import { Router } from 'express';
import db from '../database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/', (req, res) => {
  const users = db.prepare(
    'SELECT id, email, name, role, created_at FROM users ORDER BY created_at'
  ).all();
  res.json(users);
});

router.put('/:id', (req, res) => {
  const { role, name } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Prevent removing the last admin
  if (role && role !== 'admin' && user.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
    if (adminCount <= 1) return res.status(400).json({ error: 'Cannot remove the last admin' });
  }

  const validRoles = ['admin', 'editor', 'viewer'];
  const newRole = role && validRoles.includes(role) ? role : user.role;

  db.prepare('UPDATE users SET role = ?, name = ? WHERE id = ?')
    .run(newRole, name?.trim() || user.name, req.params.id);

  const updated = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
