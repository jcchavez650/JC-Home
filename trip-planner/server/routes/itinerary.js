import { Router } from 'express'
import db from '../db.js'

export const itineraryRouter = Router({ mergeParams: true })

const CATEGORIES = ['activity', 'food', 'lodging', 'transport', 'sightseeing', 'other']

// Only allow http(s) image URLs (the browser loads these directly); cap length.
function cleanImageUrl(value) {
  if (value == null || value === '') return null
  const s = String(value).trim()
  if (!/^https?:\/\//i.test(s) || s.length > 2048) return null
  return s
}

function listItems(tripId) {
  return db
    .prepare(
      `SELECT i.*, u.name AS created_by_name
       FROM itinerary_items i JOIN users u ON u.id = i.created_by
       WHERE i.trip_id = ?
       ORDER BY i.date IS NULL, i.date, i.time IS NULL, i.time, i.id`
    )
    .all(tripId)
}

itineraryRouter.get('/', (req, res) => {
  res.json({ items: listItems(req.trip.id) })
})

itineraryRouter.post('/', (req, res) => {
  const { date, time, title, category, location, notes, est_cost, image_url } = req.body || {}
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' })
  const cat = CATEGORIES.includes(category) ? category : 'activity'
  db.prepare(
    `INSERT INTO itinerary_items (trip_id, date, time, title, category, location, notes, est_cost, image_url, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    req.trip.id,
    date || null,
    time || null,
    title.trim(),
    cat,
    location?.trim() || null,
    notes?.trim() || null,
    est_cost != null && est_cost !== '' ? Number(est_cost) : null,
    cleanImageUrl(image_url),
    req.user.id
  )
  res.status(201).json({ items: listItems(req.trip.id) })
})

itineraryRouter.put('/:itemId', (req, res) => {
  const item = db
    .prepare('SELECT * FROM itinerary_items WHERE id = ? AND trip_id = ?')
    .get(Number(req.params.itemId), req.trip.id)
  if (!item) return res.status(404).json({ error: 'itinerary item not found' })
  const { date, time, title, category, location, notes, est_cost, image_url } = req.body || {}
  db.prepare(
    `UPDATE itinerary_items SET
       date = ?, time = ?, title = ?, category = ?, location = ?, notes = ?, est_cost = ?, image_url = ?
     WHERE id = ?`
  ).run(
    date !== undefined ? date || null : item.date,
    time !== undefined ? time || null : item.time,
    title?.trim() || item.title,
    CATEGORIES.includes(category) ? category : item.category,
    location !== undefined ? location?.trim() || null : item.location,
    notes !== undefined ? notes?.trim() || null : item.notes,
    est_cost !== undefined ? (est_cost === '' || est_cost == null ? null : Number(est_cost)) : item.est_cost,
    image_url !== undefined ? cleanImageUrl(image_url) : item.image_url,
    item.id
  )
  res.json({ items: listItems(req.trip.id) })
})

itineraryRouter.delete('/:itemId', (req, res) => {
  const info = db
    .prepare('DELETE FROM itinerary_items WHERE id = ? AND trip_id = ?')
    .run(Number(req.params.itemId), req.trip.id)
  if (!info.changes) return res.status(404).json({ error: 'itinerary item not found' })
  res.json({ items: listItems(req.trip.id) })
})
