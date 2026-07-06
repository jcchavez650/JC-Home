import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import db from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/suggestions.json'), 'utf8'))

export const suggestionsRouter = Router({ mergeParams: true })

const TIER_ORDER = ['free', 'budget', 'moderate', 'splurge']

// Budget-per-person → max tier included. Suggestions at or below the tier pass the filter.
function maxTierFor(budgetPerPerson) {
  if (budgetPerPerson == null) return 'splurge'
  if (budgetPerPerson < 250) return 'budget'
  if (budgetPerPerson < 1000) return 'moderate'
  return 'splurge'
}

function findDestination(destination) {
  const q = destination.toLowerCase()
  for (const dest of Object.values(data.destinations)) {
    if (dest.aliases.some((a) => q.includes(a))) return dest
  }
  return null
}

suggestionsRouter.get('/', async (req, res) => {
  const trip = req.trip
  const memberCount =
    db.prepare('SELECT COUNT(*) AS n FROM trip_members WHERE trip_id = ?').get(trip.id).n || 1
  const budgetPerPerson =
    req.query.budget != null && req.query.budget !== ''
      ? Number(req.query.budget)
      : trip.budget != null
        ? trip.budget / memberCount
        : null

  const maxTier = maxTierFor(budgetPerPerson)
  const maxIdx = TIER_ORDER.indexOf(maxTier)

  if (req.query.ai === '1') {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res
        .status(400)
        .json({ error: 'AI suggestions need an ANTHROPIC_API_KEY set on the server' })
    }
    try {
      const suggestions = await aiSuggestions(trip, budgetPerPerson)
      return res.json({ source: 'ai', destination: trip.destination, budget_per_person: budgetPerPerson, suggestions })
    } catch (err) {
      return res.status(502).json({ error: `AI suggestions failed: ${err.message}` })
    }
  }

  const dest = findDestination(trip.destination)
  const pool = dest ? dest.suggestions : data.generic
  const suggestions = pool.filter((s) => TIER_ORDER.indexOf(s.tier) <= maxIdx)
  res.json({
    source: dest ? 'curated' : 'generic',
    destination: dest ? dest.label : trip.destination,
    budget_per_person: budgetPerPerson,
    max_tier: maxTier,
    ai_available: !!process.env.ANTHROPIC_API_KEY,
    suggestions,
  })
})

async function aiSuggestions(trip, budgetPerPerson) {
  const budgetLine =
    budgetPerPerson != null
      ? `The budget is about $${Math.round(budgetPerPerson)} per person for the whole trip.`
      : 'No budget was specified — cover a mix of free, budget, and splurge options.'
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `Suggest 8 specific activities/food experiences for a trip to ${trip.destination}${
            trip.start_date ? ` from ${trip.start_date} to ${trip.end_date || '?'}` : ''
          }. ${budgetLine}
Respond with ONLY a JSON array, no prose. Each element: {"title": string, "category": one of "food"|"activity"|"sightseeing"|"lodging"|"transport", "tier": one of "free"|"budget"|"moderate"|"splurge", "est_cost": number (USD per person), "notes": short practical tip}`,
        },
      ],
    }),
  })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`API returned ${resp.status}: ${body.slice(0, 200)}`)
  }
  const json = await resp.json()
  const text = json.content?.[0]?.text || '[]'
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('could not parse model response')
  return JSON.parse(match[0])
}
