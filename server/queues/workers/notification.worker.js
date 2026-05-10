// Notification worker — writes to in-app notifications table.
// Payload: { user_id, title, body, link?, type? }
const { query } = require('../../config/database');

module.exports = {
  queueName: 'notification',
  concurrency: 20,
  async processor(job) {
    const { user_id, title, body, link, type } = job.data || {};
    if (!user_id || !title) throw new Error('missing user_id or title');
    await query(
      `INSERT INTO notifications (user_id, title, body, link, type, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, false, now())`,
      [user_id, title, body || null, link || null, type || 'info']
    );
    return { delivered: true };
  },
};
