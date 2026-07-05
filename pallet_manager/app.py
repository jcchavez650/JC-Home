from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, Response
import sqlite3
import os
import csv
import io
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'pallet_mgr_secret_2024')

# On Render, store DB on the persistent disk mounted at /data
_data_dir = os.environ.get('DATA_DIR', os.path.dirname(__file__))
os.makedirs(_data_dir, exist_ok=True)
DB_PATH = os.path.join(_data_dir, 'pallets.db')

STATUSES = ['Available', 'In Use', 'Damaged', 'Quarantine', 'Pending Inspection', 'Retired']
LOCATIONS = []  # Populated dynamically from DB


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS pallets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pallet_id TEXT NOT NULL UNIQUE,
            location TEXT,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'Available',
            quantity INTEGER DEFAULT 0,
            weight REAL,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()


def now():
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


@app.route('/')
def index():
    search = request.args.get('search', '').strip()
    status_filter = request.args.get('status', '').strip()
    location_filter = request.args.get('location', '').strip()

    conn = get_db()
    query = 'SELECT * FROM pallets WHERE 1=1'
    params = []

    if search:
        query += ' AND (pallet_id LIKE ? OR description LIKE ? OR notes LIKE ?)'
        like = f'%{search}%'
        params.extend([like, like, like])
    if status_filter:
        query += ' AND status = ?'
        params.append(status_filter)
    if location_filter:
        query += ' AND location = ?'
        params.append(location_filter)

    query += ' ORDER BY updated_at DESC'
    pallets = conn.execute(query, params).fetchall()

    # Get distinct locations for filter dropdown
    locations = [r['location'] for r in conn.execute(
        'SELECT DISTINCT location FROM pallets WHERE location IS NOT NULL AND location != "" ORDER BY location'
    ).fetchall()]

    # Summary counts
    summary = {row['status']: row['cnt'] for row in conn.execute(
        'SELECT status, COUNT(*) as cnt FROM pallets GROUP BY status'
    ).fetchall()}
    total = conn.execute('SELECT COUNT(*) as cnt FROM pallets').fetchone()['cnt']

    conn.close()
    return render_template('index.html',
                           pallets=pallets,
                           statuses=STATUSES,
                           locations=locations,
                           summary=summary,
                           total=total,
                           search=search,
                           status_filter=status_filter,
                           location_filter=location_filter)


@app.route('/add', methods=['GET', 'POST'])
def add_pallet():
    if request.method == 'POST':
        pallet_id = request.form.get('pallet_id', '').strip().upper()
        location = request.form.get('location', '').strip().upper()
        description = request.form.get('description', '').strip()
        status = request.form.get('status', 'Available')
        quantity = request.form.get('quantity', '0').strip() or '0'
        weight = request.form.get('weight', '').strip()
        notes = request.form.get('notes', '').strip()

        if not pallet_id:
            flash('Pallet ID is required.', 'error')
            return render_template('pallet_form.html', statuses=STATUSES, action='Add', pallet=request.form)

        try:
            quantity = int(quantity)
        except ValueError:
            quantity = 0

        weight_val = None
        if weight:
            try:
                weight_val = float(weight)
            except ValueError:
                flash('Weight must be a number.', 'error')
                return render_template('pallet_form.html', statuses=STATUSES, action='Add', pallet=request.form)

        ts = now()
        conn = get_db()
        try:
            conn.execute(
                'INSERT INTO pallets (pallet_id, location, description, status, quantity, weight, notes, created_at, updated_at) '
                'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                (pallet_id, location, description, status, quantity, weight_val, notes, ts, ts)
            )
            conn.commit()
            flash(f'Pallet {pallet_id} added successfully.', 'success')
            return redirect(url_for('index'))
        except sqlite3.IntegrityError:
            flash(f'Pallet ID "{pallet_id}" already exists.', 'error')
        finally:
            conn.close()

    return render_template('pallet_form.html', statuses=STATUSES, action='Add', pallet={})


