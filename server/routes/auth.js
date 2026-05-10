const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const result = await query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.is_banned) return res.status(403).json({ error: 'Account is suspended' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const tokens = generateTokens(user);

    // Store refresh token + device metadata
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
    const ua = req.headers['user-agent'] || null;
    const deviceLabel = ua ? ua.slice(0, 80) : null;
    await query(
      `INSERT INTO sessions (user_id, refresh_token, expires_at, ip_address, user_agent, device_label, last_seen_at)
       VALUES ($1, $2, now() + interval '7 days', $3, $4, $5, now())`,
      [user.id, tokens.refreshToken, ip, ua, deviceLabel]
    );

    // Get roles
    const roleResult = await query('SELECT role FROM user_roles WHERE user_id = $1', [user.id]);
    const roles = roleResult.rows.map(r => r.role);

    res.json({
      user: { id: user.id, email: user.email, full_name: user.full_name },
      roles,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register - DISABLED for security. Only admins can create accounts via /admin/create-user
router.post('/register', (_req, res) => {
  return res.status(403).json({ error: 'Public registration is disabled. Contact your administrator.' });
});

// Public customer registration (role='user' ONLY — admin role permanently blocked)
// Used by the booking flow to require a customer account before placing a booking.
router.post('/customer-register', async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body || {};
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password and full name are required' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Block duplicate email (return friendly error)
    const existing = await query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await query(
      'INSERT INTO users (id, email, password_hash, full_name, phone, email_verified) VALUES ($1, $2, $3, $4, $5, true)',
      [userId, cleanEmail, passwordHash, full_name, phone || null]
    );
    await query(
      'INSERT INTO profiles (user_id, full_name, email, phone) VALUES ($1, $2, $3, $4)',
      [userId, full_name, cleanEmail, phone || null]
    );
    // SECURITY: hard-code 'user' role. Never accept role from request body.
    await query('INSERT INTO user_roles (user_id, role) VALUES ($1, $2)', [userId, 'user']);

    const user = { id: userId, email: cleanEmail, full_name };
    const tokens = generateTokens(user);
    await query(
      'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, now() + interval \'7 days\')',
      [userId, tokens.refreshToken]
    );

    res.status(201).json({
      user,
      roles: ['user'],
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    console.error('Customer register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    
    const sessionResult = await query(
      'SELECT * FROM sessions WHERE user_id = $1 AND refresh_token = $2 AND expires_at > now()',
      [decoded.userId, refresh_token]
    );
    if (!sessionResult.rows[0]) return res.status(401).json({ error: 'Invalid session' });

    const userResult = await query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (!userResult.rows[0]) return res.status(401).json({ error: 'User not found' });

    // Delete old session and create new
    await query('DELETE FROM sessions WHERE id = $1', [sessionResult.rows[0].id]);
    const tokens = generateTokens(userResult.rows[0]);
    await query(
      'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, now() + interval \'7 days\')',
      [decoded.userId, tokens.refreshToken]
    );

    res.json({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  await query('DELETE FROM sessions WHERE user_id = $1', [req.user.id]);
  res.json({ message: 'Logged out' });
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  const roleResult = await query('SELECT role FROM user_roles WHERE user_id = $1', [req.user.id]);
  res.json({
    user: { id: req.user.id, email: req.user.email, full_name: req.user.full_name },
    roles: roleResult.rows.map(r => r.role),
  });
});

// Reset password request (simplified - sends email with token)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    // Always return success to prevent email enumeration
    if (result.rows[0]) {
      const resetToken = jwt.sign({ userId: result.rows[0].id, type: 'reset' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      // TODO: Send email with reset link containing token
      console.log('Reset token for', email, ':', resetToken);
    }
    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'reset') return res.status(400).json({ error: 'Invalid token' });

    const passwordHash = await bcrypt.hash(password, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, decoded.userId]);
    await query('DELETE FROM sessions WHERE user_id = $1', [decoded.userId]);

    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

// Change password (authenticated user)
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Current and new password required' });
    if (new_password.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

    const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!userResult.rows[0]) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [newHash, req.user.id]);

    // Invalidate all other sessions
    await query('DELETE FROM sessions WHERE user_id = $1', [req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Create user
router.post('/admin/create-user', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { email, password, full_name, phone, role } = req.body;

    // SECURITY: Block creation of admin accounts
    if (role === 'admin') {
      return res.status(403).json({ error: 'Cannot create admin accounts. Admin role is permanently locked.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await query(
      'INSERT INTO users (id, email, password_hash, full_name, phone, email_verified) VALUES ($1, $2, $3, $4, $5, true)',
      [userId, email.trim().toLowerCase(), passwordHash, full_name, phone]
    );
    await query('INSERT INTO profiles (user_id, full_name, email, phone) VALUES ($1, $2, $3, $4)',
      [userId, full_name, email.trim().toLowerCase(), phone]);
    await query('INSERT INTO user_roles (user_id, role) VALUES ($1, $2)', [userId, role || 'user']);

    res.status(201).json({ id: userId, email, full_name, role: role || 'user' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// Admin: Manage user (update, activate, deactivate, delete)
router.post('/admin/manage-user', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { user_id, target_user_id, action, updates } = req.body;
    const targetId = target_user_id || user_id;

    // SECURITY: Protect primary admin
    if (targetId === '9c56194a-b0f9-4878-ac57-e97371acd199') {
      return res.status(403).json({ error: 'Cannot modify the primary admin account' });
    }

    if (action === 'update' && updates) {
      // Update profile
      if (updates.full_name || updates.status) {
        const fields = [];
        const vals = [];
        let idx = 1;
        if (updates.full_name) { fields.push(`full_name = $${idx++}`); vals.push(updates.full_name); }
        if (updates.status) { fields.push(`status = $${idx++}`); vals.push(updates.status); }
        fields.push(`updated_at = now()`);
        vals.push(targetId);
        await query(`UPDATE profiles SET ${fields.join(', ')} WHERE user_id = $${idx}`, vals);
        // Also update users table full_name
        if (updates.full_name) {
          await query('UPDATE users SET full_name = $1, updated_at = now() WHERE id = $2', [updates.full_name, targetId]);
        }
      }
      // Update role
      if (updates.role) {
        if (updates.role === 'admin') {
          return res.status(403).json({ error: 'Cannot assign admin role' });
        }
        const existing = await query('SELECT id FROM user_roles WHERE user_id = $1', [targetId]);
        if (existing.rows.length > 0) {
          await query('UPDATE user_roles SET role = $1 WHERE user_id = $2', [updates.role, targetId]);
        } else {
          await query('INSERT INTO user_roles (user_id, role) VALUES ($1, $2)', [targetId, updates.role]);
        }
      }
      // Update password
      if (updates.password && updates.password.length >= 6) {
        const hash = await bcrypt.hash(updates.password, 10);
        await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [hash, targetId]);
        await query('DELETE FROM sessions WHERE user_id = $1', [targetId]);
      }
      return res.json({ message: 'User updated successfully' });

    } else if (action === 'deactivate' || action === 'ban') {
      await query("UPDATE profiles SET status = 'inactive', updated_at = now() WHERE user_id = $1", [targetId]);
      await query('UPDATE users SET is_banned = true WHERE id = $1', [targetId]);
      await query('DELETE FROM sessions WHERE user_id = $1', [targetId]);
      return res.json({ message: 'User deactivated successfully' });

    } else if (action === 'activate' || action === 'unban') {
      await query("UPDATE profiles SET status = 'active', updated_at = now() WHERE user_id = $1", [targetId]);
      await query('UPDATE users SET is_banned = false WHERE id = $1', [targetId]);
      return res.json({ message: 'User activated successfully' });

    } else if (action === 'delete') {
      await query('DELETE FROM user_roles WHERE user_id = $1', [targetId]);
      await query('DELETE FROM sessions WHERE user_id = $1', [targetId]);
      await query('DELETE FROM profiles WHERE user_id = $1', [targetId]);
      await query('DELETE FROM users WHERE id = $1', [targetId]);
      return res.json({ message: 'User deleted successfully' });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
