import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tote-tracker-dev-secret-change-in-prod';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token expired or invalid — please log in again' });
  }
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
