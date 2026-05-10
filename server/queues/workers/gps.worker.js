// GPS ingest worker — batches driver pings into live_vehicle_tracking.
// Payload: { driver_id, lat, lng, speed?, heading?, recorded_at? }
const { query } = require('../../config/database');

module.exports = {
  queueName: 'gps',
  concurrency: 30, // many concurrent pings
  async processor(job) {
    const { driver_id, lat, lng, speed, heading, recorded_at } = job.data || {};
    if (!driver_id || lat == null || lng == null) throw new Error('missing GPS fields');
    await query(
      `INSERT INTO live_vehicle_tracking (driver_id, lat, lng, speed, heading, recorded_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()))`,
      [driver_id, lat, lng, speed || null, heading || null, recorded_at || null]
    );
    return { ok: true };
  },
};
