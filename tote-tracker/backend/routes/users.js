import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// List all users
router.get('/', (req, res) => {
  const users = db.prepare(
    'SELECT id, email, name, role, created_at FROM users ORDER BY created_at'
  ).all();
  res.json(users);
});

// Admin creates a user directly (bypasses open_registration setting)
router.post('/', async (req, res) => {
  const { email, name, password, role } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Email, name and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const validRoles = ['admin', 'editor', 'viewer'];
  const userRole = validRoles.includes(role) ? role : 'viewer';
  const password_hash = await bcrypt.hash(password, 12);
  const id = uuidv4();

  db.prepare('INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .run(id, email.toLowerCase().trim(), name.trim(), password_hash, userRole);

  res.status(201).json(
    db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(id)
  );
});

// Update a user's role, name, and/or password
router.put('/:id', async (req, res) => {
  const { role, name, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (role && role !== 'admin' && user.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
    if (adminCount <= 1) return res.status(400).json({ error: 'Cannot remove the last admin' });
  }

  if (password !== undefined && password !== '') {
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const validRoles = ['admin', 'editor', 'viewer'];
  const newRole = role && validRoles.includes(role) ? role : user.role;
  const newName = name?.trim() || user.name;

  if (password) {
    const password_hash = await bcrypt.hash(password, 12);
    db.prepare('UPDATE users SET role = ?, name = ?, password_hash = ? WHERE id = ?')
      .run(newRole, newName, password_hash, req.params.id);
  } else {
    db.prepare('UPDATE users SET role = ?, name = ? WHERE id = ?')
      .run(newRole, newName, req.params.id);
  }

  res.json(
    db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.params.id)
  );
});

// Delete a user
router.delete('/:id', (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- Settings (admin only) ---

router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
});

router.put('/settings', (req, res) => {
  const { open_registration } = req.body;
  if (open_registration !== undefined) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('open_registration', ?)")
      .run(open_registration ? 'true' : 'false');
  }
  const rows = db.prepare('SELECT key, value FROM settings').all();
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
});

export default router;
