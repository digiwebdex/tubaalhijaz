const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('./config/validateEnv')();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fs = require('fs');
const fsp = require('fs/promises');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { query } = require('./config/database');
const { authenticate, requireRole, optionalAuth } = require('./middleware/auth');
const { auditMiddleware } = require('./middleware/audit');
const requestLogger = require('./middleware/requestLogger');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;
const startedAt = Date.now();

// Trust reverse proxy (Nginx) for accurate client IPs in rate-limit + audit logs.
app.set('trust proxy', 1);

// Security headers — disable CSP because the SPA injects inline runtime config.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global API throttle (generous default for normal app usage)
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
}));

// Stricter brute-force protection on authentication endpoints
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
}));
app.use('/api/auth/otp', rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests. Please wait a few minutes.' },
}));

// Lightweight liveness/health endpoints (no auth, no rate-limit-relevant)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
  });
});

app.get('/api/health/ready', async (_req, res) => {
  const checks = { database: 'unknown', uploads: 'unknown' };
  let httpStatus = 200;
  try {
    const dbStart = Date.now();
    await query('SELECT 1');
    checks.database = `ok (${Date.now() - dbStart}ms)`;
  } catch (err) {
    checks.database = `fail: ${err.message}`;
    httpStatus = 503;
  }
  try {
    await fsp.access(path.join(__dirname, 'uploads'));
    checks.uploads = 'ok';
  } catch {
    checks.uploads = 'missing';
  }
  res.status(httpStatus).json({
    status: httpStatus === 200 ? 'ready' : 'degraded',
    uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
    checks,
    timestamp: new Date().toISOString(),
  });
});

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const toLocalPhone = (value = '') => {
  const digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('880') && digits.length >= 12) return `0${digits.slice(2)}`;
  if (digits.startsWith('0')) return digits;
  if (digits.startsWith('1') && digits.length === 10) return `0${digits}`;
  return digits;
};

const toSmsPhone = (value = '') => {
  const digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('880')) return digits;

  const local = toLocalPhone(value);
  if (local.startsWith('0')) return `88${local}`;

  return digits.startsWith('88') ? digits : `88${digits}`;
};

const isSmsAccepted = (responseText = '') => {
  const rawText = String(responseText).trim();
  if (!rawText) return false;

  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === 'object') {
      const responseCode = Number(parsed.response_code ?? parsed.status_code ?? parsed.code);
      const successMessage = String(parsed.success_message ?? parsed.message ?? '').trim().toLowerCase();
      const errorMessage = String(parsed.error_message ?? '').trim().toLowerCase();
      const errorField = String(parsed.error ?? '').trim().toLowerCase();

      if ([200, 202].includes(responseCode)) return true;
      if (responseCode >= 200 && responseCode < 300) return true;
      // Only reject if there's a meaningful error message (not empty, not "no error")
      if (errorMessage && errorMessage !== 'no error' && errorMessage !== 'none' && errorMessage !== 'null') return false;
      if (errorField && errorField !== 'no error' && errorField !== 'none' && errorField !== 'null') return false;
      if (/(submitted successfully|sent successfully|accepted|queued|success)/i.test(successMessage)) return true;
      // If we got a parseable JSON with no clear error, assume success
      if (!errorMessage && !errorField && responseCode === 0) return true;
    }
  } catch (_error) {
    // Non-JSON response; fall back to text pattern checks.
  }

  const text = rawText.toLowerCase();
  if (/(submitted successfully|sent successfully|accepted|queued|success)/i.test(text)) return true;

  return !/(invalid|failed|error|unauthorized|denied|rejected|insufficient|balance)/i.test(text);
};

// =============================================
// AUTH ROUTES
// =============================================
// Audit logging middleware (logs all admin write operations)
app.use('/api', auditMiddleware);

app.use('/api/auth', authRoutes);

// RBAC + sessions + approvals + filtered audit logs
app.use('/api/rbac', require('./routes/rbac'));
app.use('/api/queues', require('./routes/queues'));

