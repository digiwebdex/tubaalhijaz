const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

const getIp = (req) =>
  (req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || '').trim();

const fetchBookingByTracking = async (trackingId) => {
  const r = await query(
    `SELECT b.id, b.tracking_id, b.status, b.guest_name, b.num_travelers,
            b.total_amount, b.paid_amount, b.due_amount, b.created_at, b.travel_date,
            p.name as package_name, p.type as package_type
     FROM bookings b LEFT JOIN packages p ON p.id = b.package_id
     WHERE upper(b.tracking_id) = upper($1) LIMIT 1`,
    [trackingId]
  );
  return r.rows[0] || null;
};

// GET /api/verify/:trackingId — public verification + scan logging
router.get('/:trackingId', async (req, res) => {
  try {
    const tid = String(req.params.trackingId || '').trim();
    if (!tid || !/^[A-Z0-9-]+$/i.test(tid) || tid.length > 30) {
      return res.status(400).json({ verified: false, scan_result: 'invalid' });
    }

    const booking = await fetchBookingByTracking(tid);
    const qr = await query(
      `SELECT id, status, expires_at FROM qr_verifications
       WHERE upper(tracking_id) = upper($1) ORDER BY created_at DESC LIMIT 1`,
      [tid]
    );
    const qrRow = qr.rows[0];

    let scanResult = 'verified';
    if (!booking) scanResult = 'invalid';
    else if (qrRow?.status === 'revoked') scanResult = 'revoked';
    else if (qrRow?.expires_at && new Date(qrRow.expires_at) < new Date()) scanResult = 'expired';

    // Log scan (fire and forget)
    try {
      await query(
        `INSERT INTO public_tracking_logs (qr_id, tracking_id, document_type, scan_result, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [qrRow?.id || null, tid, 'booking', scanResult, getIp(req), String(req.headers['user-agent'] || '').slice(0, 500)]
      );
      if (qrRow?.id && scanResult === 'verified') {
        await query(
          `UPDATE qr_verifications SET scan_count = scan_count + 1, last_scanned_at = now() WHERE id = $1`,
          [qrRow.id]
        );
      }
    } catch (e) {
      console.error('scan log failed:', e.message);
    }

    if (scanResult !== 'verified') {
      return res.json({ verified: false, scan_result: scanResult });
    }

    return res.json({ verified: true, scan_result: 'verified', booking });
  } catch (err) {
    console.error('verify error:', err);
    return res.status(500).json({ verified: false, scan_result: 'invalid', error: err.message });
  }
});

module.exports = router;
