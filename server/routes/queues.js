// =====================================================================
// Queue admin API — admin-only.
//   GET    /api/queues                  → stats per queue
//   GET    /api/queues/:name/jobs       → jobs by state (?state=failed|active|waiting|completed|delayed)
//   GET    /api/queues/failed           → persistent dead-letter from SQL
//   POST   /api/queues/:name/pause
//   POST   /api/queues/:name/resume
//   POST   /api/queues/:name/jobs/:id/retry
//   DELETE /api/queues/:name/jobs/:id
//   POST   /api/queues/:name/clean      → remove old completed/failed
// =====================================================================
const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { QUEUE_NAMES, getQueue, listQueueStats } = require('../queues');
const { query } = require('../config/database');
const { isQueueEnabled } = require('../queues/connection');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

router.get('/', async (_req, res, next) => {
  try {
    res.json({
      enabled: isQueueEnabled(),
      queues: await listQueueStats(),
    });
  } catch (e) { next(e); }
});

router.get('/failed', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const r = await query(
      `SELECT id, queue_name, job_id, job_name, attempts, error_message, failed_at, retried_at, resolved_at
         FROM failed_jobs
         WHERE resolved_at IS NULL
         ORDER BY failed_at DESC
         LIMIT $1`,
      [limit]
    );
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get('/:name/jobs', async (req, res, next) => {
  try {
    const { name } = req.params;
    const state = String(req.query.state || 'failed');
    const allowed = ['waiting', 'active', 'completed', 'failed', 'delayed'];
    if (!allowed.includes(state)) return res.status(400).json({ error: 'invalid state' });
    if (!Object.values(QUEUE_NAMES).includes(name)) return res.status(404).json({ error: 'unknown queue' });
    const q = getQueue(name);
    if (!q) return res.json({ enabled: false, jobs: [] });
    const jobs = await q.getJobs([state], 0, 99, false);
    res.json({
      enabled: true,
      jobs: jobs.map((j) => ({
        id: j.id,
        name: j.name,
        attempts: j.attemptsMade,
        timestamp: j.timestamp,
        processed_on: j.processedOn,
        finished_on: j.finishedOn,
        failed_reason: j.failedReason,
        data: j.data,
      })),
    });
  } catch (e) { next(e); }
});

router.post('/:name/pause', async (req, res, next) => {
  try {
    const q = getQueue(req.params.name);
    if (!q) return res.status(409).json({ error: 'queue disabled' });
    await q.pause();
    res.json({ ok: true, paused: true });
  } catch (e) { next(e); }
});

router.post('/:name/resume', async (req, res, next) => {
  try {
    const q = getQueue(req.params.name);
    if (!q) return res.status(409).json({ error: 'queue disabled' });
    await q.resume();
    res.json({ ok: true, paused: false });
  } catch (e) { next(e); }
});

router.post('/:name/jobs/:id/retry', async (req, res, next) => {
  try {
    const q = getQueue(req.params.name);
    if (!q) return res.status(409).json({ error: 'queue disabled' });
    const job = await q.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'job not found' });
    await job.retry();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:name/jobs/:id', async (req, res, next) => {
  try {
    const q = getQueue(req.params.name);
    if (!q) return res.status(409).json({ error: 'queue disabled' });
    const job = await q.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'job not found' });
    await job.remove();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/:name/clean', async (req, res, next) => {
  try {
    const q = getQueue(req.params.name);
    if (!q) return res.status(409).json({ error: 'queue disabled' });
    const olderThanMs = Number(req.body?.older_than_ms) || 24 * 3600 * 1000;
    const status = String(req.body?.status || 'completed');
    const removed = await q.clean(olderThanMs, 1000, status);
    res.json({ ok: true, removed: removed.length });
  } catch (e) { next(e); }
});

router.post('/failed/:id/resolve', async (req, res, next) => {
  try {
    await query(`UPDATE failed_jobs SET resolved_at = now() WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
