import { Router } from 'express'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import db from './db.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Throttle auth attempts per IP to blunt brute-force and mass sign-up.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many attempts — please wait a few minutes and try again' },
})

// A real secret must be provided in production; refuse to boot on the insecure
// default so a misconfigured deploy can't run with forgeable tokens. In dev we
// generate an ephemeral one (sessions reset on restart, which is fine locally).
function resolveJwtSecret() {
  const fromEnv = process.env.JWT_SECRET
  if (fromEnv && fromEnv.length >= 16 && fromEnv !== 'dev-secret-change-in-production') {
    return fromEnv
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET is not set (or too weak). Set a strong, random JWT_SECRET before starting in production.'
    )
  }
  console.warn('[auth] JWT_SECRET not set — using an ephemeral dev secret; sessions reset on restart.')
  return crypto.randomBytes(48).toString('hex')
}

const JWT_SECRET = resolveJwtSecret()
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

authRouter.post('/register', authLimiter, (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' })
  }
  if (!EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'please enter a valid email address' })
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

authRouter.post('/login', authLimiter, (req, res) => {
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
