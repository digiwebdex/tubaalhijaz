// =====================================================================
// Shared Redis connection for BullMQ. Lazy-initialised; if REDIS_URL is
// not set the module returns null so callers can fall back to inline
// execution (zero-config dev path keeps the existing flows working).
// =====================================================================
const IORedis = require('ioredis');

let connection = null;
let warned = false;

function getRedisConnection() {
  if (connection) return connection;
  const url = process.env.REDIS_URL;
  if (!url) {
    if (!warned) {
      // eslint-disable-next-line no-console
      console.warn('[queues] REDIS_URL not set — queues disabled, jobs run inline.');
      warned = true;
    }
    return null;
  }
  connection = new IORedis(url, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    lazyConnect: false,
  });
  connection.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[queues:redis] connection error:', err.message);
  });
  connection.on('connect', () => {
    // eslint-disable-next-line no-console
    console.log('[queues:redis] connected');
  });
  return connection;
}

function isQueueEnabled() {
  return Boolean(process.env.REDIS_URL);
}

module.exports = { getRedisConnection, isQueueEnabled };
