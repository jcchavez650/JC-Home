import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set — database features will fail until it is configured.");
}

// Railway/Heroku-style managed Postgres requires SSL; local dev usually does not.
const needsSsl = /sslmode=require/.test(process.env.DATABASE_URL || "") ||
  process.env.PGSSL === "true";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
});

export function query(text, params) {
  return pool.query(text, params);
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entries (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_name       TEXT NOT NULL,
  serving_weight_g NUMERIC,
  calories_kcal   NUMERIC,
  total_carbs_g   NUMERIC NOT NULL DEFAULT 0,
  fiber_g         NUMERIC,
  sugar_g         NUMERIC,
  net_carbs_g     NUMERIC,
  protein_g       NUMERIC,
  fat_g           NUMERIC,
  confidence      TEXT,
  notes           TEXT,
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entries_user_logged_idx ON entries (user_id, logged_at);
`;

export async function initDb() {
  await pool.query(SCHEMA);
  console.log("Database schema ready.");
}
