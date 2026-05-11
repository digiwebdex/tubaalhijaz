// =====================================================================
// Messaging worker — processes message_queue rows via BullMQ.
//
// Job payload: { messageQueueId: <uuid> }
//
// This worker delegates to messageDispatcher.processOne so all existing
// provider logic, message_logs writes, attempt counting, and backoff stay
// in one place. Any throw bubbles up so BullMQ records the retry.
// =====================================================================
const { query } = require('../../config/database');
const dispatcher = require('../../services/messageDispatcher');

module.exports = {
  queueName: 'messaging',
  concurrency: Number(process.env.MESSAGING_CONCURRENCY || 5),
  async processor(job) {
    const id = job.data?.messageQueueId;
    if (!id) throw new Error('messageQueueId required');

    const r = await query(`SELECT * FROM message_queue WHERE id = $1 LIMIT 1`, [id]);
    const msg = r.rows[0];
    if (!msg) {
      // Row was deleted — treat as success so BullMQ doesn't retry forever.
      return { skipped: true, reason: 'message_queue row not found' };
    }
    if (msg.status === 'sent') {
      return { skipped: true, reason: 'already sent' };
    }

    const cfg = await dispatcher.loadConfig();
    await dispatcher.processOne(cfg, msg);

    // processOne swallows errors and writes them to message_queue/message_logs.
    // Surface failures back to BullMQ so it can retry / move to failed_jobs.
    const after = await query(`SELECT status, last_error FROM message_queue WHERE id = $1`, [id]);
    const row = after.rows[0];
    if (row && row.status !== 'sent') {
      throw new Error(row.last_error || `dispatch did not complete (status=${row?.status})`);
    }
    return { ok: true };
  },
};
