// RBAC + Sessions + Approvals API
const express = require('express');
const { query } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

const router = express.Router();

const ROLE_CATALOG = [
  { key: 'super_admin',         label: 'Super Admin' },
  { key: 'admin',               label: 'Admin' },
  { key: 'operations_manager',  label: 'Operations Manager' },
  { key: 'visa_officer',        label: 'Visa Officer' },
  { key: 'transport_manager',   label: 'Transport Manager' },
  { key: 'catering_manager',    label: 'Catering Manager' },
  { key: 'finance_manager',     label: 'Finance Manager' },
  { key: 'hotel_coordinator',   label: 'Hotel Coordinator' },
  { key: 'airport_coordinator', label: 'Airport Coordinator' },
  { key: 'driver',              label: 'Driver' },
  { key: 'accountant',          label: 'Accountant' },
  { key: 'booking',             label: 'Booking Staff' },
  { key: 'cms',                 label: 'CMS Editor' },
  { key: 'viewer',              label: 'Viewer' },
  { key: 'manager',             label: 'Manager' },
  { key: 'staff',               label: 'Staff' },
  { key: 'user',                label: 'Customer' },
];

// ============ PERMISSIONS / ROLES ============
router.get('/permissions', authenticate, requireRole('admin', 'super_admin'), async (_req, res) => {
  const r = await query('SELECT key, module, label, description FROM permissions ORDER BY module, key');
  res.json({ permissions: r.rows });
});

router.get('/roles', authenticate, requireRole('admin', 'super_admin'), async (_req, res) => {
  const counts = await query('SELECT role::text AS role, count(*)::int AS n FROM user_roles GROUP BY role');
  const map = Object.fromEntries(counts.rows.map(r => [r.role, r.n]));
  res.json({ roles: ROLE_CATALOG.map(r => ({ ...r, user_count: map[r.key] || 0 })) });
});

router.get('/matrix', authenticate, requireRole('admin', 'super_admin'), async (_req, res) => {
  const r = await query('SELECT role::text AS role, permission_key, scope FROM role_permissions');
  res.json({ matrix: r.rows });
});

router.post('/matrix', authenticate, requireRole('admin', 'super_admin'), async (req, res) => {
  const { role, permission_key, granted, scope } = req.body || {};
  if (!role || !permission_key) return res.status(400).json({ error: 'role and permission_key required' });
  try {
    if (granted === false) {
      await query('DELETE FROM role_permissions WHERE role = $1::app_role AND permission_key = $2', [role, permission_key]);
    } else {
      await query(
        `INSERT INTO role_permissions (role, permission_key, scope) VALUES ($1::app_role, $2, $3)
         ON CONFLICT (role, permission_key) DO UPDATE SET scope = EXCLUDED.scope`,
        [role, permission_key, scope || 'all']
      );
    }
    await writeAuditLog({
      actor_id: req.user.id, actor_email: req.user.email, action: 'role_permission_change',
      entity_type: 'role_permissions', entity_id: `${role}:${permission_key}`,
      severity: 'warning', changes: { role, permission_key, granted, scope },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ============ SESSIONS ============
router.get('/sessions', authenticate, requireRole('admin', 'super_admin'), async (_req, res) => {
  const r = await query(`
    SELECT s.id, s.user_id, s.created_at, s.last_seen_at, s.expires_at, s.revoked_at,
           s.ip_address, s.user_agent, s.device_label,
           u.email, u.full_name
    FROM sessions s LEFT JOIN users u ON u.id = s.user_id
    WHERE s.revoked_at IS NULL AND s.expires_at > now()
    ORDER BY s.created_at DESC LIMIT 200
  `);
  res.json({ sessions: r.rows });
});

router.post('/sessions/:id/revoke', authenticate, requireRole('admin', 'super_admin'), async (req, res) => {
  await query('UPDATE sessions SET revoked_at = now() WHERE id = $1', [req.params.id]);
  await writeAuditLog({
    actor_id: req.user.id, actor_email: req.user.email, action: 'session_revoke',
    entity_type: 'sessions', entity_id: req.params.id, severity: 'warning',
  });
  res.json({ ok: true });
});

router.post('/sessions/revoke-user/:userId', authenticate, requireRole('admin', 'super_admin'), async (req, res) => {
  await query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [req.params.userId]);
  await writeAuditLog({
    actor_id: req.user.id, actor_email: req.user.email, action: 'session_revoke_all',
    entity_type: 'users', entity_id: req.params.userId, severity: 'warning',
  });
  res.json({ ok: true });
});

// ============ APPROVALS ============
router.get('/approvals', authenticate, async (req, res) => {
  const status = req.query.status || null;
  const params = [];
  let where = '';
  if (status) { params.push(status); where = `WHERE status = $${params.length}`; }
  const r = await query(`SELECT * FROM approval_requests ${where} ORDER BY created_at DESC LIMIT 200`, params);
  res.json({ approvals: r.rows });
});

router.post('/approvals', authenticate, async (req, res) => {
  const { type, entity_type, entity_id, payload, reason } = req.body || {};
  if (!type) return res.status(400).json({ error: 'type required' });
  const r = await query(
    `INSERT INTO approval_requests (type, entity_type, entity_id, payload, reason, requested_by, requested_by_email)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [type, entity_type || null, entity_id || null, payload || {}, reason || null, req.user.id, req.user.email]
  );
  await writeAuditLog({
    actor_id: req.user.id, actor_email: req.user.email, action: 'approval_request',
    entity_type: 'approval_requests', entity_id: r.rows[0].id, severity: 'info', changes: { type, reason },
  });
  res.json(r.rows[0]);
});

router.post('/approvals/:id/decision', authenticate, requireRole('admin', 'super_admin'), async (req, res) => {
  const { decision, note } = req.body || {};
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'decision must be approved or rejected' });
  const r = await query(
    `UPDATE approval_requests SET status=$1, review_note=$2, reviewed_by=$3, reviewed_by_email=$4, reviewed_at=now(), updated_at=now()
     WHERE id=$5 RETURNING *`,
    [decision, note || null, req.user.id, req.user.email, req.params.id]
  );
  await writeAuditLog({
    actor_id: req.user.id, actor_email: req.user.email, action: `approval_${decision}`,
    entity_type: 'approval_requests', entity_id: req.params.id,
    severity: decision === 'rejected' ? 'warning' : 'info', changes: { note },
  });
  res.json(r.rows[0] || { ok: true });
});

// ============ AUDIT LOGS (filtered) ============
router.get('/audit-logs', authenticate, requireRole('admin', 'super_admin'), async (req, res) => {
  const { action, entity_type, severity, actor, from, to, q } = req.query;
  const params = [];
  const conds = [];
  if (action)      { params.push(action);      conds.push(`action = $${params.length}`); }
  if (entity_type) { params.push(entity_type); conds.push(`entity_type = $${params.length}`); }
  if (severity)    { params.push(severity);    conds.push(`severity = $${params.length}`); }
  if (actor)       { params.push(`%${actor}%`); conds.push(`(actor_email ILIKE $${params.length} OR actor_id::text ILIKE $${params.length})`); }
  if (from)        { params.push(from);        conds.push(`created_at >= $${params.length}`); }
  if (to)          { params.push(to);          conds.push(`created_at <= $${params.length}`); }
  if (q)           { params.push(`%${q}%`);    conds.push(`(path ILIKE $${params.length} OR entity_id ILIKE $${params.length})`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const r = await query(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT 500`, params);
  res.json({ logs: r.rows });
});

module.exports = router;
