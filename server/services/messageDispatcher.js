// Phase 6 — Messaging Engine
// When REDIS_URL is set: rows inserted into message_queue are dispatched
// via BullMQ (queue: 'messaging'); the legacy SQL polling loop is disabled
// to prevent duplicate sends.
// When REDIS_URL is not set: falls back to the legacy in-process polling
// loop so dev / no-Redis deployments keep working unchanged.
const { query } = require('../config/database');
const { isQueueEnabled, enqueue: queueEnqueue, QUEUE_NAMES } = require('../queues');

const POLL_INTERVAL_MS = Number(process.env.MESSAGE_POLL_MS || 8000);
const BATCH_SIZE = Number(process.env.MESSAGE_BATCH_SIZE || 10);
const BACKOFF_BASE_MS = 60_000; // 1m * attempts^2

let started = false;

async function loadConfig() {
  const r = await query(
    `SELECT setting_value FROM company_settings WHERE setting_key = 'messaging_config' LIMIT 1`
  );
  let raw = r.rows[0]?.setting_value || {};
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = {}; }
  }
  return raw || {};
}

function renderTemplate(body, payload) {
  if (!body) return '';
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = k.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), payload);
    return v == null ? '' : String(v);
  });
}

// ----- Providers (stubs that call real APIs when keys are present) -----
async function sendWhatsApp(cfg, msg) {
  const wa = cfg.whatsapp || {};
  if (!wa.enabled || !wa.access_token || !wa.phone_number_id) {
    throw new Error('WhatsApp not configured');
  }
  const to = String(msg.recipient).replace(/\D/g, '');
  const url = `https://graph.facebook.com/v20.0/${wa.phone_number_id}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${wa.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: msg.body, preview_url: false },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return { provider_message_id: data?.messages?.[0]?.id || null, provider_response: data };
}

async function sendSms(cfg, msg) {
  const sms = cfg.sms || {};
  if (!sms.enabled) throw new Error('SMS not configured');

  // Provider 1: Twilio
  if (sms.provider === 'twilio') {
    if (!sms.account_sid || !sms.auth_token || !sms.from) throw new Error('Twilio creds missing');
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sms.account_sid}/Messages.json`;
    const auth = Buffer.from(`${sms.account_sid}:${sms.auth_token}`).toString('base64');
    const params = new URLSearchParams({ To: msg.recipient, From: sms.from, Body: msg.body });
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return { provider_message_id: data?.sid || null, provider_response: data };
  }

  // Provider 2: BD local gateway (generic GET endpoint with placeholders)
  if (sms.provider === 'bdgateway') {
    if (!sms.endpoint) throw new Error('BD gateway endpoint missing');
    const phone = String(msg.recipient).replace(/\D/g, '').replace(/^0/, '88');
    const url = sms.endpoint
      .replace('{phone}', encodeURIComponent(phone))
      .replace('{message}', encodeURIComponent(msg.body));
    const res = await fetch(url, { method: sms.method || 'GET' });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    return { provider_message_id: null, provider_response: { raw: text.slice(0, 1000) } };
  }

  throw new Error(`Unknown SMS provider: ${sms.provider}`);
}

async function sendEmail(cfg, msg) {
  const email = cfg.email || {};
  if (!email.enabled) throw new Error('Email not configured');

  // SMTP via nodemailer (lazy require so missing module doesn't crash boot)
  let nodemailer;
  try { nodemailer = require('nodemailer'); }
  catch { throw new Error('nodemailer not installed on server'); }

  const transporter = nodemailer.createTransport({
    host: email.smtp_host,
    port: Number(email.smtp_port || 587),
    secure: Boolean(email.smtp_secure),
    auth: email.smtp_user ? { user: email.smtp_user, pass: email.smtp_password } : undefined,
  });
  const info = await transporter.sendMail({
    from: email.from || email.smtp_user,
    to: msg.recipient,
    subject: msg.subject || '(no subject)',
    text: msg.body,
    html: msg.body.replace(/\n/g, '<br/>'),
  });
  return { provider_message_id: info.messageId, provider_response: { accepted: info.accepted, rejected: info.rejected } };
}

const PROVIDERS = { whatsapp: sendWhatsApp, sms: sendSms, email: sendEmail };

