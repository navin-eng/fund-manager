const express = require('express');
const crypto = require('crypto');
const { db } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Create users and sessions tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK(role IN ('admin','manager','member')),
    email TEXT,
    status TEXT DEFAULT 'active',
    member_id INTEGER,
    password_updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_login TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Check if password_updated_at exists and add it if missing
try {
  const tableInfo = db.pragma('table_info(users)');
  const hasColumn = tableInfo.some(col => col.name === 'password_updated_at');
  
  if (!hasColumn) {
    db.exec('ALTER TABLE users ADD COLUMN password_updated_at TEXT');
    
    db.prepare(`
      UPDATE users
      SET password_updated_at = COALESCE(created_at, datetime('now'))
      WHERE password_updated_at IS NULL
    `).run();
  }
} catch (error) {
  console.error("Error migrating users table:", error.message);
}
// Create default admin user if no users exist
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync('admin123', salt, 100000, 64, 'sha512').toString('hex');
  const passwordHash = `${salt}:${hash}`;

  db.prepare(
    'INSERT INTO users (username, password_hash, name, role, password_updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
  ).run('admin', passwordHash, 'Administrator', 'admin');

  console.log('Default admin user created (username: admin, password: admin123)');
}

// Helper: hash password
function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Helper: verify password
function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// Helper: create session token
function createSession(userId) {
  // Clean up expired sessions for this user
  db.prepare('DELETE FROM sessions WHERE user_id = ? OR expires_at < datetime(\'now\')').run(userId);

  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(userId, token, expiresAt);

  return { token, expiresAt };
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account is deactivated. Contact an administrator.' });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Update last login
    db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(user.id);

    const session = createSession(user.id);

    const { password_hash, ...userData } = user;
    res.json({
      user: userData,
      token: session.token,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const { password_hash, ...userData } = req.user;
  res.json({ user: userData });
});

// POST /api/auth/register (admin only)
router.post('/register', authenticate, requireRole('admin'), (req, res) => {
  try {
    const { username, password, name, email, role, member_id } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ message: 'Username, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const passwordHash = hashPassword(password);

    const result = db.prepare(
      'INSERT INTO users (username, password_hash, name, email, role, member_id, password_updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
    ).run(username, passwordHash, name, email || null, role || 'member', member_id || null);

    const user = db.prepare('SELECT id, username, name, role, email, status, member_id, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!verifyPassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const newHash = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ?, password_updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, req.user.id);

    // Invalidate all other sessions
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(
      req.user.id,
      req.headers.authorization.slice(7)
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/auth/users (admin only) - only admin/manager users, not member accounts
router.get('/users', authenticate, requireRole('admin'), (req, res) => {
  try {
    const users = db.prepare(
      "SELECT id, username, name, role, email, status, member_id, last_login, created_at FROM users WHERE role IN ('admin', 'manager') ORDER BY created_at DESC"
    ).all();

    res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/auth/users/:id (admin only)
router.put('/users/:id', authenticate, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { role, status, name, email, resetPassword } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (Number(id) === req.user.id && status === 'inactive') {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    const updates = [];
    const params = [];

    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (resetPassword) {
      const newHash = hashPassword(resetPassword);
      updates.push('password_hash = ?');
      params.push(newHash);
      updates.push('password_updated_at = CURRENT_TIMESTAMP');

      // Invalidate all sessions for this user
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updatedUser = db.prepare(
      'SELECT id, username, name, role, email, status, member_id, last_login, created_at FROM users WHERE id = ?'
    ).get(id);

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
