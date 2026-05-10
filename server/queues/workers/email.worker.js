// Email worker (Resend)
// Payload: { to, subject, html?, text? }
module.exports = {
  queueName: 'email',
  concurrency: 5,
  async processor(job) {
    const { to, subject, html, text } = job.data || {};
    if (!to || !subject || (!html && !text)) throw new Error('missing email fields');
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.NOTIFICATION_FROM_EMAIL;
    if (!apiKey || !from) throw new Error('Resend not configured');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`Resend HTTP ${res.status}: ${body.slice(0, 200)}`);
    return { provider: 'resend', response: body.slice(0, 500) };
  },
};