// =============================================
// GENERIC CRUD HELPER
// =============================================
const createCrudRoutes = (tableName, options = {}) => {
  const router = express.Router();
  // Use id DESC as safe default because some tables (site_content/company_settings/financial_summary/user_roles)
  // do not have created_at.
  const { readAuth = true, writeAuth = true, adminOnly = false, selectFields = '*', orderBy = 'id DESC', afterCreate = null, afterUpdate = null } = options;

  // List
  router.get('/', readAuth ? authenticate : optionalAuth, async (req, res) => {
    try {
      const { limit = 1000, offset = 0, ...filters } = req.query;
      let sql = `SELECT ${selectFields} FROM ${tableName}`;
      const params = [];
      const conditions = [];

      const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
      Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === '') return;

        const opMatch = key.match(/^(.+?)_(not_is|neq|gt|gte|lt|lte|ilike|in|is)$/);
        const column = opMatch ? opMatch[1] : key;
        const operator = opMatch ? opMatch[2] : 'eq';
        if (!validColumn(column)) return;

        if (operator === 'is') {
          if (String(value).toLowerCase() === 'null') conditions.push(`${column} IS NULL`);
          else {
            params.push(value);
            conditions.push(`${column} = $${params.length}`);
          }
          return;
        }

        if (operator === 'not_is') {
          if (String(value).toLowerCase() === 'null') conditions.push(`${column} IS NOT NULL`);
          else {
            params.push(value);
            conditions.push(`${column} <> $${params.length}`);
          }
          return;
        }

        if (operator === 'in') {
          const arr = String(value).split(',').filter(Boolean);
          if (!arr.length) return;
          params.push(arr);
          conditions.push(`${column} = ANY($${params.length})`);
          return;
        }

        const sqlOp = {
          eq: '=',
          neq: '<>',
          gt: '>',
          gte: '>=',
          lt: '<',
          lte: '<=',
          ilike: 'ILIKE',
        }[operator] || '=';

        params.push(operator === 'ilike' ? `%${String(value).replace(/%/g, '')}%` : value);
        conditions.push(`${column} ${sqlOp} $${params.length}`);
      });

      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ` ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(Number(limit) || 1000, Number(offset) || 0);

      const result = await query(sql, params);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get by ID
  router.get('/:id', readAuth ? authenticate : optionalAuth, async (req, res) => {
    try {
      const result = await query(`SELECT ${selectFields} FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Serialize arrays/plain objects to JSON strings so Postgres receives valid JSON for jsonb columns.
  const serializeJsonValues = (value) => {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
      return JSON.stringify(value);
    }
    return value;
  };

  // Create (supports single object or array of objects)
  router.post('/', writeAuth ? authenticate : optionalAuth, adminOnly ? requireRole('admin') : (req, res, next) => next(), async (req, res) => {
    try {
      const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
      const quote = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;
      const rows = Array.isArray(req.body) ? req.body : [req.body];
      const results = [];

      for (const rawRow of rows) {
        if (!rawRow || typeof rawRow !== 'object' || Array.isArray(rawRow)) {
          return res.status(400).json({ error: 'Invalid payload format for insert' });
        }

        const entries = Object.entries(rawRow).filter(([key, value]) => validColumn(key) && value !== undefined);
        if (!entries.length) {
          return res.status(400).json({ error: 'No valid columns provided for insert' });
        }

        const keys = entries.map(([key]) => key);
        const values = entries.map(([, value]) => serializeJsonValues(value));
        const placeholders = keys.map((_, i) => `$${i + 1}`);
        const sql = `INSERT INTO "${tableName}" (${keys.map(quote).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        console.log(`INSERT into ${tableName}:`, { sql, values, keys });
        const result = await query(sql, values);
        results.push(result.rows[0]);
        if (afterCreate) { try { await afterCreate(result.rows[0], req); } catch (e) { console.error(`afterCreate ${tableName}:`, e.message); } }
      }

      res.status(201).json(Array.isArray(req.body) ? results : results[0]);
    } catch (err) {
      console.error(`POST /${tableName} error:`, err.message, 'Body:', JSON.stringify(req.body).substring(0, 500));
      res.status(500).json({ error: err.message });
    }
  });

  // Update
  router.patch('/:id', writeAuth ? authenticate : optionalAuth, adminOnly ? requireRole('admin') : (req, res, next) => next(), async (req, res) => {
    try {
      const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
      const quote = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;
      const entries = Object.entries(req.body || {}).filter(([key, value]) => validColumn(key) && value !== undefined);

      if (!entries.length) {
        return res.status(400).json({ error: 'No valid columns provided for update' });
      }

      const keys = entries.map(([key]) => key);
      const values = entries.map(([, value]) => serializeJsonValues(value));
      const sets = keys.map((key, i) => `${quote(key)} = $${i + 1}`);
      values.push(req.params.id);

      const result = await query(
        `UPDATE ${tableName} SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      if (afterUpdate) { try { await afterUpdate(result.rows[0], req); } catch (e) { console.error(`afterUpdate ${tableName}:`, e.message); } }
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk delete by filter (e.g. DELETE /api/payments?booking_id=xxx)
  router.delete('/', writeAuth ? authenticate : optionalAuth, adminOnly ? requireRole('admin') : (req, res, next) => next(), async (req, res) => {
    try {
      const filters = req.query;
      const keys = Object.keys(filters);
      if (!keys.length) return res.status(400).json({ error: 'Filter required for bulk delete' });
      const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
      const conditions = [];
      const params = [];
      keys.forEach((col) => {
        if (!validColumn(col)) return;
        params.push(filters[col]);
        conditions.push(`${col} = $${params.length}`);
      });
      if (!conditions.length) return res.status(400).json({ error: 'Valid filter required' });
      const result = await query(`DELETE FROM ${tableName} WHERE ${conditions.join(' AND ')} RETURNING id`, params);
      res.json({ message: 'Deleted', count: result.rowCount });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete by ID
  router.delete('/:id', writeAuth ? authenticate : optionalAuth, adminOnly ? requireRole('admin') : (req, res, next) => next(), async (req, res) => {
    try {
      const result = await query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING id`, [req.params.id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

// =============================================
// ENTITY ROUTES
// =============================================

// Public routes (no auth)
app.get('/api/public/payment-methods', async (_req, res) => {
  try {
    const result = await query(`
      SELECT setting_value
      FROM company_settings
      WHERE setting_key = 'payment_methods'
      LIMIT 1
    `);

    if (!result.rows[0]?.setting_value) {
      return res.json([]);
    }

    let methods = result.rows[0].setting_value;
    if (typeof methods === 'string') {
      try {
        methods = JSON.parse(methods);
      } catch {
        methods = [];
      }
    }

    if (!Array.isArray(methods)) {
      return res.json([]);
    }

    const safeMethods = methods
      .filter((method) => method && method.enabled)
      .map((method) => ({
        id: method.id,
        name: method.name,
        name_bn: method.name_bn,
        icon: method.icon,
        category: method.category,
        enabled: Boolean(method.enabled),
        account_name: method.account_name || '',
        account_number: method.account_number || '',
        instructions: method.instructions || '',
        instructions_bn: method.instructions_bn || '',
        charge_percent: Number(method.charge_percent || 0),
        min_amount: Number(method.min_amount || 0),
        max_amount: Number(method.max_amount || 0),
        is_sandbox: Boolean(method.is_sandbox),
      }));

    return res.json(safeMethods);
  } catch (err) {
    console.error('GET /api/public/payment-methods error:', err.message);
    return res.status(500).json({ error: 'Failed to load payment methods' });
  }
});

// Public: Track booking by tracking_id or phone
app.post('/api/track-booking', async (req, res) => {
  try {
    const { tracking_id, phone } = req.body;
    if (!tracking_id && !phone) return res.status(400).json({ error: 'tracking_id or phone is required' });

    let booking = null;

    if (phone) {
      const cleanPhone = phone.trim();
      if (!/^[\+]?[0-9\s\-]{7,15}$/.test(cleanPhone)) return res.status(400).json({ error: 'Invalid phone format' });
      const result = await query(
        `SELECT b.tracking_id, b.status, b.guest_name, b.num_travelers, b.due_amount, b.notes, b.created_at,
                p.name as package_name, p.type as package_type
         FROM bookings b LEFT JOIN packages p ON b.package_id = p.id
         WHERE b.guest_phone = $1 ORDER BY b.created_at DESC LIMIT 1`, [cleanPhone]
      );
      if (result.rows[0]) booking = result.rows[0];
    } else {
      const id = tracking_id.toUpperCase();
      if (!/^[A-Z0-9\-]+$/i.test(id) || id.length > 20) return res.status(400).json({ error: 'Invalid tracking ID format' });
      const result = await query(
        `SELECT b.tracking_id, b.status, b.guest_name, b.num_travelers, b.due_amount, b.notes, b.created_at,
                p.name as package_name, p.type as package_type
         FROM bookings b LEFT JOIN packages p ON b.package_id = p.id
         WHERE b.tracking_id = $1 LIMIT 1`, [id]
      );
      if (result.rows[0]) booking = result.rows[0];
    }

    if (!booking) return res.json({ booking: null });

    // Return safe fields only
    res.json({
      booking: {
        tracking_id: booking.tracking_id,
        status: booking.status,
        guest_name: booking.guest_name,
        num_travelers: booking.num_travelers,
        due_amount: booking.due_amount,
        notes: booking.notes,
        created_at: booking.created_at,
        packages: { name: booking.package_name, type: booking.package_type },
      }
    });
  } catch (err) {
    console.error('POST /api/track-booking error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('/api/packages', createCrudRoutes('packages', { readAuth: false, writeAuth: true, adminOnly: true }));
app.use('/api/hotels', createCrudRoutes('hotels', { readAuth: false, writeAuth: true, adminOnly: true }));
app.use('/api/hotel-rooms', createCrudRoutes('hotel_rooms', { readAuth: false, writeAuth: true, adminOnly: true }));
app.use('/api/site-content', createCrudRoutes('site_content', { readAuth: false, writeAuth: true, adminOnly: true }));
app.use('/api/blog-posts', createCrudRoutes('blog_posts', { readAuth: false, writeAuth: true, adminOnly: true }));
app.use('/api/installment-plans', createCrudRoutes('installment_plans', { readAuth: false, writeAuth: true, adminOnly: true }));

// Auth required routes
// Custom bookings GET with JOINs (must be before generic CRUD)
app.get('/api/bookings', authenticate, async (req, res) => {
  try {
    const { limit = 1000, offset = 0, ...filters } = req.query;
    let conditions = [];
    let params = [];
    const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === '') return;
      const opMatch = key.match(/^(.+?)_(not_is|neq|gt|gte|lt|lte|ilike|in|is)$/);
      const column = opMatch ? opMatch[1] : key;
      const operator = opMatch ? opMatch[2] : 'eq';
      if (!validColumn(column)) return;
      
      const prefixedCol = `b.${column}`;
      if (operator === 'is') {
        if (String(value).toLowerCase() === 'null') conditions.push(`${prefixedCol} IS NULL`);
        else { params.push(value); conditions.push(`${prefixedCol} = $${params.length}`); }
        return;
      }
      if (operator === 'not_is') {
        if (String(value).toLowerCase() === 'null') conditions.push(`${prefixedCol} IS NOT NULL`);
        else { params.push(value); conditions.push(`${prefixedCol} <> $${params.length}`); }
        return;
      }
      if (operator === 'in') {
        const arr = String(value).split(',').filter(Boolean);
        if (!arr.length) return;
        params.push(arr);
        conditions.push(`${prefixedCol} = ANY($${params.length})`);
        return;
      }
      const sqlOp = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', ilike: 'ILIKE' }[operator] || '=';
      params.push(operator === 'ilike' ? `%${String(value).replace(/%/g, '')}%` : value);
      conditions.push(`${prefixedCol} ${sqlOp} $${params.length}`);
    });

    let sql = `SELECT b.*, 
      json_build_object('name', p.name, 'type', p.type, 'duration_days', p.duration_days, 'price', p.price, 'start_date', p.start_date) as packages,
      CASE WHEN m.id IS NOT NULL THEN json_build_object('name', m.name, 'phone', m.phone) ELSE NULL END as moallems
      FROM bookings b
      LEFT JOIN packages p ON b.package_id = p.id
      LEFT JOIN moallems m ON b.moallem_id = m.id`;
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit) || 1000, Number(offset) || 0);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/bookings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
const triggers = require('./services/messagingTriggers');
app.use('/api/bookings', createCrudRoutes('bookings', {
  adminOnly: true,
  afterCreate: triggers.onBookingCreated,
  afterUpdate: triggers.onBookingUpdated,
}));
app.use('/api/payments', createCrudRoutes('payments', {
  adminOnly: true,
  afterCreate: triggers.onPaymentCreated,
}));
app.use('/api/expenses', createCrudRoutes('expenses', { adminOnly: true }));
app.use('/api/transactions', createCrudRoutes('transactions', { adminOnly: true }));
app.use('/api/profiles', createCrudRoutes('profiles', { adminOnly: true }));
app.use('/api/accounts', createCrudRoutes('accounts', { adminOnly: true }));
app.use('/api/moallems', createCrudRoutes('moallems', { adminOnly: true }));
// Custom moallem_payments GET with JOINs
app.get('/api/moallem-payments', authenticate, async (req, res) => {
  try {
    const { limit = 1000, offset = 0, ...filters } = req.query;
    let conditions = [];
    let params = [];
    const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === '') return;
      const opMatch = key.match(/^(.+?)_(not_is|neq|gt|gte|lt|lte|ilike|in|is)$/);
      const column = opMatch ? opMatch[1] : key;
      const operator = opMatch ? opMatch[2] : 'eq';
      if (!validColumn(column)) return;
      const prefixedCol = `mp.${column}`;
      if (operator === 'is') {
        if (String(value).toLowerCase() === 'null') conditions.push(`${prefixedCol} IS NULL`);
        else { params.push(value); conditions.push(`${prefixedCol} = $${params.length}`); }
        return;
      }
      if (operator === 'not_is') {
        if (String(value).toLowerCase() === 'null') conditions.push(`${prefixedCol} IS NOT NULL`);
        else { params.push(value); conditions.push(`${prefixedCol} <> $${params.length}`); }
        return;
      }
      if (operator === 'in') {
        const arr = String(value).split(',').filter(Boolean);
        if (!arr.length) return;
        params.push(arr);
        conditions.push(`${prefixedCol} = ANY($${params.length})`);
        return;
      }
      const sqlOp = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', ilike: 'ILIKE' }[operator] || '=';
      params.push(operator === 'ilike' ? `%${String(value).replace(/%/g, '')}%` : value);
      conditions.push(`${prefixedCol} ${sqlOp} $${params.length}`);
    });
    let sql = `SELECT mp.*,
      CASE WHEN m.id IS NOT NULL THEN json_build_object('name', m.name, 'phone', m.phone) ELSE NULL END as moallems,
      CASE WHEN b.id IS NOT NULL THEN json_build_object('tracking_id', b.tracking_id, 'total_amount', b.total_amount, 'paid_amount', b.paid_amount, 'due_amount', b.due_amount, 'paid_by_moallem', b.paid_by_moallem, 'moallem_due', b.moallem_due, 'guest_name', b.guest_name, 'packages', json_build_object('name', p.name, 'type', p.type)) ELSE NULL END as bookings
      FROM moallem_payments mp
      LEFT JOIN moallems m ON mp.moallem_id = m.id
      LEFT JOIN bookings b ON mp.booking_id = b.id
      LEFT JOIN packages p ON b.package_id = p.id`;
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY mp.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit) || 1000, Number(offset) || 0);
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/moallem-payments error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
app.use('/api/moallem-payments', createCrudRoutes('moallem_payments', { adminOnly: true }));
app.use('/api/moallem-commission-payments', createCrudRoutes('moallem_commission_payments', { adminOnly: true }));
app.use('/api/moallem-items', createCrudRoutes('moallem_items', { adminOnly: true }));
app.use('/api/supplier-agents', createCrudRoutes('supplier_agents', { adminOnly: true }));
// Custom supplier_agent_payments GET with JOINs
app.get('/api/supplier-agent-payments', authenticate, async (req, res) => {
  try {
    const { limit = 1000, offset = 0, ...filters } = req.query;
    let conditions = [];
    let params = [];
    const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === '') return;
      const opMatch = key.match(/^(.+?)_(not_is|neq|gt|gte|lt|lte|ilike|in|is)$/);
      const column = opMatch ? opMatch[1] : key;
      const operator = opMatch ? opMatch[2] : 'eq';
      if (!validColumn(column)) return;
      const prefixedCol = `sp.${column}`;
      if (operator === 'is') {
        if (String(value).toLowerCase() === 'null') conditions.push(`${prefixedCol} IS NULL`);
        else { params.push(value); conditions.push(`${prefixedCol} = $${params.length}`); }
        return;
      }
      if (operator === 'not_is') {
        if (String(value).toLowerCase() === 'null') conditions.push(`${prefixedCol} IS NOT NULL`);
        else { params.push(value); conditions.push(`${prefixedCol} <> $${params.length}`); }
        return;
      }
      if (operator === 'in') {
        const arr = String(value).split(',').filter(Boolean);
        if (!arr.length) return;
        params.push(arr);
        conditions.push(`${prefixedCol} = ANY($${params.length})`);
        return;
      }
      const sqlOp = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', ilike: 'ILIKE' }[operator] || '=';
      params.push(operator === 'ilike' ? `%${String(value).replace(/%/g, '')}%` : value);
      conditions.push(`${prefixedCol} ${sqlOp} $${params.length}`);
    });
    let sql = `SELECT sp.*,
      CASE WHEN sa.id IS NOT NULL THEN json_build_object('agent_name', sa.agent_name, 'company_name', sa.company_name) ELSE NULL END as supplier_agents,
      CASE WHEN b.id IS NOT NULL THEN json_build_object('tracking_id', b.tracking_id, 'total_amount', b.total_amount, 'total_cost', b.total_cost, 'paid_to_supplier', b.paid_to_supplier, 'supplier_due', b.supplier_due, 'guest_name', b.guest_name, 'packages', json_build_object('name', p.name, 'type', p.type)) ELSE NULL END as bookings
      FROM supplier_agent_payments sp
      LEFT JOIN supplier_agents sa ON sp.supplier_agent_id = sa.id
      LEFT JOIN bookings b ON sp.booking_id = b.id
      LEFT JOIN packages p ON b.package_id = p.id`;
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY sp.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit) || 1000, Number(offset) || 0);
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/supplier-agent-payments error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
app.use('/api/supplier-agent-payments', createCrudRoutes('supplier_agent_payments', { adminOnly: true }));
app.use('/api/supplier-agent-items', createCrudRoutes('supplier_agent_items', { adminOnly: true }));
app.use('/api/supplier-contracts', createCrudRoutes('supplier_contracts', { adminOnly: true }));
app.use('/api/supplier-contract-payments', createCrudRoutes('supplier_contract_payments', { adminOnly: true }));
app.use('/api/booking-members', createCrudRoutes('booking_members', { adminOnly: true }));
app.use('/api/booking-documents', createCrudRoutes('booking_documents', { readAuth: true, writeAuth: false }));
app.use('/api/hotel-bookings', createCrudRoutes('hotel_bookings'));
app.use('/api/notification-logs', createCrudRoutes('notification_logs', { adminOnly: true }));
app.use('/api/notification-settings', createCrudRoutes('notification_settings', { adminOnly: true, orderBy: 'event_key ASC' }));
app.use('/api/company-settings', createCrudRoutes('company_settings', { adminOnly: true }));
app.use('/api/cms-versions', createCrudRoutes('cms_versions', { adminOnly: true }));
// SECURITY: Block admin role assignment via API (must be BEFORE CRUD routes)
app.use('/api/user-roles', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PATCH') {
    const role = req.body?.role;
    if (role === 'admin') {
      return res.status(403).json({ error: 'Cannot assign admin role. Admin role is permanently locked.' });
    }
  }
  next();
});
app.use('/api/user-roles', createCrudRoutes('user_roles', { adminOnly: true }));

// (admin role protection middleware moved before route registration)

app.use('/api/financial-summary', createCrudRoutes('financial_summary', { adminOnly: true }));
app.use('/api/daily-cashbook', createCrudRoutes('daily_cashbook', { adminOnly: true }));
app.use('/api/refunds', createCrudRoutes('refunds', { adminOnly: true }));
app.use('/api/cancellation-policies', createCrudRoutes('cancellation_policies', { readAuth: false, writeAuth: true, adminOnly: true }));
app.use('/api/audit-logs', createCrudRoutes('audit_logs', { adminOnly: true, orderBy: 'created_at DESC' }));

// Phase 6: Messaging Engine (notifications + WhatsApp/SMS/Email queue)
app.use('/api/message-templates', createCrudRoutes('message_templates', { adminOnly: true, orderBy: 'event_key ASC' }));
app.use('/api/message-queue', createCrudRoutes('message_queue', { adminOnly: true, orderBy: 'created_at DESC' }));
app.use('/api/message-logs', createCrudRoutes('message_logs', { adminOnly: true, orderBy: 'created_at DESC' }));
app.use('/api', require('./routes/messaging'));
require('./services/messageDispatcher').start();

// Phase 6 Slice B: QR / Public verification + scan logging
app.use('/api/qr-verifications', createCrudRoutes('qr_verifications', { adminOnly: true, orderBy: 'created_at DESC' }));
app.use('/api/document-reviews', require('./routes/documentReviews'));
app.use('/api/public-tracking-logs', createCrudRoutes('public_tracking_logs', { adminOnly: true, orderBy: 'scanned_at DESC' }));
app.use('/api/verify', require('./routes/verify'));
app.use('/api/ops', require('./routes/ops'));

// ==============================================
// BACKUP / RESTORE ROUTES
// =============================================
const BACKUP_TABLES = [
  'profiles', 'bookings', 'booking_members', 'booking_documents',
  'payments', 'packages', 'installment_plans',
  'hotels', 'hotel_rooms', 'hotel_bookings',
  'moallems', 'moallem_payments', 'moallem_commission_payments', 'moallem_items',
  'supplier_agents', 'supplier_agent_payments', 'supplier_agent_items',
  'supplier_contracts', 'supplier_contract_payments',
  'expenses', 'transactions', 'accounts', 'financial_summary',
  'notification_logs', 'notification_settings',
  'user_roles', 'site_content', 'company_settings',
  'blog_posts', 'cms_versions', 'daily_cashbook',
  'cancellation_policies', 'refunds',
];

const RESTORE_ORDER = [
  'accounts', 'packages', 'installment_plans', 'hotels', 'hotel_rooms',
  'moallems', 'supplier_agents', 'supplier_contracts',
  'profiles', 'site_content', 'company_settings', 'blog_posts', 'notification_settings',
  'bookings', 'hotel_bookings', 'booking_members', 'booking_documents',
  'payments', 'expenses', 'transactions',
  'moallem_items', 'supplier_agent_items',
  'moallem_payments', 'moallem_commission_payments', 'supplier_agent_payments', 'supplier_contract_payments',
  'notification_logs', 'cms_versions', 'user_roles', 'financial_summary', 'daily_cashbook',
];

const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

// List backups
app.get('/api/backup/list', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await fsp.mkdir(backupsDir, { recursive: true });
    const entries = await fsp.readdir(backupsDir, { withFileTypes: true });
    const files = await Promise.all(
      entries.filter(e => e.isFile() && e.name.endsWith('.json')).map(async e => {
        const stat = await fsp.stat(path.join(backupsDir, e.name));
        return { name: e.name, created_at: stat.birthtime.toISOString(), size: stat.size };
      })
    );
    res.json(files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create backup
app.post('/api/backup/create', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const backupData = {};
    const stats = [];
    for (const table of BACKUP_TABLES) {
      try {
        const result = await query(`SELECT * FROM ${table}`);
        backupData[table] = result.rows;
        stats.push({ name: table, rows: result.rows.length });
      } catch (e) {
        stats.push({ name: table, rows: -1, error: e.message });
      }
    }
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${timestamp}.json`;
    const jsonStr = JSON.stringify({ created_at: now.toISOString(), tables: backupData, stats }, null, 2);
    await fsp.writeFile(path.join(backupsDir, fileName), jsonStr);
    res.json({ success: true, fileName, tables: stats.length, size: jsonStr.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore backup
app.post('/api/backup/restore', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { fileName, mode } = req.body;
    if (!fileName) return res.status(400).json({ error: 'fileName required' });

    const restoreMode = mode === 'full' ? 'full' : 'merge';
    const filePath = path.join(backupsDir, path.basename(fileName));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Backup not found' });

    const raw = await fsp.readFile(filePath, 'utf-8');
    const backup = JSON.parse(raw);
    const backupTables = Object.keys(backup.tables || {}).filter((table) => BACKUP_TABLES.includes(table));
    const orderedTables = [
      ...RESTORE_ORDER.filter((table) => backupTables.includes(table)),
      ...backupTables.filter((table) => !RESTORE_ORDER.includes(table)),
    ];

    if (orderedTables.length === 0) {
      return res.status(400).json({ error: 'No valid tables found in backup file' });
    }

    const results = [];
    const quote = (id) => `"${String(id).replace(/"/g, '""')}"`;

    if (restoreMode === 'full') {
      for (const table of [...orderedTables].reverse()) {
        try {
          await query(`DELETE FROM ${quote(table)}`);
        } catch (e) {
          results.push({ table, status: 'delete_error', error: e.message });
        }
      }
    }

    for (const table of orderedTables) {
      const rows = backup.tables?.[table];
      if (!Array.isArray(rows) || rows.length === 0) {
        results.push({ table, status: 'skipped', reason: 'empty' });
        continue;
      }

      try {
        const keys = Object.keys(rows[0]);
        if (!keys.length) {
          results.push({ table, status: 'skipped', reason: 'no_columns' });
          continue;
        }

        const updateCols = keys.filter((k) => k !== 'id');
        for (const row of rows) {
          const values = keys.map((k) => row[k]);
          const placeholders = keys.map((_, i) => `$${i + 1}`);

          const sql = `
            INSERT INTO ${quote(table)} (${keys.map(quote).join(', ')})
            VALUES (${placeholders.join(', ')})
            ON CONFLICT (id) DO ${updateCols.length
              ? `UPDATE SET ${updateCols.map((k) => `${quote(k)} = EXCLUDED.${quote(k)}`).join(', ')}`
              : 'NOTHING'}
          `;

          await query(sql, values);
        }

        results.push({ table, status: 'restored', rows: rows.length });
      } catch (e) {
        results.push({ table, status: 'error', error: e.message });
      }
    }

    const restored = results.filter((r) => r.status === 'restored').length;
    res.json({ success: true, restored, mode: restoreMode, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download backup
app.get('/api/backup/download', authenticate, requireRole('admin'), (req, res) => {
  const file = path.basename(req.query.file || '');
  const filePath = path.join(backupsDir, file);
  if (!file || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  res.download(filePath, file);
});

// Delete backup
app.post('/api/backup/delete', authenticate, requireRole('admin'), async (req, res) => {
  const file = path.basename(req.body?.fileName || '');
  const filePath = path.join(backupsDir, file);
  if (!file || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  await fsp.unlink(filePath);
  res.json({ message: 'Deleted' });
});

// =============================================
// SPECIAL ROUTES
// =============================================

// Bookings with joins (nested join (legacy comment))
app.get('/api/bookings-full', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT b.*, p.name as package_name, p.type as package_type, p.duration_days, p.price as package_price,
             m.name as moallem_name, m.phone as moallem_phone
      FROM bookings b
      LEFT JOIN packages p ON b.package_id = p.id
      LEFT JOIN moallems m ON b.moallem_id = m.id
      ORDER BY b.created_at DESC
    `);
    // Format nested join structure
    const bookings = result.rows.map(row => ({
      ...row,
      packages: { name: row.package_name, type: row.package_type, duration_days: row.duration_days, price: row.package_price },
      moallems: row.moallem_name ? { name: row.moallem_name, phone: row.moallem_phone } : null,
    }));
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Views
app.get('/api/views/booking-profit', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM v_booking_profit ORDER BY tracking_id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/views/customer-profit', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM v_customer_profit');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/views/package-profit', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM v_package_profit');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Track booking (public)
app.get('/api/track/:trackingId', async (req, res) => {
  try {
    const result = await query(`
      SELECT b.id, b.tracking_id, b.status, b.total_amount, b.paid_amount, b.due_amount,
             b.num_travelers, b.guest_name, b.created_at,
             p.name as package_name, p.type as package_type, p.duration_days
      FROM bookings b LEFT JOIN packages p ON b.package_id = p.id
      WHERE b.tracking_id = $1
    `, [req.params.trackingId.toUpperCase()]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });

    const payments = await query(
      'SELECT amount, status, due_date, paid_at, installment_number FROM payments WHERE booking_id = $1 ORDER BY installment_number',
      [result.rows[0].id]
    );
    res.json({ booking: result.rows[0], payments: payments.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// File + Storage helpers
const sanitizeStoragePath = (input = '') =>
  String(input)
    .replace(/\\/g, '/')
    .split('/')
    .filter((p) => p && p !== '.' && p !== '..')
    .join('/');

const uploadsRoot = path.join(__dirname, 'uploads');

// File upload
app.post('/api/upload', optionalAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const bucket = sanitizeStoragePath(req.body?.bucket || 'misc');
    const requestedPath = sanitizeStoragePath(req.body?.path || req.file.originalname);
    const finalRelative = path.join(bucket, requestedPath).replace(/\\/g, '/');
    const finalAbsolute = path.join(uploadsRoot, finalRelative);

    await fsp.mkdir(path.dirname(finalAbsolute), { recursive: true });
    await fsp.rename(req.file.path, finalAbsolute);

    res.json({
      file_path: `/uploads/${finalRelative}`,
      file_name: req.file.originalname,
      file_size: req.file.size,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Storage list
app.get('/api/storage/:bucket/list', authenticate, async (req, res) => {
  try {
    const bucket = sanitizeStoragePath(req.params.bucket);
    const prefix = sanitizeStoragePath(req.query.prefix || '');
    const dirPath = path.join(uploadsRoot, bucket, prefix);
    await fsp.mkdir(dirPath, { recursive: true });
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });

    const files = await Promise.all(
      entries
        .filter((e) => e.isFile())
        .map(async (e) => {
          const full = path.join(dirPath, e.name);
          const stat = await fsp.stat(full);
          return {
            name: e.name,
            id: `${bucket}/${prefix}/${e.name}`.replace(/\/+/g, '/'),
            created_at: stat.birthtime.toISOString(),
            updated_at: stat.mtime.toISOString(),
            metadata: { size: stat.size },
          };
        })
    );

    res.json(files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Storage download
app.get('/api/storage/:bucket/download', authenticate, async (req, res) => {
  try {
    const bucket = sanitizeStoragePath(req.params.bucket);
    const filePath = sanitizeStoragePath(req.query.path || '');
    if (!filePath) return res.status(400).json({ error: 'File path required' });

    const absolutePath = path.join(uploadsRoot, bucket, filePath);
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ error: 'File not found' });

    res.download(absolutePath, path.basename(filePath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Storage delete
app.delete('/api/storage/:bucket', authenticate, async (req, res) => {
  try {
    const bucket = sanitizeStoragePath(req.params.bucket);
    const paths = Array.isArray(req.body?.paths) ? req.body.paths : [];

    for (const p of paths) {
      const safe = sanitizeStoragePath(p);
      if (!safe) continue;
      const absolutePath = path.join(uploadsRoot, bucket, safe);
      if (fs.existsSync(absolutePath)) await fsp.unlink(absolutePath);
    }

    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// =============================================
// CREATE GUEST BOOKING (public)
// =============================================
app.post('/api/create-guest-booking', async (req, res) => {
  try {
    const body = req.body;
    // Support both camelCase (frontend) and snake_case field names
    const guest_name = body.guest_name || body.fullName;
    const guest_phone = body.guest_phone || body.phone;
    const guest_email = body.guest_email || body.email;
    const guest_address = body.guest_address || body.address;
    const guest_passport = body.guest_passport || body.passportNumber;
    const package_id = body.package_id || body.packageId;
    const num_travelers = body.num_travelers || body.numTravelers;
    const installment_plan_id = body.installment_plan_id || body.installmentPlanId;
    const notes = body.notes;
    const payment_method = body.payment_method || body.paymentMethod;
    if (!guest_name || !guest_phone || !package_id) {
      return res.status(400).json({ error: 'guest_name, guest_phone, and package_id are required' });
    }

    // Fetch active package
    const pkgResult = await query('SELECT * FROM packages WHERE id = $1 AND is_active = true', [package_id]);
    if (!pkgResult.rows[0]) return res.status(404).json({ error: 'Package not found or inactive' });
    const pkg = pkgResult.rows[0];

    const travelers = Math.max(1, Number(num_travelers) || 1);
    const sellingPricePerPerson = Number(pkg.price) || 0;
    const totalAmount = sellingPricePerPerson * travelers;

    // Insert booking with full financial fields
    const bookingResult = await query(
      `INSERT INTO bookings (package_id, total_amount, due_amount, num_travelers, guest_name, guest_phone, guest_email, guest_address, guest_passport, notes, status, booking_type, selling_price_per_person, paid_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', 'individual', $11, 0)
       RETURNING *`,
      [package_id, totalAmount, totalAmount, travelers, guest_name, guest_phone, guest_email || null, guest_address || null, guest_passport || null, notes ? `${notes}${payment_method ? ` | Payment Method: ${payment_method}` : ''}` : (payment_method ? `Payment Method: ${payment_method}` : null), sellingPricePerPerson]
    );

    const booking = bookingResult.rows[0];

    // Generate installment schedule if plan selected
    if (installment_plan_id) {
      const planResult = await query('SELECT * FROM installment_plans WHERE id = $1 AND is_active = true', [installment_plan_id]);
      if (planResult.rows[0]) {
        const plan = planResult.rows[0];
        const installmentAmount = Math.ceil(totalAmount / plan.num_installments);
        for (let i = 1; i <= plan.num_installments; i++) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + i);
          await query(
            `INSERT INTO payments (booking_id, user_id, amount, installment_number, due_date, status)
             VALUES ($1, $2, $3, $4, $5, 'pending')`,
            [booking.id, booking.user_id || '00000000-0000-0000-0000-000000000000', i === plan.num_installments ? totalAmount - installmentAmount * (plan.num_installments - 1) : installmentAmount, i, dueDate.toISOString()]
          );
        }
      }
    }

    // Send email notification if Resend is configured
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY && guest_email) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.NOTIFICATION_FROM_EMAIL || 'TRIP TASTIC <noreply@triptastic.com.bd>',
            to: [guest_email],
            subject: `Booking Confirmed - ${booking.tracking_id}`,
            html: `<h2>Your Booking is Confirmed!</h2><p>Tracking ID: <strong>${booking.tracking_id}</strong></p><p>Package: ${pkg.name}</p><p>Total: ৳${totalAmount.toLocaleString()}</p><p>Thank you for choosing TRIP TASTIC.</p>`,
          }),
        });
      } catch (emailErr) {
        console.error('Booking email notification failed:', emailErr.message);
      }
    }

    res.status(201).json({ success: true, booking_id: booking.id, tracking_id: booking.tracking_id });
  } catch (err) {
    console.error('POST /api/create-guest-booking error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// VERIFY INVOICE (public)
// =============================================
app.post('/api/verify-invoice', async (req, res) => {
  try {
    const { tracking_id } = req.body;
    if (!tracking_id || typeof tracking_id !== 'string') {
      return res.status(400).json({ error: 'tracking_id is required' });
    }

    const result = await query(
      `SELECT b.tracking_id, b.total_amount, b.paid_amount, b.due_amount, b.status, b.created_at, b.num_travelers, b.guest_name,
              json_build_object('name', p.name, 'type', p.type) as packages
       FROM bookings b LEFT JOIN packages p ON b.package_id = p.id
       WHERE b.tracking_id = $1 LIMIT 1`,
      [tracking_id.toUpperCase()]
    );

    if (!result.rows[0]) return res.json({ booking: null });

    const data = result.rows[0];
    res.json({
      booking: {
        tracking_id: data.tracking_id,
        total_amount: data.total_amount,
        paid_amount: data.paid_amount,
        due_amount: data.due_amount,
        status: data.status,
        created_at: data.created_at,
        num_travelers: data.num_travelers,
        guest_name: data.guest_name,
        packages: data.packages,
      }
    });
  } catch (err) {
    console.error('POST /api/verify-invoice error:', err.message);
    res.status(400).json({ error: 'Invalid request' });
  }
});

// =============================================
// SEND NOTIFICATION (admin only)
// =============================================
app.post('/api/send-notification', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { type, channels, user_id, booking_id, custom_subject, custom_message, sms_message } = req.body;
    if (!type || !channels || !user_id) {
      return res.status(400).json({ error: 'type, channels, and user_id are required' });
    }

    // Fetch user profile
    const profileResult = await query('SELECT * FROM profiles WHERE user_id = $1', [user_id]);
    const profile = profileResult.rows[0];
    if (!profile) return res.status(404).json({ error: 'User profile not found' });

    // Fetch booking if provided
    let booking = null;
    if (booking_id) {
      const bResult = await query(
        `SELECT b.*, p.name as package_name, p.type as package_type FROM bookings b LEFT JOIN packages p ON b.package_id = p.id WHERE b.id = $1`,
        [booking_id]
      );
      booking = bResult.rows[0];
    }

    const results = [];
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    // Send email
    if (channels.includes('email') && profile.email && RESEND_API_KEY) {
      try {
        const subject = custom_subject || `Notification: ${type}`;
        const html = custom_message || `<p>Booking ${booking?.tracking_id || ''} - Status: ${booking?.status || 'N/A'}</p>`;
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.NOTIFICATION_FROM_EMAIL || 'TRIP TASTIC <noreply@triptastic.com.bd>',
            to: [profile.email],
            subject,
            html,
          }),
        });
        const status = emailRes.ok ? 'sent' : 'failed';
        results.push({ channel: 'email', status });

        await query(
          `INSERT INTO notification_logs (user_id, booking_id, event_type, channel, recipient, subject, message, status)
           VALUES ($1, $2, $3, 'email', $4, $5, $6, $7)`,
          [user_id, booking_id || null, type, profile.email, subject, html, status]
        );
      } catch (e) {
        results.push({ channel: 'email', status: 'failed', error: e.message });
      }
    }

    // Send SMS
    if (channels.includes('sms') && profile.phone) {
      const BULKSMS_API_KEY = process.env.BULKSMS_API_KEY;
      if (BULKSMS_API_KEY) {
        try {
          const smsMessage = sms_message || custom_message || `TRIP TASTIC: Booking ${booking?.tracking_id || ''} - ${type}`;
          const smsRes = await fetch(`https://bulksmsbd.net/api/smsapi?api_key=${BULKSMS_API_KEY}&type=text&number=${profile.phone}&senderid=${process.env.BULKSMS_SENDER_ID || 'TRIPTASTIC'}&message=${encodeURIComponent(smsMessage)}`);
          const status = smsRes.ok ? 'sent' : 'failed';
          results.push({ channel: 'sms', status });

          await query(
            `INSERT INTO notification_logs (user_id, booking_id, event_type, channel, recipient, message, status)
             VALUES ($1, $2, $3, 'sms', $4, $5, $6)`,
            [user_id, booking_id || null, type, profile.phone, smsMessage, status]
          );
        } catch (e) {
          results.push({ channel: 'sms', status: 'failed', error: e.message });
        }
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error('POST /api/send-notification error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// CONTACT FORM EMAIL
// =============================================
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};

app.post('/api/contact', async (req, res) => {
  try {
    const { name, phone, email, service, message } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const CONTACT_EMAIL = 'info@triptastic.com.bd';

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const safeName = escapeHtml(name);
    const safePhone = escapeHtml(phone);
    const safeEmail = escapeHtml(email);
    const safeService = escapeHtml(service);
    const safeMessage = escapeHtml(message);

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#b8860b;border-bottom:2px solid #b8860b;padding-bottom:10px;">📩 New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:15px;">
          <tr><td style="padding:8px;font-weight:bold;color:#555;width:120px;">Name:</td><td style="padding:8px;">${safeName}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;color:#555;">Phone:</td><td style="padding:8px;">${safePhone}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#555;">Email:</td><td style="padding:8px;">${safeEmail || 'Not provided'}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;color:#555;">Service:</td><td style="padding:8px;">${safeService || 'Not selected'}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#555;vertical-align:top;">Message:</td><td style="padding:8px;">${safeMessage || 'No message'}</td></tr>
        </table>
        <p style="color:#999;font-size:12px;margin-top:20px;">Sent from TRIP TASTIC website contact form</p>
      </div>
    `;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.NOTIFICATION_FROM_EMAIL || 'TRIP TASTIC <noreply@triptastic.com.bd>',
        to: [CONTACT_EMAIL],
        subject: `New Contact: ${name} - ${service || 'General Inquiry'}`,
        html: htmlBody,
        reply_to: email || undefined,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (err) {
    console.error('Contact email error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================
// SEND OTP (public)
// =============================================
app.post('/api/send-otp', async (req, res) => {
  try {
    const { phone, action, code } = req.body;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    const sanitizedPhone = toLocalPhone(phone);
    const smsNumber = toSmsPhone(phone);
    const phoneCandidates = Array.from(new Set([
      sanitizedPhone,
      smsNumber,
      String(phone).replace(/\D/g, ''),
      `+${smsNumber}`,
    ].filter(Boolean)));

    if (sanitizedPhone.length < 10 || sanitizedPhone.length > 15) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    if (action === 'send') {
      // Check if there's a profile or guest booking with this phone
      const profileCheck = await query('SELECT user_id FROM profiles WHERE phone = ANY($1::text[]) LIMIT 1', [phoneCandidates]);
      const bookingCheck = await query('SELECT id FROM bookings WHERE guest_phone = ANY($1::text[]) LIMIT 1', [phoneCandidates]);

      if (!profileCheck.rows[0] && !bookingCheck.rows[0]) {
        return res.status(404).json({ error: 'এই নম্বরে কোনো বুকিং পাওয়া যায়নি। আগে বুকিং করুন।' });
      }

      // Rate limit: max 3 OTPs per phone in last 5 minutes
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const rateCheck = await query(
        'SELECT COUNT(*) as cnt FROM otp_codes WHERE phone = $1 AND created_at >= $2',
        [sanitizedPhone, fiveMinAgo]
      );
      if (parseInt(rateCheck.rows[0]?.cnt || '0') >= 3) {
        return res.status(429).json({ error: 'অনেক বেশি OTP অনুরোধ। ৫ মিনিট অপেক্ষা করুন।' });
      }

      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Send SMS
      const smsApiKey = process.env.BULKSMSBD_API_KEY;
      const smsSenderId = process.env.BULKSMSBD_SENDER_ID || '8809617618686';
      if (!smsApiKey) {
        return res.status(500).json({ error: 'SMS service not configured' });
      }

      const message = `TRIP TASTIC OTP is ${otpCode}`;
      const smsUrl = `https://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(smsApiKey)}&type=text&number=${encodeURIComponent(smsNumber)}&senderid=${encodeURIComponent(smsSenderId)}&message=${encodeURIComponent(message)}`;
      let smsText = '';
      let smsHttpStatus = 0;
      try {
        const smsRes = await fetch(smsUrl);
        smsHttpStatus = smsRes.status;
        smsText = await smsRes.text();
      } catch (fetchErr) {
        console.error('OTP SMS fetch error:', fetchErr.message);
        return res.status(502).json({ error: 'SMS service unreachable. Please try again.' });
      }
      console.log('SMS result:', { status: smsHttpStatus, body: smsText });

      if (!isSmsAccepted(smsText)) {
        console.error('OTP SMS failed:', { smsNumber, httpStatus: smsHttpStatus, smsText });
        return res.status(502).json({ error: 'SMS delivery failed. Please check SMS configuration.' });
      }

      await query('INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)', [sanitizedPhone, otpCode, expiresAt]);

      return res.json({ success: true, message: 'OTP sent successfully' });

    } else if (action === 'verify') {
      if (!code || typeof code !== 'string' || code.length !== 6) {
        return res.status(400).json({ error: 'Invalid OTP code' });
      }

      const otpResult = await query(
        `SELECT * FROM otp_codes WHERE phone = $1 AND code = $2 AND verified = false AND expires_at >= $3 ORDER BY created_at DESC LIMIT 1`,
        [sanitizedPhone, code, new Date().toISOString()]
      );

      if (!otpResult.rows[0]) {
        return res.status(401).json({ error: 'ভুল বা মেয়াদোত্তীর্ণ OTP' });
      }

      // Mark as verified
      await query('UPDATE otp_codes SET verified = true WHERE id = $1', [otpResult.rows[0].id]);

      // Find user by phone in profiles
      const profileResult = await query('SELECT user_id FROM profiles WHERE phone = ANY($1::text[]) LIMIT 1', [phoneCandidates]);
      let userId = profileResult.rows[0]?.user_id;

      // If no profile found, auto-create from guest booking
      if (!userId) {
        const guestResult = await query(
          'SELECT id, guest_name, guest_phone, guest_email, guest_address, guest_passport FROM bookings WHERE guest_phone = ANY($1::text[]) ORDER BY created_at DESC LIMIT 1',
          [phoneCandidates]
        );

        if (!guestResult.rows[0]) {
          return res.status(404).json({ error: 'এই নম্বরে কোনো অ্যাকাউন্ট বা বুকিং পাওয়া যায়নি।' });
        }

        const guestBooking = guestResult.rows[0];

        // Native auth (no Supabase) — create user with bcrypt + issue JWTs
        const bcrypt = require('bcryptjs');
        const jwt = require('jsonwebtoken');
        const { v4: uuidv4 } = require('uuid');

        const issueTokens = (uid, email) => {
          const accessToken = jwt.sign({ userId: uid, email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
          const refreshToken = jwt.sign({ userId: uid }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
          return { accessToken, refreshToken };
        };

        const tempEmail = guestBooking.guest_email || `${sanitizedPhone.replace(/\+/g, '')}@phone.tubaalhijaz.com`;
        const tempPassword = uuidv4() + 'Aa1!';
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        try {
          const created = await query(
            'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email',
            [tempEmail.toLowerCase(), passwordHash, guestBooking.guest_name || '']
          );
          userId = created.rows[0].id;
          await query(
            'INSERT INTO profiles (user_id, full_name, phone, email, address, passport_number) VALUES ($1, $2, $3, $4, $5, $6)',
            [userId, guestBooking.guest_name || '', sanitizedPhone, tempEmail, guestBooking.guest_address || null, guestBooking.guest_passport || null]
          );
          await query('INSERT INTO user_roles (user_id, role) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, 'user']);
        } catch (e) {
          // user already exists — look up id
          const existing = await query('SELECT id FROM users WHERE email = $1', [tempEmail.toLowerCase()]);
          if (existing.rows[0]) {
            userId = existing.rows[0].id;
            const profExists = await query('SELECT id FROM profiles WHERE user_id = $1', [userId]);
            if (profExists.rows[0]) {
              await query('UPDATE profiles SET phone = $1, full_name = COALESCE(full_name, $2) WHERE user_id = $3', [sanitizedPhone, guestBooking.guest_name || '', userId]);
            } else {
              await query('INSERT INTO profiles (user_id, phone, full_name, email) VALUES ($1, $2, $3, $4)', [userId, sanitizedPhone, guestBooking.guest_name || '', tempEmail]);
            }
          }
        }

        if (!userId) {
          return res.status(500).json({ error: 'অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে।' });
        }

        // Link guest bookings + payments to this user
        await query('UPDATE bookings SET user_id = $1 WHERE guest_phone = $2 AND user_id IS NULL', [userId, sanitizedPhone]);
        const userBookings = await query('SELECT id FROM bookings WHERE user_id = $1', [userId]);
        if (userBookings.rows.length) {
          const bookingIds = userBookings.rows.map(b => b.id);
          await query(`UPDATE payments SET user_id = $1 WHERE booking_id = ANY($2) AND user_id = '00000000-0000-0000-0000-000000000000'`, [userId, bookingIds]);
        }

        const { accessToken, refreshToken } = issueTokens(userId, tempEmail);
        await query(
          "INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, now() + interval '7 days')",
          [userId, refreshToken]
        );

        return res.json({
          success: true,
          access_token: accessToken,
          refresh_token: refreshToken,
          user_id: userId,
        });
      } else {
        // Existing user — issue fresh JWT pair
        const jwt = require('jsonwebtoken');
        const userRow = await query('SELECT id, email FROM users WHERE id = $1', [userId]);
        if (!userRow.rows[0]) {
          return res.status(500).json({ error: 'User account issue.' });
        }
        const u = userRow.rows[0];
        const accessToken = jwt.sign({ userId: u.id, email: u.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
        const refreshToken = jwt.sign({ userId: u.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
        await query(
          "INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, now() + interval '7 days')",
          [u.id, refreshToken]
        );
        return res.json({
          success: true,
          access_token: accessToken,
          refresh_token: refreshToken,
          user_id: u.id,
        });
      }
    }

    return res.status(400).json({ error: "Invalid action. Use 'send' or 'verify'." });
  } catch (err) {
    console.error('POST /api/send-otp error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// UPLOAD BOOKING DOCUMENT (public)
// =============================================
app.post('/api/upload-booking-document', upload.single('file'), async (req, res) => {
  try {
    const bookingId = req.body.booking_id;
    const trackingId = req.body.tracking_id;
    const documentType = req.body.document_type;
    const file = req.file;

    if (!bookingId || !trackingId || !documentType || !file) {
      return res.status(400).json({ error: 'Missing required fields: booking_id, tracking_id, document_type, file' });
    }

    // Verify booking exists
    const bookingResult = await query('SELECT id, user_id, guest_name FROM bookings WHERE id = $1 AND tracking_id = $2', [bookingId, trackingId]);
    if (!bookingResult.rows[0]) {
      return res.status(404).json({ error: 'Booking not found or tracking ID mismatch' });
    }

    const booking = bookingResult.rows[0];
    const userId = booking.user_id || '00000000-0000-0000-0000-000000000000';

    // Move file to proper location
    const ext = file.originalname.split('.').pop() || 'jpg';
    const relativePath = `booking-documents/${userId}/${bookingId}/${documentType}_${Date.now()}.${ext}`;
    const absolutePath = path.join(uploadsRoot, relativePath);

    await fsp.mkdir(path.dirname(absolutePath), { recursive: true });
    await fsp.rename(file.path, absolutePath);

    const filePath = `/uploads/${relativePath}`;

    // Insert document record
    await query(
      'INSERT INTO booking_documents (booking_id, user_id, document_type, file_name, file_path, file_size) VALUES ($1, $2, $3, $4, $5, $6)',
      [bookingId, userId, documentType, file.originalname, filePath, file.size]
    );

    res.json({ success: true, file_path: filePath });
  } catch (err) {
    console.error('POST /api/upload-booking-document error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// =============================================
// DUE REMINDER + 2FA
// =============================================
const cron = require('node-cron');
const { runDueReminderJob } = require('./services/dueReminder');
const twoFA = require('./services/twoFactor');

// Manual trigger (admin only)
app.post('/api/due-reminder/run', authenticate, requireRole('admin'), async (_req, res) => {
  try {
    const result = await runDueReminderJob();
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Daily at 09:30 Asia/Dhaka
if (process.env.DISABLE_CRON !== '1') {
  cron.schedule('30 9 * * *', () => {
    runDueReminderJob().catch((e) => console.error('[due-reminder] failed:', e.message));
  }, { timezone: 'Asia/Dhaka' });
  console.log('⏰ Due-reminder cron scheduled: daily 09:30 Asia/Dhaka');
}

// === 2FA ROUTES ===
app.get('/api/2fa/status', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const s = await twoFA.getSettings(req.user.id);
    res.json({
      sms_enabled: s?.sms_enabled || false,
      sms_phone: s?.sms_phone || null,
      totp_enabled: s?.totp_enabled || false,
      has_pending_totp: !!s?.totp_secret_pending,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/2fa/sms/enable', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'phone required' });
    await twoFA.setSmsEnabled(req.user.id, true, phone);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/2fa/sms/disable', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await twoFA.setSmsEnabled(req.user.id, false, null);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/2fa/totp/setup', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const setup = await twoFA.generateTotpSetup(req.user.id, req.user.email);
    res.json(setup);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/2fa/totp/confirm', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token required' });
    const ok = await twoFA.confirmTotpEnable(req.user.id, token);
    if (!ok) return res.status(401).json({ error: 'Invalid TOTP code' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/2fa/totp/disable', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await twoFA.disableTotp(req.user.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Step-2 login: send SMS OTP
app.post('/api/2fa/login/send-sms', async (req, res) => {
  try {
    const { user_id } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const s = await twoFA.getSettings(user_id);
    if (!s?.sms_enabled || !s.sms_phone) return res.status(400).json({ error: 'SMS 2FA not enabled' });
    await twoFA.sendSmsOtp(user_id, s.sms_phone);
    res.json({ success: true, masked_phone: s.sms_phone.replace(/.(?=.{4})/g, '*') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Step-2 login: verify (SMS or TOTP)
app.post('/api/2fa/login/verify', async (req, res) => {
  try {
    const { user_id, method, code } = req.body || {};
    if (!user_id || !method || !code) return res.status(400).json({ error: 'user_id, method, code required' });
    const s = await twoFA.getSettings(user_id);
    if (!s) return res.status(400).json({ error: '2FA not configured' });
    let ok = false;
    if (method === 'sms') ok = await twoFA.verifySmsOtp(user_id, code);
    else if (method === 'totp' && s.totp_enabled && s.totp_secret) {
      ok = twoFA.verifyTotpCode(s.totp_secret, code);
    }
    res.json({ success: ok });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =============================================
// ONLINE PAYMENT (SSLCommerz)
// =============================================
const sslcz = require('./services/sslcommerz');

const getBaseUrl = (req) => process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;

// Initiate payment session — works for logged-in user OR guest with tracking_id
app.post('/api/payments/online/initiate', optionalAuth, async (req, res) => {
  try {
    const { booking_id, tracking_id, amount, customer } = req.body || {};
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Invalid amount' });

    let booking;
    if (booking_id) {
      const r = await query('SELECT id, user_id, tracking_id, due_amount FROM bookings WHERE id=$1', [booking_id]);
      booking = r.rows[0];
    } else if (tracking_id) {
      const r = await query('SELECT id, user_id, tracking_id, due_amount FROM bookings WHERE tracking_id=$1', [tracking_id]);
      booking = r.rows[0];
    }
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (Number(amount) > Number(booking.due_amount || 0) + 0.01) {
      return res.status(400).json({ error: `Amount exceeds due (৳${booking.due_amount})` });
    }

    const tran_id = `TT-${booking.tracking_id}-${Date.now()}`;
    const sessionRes = await query(
      `INSERT INTO online_payment_sessions (tran_id, booking_id, user_id, customer_phone, amount)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [tran_id, booking.id, req.user?.id || booking.user_id, customer?.phone || null, amount]
    );

    const baseUrl = getBaseUrl(req);
    const init = await sslcz.initSession({
      tran_id,
      amount,
      customer: customer || {},
      productName: `Trip Tastic Booking ${booking.tracking_id}`,
      urls: {
        success: `${baseUrl}/api/payments/online/callback/success`,
        fail: `${baseUrl}/api/payments/online/callback/fail`,
        cancel: `${baseUrl}/api/payments/online/callback/cancel`,
        ipn: `${baseUrl}/api/payments/online/ipn`,
      },
    });

    res.json({ success: true, gateway_url: init.GatewayPageURL, tran_id, session_id: sessionRes.rows[0].id });
  } catch (e) {
    console.error('initiate online payment error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// SSLCommerz callback handler — POST form data, then redirect user to SPA
const handleCallback = (resultStatus) => async (req, res) => {
  try {
    const { tran_id, val_id, status } = req.body || {};
    const sessionRes = await query('SELECT * FROM online_payment_sessions WHERE tran_id=$1', [tran_id]);
    const session = sessionRes.rows[0];
    if (!session) return res.redirect(`/payment/fail?reason=invalid_session`);

    if (resultStatus === 'success' && val_id) {
      const validation = await sslcz.validateTransaction(val_id);
      if (validation.status === 'VALID' || validation.status === 'VALIDATED') {
        await sslcz.markSessionPaid(session, { ...req.body, ...validation });
        return res.redirect(`/payment/success?tran=${encodeURIComponent(tran_id)}`);
      }
      await query("UPDATE online_payment_sessions SET status='failed', gateway_response=$1, updated_at=now() WHERE id=$2",
        [JSON.stringify({ ...req.body, validation }), session.id]);
      return res.redirect(`/payment/fail?tran=${encodeURIComponent(tran_id)}&reason=invalid`);
    }

    await query("UPDATE online_payment_sessions SET status=$1, gateway_response=$2, updated_at=now() WHERE id=$3",
      [resultStatus === 'cancel' ? 'cancelled' : 'failed', JSON.stringify(req.body), session.id]);
    res.redirect(`/payment/${resultStatus}?tran=${encodeURIComponent(tran_id)}`);
  } catch (e) {
    console.error(`SSLCZ ${resultStatus} callback error:`, e.message);
    res.redirect(`/payment/fail?reason=server_error`);
  }
};

// SSLCommerz POSTs to these URLs (form-urlencoded)
app.use('/api/payments/online/callback', express.urlencoded({ extended: true }));
app.post('/api/payments/online/callback/success', handleCallback('success'));
app.post('/api/payments/online/callback/fail', handleCallback('fail'));
app.post('/api/payments/online/callback/cancel', handleCallback('cancel'));

// IPN — server-to-server final confirmation
app.post('/api/payments/online/ipn', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { tran_id, val_id, status } = req.body || {};
    const sessionRes = await query('SELECT * FROM online_payment_sessions WHERE tran_id=$1', [tran_id]);
    const session = sessionRes.rows[0];
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (session.status === 'success') return res.json({ ok: true, already: true });

    if (status === 'VALID' && val_id) {
      const validation = await sslcz.validateTransaction(val_id);
      if (validation.status === 'VALID' || validation.status === 'VALIDATED') {
        await sslcz.markSessionPaid(session, { ...req.body, ...validation });
        return res.json({ ok: true });
      }
    }
    res.json({ ok: false });
  } catch (e) {
    console.error('IPN error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Public lookup — used by /payment/success page
app.get('/api/payments/online/session/:tran_id', async (req, res) => {
  try {
    const r = await query(
      `SELECT ops.tran_id, ops.status, ops.amount, ops.created_at, b.tracking_id
       FROM online_payment_sessions ops LEFT JOIN bookings b ON b.id=ops.booking_id
       WHERE ops.tran_id=$1`, [req.params.tran_id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =============================================
// SERVE FRONTEND (production)
// =============================================
const frontendPath = path.join(__dirname, '..', 'dist');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

// =============================================
// GLOBAL ERROR HANDLER (last middleware)
// =============================================
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error(`[api-error] ${req.method} ${req.originalUrl}`, err);
  }
  res.status(status).json({
    error: err.expose || status < 500 ? err.message : 'Internal server error',
  });
});

// =============================================
// START
// =============================================
app.listen(PORT, () => {
  console.log(`🚀 TRIP TASTIC API running on port ${PORT}`);
  console.log(`📁 Serving frontend from ${frontendPath}`);
});
