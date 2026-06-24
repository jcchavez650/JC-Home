import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import db from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  const totes = db.prepare(`
    SELECT t.*,
      COUNT(DISTINCT i.id) as item_count,
      COUNT(DISTINCT p.id) as photo_count
    FROM totes t
    LEFT JOIN items i ON i.tote_id = t.id
    LEFT JOIN photos p ON p.tote_id = t.id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).all();
  res.json(totes);
});

router.get('/:id', (req, res) => {
  const tote = db.prepare('SELECT * FROM totes WHERE id = ?').get(req.params.id);
  if (!tote) return res.status(404).json({ error: 'Tote not found' });

  const items = db.prepare('SELECT * FROM items WHERE tote_id = ? ORDER BY name').all(req.params.id);
  const photos = db.prepare('SELECT * FROM photos WHERE tote_id = ? ORDER BY created_at DESC').all(req.params.id);

  res.json({ ...tote, items, photos });
});

router.post('/', async (req, res) => {
  const { label, location } = req.body;
  if (!label) return res.status(400).json({ error: 'Label is required' });

  const id = uuidv4();
  const qrData = JSON.stringify({ tote_id: id, label });
  const qrCode = await QRCode.toDataURL(qrData, { width: 300 });

  db.prepare(`
    INSERT INTO totes (id, label, location, qr_code) VALUES (?, ?, ?, ?)
  `).run(id, label, location || null, qrCode);

  const tote = db.prepare('SELECT * FROM totes WHERE id = ?').get(id);
  res.status(201).json(tote);
});

router.put('/:id', (req, res) => {
  const { label, location } = req.body;
  const tote = db.prepare('SELECT * FROM totes WHERE id = ?').get(req.params.id);
  if (!tote) return res.status(404).json({ error: 'Tote not found' });

  db.prepare(`
    UPDATE totes SET label = ?, location = ?, updated_at = datetime('now') WHERE id = ?
  `).run(label || tote.label, location !== undefined ? location : tote.location, req.params.id);

  res.json(db.prepare('SELECT * FROM totes WHERE id = ?').get(req.params.id));
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
  db.prepare(`
    INSERT INTO items (id, tote_id, name, quantity, notes) VALUES (?, ?, ?, ?, ?)
  `).run(id, req.params.id, name, quantity || 1, notes || null);

  db.prepare(`UPDATE totes SET updated_at = datetime('now') WHERE id = ?`).run(req.params.id);

  res.status(201).json(db.prepare('SELECT * FROM items WHERE id = ?').get(id));
});

router.put('/:id/items/:itemId', (req, res) => {
  const { name, quantity, notes } = req.body;
  const item = db.prepare('SELECT * FROM items WHERE id = ? AND tote_id = ?').get(req.params.itemId, req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  db.prepare(`
    UPDATE items SET name = ?, quantity = ?, notes = ? WHERE id = ?
  `).run(name || item.name, quantity !== undefined ? quantity : item.quantity, notes !== undefined ? notes : item.notes, req.params.itemId);

  res.json(db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.itemId));
});

router.delete('/:id/items/:itemId', (req, res) => {
  db.prepare('DELETE FROM items WHERE id = ? AND tote_id = ?').run(req.params.itemId, req.params.id);
  res.json({ success: true });
});

export default router;
