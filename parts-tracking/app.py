"""Parts Tracking + Sign-off — Flask application.

A shop/warehouse tool for checking parts out and back in, with a live
two-person sign-off at the counter. Identity comes from a keyboard-wedge
badge scanner (the scanner "types" a badge id and presses Enter); parts are
scanned the same way by their part number. See README.md.
"""
import csv
import datetime
import io

from flask import (
    Flask,
    Response,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    url_for,
)

from db import get_db, init_db

app = Flask(__name__)
app.secret_key = "parts-tracking-dev-secret"

# Make sure the database exists before the first request is handled.
init_db()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_iso():
    """Timestamp string, seconds precision, for the ledger."""
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def find_person(conn, badge_id):
    return conn.execute(
        "SELECT * FROM people WHERE badge_id = ? AND active = 1",
        (badge_id,),
    ).fetchone()


def find_part(conn, part_number):
    return conn.execute(
        "SELECT * FROM parts WHERE part_number = ?",
        (part_number,),
    ).fetchone()


def outstanding_for_part_person(conn, part_id, person_id):
    """Net quantity this person currently has checked out for this part."""
    row = conn.execute(
        """
        SELECT COALESCE(SUM(CASE WHEN direction = 'out' THEN quantity
                                 ELSE -quantity END), 0) AS net
        FROM movements
        WHERE part_id = ? AND person_id = ?
        """,
        (part_id, person_id),
    ).fetchone()
    return row["net"] if row else 0


# ---------------------------------------------------------------------------
# Counter station (main screen)
# ---------------------------------------------------------------------------
@app.route("/")
def counter():
    return render_template("counter.html")


@app.route("/api/part/<part_number>")
def api_part(part_number):
    """Look up a scanned part so the counter screen can show its details."""
    conn = get_db()
    try:
        part = find_part(conn, part_number.strip())
    finally:
        conn.close()
    if not part:
        return jsonify({"ok": False, "error": "Unknown part number."}), 404
    return jsonify(
        {
            "ok": True,
            "part": {
                "part_number": part["part_number"],
                "name": part["name"],
                "location": part["location"],
                "qty_on_hand": part["qty_on_hand"],
            },
        }
    )


