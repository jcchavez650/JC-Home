import express from 'express'
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
app.use(express.json())

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
