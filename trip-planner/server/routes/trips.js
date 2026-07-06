import { Router } from 'express'
import db from '../db.js'
import { requireTripMember } from '../auth.js'

export const tripsRouter = Router()

const tripSummary = db.prepare(`
  SELECT t.*, tm.role AS my_role,
    (SELECT COUNT(*) FROM trip_members m WHERE m.trip_id = t.id) AS member_count,
    (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e WHERE e.trip_id = t.id) AS total_spent
  FROM trips t
  JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = ?
`)

tripsRouter.get('/', (req, res) => {
  const trips = tripSummary.all(req.user.id)
  res.json({ trips })
})

tripsRouter.post('/', (req, res) => {
  const { name, destination, start_date, end_date, budget, currency } = req.body || {}
  if (!name?.trim() || !destination?.trim()) {
    return res.status(400).json({ error: 'name and destination are required' })
  }
  const create = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO trips (name, destination, start_date, end_date, budget, currency, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name.trim(),
        destination.trim(),
        start_date || null,
        end_date || null,
        budget != null && budget !== '' ? Number(budget) : null,
        currency?.trim() || 'USD',
        req.user.id
      )
    db.prepare('INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, ?)').run(
      info.lastInsertRowid,
      req.user.id,
      'owner'
    )
    return info.lastInsertRowid
  })
  const tripId = create()
  const trip = db
    .prepare(`${tripSummary.source} WHERE t.id = ?`)
    .get(req.user.id, tripId)
  res.status(201).json({ trip })
})

tripsRouter.get('/:id', requireTripMember, (req, res) => {
  const members = listMembers(req.trip.id)
  res.json({ trip: req.trip, members })
})

tripsRouter.put('/:id', requireTripMember, (req, res) => {
  const { name, destination, start_date, end_date, budget, currency } = req.body || {}
  db.prepare(
    `UPDATE trips SET
       name = COALESCE(?, name),
       destination = COALESCE(?, destination),
       start_date = COALESCE(?, start_date),
       end_date = COALESCE(?, end_date),
       budget = COALESCE(?, budget),
       currency = COALESCE(?, currency)
     WHERE id = ?`
  ).run(
    name?.trim() || null,
    destination?.trim() || null,
    start_date ?? null,
    end_date ?? null,
    budget != null && budget !== '' ? Number(budget) : null,
    currency?.trim() || null,
    req.trip.id
  )
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.trip.id)
  res.json({ trip })
})

tripsRouter.delete('/:id', requireTripMember, (req, res) => {
  if (req.trip.my_role !== 'owner') {
    return res.status(403).json({ error: 'only the trip owner can delete a trip' })
  }
  db.prepare('DELETE FROM trips WHERE id = ?').run(req.trip.id)
  res.json({ ok: true })
})

// --- Members ---

function listMembers(tripId) {
  return db
    .prepare(
      `SELECT u.id, u.name, u.email, tm.role, tm.joined_at
       FROM trip_members tm JOIN users u ON u.id = tm.user_id
       WHERE tm.trip_id = ? ORDER BY tm.joined_at`
    )
    .all(tripId)
}

tripsRouter.get('/:id/members', requireTripMember, (req, res) => {
  res.json({ members: listMembers(req.trip.id) })
})

tripsRouter.post('/:id/members', requireTripMember, (req, res) => {
  const { email } = req.body || {}
  if (!email?.trim()) return res.status(400).json({ error: 'email is required' })
  const user = db
    .prepare('SELECT id, name, email FROM users WHERE email = ?')
    .get(email.trim().toLowerCase())
  if (!user) {
    return res.status(404).json({ error: 'no user with that email — ask them to register first' })
  }
  try {
    db.prepare('INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, ?)').run(
      req.trip.id,
      user.id,
      'member'
    )
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: `${user.name} is already on this trip` })
    }
    throw err
  }
  res.status(201).json({ members: listMembers(req.trip.id) })
})

tripsRouter.delete('/:id/members/:userId', requireTripMember, (req, res) => {
  const userId = Number(req.params.userId)
  const target = db
    .prepare('SELECT role FROM trip_members WHERE trip_id = ? AND user_id = ?')
    .get(req.trip.id, userId)
  if (!target) return res.status(404).json({ error: 'member not found' })
  if (target.role === 'owner') {
    return res.status(400).json({ error: 'the trip owner cannot be removed' })
  }
  if (req.trip.my_role !== 'owner' && userId !== req.user.id) {
    return res.status(403).json({ error: 'only the owner can remove other members' })
  }
  const hasActivity = db
    .prepare(
      `SELECT EXISTS(
         SELECT 1 FROM expenses WHERE trip_id = ? AND paid_by = ?
         UNION SELECT 1 FROM expense_splits es JOIN expenses e ON e.id = es.expense_id
           WHERE e.trip_id = ? AND es.user_id = ?
         UNION SELECT 1 FROM settlements WHERE trip_id = ? AND (from_user = ? OR to_user = ?)
       ) AS x`
    )
    .get(req.trip.id, userId, req.trip.id, userId, req.trip.id, userId, userId)
  if (hasActivity.x) {
    return res
      .status(400)
      .json({ error: 'this member has expenses or payments on the trip and cannot be removed' })
  }
  db.prepare('DELETE FROM trip_members WHERE trip_id = ? AND user_id = ?').run(req.trip.id, userId)
  res.json({ members: listMembers(req.trip.id) })
})
