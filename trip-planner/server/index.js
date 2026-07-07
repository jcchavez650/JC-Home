import express from 'express'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { authRouter, requireAuth, requireTripMember } from './auth.js'
import { tripsRouter } from './routes/trips.js'
import { itineraryRouter } from './routes/itinerary.js'
import {
  expensesRouter,
  computeBalances,
  listSettlements,
  createSettlement,
} from './routes/expenses.js'
import { suggestionsRouter } from './routes/suggestions.js'
import { reportsRouter } from './routes/reports.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// Behind Railway's proxy: trust it so client IPs (for rate limiting) are correct.
app.set('trust proxy', 1)
// Security headers. CSP is disabled here because the SPA loads Google Fonts and
// inline styles; the strict defaults would block them.
app.use(helmet({ contentSecurityPolicy: false }))
app.use(express.json({ limit: '100kb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/trips', requireAuth, tripsRouter)
app.use('/api/trips/:tripId/itinerary', requireAuth, requireTripMember, itineraryRouter)
app.use('/api/trips/:tripId/expenses', requireAuth, requireTripMember, expensesRouter)
app.get('/api/trips/:tripId/balances', requireAuth, requireTripMember, (req, res) => {
  res.json(computeBalances(req.trip.id))
})
app.get('/api/trips/:tripId/settlements', requireAuth, requireTripMember, (req, res) => {
  res.json({ settlements: listSettlements(req.trip.id) })
})
app.post('/api/trips/:tripId/settlements', requireAuth, requireTripMember, createSettlement)
app.use('/api/trips/:tripId/suggestions', requireAuth, requireTripMember, suggestionsRouter)
app.use('/api/reports', requireAuth, reportsRouter)

app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'request body too large' })
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid JSON body' })
  }
  console.error(err)
  res.status(500).json({ error: 'internal server error' })
})

// Serve the built client in production
const dist = path.join(__dirname, '../client/dist')
app.use(express.static(dist))
app.get(/^\/(?!api\/).*/, (_req, res, next) => {
  res.sendFile(path.join(dist, 'index.html'), (err) => err && next())
})

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`trip-planner API listening on http://localhost:${port}`))
