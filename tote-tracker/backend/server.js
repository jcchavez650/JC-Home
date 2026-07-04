import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import totesRouter from './routes/totes.js';
import analyzeRouter from './routes/analyze.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import { requireAuth, requireEditor, requireAdmin } from './middleware/auth.js';
import db from './database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = process.env.UPLOADS_DIR || join(__dirname, 'uploads');
mkdirSync(uploadsDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS — restrict to known frontend origin
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: true }));

app.use(express.json({ limit: '16kb' }));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many scan requests, please slow down' },
});

// File upload — images only, extension from MIME type (not user filename)
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MIME_TO_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = MIME_TO_EXT[file.mimetype] || 'jpg';
    cb(null, `photo-${unique}.${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, or GIF images are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Serve uploads — auth required; basename() prevents path traversal
app.get('/uploads/:filename', requireAuth, (req, res) => {
  const safe = basename(req.params.filename);
  res.sendFile(join(uploadsDir, safe));
});

// Public routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRouter);

// Public share endpoint — must be before protected totes router
app.get('/api/totes/share/:token', (req, res) => {
  const tote = db.prepare(
    'SELECT id, label, location, tags, created_at, updated_at FROM totes WHERE share_token = ?'
  ).get(req.params.token);
  if (!tote) return res.status(404).json({ error: 'Not found' });
  const items = db.prepare(
    'SELECT id, name, quantity, notes FROM items WHERE tote_id = ? ORDER BY name'
  ).all(tote.id);
  res.json({ ...tote, tags: JSON.parse(tote.tags || '[]'), items });
});

// Protected routes
app.use('/api/totes', requireAuth, totesRouter);
app.use('/api/analyze', requireAuth, requireEditor, analyzeLimiter, upload.single('photo'), analyzeRouter);
app.use('/api/users', requireAuth, requireAdmin, usersRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve React frontend in production
const distPath = join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(join(distPath, 'index.html')));

app.listen(PORT, () => {
  console.log(`Tote Tracker running on port ${PORT}`);
});
