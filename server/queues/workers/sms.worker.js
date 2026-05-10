// SMS worker — delegates to the existing dispatcher's provider logic.
// Payload: { recipient, body, template?, metadata? }
const { query } = require('../../config/database');

async function loadConfig() {
  const r = await query(`SELECT setting_value FROM company_settings WHERE setting_key='messaging_config' LIMIT 1`);
  let raw = r.rows[0]?.setting_value || {};
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = {}; } }
  return raw || {};
}

function toSmsPhone(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  return digits.startsWith('88') ? digits : `88${digits}`;
}

async function sendBulkSmsBd(cfg, recipient, body) {
  const apiKey = cfg.api_key || process.env.BULKSMSBD_API_KEY;
  const senderId = cfg.sender_id || process.env.BULKSMSBD_SENDER_ID;
  if (!apiKey || !senderId) throw new Error('BulkSMSBD not configured');
  const url = `https://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&number=${encodeURIComponent(toSmsPhone(recipient))}&senderid=${encodeURIComponent(senderId)}&message=${encodeURIComponent(body)}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`SMS HTTP ${res.status}: ${text.slice(0, 200)}`);
  return { provider: 'bulksmsbd', response: text.slice(0, 500) };
}

module.exports = {
  queueName: 'sms',
  concurrency: 10,
  async processor(job) {
    const { recipient, body } = job.data || {};
    if (!recipient || !body) throw new Error('missing recipient or body');
    const cfg = (await loadConfig()).sms || {};
    return sendBulkSmsBd(cfg, recipient, body);
  },
};
