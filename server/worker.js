// =====================================================================
// Worker process entry point.
//   Run with:  node server/worker.js
//   PM2:       pm2 start ecosystem.config.cjs --only tubaalhijaz-worker
// Loads ALL workers in the queues/workers directory and shares a single
// Redis connection. Logs structured JSON lines for ops visibility.
// =====================================================================
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('./config/validateEnv')();

const fs = require('fs');
const { Worker } = require('bullmq');
const { getRedisConnection, isQueueEnabled } = require('./queues/connection');
const { query } = require('./config/database');

if (!isQueueEnabled()) {
  console.error('[worker] REDIS_URL not set — refusing to start worker process.');
  process.exit(1);
}

const connection = getRedisConnection();
const workersDir = path.join(__dirname, 'queues', 'workers');
const workers = [];

const log = (level, msg, meta = {}) => {
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...meta }) + '\n');
};

async function recordJobOutcome({ queueName, jobId, jobName, status, attempts, durationMs, payload, errorMessage, errorStack }) {
  try {
    const summary = (() => {
      try { return JSON.stringify(payload).slice(0, 500); } catch { return null; }
    })();
    await query(
      `INSERT INTO queue_job_logs (queue_name, job_id, job_name, status, attempts, duration_ms, payload_summary, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [queueName, String(jobId), jobName, status, attempts, durationMs, summary, errorMessage || null]
    );
    if (status === 'failed') {
      await query(
        `INSERT INTO failed_jobs (queue_name, job_id, job_name, payload, attempts, error_message, error_stack)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [queueName, String(jobId), jobName, payload || {}, attempts, errorMessage || null, errorStack || null]
      );
    }
  } catch (err) {
    log('error', 'failed to persist job outcome', { error: err.message });
  }
}

function loadWorkers() {
  if (!fs.existsSync(workersDir)) return;
  for (const file of fs.readdirSync(workersDir)) {
    if (!file.endsWith('.worker.js')) continue;
    const mod = require(path.join(workersDir, file));
    if (!mod || !mod.queueName || typeof mod.processor !== 'function') {
      log('warn', 'skipping invalid worker', { file });
      continue;
    }
    const startTimes = new Map();
    const w = new Worker(mod.queueName, mod.processor, {
      connection,
      concurrency: mod.concurrency || 5,
    });
    w.on('active', (job) => startTimes.set(job.id, Date.now()));
    w.on('completed', async (job) => {
      const durationMs = Date.now() - (startTimes.get(job.id) || Date.now());
      startTimes.delete(job.id);
      log('info', 'job_completed', { queue: mod.queueName, job: job.name, id: job.id, attempts: job.attemptsMade, duration_ms: durationMs });
      await recordJobOutcome({
        queueName: mod.queueName, jobId: job.id, jobName: job.name,
        status: 'completed', attempts: job.attemptsMade, durationMs, payload: job.data,
      });
    });
    w.on('failed', async (job, err) => {
      const durationMs = Date.now() - (startTimes.get(job?.id) || Date.now());
      if (job?.id) startTimes.delete(job.id);
      log('error', 'job_failed', { queue: mod.queueName, job: job?.name, id: job?.id, attempts: job?.attemptsMade, error: err.message });
      // Only persist to failed_jobs after the LAST attempt
      const isFinal = job?.attemptsMade >= (job?.opts?.attempts || 1);
      await recordJobOutcome({
        queueName: mod.queueName, jobId: job?.id, jobName: job?.name,
        status: isFinal ? 'failed' : 'retrying',
        attempts: job?.attemptsMade, durationMs, payload: job?.data,
        errorMessage: err.message, errorStack: err.stack,
      });
    });
    w.on('error', (err) => log('error', 'worker_error', { queue: mod.queueName, error: err.message }));
    workers.push(w);
    log('info', 'worker_started', { queue: mod.queueName, concurrency: mod.concurrency || 5 });
  }
}

loadWorkers();

const shutdown = async (signal) => {
  log('info', 'shutting_down', { signal });
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit().catch(() => {});
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

log('info', 'worker_ready', { workers: workers.length });
