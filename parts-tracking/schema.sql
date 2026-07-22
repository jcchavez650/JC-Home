-- Parts Tracking + Sign-off schema (SQLite)

-- People who can act at the counter. A badge_id is what the scanner reads.
CREATE TABLE IF NOT EXISTS people (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    badge_id TEXT    NOT NULL UNIQUE,
    name     TEXT    NOT NULL,
    role     TEXT    NOT NULL CHECK (role IN ('worker', 'approver')),
    active   INTEGER NOT NULL DEFAULT 1
);

-- Parts on the shelf. part_number is the barcode printed on the part/bin.
CREATE TABLE IF NOT EXISTS parts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    part_number TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    location    TEXT    NOT NULL DEFAULT '',
    qty_on_hand INTEGER NOT NULL DEFAULT 0
);

-- The ledger: one row per authorized check-out / check-in movement.
CREATE TABLE IF NOT EXISTS movements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id     INTEGER NOT NULL REFERENCES parts(id),
    person_id   INTEGER NOT NULL REFERENCES people(id),   -- the worker
    approver_id INTEGER NOT NULL REFERENCES people(id),   -- who signed off
    direction   TEXT    NOT NULL CHECK (direction IN ('out', 'in')),
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    note        TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_movements_part   ON movements(part_id);
CREATE INDEX IF NOT EXISTS idx_movements_person ON movements(person_id);
CREATE INDEX IF NOT EXISTS idx_movements_created ON movements(created_at);
