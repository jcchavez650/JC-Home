# 🔧 Parts Tracking + Sign-off

A shop/warehouse tool for checking parts **out** and back **in**, with a live
**two-person sign-off** at the counter. A worker takes or returns parts and an
approver authorizes the movement on the spot. Every movement is recorded with
the part, quantity, worker, approver, and a timestamp, so you always know who
took what — and what's still out.

Built with **Flask + SQLite**. Everything is scan-driven with an ordinary
**keyboard-wedge barcode scanner** (the kind that "types" a code and presses
Enter) — no drivers, no camera, works in any browser. You can also just type
the codes by hand, which is exactly how you test it.

## How the counter works

1. **Scan the part** → the screen shows its name, location, and quantity on hand.
2. **Pick check-out or check-in** and a quantity.
3. **Scan the worker badge** → validated as a worker.
4. **Scan the approver badge** → validated as an approver (must be a different
   person). The movement is recorded, stock is adjusted, and it's timestamped.

Both people and parts carry barcodes: a **badge ID** identifies a person (and
their role), and a **part number** identifies a part.

## Screens

- **Counter** — the scan station (main screen).
- **Outstanding** — who currently has what checked out (net check-outs − check-ins).
- **History** — the full movement ledger, filterable by part / badge / date, with CSV export.
- **Parts** — add and edit parts (part number, name, location, starting quantity).
- **People** — add and edit people, their badge IDs, and their role.

## Getting started

```bash
cd parts-tracking
pip install -r requirements.txt
python seed.py     # optional: loads sample people + parts
python app.py      # runs on http://localhost:5000
```

Open <http://localhost:5000> in a browser on the counter PC. Plug in a
keyboard-wedge scanner and you're ready — the input fields receive scans just
like typed text.

### Try it with the sample data

`python seed.py` creates:

- Workers: `W-1001` (Alex), `W-1002` (Sam)
- Approvers: `A-2001` (Jordan), `A-2002` (Casey)
- Parts: `P-100`, `P-101`, `P-200`, `P-201`, `P-300`

On the **Counter** screen, type `P-200`, Enter → choose Check out, qty `1` →
type `W-1001`, Enter → type `A-2001`, Enter. The movement is recorded and the
drill's on-hand count drops by one. Check **Outstanding** to see Alex holding it,
then check it back in the same way.

## What gets validated

The server rejects a movement (atomically — nothing is saved) when:

- the part number or a badge is unknown,
- a worker badge is used in the approver slot (or vice-versa),
- the worker and approver are the same person,
- the quantity is zero or negative,
- a check-out exceeds what's on hand, or
- a check-in exceeds what that worker currently has out.

## Data

Everything lives in a single SQLite file, `parts.db`, created automatically on
first run (git-ignored). Set the `PARTS_DB` environment variable to store it
elsewhere (e.g. a mounted volume in a container).

Three tables: **people** (badge, name, role), **parts** (part number, name,
location, qty on hand), and **movements** (the ledger). "Outstanding" is derived
from the movements table, so the audit trail is the source of truth.

## Deploying so any device can use it (optional)

Running locally on the counter PC is all most shops need. If you want the app
reachable from other devices, a `Dockerfile` is included and the app honors
`PARTS_DB` and `PORT`, so you can use the same Railway flow documented in
[`../trip-planner/README.md`](../trip-planner/README.md) — set the root
directory to `parts-tracking`, attach a volume, and point `PARTS_DB` at it
(e.g. `/data/parts.db`) so your data survives restarts.
