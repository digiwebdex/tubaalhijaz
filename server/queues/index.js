// =====================================================================
// Queue registry — defines every queue used by the app.
// Use `enqueue(queueName, jobName, payload, opts?)` from anywhere.
// If Redis isn't configured the call is a safe no-op (returns null).
// =====================================================================
const { Queue, QueueEvents } = require('bullmq');
const { getRedisConnection, isQueueEnabled } = require('./connection');

// Canonical queue names. Keep stable — workers and dashboard refer to these.
const QUEUE_NAMES = Object.freeze({
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  EMAIL: 'email',
  PDF: 'pdf',
  NOTIFICATION: 'notification',
  GPS: 'gps',
  AUDIT_EXPORT: 'audit-export',
  REMINDERS: 'reminders',
});

const DEFAULT_JOB_OPTS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5_000 }, // 5s, 10s, 20s, 40s, 80s
  removeOnComplete: { age: 60 * 60, count: 1000 }, // keep 1h / 1000 most recent
  removeOnFail: { age: 24 * 60 * 60, count: 5000 },
};

const queues = new Map();
const queueEvents = new Map();

function getQueue(name) {
  if (!Object.values(QUEUE_NAMES).includes(name)) {
    throw new Error(`[queues] unknown queue "${name}"`);
  }
  if (queues.has(name)) return queues.get(name);
  const conn = getRedisConnection();
  if (!conn) return null;
  const q = new Queue(name, { connection: conn, defaultJobOptions: DEFAULT_JOB_OPTS });
  queues.set(name, q);
  return q;
}

function getQueueEvents(name) {
  if (queueEvents.has(name)) return queueEvents.get(name);
  const conn = getRedisConnection();
  if (!conn) return null;
  const ev = new QueueEvents(name, { connection: conn });
  queueEvents.set(name, ev);
  return ev;
}

/**
 * Enqueue a job. Returns Job or null if Redis is unavailable.
 * Use `enqueueOrRun` if you want an automatic inline fallback.
 */
async function enqueue(queueName, jobName, payload, opts = {}) {
  const q = getQueue(queueName);
  if (!q) return null;
  return q.add(jobName, payload, opts);
}

/**
 * Enqueue if Redis is configured, otherwise execute inline using the
 * provided fallback function. This is the safest call-site pattern
 * during the migration from polling-based dispatchers.
 */
async function enqueueOrRun(queueName, jobName, payload, inlineFn, opts = {}) {
  if (isQueueEnabled()) {
    return enqueue(queueName, jobName, payload, opts);
  }
  try {
    return await inlineFn(payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[queues:inline] ${queueName}/${jobName} failed:`, err.message);
    throw err;
  }
}

async function listQueueStats() {
  const stats = [];
  for (const name of Object.values(QUEUE_NAMES)) {
    const q = getQueue(name);
    if (!q) {
      stats.push({ name, enabled: false, counts: null });
      continue;
    }
    const counts = await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
    const isPaused = await q.isPaused();
    stats.push({ name, enabled: true, paused: isPaused, counts });
  }
  return stats;
}

async function shutdown() {
  for (const q of queues.values()) await q.close().catch(() => {});
  for (const ev of queueEvents.values()) await ev.close().catch(() => {});
  queues.clear();
  queueEvents.clear();
}

module.exports = {
  QUEUE_NAMES,
  getQueue,
  getQueueEvents,
  enqueue,
  enqueueOrRun,
  listQueueStats,
  shutdown,
};
