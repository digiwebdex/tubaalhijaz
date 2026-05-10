// Phase 6 — Auto-send triggers for bookings, payments, visa, etc.
const { query } = require('../config/database');
const dispatcher = require('./messageDispatcher');

async function notify({ user_id = null, event_type, title, body = null, link = null, severity = 'info', metadata = {} }) {
  try {
    await query(
      `INSERT INTO notifications (user_id, event_type, title, body, link, severity, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [user_id, event_type, title, body, link, severity, JSON.stringify(metadata)]
    );
  } catch (e) { console.error('[trigger] notify:', e.message); }
}

async function getRecipients(booking) {
  // Try profile first; fall back to guest fields
  let phone = booking.guest_phone || null;
  let email = booking.guest_email || null;
  let name = booking.guest_name || null;
  if (booking.user_id) {
    const r = await query(
      `SELECT full_name, phone, email FROM profiles WHERE user_id = $1 LIMIT 1`,
      [booking.user_id]
    );
    const p = r.rows[0];
    if (p) {
      phone = phone || p.phone;
      email = email || p.email;
      name = name || p.full_name;
    }
  }
  return { phone, email, name };
}

async function tryEnqueueTemplate(opts) {
  try {
    return await dispatcher.enqueueFromTemplate(opts);
  } catch (e) {
    // Silently skip if template not configured
    if (!String(e.message).includes('No template')) {
      console.error('[trigger] enqueue:', e.message);
    }
  }
}

async function onBookingCreated(row) {
  const { phone, email, name } = await getRecipients(row);
  await notify({
    event_type: 'booking.created',
    title: `New booking — ${row.tracking_id}`,
    body: `${name || 'Guest'} • ${row.num_travelers} traveler(s) • Total ${row.total_amount}`,
    link: `/admin/bookings/${row.id}`,
    severity: 'success',
    metadata: { booking_id: row.id, tracking_id: row.tracking_id },
  });
  const payload = {
    name: name || 'Pilgrim',
    tracking_id: row.tracking_id,
    total: row.total_amount,
    travelers: row.num_travelers,
  };
  if (phone) {
    await tryEnqueueTemplate({ event_key: 'booking_confirmed', channel: 'sms', recipient: phone, recipient_name: name, payload, related_type: 'booking', related_id: row.id });
    await tryEnqueueTemplate({ event_key: 'booking_confirmed', channel: 'whatsapp', recipient: phone, recipient_name: name, payload, related_type: 'booking', related_id: row.id });
  }
  if (email) {
    await tryEnqueueTemplate({ event_key: 'booking_confirmed', channel: 'email', recipient: email, recipient_name: name, payload, related_type: 'booking', related_id: row.id });
  }
}

async function onBookingUpdated(row) {
  // Only fire on status changes that we care about — keep it light by always firing a notification
  await notify({
    event_type: 'booking.updated',
    title: `Booking updated — ${row.tracking_id}`,
    body: `Status: ${row.status} • Paid: ${row.paid_amount} / ${row.total_amount}`,
    link: `/admin/bookings/${row.id}`,
    severity: 'info',
    metadata: { booking_id: row.id, status: row.status },
  });
}

async function onPaymentCreated(row) {
  // Look up booking for recipients
  let booking = null;
  if (row.booking_id) {
    const r = await query(`SELECT * FROM bookings WHERE id = $1`, [row.booking_id]);
    booking = r.rows[0] || null;
  }
  await notify({
    event_type: 'payment.received',
    title: `Payment received — ${row.amount}`,
    body: booking ? `Booking ${booking.tracking_id}` : null,
    link: booking ? `/admin/bookings/${booking.id}` : null,
    severity: 'success',
    metadata: { payment_id: row.id, booking_id: row.booking_id },
  });
  if (!booking) return;
  const { phone, email, name } = await getRecipients(booking);
  const payload = {
    name: name || 'Pilgrim',
    amount: row.amount,
    tracking_id: booking.tracking_id,
    paid: booking.paid_amount,
    due: booking.due_amount,
    total: booking.total_amount,
  };
  if (phone) {
    await tryEnqueueTemplate({ event_key: 'payment_received', channel: 'sms', recipient: phone, recipient_name: name, payload, related_type: 'payment', related_id: row.id });
    await tryEnqueueTemplate({ event_key: 'payment_received', channel: 'whatsapp', recipient: phone, recipient_name: name, payload, related_type: 'payment', related_id: row.id });
  }
  if (email) {
    await tryEnqueueTemplate({ event_key: 'payment_received', channel: 'email', recipient: email, recipient_name: name, payload, related_type: 'payment', related_id: row.id });
  }
}

module.exports = { onBookingCreated, onBookingUpdated, onPaymentCreated, notify };
