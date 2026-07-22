"""SQLite connection helpers for the Parts Tracking app.

The database file is created automatically on first use and the schema in
schema.sql is applied. Set the PARTS_DB environment variable to change where
the database file lives (useful for a mounted volume in a container).
"""
import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("PARTS_DB", os.path.join(BASE_DIR, "parts.db"))
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")


def get_db():
    """Return a SQLite connection with row access by column name and FKs on."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Create tables if they don't exist yet. Safe to call repeatedly."""
    with open(SCHEMA_PATH, "r") as f:
        schema = f.read()
    conn = get_db()
    try:
        conn.executescript(schema)
        conn.commit()
    finally:
        conn.close()
