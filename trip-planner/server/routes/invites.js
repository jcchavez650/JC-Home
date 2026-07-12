import { Router } from 'express'
import db from '../db.js'

// Handles joining a trip via an invite token. Mounted at /api/invites and
// requires auth, but NOT trip membership (the whole point is to become a member).
export const invitesRouter = Router()

function tripForToken(token) {
  if (!token) return null
  return db
    .prepare('SELECT id, name, destination, start_date, end_date FROM trips WHERE invite_token = ?')
    .get(token)
}

// Preview which trip an invite points to (so the UI can say "Join <name>?").
invitesRouter.get('/:token', (req, res) => {
  const trip = tripForToken(req.params.token)
  if (!trip) return res.status(404).json({ error: 'this invite link is invalid or has been revoked' })
  const already = !!db
    .prepare('SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?')
    .get(trip.id, req.user.id)
  res.json({ trip, already_member: already })
})

// Accept the invite: add the current user to the trip.
invitesRouter.post('/:token/accept', (req, res) => {
  const trip = tripForToken(req.params.token)
  if (!trip) return res.status(404).json({ error: 'this invite link is invalid or has been revoked' })
  try {
    db.prepare('INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, ?)').run(
      trip.id,
      req.user.id,
      'member'
    )
  } catch (err) {
    if (!String(err.message).includes('UNIQUE')) throw err
    // Already a member — treat as success (idempotent join).
  }
  res.json({ trip_id: trip.id })
})
