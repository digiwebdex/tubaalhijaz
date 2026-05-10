const express = require('express');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// =====================================================
// LIVE VEHICLE TRACKING
// =====================================================

// POST /api/ops/tracking/ping  — driver/coordinator app pushes GPS
router.post('/tracking/ping', authenticate, async (req, res) => {
  try {
    const {
      movement_id = null, voucher_id = null, driver_name = null,
      vehicle_label = null, lat, lng, speed_kmh = null,
      heading = null, status = 'on_route', eta_minutes = null,
    } = req.body || {};
    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }
    const r = await query(
      `INSERT INTO live_vehicle_tracking
        (movement_id, voucher_id, driver_user_id, driver_name, vehicle_label,
         lat, lng, speed_kmh, heading, status, eta_minutes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [movement_id, voucher_id, req.user.id, driver_name, vehicle_label,
       lat, lng, speed_kmh, heading, status, eta_minutes]
    );
    res.json(r.rows[0]);
  } catch (err) {
    console.error('tracking/ping', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ops/tracking/live — latest ping per driver (last 30 min)
router.get('/tracking/live', authenticate, async (req, res) => {
  try {
    const r = await query(
      `SELECT DISTINCT ON (driver_user_id) *
         FROM live_vehicle_tracking
        WHERE recorded_at > now() - interval '30 minutes'
        ORDER BY driver_user_id, recorded_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/ops/tracking/movement/:id — track history for one movement
router.get('/tracking/movement/:id', authenticate, async (req, res) => {
  try {
    const r = await query(
      `SELECT * FROM live_vehicle_tracking WHERE movement_id = $1
       ORDER BY recorded_at ASC LIMIT 500`, [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================================================
// OPS ALERTS
// =====================================================
router.get('/alerts', authenticate, async (req, res) => {
  try {
    const status = req.query.status || 'open';
    const r = await query(
      `SELECT * FROM ops_alerts WHERE status = $1
       ORDER BY (severity = 'critical') DESC, created_at DESC LIMIT 200`,
      [status]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/alerts', authenticate, async (req, res) => {
  try {
    const { alert_type, severity = 'warning', title, body = null,
      related_type = null, related_id = null, metadata = {} } = req.body || {};
    if (!alert_type || !title) return res.status(400).json({ error: 'alert_type and title required' });
    const r = await query(
      `INSERT INTO ops_alerts (alert_type, severity, title, body, related_type, related_id, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [alert_type, severity, title, body, related_type, related_id, metadata]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/alerts/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['open', 'acknowledged', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }
    const r = await query(
      `UPDATE ops_alerts SET status = $1,
         acknowledged_by = COALESCE(acknowledged_by, $2),
         acknowledged_at = COALESCE(acknowledged_at, CASE WHEN $1 IN ('acknowledged','resolved') THEN now() END),
         resolved_at = CASE WHEN $1 = 'resolved' THEN now() ELSE resolved_at END
       WHERE id = $3 RETURNING *`,
      [status, req.user.id, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Auto-scan: generate alerts based on stale data (called on demand by command center)
router.post('/alerts/auto-scan', authenticate, async (req, res) => {
  try {
    const created = [];
    // Vehicle offline (no ping in 30 min but movement in_progress)
    const offline = await query(
      `SELECT m.id, m.from_location, m.to_location, m.driver
         FROM movement_schedules m
        WHERE m.status = 'in_progress'
          AND NOT EXISTS (
            SELECT 1 FROM live_vehicle_tracking l
             WHERE l.movement_id = m.id AND l.recorded_at > now() - interval '30 minutes'
          ) LIMIT 50`
    );
    for (const m of offline.rows) {
      const ins = await query(
        `INSERT INTO ops_alerts (alert_type, severity, title, body, related_type, related_id)
         SELECT 'vehicle_offline','warning','Vehicle offline: ' || $1,
                'No GPS update in 30 min for ' || COALESCE($2,'Driver') || ' on route ' || $3 || ' → ' || $4,
                'movement', $5
          WHERE NOT EXISTS (SELECT 1 FROM ops_alerts WHERE related_type='movement' AND related_id=$5 AND status='open' AND alert_type='vehicle_offline')
         RETURNING id`,
        [m.id, m.driver, m.from_location, m.to_location, m.id]
      );
      if (ins.rows[0]) created.push(ins.rows[0].id);
    }
    // Overdue payments
    const overdue = await query(
      `SELECT b.id, b.tracking_id, b.due_amount FROM bookings b
        WHERE b.due_amount > 0 AND b.travel_date < CURRENT_DATE
          AND COALESCE(b.status,'') NOT IN ('cancelled','deleted','completed') LIMIT 50`
    );
    for (const b of overdue.rows) {
      const ins = await query(
        `INSERT INTO ops_alerts (alert_type, severity, title, body, related_type, related_id)
         SELECT 'payment_overdue','warning','Payment overdue: ' || $1,
                'Due amount ' || $2 || ' BDT past travel date',
                'booking', $3
          WHERE NOT EXISTS (SELECT 1 FROM ops_alerts WHERE related_type='booking' AND related_id=$3 AND status='open' AND alert_type='payment_overdue')
         RETURNING id`,
        [b.tracking_id, b.due_amount, b.id]
      );
      if (ins.rows[0]) created.push(ins.rows[0].id);
    }
    res.json({ created: created.length });
  } catch (err) {
    console.error('auto-scan', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// AIRPORT ARRIVALS BOARD
// =====================================================
router.get('/arrivals', authenticate, async (req, res) => {
  try {
    const direction = req.query.direction || 'arrival';
    const r = await query(
      `SELECT * FROM airport_arrivals
        WHERE direction = $1
          AND scheduled_at > now() - interval '24 hours'
        ORDER BY scheduled_at ASC LIMIT 200`,
      [direction]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/arrivals', authenticate, async (req, res) => {
  try {
    const f = req.body || {};
    if (!f.airport_code || !f.flight_number || !f.scheduled_at) {
      return res.status(400).json({ error: 'airport_code, flight_number, scheduled_at required' });
    }
    const r = await query(
      `INSERT INTO airport_arrivals
       (booking_id, voucher_id, direction, airport_code, airport_name, airline, flight_number,
        scheduled_at, pilgrim_count, assigned_driver_id, assigned_driver_name, vehicle_label,
        pickup_status, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [f.booking_id||null, f.voucher_id||null, f.direction||'arrival',
       f.airport_code, f.airport_name||null, f.airline||null, f.flight_number,
       f.scheduled_at, f.pilgrim_count||1, f.assigned_driver_id||null,
       f.assigned_driver_name||null, f.vehicle_label||null,
       f.pickup_status||'scheduled', f.notes||null, req.user.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/arrivals/:id', authenticate, async (req, res) => {
  try {
    const f = req.body || {};
    const r = await query(
      `UPDATE airport_arrivals SET
        pickup_status = COALESCE($1, pickup_status),
        assigned_driver_id = COALESCE($2, assigned_driver_id),
        assigned_driver_name = COALESCE($3, assigned_driver_name),
        vehicle_label = COALESCE($4, vehicle_label),
        actual_at = COALESCE($5, actual_at),
        notes = COALESCE($6, notes)
       WHERE id = $7 RETURNING *`,
      [f.pickup_status||null, f.assigned_driver_id||null, f.assigned_driver_name||null,
       f.vehicle_label||null, f.actual_at||null, f.notes||null, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================================================
// DRIVER APP — my trips
// =====================================================
router.get('/driver/my-trips', authenticate, async (req, res) => {
  try {
    // Trips where driver_name matches user's profile name OR airport_arrivals assigned to them
    const u = await query(`SELECT full_name FROM profiles WHERE user_id = $1 LIMIT 1`, [req.user.id]);
    const name = u.rows[0]?.full_name || '';
    const trips = await query(
      `SELECT m.id, m.movement_date, m.from_location, m.to_location, m.movement_time,
              m.vehicle, m.driver, m.status, m.notes,
              v.tracking_id, v.lead_pilgrim_name, v.num_pilgrims
         FROM movement_schedules m
         LEFT JOIN transport_vouchers v ON v.id = m.voucher_id
        WHERE LOWER(COALESCE(m.driver,'')) = LOWER($1)
          AND m.movement_date >= CURRENT_DATE - 1
        ORDER BY m.movement_date ASC, m.movement_time ASC LIMIT 200`,
      [name]
    );
    const arrivals = await query(
      `SELECT * FROM airport_arrivals WHERE assigned_driver_id = $1
        AND scheduled_at > now() - interval '24 hours'
        ORDER BY scheduled_at ASC LIMIT 100`,
      [req.user.id]
    );
    res.json({ driver_name: name, movements: trips.rows, arrivals: arrivals.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/driver/movement/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['scheduled','accepted','in_progress','arrived','completed','cancelled','delayed'].includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }
    const r = await query(
      `UPDATE movement_schedules SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
