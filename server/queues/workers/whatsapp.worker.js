// WhatsApp worker (Meta Cloud API)
// Payload: { recipient, body, template_name?, language? }
const { query } = require('../../config/database');

async function loadConfig() {
  const r = await query(`SELECT setting_value FROM company_settings WHERE setting_key='messaging_config' LIMIT 1`);
  let raw = r.rows[0]?.setting_value || {};
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = {}; } }
  return (raw && raw.whatsapp) || {};
}

module.exports = {
  queueName: 'whatsapp',
  concurrency: 5,
  async processor(job) {
    const { recipient, body } = job.data || {};
    if (!recipient || !body) throw new Error('missing recipient or body');
    const cfg = await loadConfig();
    if (!cfg.enabled || !cfg.access_token || !cfg.phone_number_id) {
      throw new Error('WhatsApp not configured');
    }
    const to = String(recipient).replace(/\D/g, '');
    const url = `https://graph.facebook.com/v20.0/${cfg.phone_number_id}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`WhatsApp HTTP ${res.status}: ${text.slice(0, 200)}`);
    return { provider: 'whatsapp_cloud', response: text.slice(0, 500) };
  },
};
