import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { requireAuth, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

// httpOnly cookie so client-side JS (and any XSS) cannot read the token.
// sameSite:'strict' + the CORS lockdown provides CSRF protection since the
// SPA and API are served from the same origin.
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function setAuthCookie(res, token) {
  res.cookie('auth_token', token, COOKIE_OPTS);
}

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, tv: user.token_version ?? 0 },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '7d' }
  );
}

function publicUser(u) {
  const { password_hash, token_version, ...rest } = u;
  return rest;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isRegistrationOpen() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) return true;
  const setting = db.prepare("SELECT value FROM settings WHERE key = 'open_registration'").get();
  return setting?.value === 'true';
}

// Public — frontend checks this to show/hide the register tab
router.get('/registration-status', (req, res) => {
  res.json({ open: isRegistrationOpen() });
});

router.post('/register', async (req, res) => {
  if (!isRegistrationOpen()) {
    return res.status(403).json({
      error: 'Registration is currently closed. Ask an admin to create an account for you.',
    });
  }

  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Email, name and password are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (name.trim().length > 100) {
    return res.status(400).json({ error: 'Name must be 100 characters or fewer' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const role = userCount === 0 ? 'admin' : 'viewer';

  const password_hash = await bcrypt.hash(password, 12);
  const id = uuidv4();

  db.prepare('INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .run(id, email.toLowerCase().trim(), name.trim(), password_hash, role);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  setAuthCookie(res, makeToken(user));
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  setAuthCookie(res, makeToken(user));
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', { ...COOKIE_OPTS, maxAge: undefined });
  res.json({ success: true });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(publicUser(user));
});

export default router;