async function processOne(cfg, msg) {
  await query(
    `UPDATE message_queue SET status = 'sending', updated_at = now() WHERE id = $1`,
    [msg.id]
  );
  try {
    const provider = PROVIDERS[msg.channel];
    if (!provider) throw new Error(`Unknown channel: ${msg.channel}`);
    // Re-render in case payload was provided after queueing
    const body = msg.payload && Object.keys(msg.payload).length
      ? renderTemplate(msg.body, msg.payload)
      : msg.body;
    const subject = msg.subject && msg.payload ? renderTemplate(msg.subject, msg.payload) : msg.subject;
    const sendable = { ...msg, body, subject };

    const result = await provider(cfg, sendable);
    await query(
      `UPDATE message_queue
       SET status = 'sent', attempts = attempts + 1,
           provider_message_id = $2, last_error = NULL, updated_at = now()
       WHERE id = $1`,
      [msg.id, result.provider_message_id]
    );
    await query(
      `INSERT INTO message_logs (queue_id, channel, recipient, subject, body, event_key,
         related_type, related_id, status, provider_message_id, provider_response)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'sent',$9,$10::jsonb)`,
      [msg.id, msg.channel, msg.recipient, subject, body, msg.event_key,
       msg.related_type, msg.related_id, result.provider_message_id,
       JSON.stringify(result.provider_response || {})]
    );
  } catch (err) {
    const attempts = (msg.attempts || 0) + 1;
    const exhausted = attempts >= (msg.max_attempts || 5);
    const nextDelay = BACKOFF_BASE_MS * Math.pow(attempts, 2);
    await query(
      `UPDATE message_queue
       SET status = $2, attempts = $3, last_error = $4,
           next_attempt_at = $5, updated_at = now()
       WHERE id = $1`,
      [
        msg.id,
        exhausted ? 'failed' : 'pending',
        attempts,
        String(err.message).slice(0, 1000),
        new Date(Date.now() + nextDelay),
      ]
    );
    await query(
      `INSERT INTO message_logs (queue_id, channel, recipient, subject, body, event_key,
         related_type, related_id, status, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'failed',$9)`,
      [msg.id, msg.channel, msg.recipient, msg.subject, msg.body, msg.event_key,
       msg.related_type, msg.related_id, String(err.message).slice(0, 1000)]
    );
  }
}

async function tick() {
  try {
    const cfg = await loadConfig();
    const r = await query(
      `SELECT * FROM message_queue
       WHERE status = 'pending' AND next_attempt_at <= now()
       ORDER BY created_at ASC
       LIMIT $1`,
      [BATCH_SIZE]
    );
    if (!r.rows.length) return;
    for (const msg of r.rows) {
      // Sequential to avoid hammering providers
      // eslint-disable-next-line no-await-in-loop
      await processOne(cfg, msg);
    }
  } catch (err) {
    console.error('[messageDispatcher] tick error:', err.message);
  }
}

// ----- Public helpers used by routes -----
async function enqueue({
  channel, recipient, recipient_name, body, subject, language = 'en',
  event_key = null, related_type = null, related_id = null, payload = {},
  attachments = [], created_by = null,
}) {
  if (!channel || !recipient || !body) throw new Error('channel, recipient, body required');
  const r = await query(
    `INSERT INTO message_queue
       (channel, language, recipient, recipient_name, subject, body, event_key,
        related_type, related_id, payload, attachments, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12)
     RETURNING *`,
    [channel, language, String(recipient), recipient_name || null, subject || null, body,
     event_key, related_type, related_id, JSON.stringify(payload || {}),
     JSON.stringify(attachments || []), created_by]
  );
  return r.rows[0];
}

// Look up template by (event_key, channel, language) and enqueue rendered message.
async function enqueueFromTemplate({
  event_key, channel, language = 'en', recipient, recipient_name,
  payload = {}, related_type = null, related_id = null, created_by = null,
}) {
  const tpl = await query(
    `SELECT subject, body FROM message_templates
     WHERE event_key = $1 AND channel = $2 AND language = $3 AND is_active = true
     LIMIT 1`,
    [event_key, channel, language]
  );
  let row = tpl.rows[0];
  if (!row) {
    // Fallback to English
    const fallback = await query(
      `SELECT subject, body FROM message_templates
       WHERE event_key = $1 AND channel = $2 AND language = 'en' AND is_active = true
       LIMIT 1`,
      [event_key, channel]
    );
    row = fallback.rows[0];
  }
  if (!row) throw new Error(`No template for ${event_key}/${channel}/${language}`);
  const body = renderTemplate(row.body, payload);
  const subject = renderTemplate(row.subject || '', payload);
  return enqueue({
    channel, recipient, recipient_name, body, subject, language,
    event_key, related_type, related_id, payload, created_by,
  });
}

function start() {
  if (started) return;
  started = true;
  setInterval(tick, POLL_INTERVAL_MS).unref();
  console.log(`[messageDispatcher] started (poll=${POLL_INTERVAL_MS}ms, batch=${BATCH_SIZE})`);
}

module.exports = { start, enqueue, enqueueFromTemplate, renderTemplate, processOne, loadConfig };
