import jwt from 'jsonwebtoken';
import db from '../database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tote-tracker-dev-secret-change-in-prod';

export function requireAuth(req, res, next) {
  // Prefer the httpOnly cookie; fall back to a Bearer header for API clients
  const header = req.headers.authorization;
  const token = req.cookies?.auth_token
    || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid — please log in again' });
  }

  // Re-validate against the DB: kills tokens for deleted users, revoked sessions
  // (token_version bumped on password change), and keeps role/name current.
  const user = db.prepare('SELECT id, email, name, role, token_version FROM users WHERE id = ?').get(payload.id);
  if (!user || user.token_version !== (payload.tv ?? 0)) {
    return res.status(401).json({ error: 'Session no longer valid — please log in again' });
  }

  req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  next();
}

export function requireEditor(req, res, next) {
  if (!['editor', 'admin'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Editor or admin access required' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

export { JWT_SECRET };
