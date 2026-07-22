"""Populate the database with a little sample data for a quick demo.

Run once after setup:  python seed.py
Safe to re-run — it skips rows that already exist.
"""
from db import get_db, init_db

PEOPLE = [
    ("W-1001", "Alex Rivera", "worker"),
    ("W-1002", "Sam Okafor", "worker"),
    ("A-2001", "Jordan Lee", "approver"),
    ("A-2002", "Casey Morgan", "approver"),
]

PARTS = [
    ("P-100", "M8 Hex Bolt", "Aisle 3 / Bin A2", 500),
    ("P-101", "M8 Lock Nut", "Aisle 3 / Bin A3", 500),
    ("P-200", "Cordless Drill", "Cage 1 / Shelf 2", 6),
    ("P-201", "18V Battery Pack", "Cage 1 / Shelf 2", 12),
    ("P-300", "Safety Goggles", "Aisle 1 / Bin C1", 40),
]


def main():
    init_db()
    conn = get_db()
    try:
        for badge_id, name, role in PEOPLE:
            exists = conn.execute("SELECT 1 FROM people WHERE badge_id = ?", (badge_id,)).fetchone()
            if not exists:
                conn.execute(
                    "INSERT INTO people (badge_id, name, role, active) VALUES (?, ?, ?, 1)",
                    (badge_id, name, role),
                )
        for part_number, name, location, qty in PARTS:
            exists = conn.execute("SELECT 1 FROM parts WHERE part_number = ?", (part_number,)).fetchone()
            if not exists:
                conn.execute(
                    "INSERT INTO parts (part_number, name, location, qty_on_hand) VALUES (?, ?, ?, ?)",
                    (part_number, name, location, qty),
                )
        conn.commit()
        print("Seed data loaded.")
        print("  Workers:   W-1001 (Alex), W-1002 (Sam)")
        print("  Approvers: A-2001 (Jordan), A-2002 (Casey)")
        print("  Parts:     P-100, P-101, P-200, P-201, P-300")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