@app.route('/edit/<int:id>', methods=['GET', 'POST'])
def edit_pallet(id):
    conn = get_db()
    pallet = conn.execute('SELECT * FROM pallets WHERE id = ?', (id,)).fetchone()
    if not pallet:
        conn.close()
        flash('Pallet not found.', 'error')
        return redirect(url_for('index'))

    if request.method == 'POST':
        pallet_id = request.form.get('pallet_id', '').strip().upper()
        location = request.form.get('location', '').strip().upper()
        description = request.form.get('description', '').strip()
        status = request.form.get('status', 'Available')
        quantity = request.form.get('quantity', '0').strip() or '0'
        weight = request.form.get('weight', '').strip()
        notes = request.form.get('notes', '').strip()

        if not pallet_id:
            flash('Pallet ID is required.', 'error')
            conn.close()
            return render_template('pallet_form.html', statuses=STATUSES, action='Edit', pallet=request.form)

        try:
            quantity = int(quantity)
        except ValueError:
            quantity = 0

        weight_val = None
        if weight:
            try:
                weight_val = float(weight)
            except ValueError:
                flash('Weight must be a number.', 'error')
                conn.close()
                return render_template('pallet_form.html', statuses=STATUSES, action='Edit', pallet=request.form)

        try:
            conn.execute(
                'UPDATE pallets SET pallet_id=?, location=?, description=?, status=?, quantity=?, weight=?, notes=?, updated_at=? WHERE id=?',
                (pallet_id, location, description, status, quantity, weight_val, notes, now(), id)
            )
            conn.commit()
            flash(f'Pallet {pallet_id} updated.', 'success')
            return redirect(url_for('index'))
        except sqlite3.IntegrityError:
            flash(f'Pallet ID "{pallet_id}" already exists.', 'error')
        finally:
            conn.close()
    else:
        pallet = dict(pallet)
        conn.close()

    return render_template('pallet_form.html', statuses=STATUSES, action='Edit', pallet=pallet)


@app.route('/delete/<int:id>', methods=['POST'])
def delete_pallet(id):
    conn = get_db()
    row = conn.execute('SELECT pallet_id FROM pallets WHERE id = ?', (id,)).fetchone()
    if row:
        conn.execute('DELETE FROM pallets WHERE id = ?', (id,))
        conn.commit()
        flash(f'Pallet {row["pallet_id"]} deleted.', 'success')
    else:
        flash('Pallet not found.', 'error')
    conn.close()
    return redirect(url_for('index'))


@app.route('/status/<int:id>', methods=['POST'])
def update_status(id):
    new_status = request.form.get('status')
    if new_status not in STATUSES:
        return jsonify({'error': 'Invalid status'}), 400
    conn = get_db()
    conn.execute('UPDATE pallets SET status=?, updated_at=? WHERE id=?', (new_status, now(), id))
    conn.commit()
    conn.close()
    flash('Status updated.', 'success')
    return redirect(url_for('index'))


@app.route('/export')
def export_csv():
    search = request.args.get('search', '').strip()
    status_filter = request.args.get('status', '').strip()
    location_filter = request.args.get('location', '').strip()

    conn = get_db()
    query = 'SELECT * FROM pallets WHERE 1=1'
    params = []
    if search:
        like = f'%{search}%'
        query += ' AND (pallet_id LIKE ? OR description LIKE ? OR notes LIKE ?)'
        params.extend([like, like, like])
    if status_filter:
        query += ' AND status = ?'
        params.append(status_filter)
    if location_filter:
        query += ' AND location = ?'
        params.append(location_filter)
    query += ' ORDER BY updated_at DESC'
    rows = conn.execute(query, params).fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Pallet ID', 'Location', 'Description', 'Status', 'Quantity', 'Weight (lbs)', 'Notes', 'Created', 'Last Updated'])
    for row in rows:
        writer.writerow([row['pallet_id'], row['location'], row['description'],
                         row['status'], row['quantity'], row['weight'] or '',
                         row['notes'], row['created_at'], row['updated_at']])

    filename = f"pallets_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename={filename}'}
    )


@app.route('/view/<int:id>')
def view_pallet(id):
    conn = get_db()
    pallet = conn.execute('SELECT * FROM pallets WHERE id = ?', (id,)).fetchone()
    conn.close()
    if not pallet:
        flash('Pallet not found.', 'error')
        return redirect(url_for('index'))
    return render_template('view_pallet.html', pallet=pallet, statuses=STATUSES)


if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5001)
