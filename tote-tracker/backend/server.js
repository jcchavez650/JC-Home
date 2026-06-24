import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import totesRouter from './routes/totes.js';
import analyzeRouter from './routes/analyze.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, 'uploads');
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

app.use('/api/totes', totesRouter);
app.use('/api/analyze', upload.single('photo'), analyzeRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Tote Tracker API running on port ${PORT}`);
});
