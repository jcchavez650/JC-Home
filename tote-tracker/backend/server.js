import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import totesRouter from './routes/totes.js';
import analyzeRouter from './routes/analyze.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import { requireAuth, requireEditor } from './middleware/auth.js';
import db from './database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = process.env.UPLOADS_DIR || join(__dirname, 'uploads');
mkdirSync(uploadsDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = file.originalname.split('.').pop();
    cb(null, `photo-${unique}.${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Public routes (no auth)
app.use('/api/auth', authRouter);

// Public share endpoint — must be mounted before the protected totes router
app.get('/api/totes/share/:token', (req, res) => {
  const tote = db.prepare('SELECT * FROM totes WHERE share_token = ?').get(req.params.token);
  if (!tote) return res.status(404).json({ error: 'Not found' });
  const items = db.prepare('SELECT * FROM items WHERE tote_id = ? ORDER BY name').all(tote.id);
  res.json({ ...tote, tags: JSON.parse(tote.tags || '[]'), items });
});

// Protected routes
app.use('/api/totes', requireAuth, totesRouter);
app.use('/api/analyze', requireAuth, requireEditor, upload.single('photo'), analyzeRouter);
app.use('/api/users', usersRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve React frontend in production
const distPath = join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(join(distPath, 'index.html')));

app.listen(PORT, () => {
  console.log(`Tote Tracker running on port ${PORT}`);
});
