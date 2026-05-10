// PDF generation worker — placeholder that records the request.
// Real implementation will render via the same pdfCore the client uses;
// for now this proves the queue contract end-to-end.
// Payload: { type: 'invoice'|'voucher'|'manifest'|'catering', entity_id, requested_by? }
const { query } = require('../../config/database');

module.exports = {
  queueName: 'pdf',
  concurrency: 2, // PDFs are CPU-heavy
  async processor(job) {
    const { type, entity_id } = job.data || {};
    if (!type || !entity_id) throw new Error('missing type or entity_id');
    // Record the render request — UI shows "PDF queued" then polls until ready.
    await query(
      `INSERT INTO queue_job_logs (queue_name, job_id, job_name, status, attempts, payload_summary)
       VALUES ('pdf', $1, $2, 'completed', 1, $3)`,
      [String(job.id), type, JSON.stringify({ type, entity_id }).slice(0, 500)]
    );
    return { type, entity_id, generated_at: new Date().toISOString() };
  },
};