@app.route("/api/movement", methods=["POST"])
def api_movement():
    """Record one authorized check-out / check-in. All-or-nothing validation."""
    data = request.get_json(silent=True) or {}
    part_number = str(data.get("part_number", "")).strip()
    worker_badge = str(data.get("worker_badge", "")).strip()
    approver_badge = str(data.get("approver_badge", "")).strip()
    direction = str(data.get("direction", "")).strip()
    note = str(data.get("note", "")).strip()

    try:
        quantity = int(data.get("quantity", 0))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "error": "Quantity must be a whole number."}), 400

    if direction not in ("out", "in"):
        return jsonify({"ok": False, "error": "Direction must be check-out or check-in."}), 400
    if quantity <= 0:
        return jsonify({"ok": False, "error": "Quantity must be greater than zero."}), 400

    conn = get_db()
    try:
        part = find_part(conn, part_number)
        if not part:
            return jsonify({"ok": False, "error": "Unknown part number."}), 400

        worker = find_person(conn, worker_badge)
        if not worker:
            return jsonify({"ok": False, "error": "Unknown worker badge."}), 400
        if worker["role"] != "worker":
            return jsonify({"ok": False, "error": "That badge is not a worker badge."}), 400

        approver = find_person(conn, approver_badge)
        if not approver:
            return jsonify({"ok": False, "error": "Unknown approver badge."}), 400
        if approver["role"] != "approver":
            return jsonify({"ok": False, "error": "That badge is not an approver badge."}), 400

        if worker["id"] == approver["id"]:
            return jsonify({"ok": False, "error": "Worker and approver must be different people."}), 400

        if direction == "out" and quantity > part["qty_on_hand"]:
            return jsonify(
                {"ok": False, "error": f"Only {part['qty_on_hand']} on hand to check out."}
            ), 400

        if direction == "in":
            net_out = outstanding_for_part_person(conn, part["id"], worker["id"])
            if quantity > net_out:
                return jsonify(
                    {"ok": False, "error": f"{worker['name']} only has {net_out} of this part checked out."}
                ), 400

        delta = -quantity if direction == "out" else quantity
        conn.execute(
            "UPDATE parts SET qty_on_hand = qty_on_hand + ? WHERE id = ?",
            (delta, part["id"]),
        )
        conn.execute(
            """
            INSERT INTO movements
                (part_id, person_id, approver_id, direction, quantity, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (part["id"], worker["id"], approver["id"], direction, quantity, note, now_iso()),
        )
        conn.commit()

        new_qty = part["qty_on_hand"] + delta
        verb = "checked out" if direction == "out" else "checked in"
        return jsonify(
            {
                "ok": True,
                "message": f"{worker['name']} {verb} {quantity} × {part['name']} "
                f"(approved by {approver['name']}). On hand: {new_qty}.",
            }
        )
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Outstanding — who currently has what checked out
# ---------------------------------------------------------------------------
@app.route("/outstanding")
def outstanding():
    conn = get_db()
    try:
        rows = conn.execute(
            """
            SELECT pe.name AS person, pe.badge_id AS badge,
                   pa.part_number AS part_number, pa.name AS part_name,
                   SUM(CASE WHEN m.direction = 'out' THEN m.quantity
                            ELSE -m.quantity END) AS net
            FROM movements m
            JOIN people pe ON pe.id = m.person_id
            JOIN parts  pa ON pa.id = m.part_id
            GROUP BY m.person_id, m.part_id
            HAVING net > 0
            ORDER BY pe.name, pa.name
            """
        ).fetchall()
    finally:
        conn.close()
    return render_template("outstanding.html", rows=rows)


# ---------------------------------------------------------------------------
# History ledger + CSV export
# ---------------------------------------------------------------------------
def query_movements(conn, part_number="", badge="", start="", end=""):
    sql = [
        """
        SELECT m.created_at, pa.part_number, pa.name AS part_name,
               m.direction, m.quantity,
               w.name AS worker, w.badge_id AS worker_badge,
               a.name AS approver, a.badge_id AS approver_badge, m.note
        FROM movements m
        JOIN parts  pa ON pa.id = m.part_id
        JOIN people w  ON w.id = m.person_id
        JOIN people a  ON a.id = m.approver_id
        WHERE 1 = 1
        """
    ]
    params = []
    if part_number:
        sql.append("AND pa.part_number = ?")
        params.append(part_number)
    if badge:
        sql.append("AND (w.badge_id = ? OR a.badge_id = ?)")
        params.extend([badge, badge])
    if start:
        sql.append("AND m.created_at >= ?")
        params.append(start + " 00:00:00")
    if end:
        sql.append("AND m.created_at <= ?")
        params.append(end + " 23:59:59")
    sql.append("ORDER BY m.created_at DESC")
    return conn.execute("\n".join(sql), params).fetchall()


@app.route("/history")
def history():
    filters = {
        "part_number": request.args.get("part_number", "").strip(),
        "badge": request.args.get("badge", "").strip(),
        "start": request.args.get("start", "").strip(),
        "end": request.args.get("end", "").strip(),
    }
    conn = get_db()
    try:
        rows = query_movements(conn, **filters)
    finally:
        conn.close()
    return render_template("history.html", rows=rows, filters=filters)


def _csv_safe(value):
    """Neutralize spreadsheet formula injection in CSV cells."""
    text = "" if value is None else str(value)
    if text and text[0] in ("=", "+", "-", "@"):
        return "'" + text
    return text


@app.route("/history.csv")
def history_csv():
    filters = {
        "part_number": request.args.get("part_number", "").strip(),
        "badge": request.args.get("badge", "").strip(),
        "start": request.args.get("start", "").strip(),
        "end": request.args.get("end", "").strip(),
    }
    conn = get_db()
    try:
        rows = query_movements(conn, **filters)
    finally:
        conn.close()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["Timestamp", "Part Number", "Part Name", "Direction", "Quantity",
         "Worker", "Worker Badge", "Approver", "Approver Badge", "Note"]
    )
    for r in rows:
        writer.writerow([
            _csv_safe(r["created_at"]), _csv_safe(r["part_number"]), _csv_safe(r["part_name"]),
            _csv_safe(r["direction"]), r["quantity"], _csv_safe(r["worker"]),
            _csv_safe(r["worker_badge"]), _csv_safe(r["approver"]),
            _csv_safe(r["approver_badge"]), _csv_safe(r["note"]),
        ])
    return Response(
        buf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=parts-history.csv"},
    )


# ---------------------------------------------------------------------------
# Parts admin
# ---------------------------------------------------------------------------
@app.route("/parts", methods=["GET", "POST"])
def parts():
    conn = get_db()
    try:
        if request.method == "POST":
            action = request.form.get("action")
            if action == "add":
                part_number = request.form.get("part_number", "").strip()
                name = request.form.get("name", "").strip()
                location = request.form.get("location", "").strip()
                try:
                    qty = int(request.form.get("qty_on_hand", "0") or "0")
                except ValueError:
                    qty = -1
                if not part_number or not name:
                    flash("Part number and name are required.", "error")
                elif qty < 0:
                    flash("Starting quantity must be zero or more.", "error")
                elif find_part(conn, part_number):
                    flash("That part number already exists.", "error")
                else:
                    conn.execute(
                        "INSERT INTO parts (part_number, name, location, qty_on_hand) VALUES (?, ?, ?, ?)",
                        (part_number, name, location, qty),
                    )
                    conn.commit()
                    flash(f"Added part {part_number}.", "success")
            elif action == "update":
                pid = request.form.get("id")
                name = request.form.get("name", "").strip()
                location = request.form.get("location", "").strip()
                if not name:
                    flash("Name is required.", "error")
                else:
                    conn.execute(
                        "UPDATE parts SET name = ?, location = ? WHERE id = ?",
                        (name, location, pid),
                    )
                    conn.commit()
                    flash("Part updated.", "success")
            return redirect(url_for("parts"))

        rows = conn.execute("SELECT * FROM parts ORDER BY part_number").fetchall()
    finally:
        conn.close()
    return render_template("parts.html", rows=rows)


# ---------------------------------------------------------------------------
# People admin
# ---------------------------------------------------------------------------
@app.route("/people", methods=["GET", "POST"])
def people():
    conn = get_db()
    try:
        if request.method == "POST":
            action = request.form.get("action")
            if action == "add":
                badge_id = request.form.get("badge_id", "").strip()
                name = request.form.get("name", "").strip()
                role = request.form.get("role", "").strip()
                if not badge_id or not name:
                    flash("Badge ID and name are required.", "error")
                elif role not in ("worker", "approver"):
                    flash("Role must be worker or approver.", "error")
                elif find_person(conn, badge_id):
                    flash("That badge ID is already in use.", "error")
                else:
                    conn.execute(
                        "INSERT INTO people (badge_id, name, role, active) VALUES (?, ?, ?, 1)",
                        (badge_id, name, role),
                    )
                    conn.commit()
                    flash(f"Added {name}.", "success")
            elif action == "update":
                pid = request.form.get("id")
                name = request.form.get("name", "").strip()
                role = request.form.get("role", "").strip()
                active = 1 if request.form.get("active") == "on" else 0
                if not name or role not in ("worker", "approver"):
                    flash("Name and a valid role are required.", "error")
                else:
                    conn.execute(
                        "UPDATE people SET name = ?, role = ?, active = ? WHERE id = ?",
                        (name, role, active, pid),
                    )
                    conn.commit()
                    flash("Person updated.", "success")
            return redirect(url_for("people"))

        rows = conn.execute("SELECT * FROM people ORDER BY role, name").fetchall()
    finally:
        conn.close()
    return render_template("people.html", rows=rows)


if __name__ == "__main__":
    app.run(debug=True)
