import { Router } from 'express'
import db from '../db.js'

// Shared packing checklist for a trip. Mounted under /api/trips/:tripId/packing
// (already gated by requireAuth + requireTripMember).
export const packingRouter = Router({ mergeParams: true })

function listItems(tripId) {
  return db
    .prepare('SELECT id, text, checked, created_by FROM packing_items WHERE trip_id = ? ORDER BY id')
    .all(tripId)
    .map((i) => ({ ...i, checked: !!i.checked }))
}

packingRouter.get('/', (req, res) => {
  res.json({ items: listItems(req.trip.id) })
})

packingRouter.post('/', (req, res) => {
  const text = String(req.body?.text ?? '').trim()
  if (!text) return res.status(400).json({ error: 'item text is required' })
  db.prepare('INSERT INTO packing_items (trip_id, text, created_by) VALUES (?, ?, ?)').run(
    req.trip.id,
    text.slice(0, 200),
    req.user.id
  )
  res.status(201).json({ items: listItems(req.trip.id) })
})

packingRouter.put('/:itemId', (req, res) => {
  const item = db
    .prepare('SELECT * FROM packing_items WHERE id = ? AND trip_id = ?')
    .get(Number(req.params.itemId), req.trip.id)
  if (!item) return res.status(404).json({ error: 'packing item not found' })
  const { text, checked } = req.body || {}
  db.prepare('UPDATE packing_items SET text = ?, checked = ? WHERE id = ?').run(
    text !== undefined ? String(text).trim().slice(0, 200) || item.text : item.text,
    checked !== undefined ? (checked ? 1 : 0) : item.checked,
    item.id
  )
  res.json({ items: listItems(req.trip.id) })
})

packingRouter.delete('/:itemId', (req, res) => {
  const info = db
    .prepare('DELETE FROM packing_items WHERE id = ? AND trip_id = ?')
    .run(Number(req.params.itemId), req.trip.id)
  if (!info.changes) return res.status(404).json({ error: 'packing item not found' })
  res.json({ items: listItems(req.trip.id) })
})
