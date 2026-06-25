import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || join(__dirname, 'data');
mkdirSync(dataDir, { recursive: true });

const db = new Database(join(dataDir, 'totes.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS totes (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    location TEXT,
    qr_code TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    tote_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    FOREIGN KEY (tote_id) REFERENCES totes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    tote_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    ai_raw_response TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tote_id) REFERENCES totes(id) ON DELETE CASCADE
  );
`);

export default db;
