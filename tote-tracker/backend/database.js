import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || join(__dirname, 'data');
mkdirSync(dataDir, { recursive: true });

const db = new Database(join(dataDir, 'totes.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS totes (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    location TEXT,
    tags TEXT DEFAULT '[]',
    share_token TEXT,
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

// Migrations for existing databases
try { db.exec(`ALTER TABLE totes ADD COLUMN tags TEXT DEFAULT '[]'`); } catch {}
try { db.exec(`ALTER TABLE totes ADD COLUMN share_token TEXT`); } catch {}

export default db;
