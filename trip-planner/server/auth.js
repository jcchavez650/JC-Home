import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const TOKEN_TTL = '30d'

export const authRouter = Router()

function issueToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  })
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email }
}

authRouter.post('/register', (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' })
  }
  const hash = bcrypt.hashSync(password, 10)
  try {
    const info = db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(name.trim(), email.trim().toLowerCase(), hash)
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)
    res.status(201).json({ token: issueToken(user), user: publicUser(user) })
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'an account with that email already exists' })
    }
    throw err
  }
})

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase())
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'invalid email or password' })
  }
  res.json({ token: issueToken(user), user: publicUser(user) })
})

authRouter.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(401).json({ error: 'account no longer exists' })
  res.json({ user })
})

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'authentication required' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'invalid or expired token' })
  }
}

// Loads the trip if the requester is a member; 404 otherwise (existence not revealed).
export function requireTripMember(req, res, next) {
  const tripId = Number(req.params.tripId ?? req.params.id)
  const trip = db
    .prepare(
      `SELECT t.*, tm.role AS my_role FROM trips t
       JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = ?
       WHERE t.id = ?`
    )
    .get(req.user.id, tripId)
  if (!trip) return res.status(404).json({ error: 'trip not found' })
  req.trip = trip
  next()
}
