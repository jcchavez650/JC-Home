import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.DB_PATH || path.join(__dirname, 'trip-planner.db')

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  budget REAL,
  currency TEXT NOT NULL DEFAULT 'USD',
  preferences TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trip_members (
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (trip_id, user_id)
);

CREATE TABLE IF NOT EXISTS itinerary_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date TEXT,
  time TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'activity',
  location TEXT,
  notes TEXT,
  est_cost REAL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  itinerary_item_id INTEGER REFERENCES itinerary_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  amount REAL NOT NULL CHECK (amount > 0),
  paid_by INTEGER NOT NULL REFERENCES users(id),
  date TEXT,
  split_type TEXT NOT NULL DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expense_splits (
  expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  share_amount REAL NOT NULL CHECK (share_amount >= 0),
  UNIQUE (expense_id, user_id)
);

CREATE TABLE IF NOT EXISTS settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_user INTEGER NOT NULL REFERENCES users(id),
  to_user INTEGER NOT NULL REFERENCES users(id),
  amount REAL NOT NULL CHECK (amount > 0),
  date TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trip_members_user ON trip_members(user_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_trip ON itinerary_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_splits_expense ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_settlements_trip ON settlements(trip_id);
`)

// Migrations for databases created before newer columns existed
const tripCols = db.prepare('PRAGMA table_info(trips)').all()
if (!tripCols.some((c) => c.name === 'preferences')) {
  db.exec('ALTER TABLE trips ADD COLUMN preferences TEXT')
}
if (!tripCols.some((c) => c.name === 'party_size')) {
  db.exec('ALTER TABLE trips ADD COLUMN party_size INTEGER')
}
if (!tripCols.some((c) => c.name === 'cost_plan')) {
  db.exec('ALTER TABLE trips ADD COLUMN cost_plan TEXT')
}

const itinCols = db.prepare('PRAGMA table_info(itinerary_items)').all()
if (!itinCols.some((c) => c.name === 'image_url')) {
  db.exec('ALTER TABLE itinerary_items ADD COLUMN image_url TEXT')
}
if (!tripCols.some((c) => c.name === 'invite_token')) {
  db.exec('ALTER TABLE trips ADD COLUMN invite_token TEXT')
}

db.exec(`
CREATE TABLE IF NOT EXISTS packing_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_packing_trip ON packing_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_trips_invite ON trips(invite_token);
`)

export default db
