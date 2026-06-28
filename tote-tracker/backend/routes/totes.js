import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import db from '../database.js';

const router = Router();

function parseTote(t) {
  if (!t) return null;
  return { ...t, tags: JSON.parse(t.tags || '[]') };
}

router.get('/', (req, res) => {
  const totes = db.prepare(`
    SELECT t.*,
      COUNT(DISTINCT i.id) as item_count,
      COUNT(DISTINCT p.id) as photo_count
    FROM totes t
    LEFT JOIN items i ON i.tote_id = t.id
    LEFT JOIN photos p ON p.tote_id = t.id
    GROUP BY t.id
    ORDER BY t.updated_at DESC
  `).all();
  res.json(totes.map(parseTote));
});

router.get('/export', (req, res) => {
  const totes = db.prepare('SELECT * FROM totes ORDER BY label').all();
  const items = db.prepare('SELECT * FROM items ORDER BY tote_id, name').all();

  const rows = [['Tote', 'Location', 'Tags', 'Item', 'Quantity', 'Notes']];
  for (const tote of totes) {
    const toteItems = items.filter(i => i.tote_id === tote.id);
    if (toteItems.length === 0) {
      rows.push([tote.label, tote.location || '', tote.tags || '[]', '', '', '']);
    } else {
      for (const item of toteItems) {
        rows.push([tote.label, tote.location || '', tote.tags || '[]', item.name, item.quantity, item.notes || '']);
      }
    }
  }

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="tote-inventory.csv"');
  res.send(csv);
});

router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  const results = db.prepare(`
    SELECT i.*, t.label as tote_label, t.location as tote_location, t.id as tote_id
    FROM items i
    JOIN totes t ON t.id = i.tote_id
    WHERE i.name LIKE ? OR i.notes LIKE ?
    ORDER BY t.label, i.name
  `).all(`%${q}%`, `%${q}%`);

  res.json(results);
});

router.get('/share/:token', (req, res) => {
  const tote = db.prepare('SELECT * FROM totes WHERE share_token = ?').get(req.params.token);
  if (!tote) return res.status(404).json({ error: 'Not found' });
  const items = db.prepare('SELECT * FROM items WHERE tote_id = ? ORDER BY name').all(tote.id);
  res.json({ ...parseTote(tote), items });
});

router.get('/:id', (req, res) => {
  const tote = db.prepare('SELECT * FROM totes WHERE id = ?').get(req.params.id);
  if (!tote) return res.status(404).json({ error: 'Tote not found' });
  const items = db.prepare('SELECT * FROM items WHERE tote_id = ? ORDER BY name').all(req.params.id);
  const photos = db.prepare('SELECT * FROM photos WHERE tote_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...parseTote(tote), items, photos });
});

router.post('/', async (req, res) => {
  const { label, location, tags } = req.body;
  if (!label) return res.status(400).json({ error: 'Label is required' });

  const id = uuidv4();
  const qrData = JSON.stringify({ tote_id: id, label });
  const qrCode = await QRCode.toDataURL(qrData, { width: 300 });
  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);

  db.prepare(`
    INSERT INTO totes (id, label, location, tags, qr_code) VALUES (?, ?, ?, ?, ?)
  `).run(id, label, location || null, tagsJson, qrCode);

  res.status(201).json(parseTote(db.prepare('SELECT * FROM totes WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
  const { label, location, tags } = req.body;
  const tote = db.prepare('SELECT * FROM totes WHERE id = ?').get(req.params.id);
  if (!tote) return res.status(404).json({ error: 'Tote not found' });

  const tagsJson = tags !== undefined ? JSON.stringify(Array.isArray(tags) ? tags : []) : tote.tags;

  db.prepare(`
    UPDATE totes SET label = ?, location = ?, tags = ?, updated_at = datetime('now') WHERE id = ?
  `).run(label || tote.label, location !== undefined ? location : tote.location, tagsJson, req.params.id);

  res.json(parseTote(db.prepare('SELECT * FROM totes WHERE id = ?').get(req.params.id)));
});

router.post('/:id/share', (req, res) => {
  const tote = db.prepare('SELECT * FROM totes WHERE id = ?').get(req.params.id);
  if (!tote) return res.status(404).json({ error: 'Tote not found' });

  let token = tote.share_token;
  if (!token) {
    token = uuidv4();
    db.prepare('UPDATE totes SET share_token = ? WHERE id = ?').run(token, req.params.id);
  }
  res.json({ token });
});

router.delete('/:id/share', (req, res) => {
  db.prepare('UPDATE totes SET share_token = NULL WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const tote = db.prepare('SELECT * FROM totes WHERE id = ?').get(req.params.id);
  if (!tote) return res.status(404).json({ error: 'Tote not found' });
  db.prepare('DELETE FROM totes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/items', (req, res) => {
  const { name, quantity, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Item name is required' });
  const tote = db.prepare('SELECT id FROM totes WHERE id = ?').get(req.params.id);
  if (!tote) return res.status(404).json({ error: 'Tote not found' });

  const id = uuidv4();
  db.prepare(`INSERT INTO items (id, tote_id, name, quantity, notes) VALUES (?, ?, ?, ?, ?)`)
    .run(id, req.params.id, name, quantity || 1, notes || null);
  db.prepare(`UPDATE totes SET updated_at = datetime('now') WHERE id = ?`).run(req.params.id);

  res.status(201).json(db.prepare('SELECT * FROM items WHERE id = ?').get(id));
});

router.put('/:id/items/:itemId', (req, res) => {
  const { name, quantity, notes } = req.body;
  const item = db.prepare('SELECT * FROM items WHERE id = ? AND tote_id = ?').get(req.params.itemId, req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  db.prepare(`UPDATE items SET name = ?, quantity = ?, notes = ? WHERE id = ?`)
    .run(name || item.name, quantity !== undefined ? quantity : item.quantity, notes !== undefined ? notes : item.notes, req.params.itemId);

  res.json(db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.itemId));
});

router.delete('/:id/items/:itemId', (req, res) => {
  db.prepare('DELETE FROM items WHERE id = ? AND tote_id = ?').run(req.params.itemId, req.params.id);
  res.json({ success: true });
});

export default router;
