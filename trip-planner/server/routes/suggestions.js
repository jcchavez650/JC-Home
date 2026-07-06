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

function parsePreferences(trip) {
  try {
    return trip.preferences ? JSON.parse(trip.preferences) : {}
  } catch {
    return {}
  }
}

function tripDates(trip) {
  const out = {}
  if (trip.start_date) {
    const start = new Date(trip.start_date + 'T00:00:00Z')
    if (!Number.isNaN(start.getTime())) {
      out.month = start.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
      if (trip.end_date) {
        const end = new Date(trip.end_date + 'T00:00:00Z')
        const days = Math.round((end - start) / 86400000) + 1
        if (days > 0 && days < 366) out.days = days
      }
    }
  }
  return out
}

// Keyword/category hints used to rank curated suggestions against selected interests.
const INTEREST_MATCHERS = {
  'beaches & water': { categories: [], keywords: ['beach', 'snorkel', 'island', 'cenote', 'bay', 'waterfront', 'ferry', 'boat', 'kayak', 'springs'] },
  'nature & outdoors': { categories: [], keywords: ['park', 'canyon', 'garden', 'spring', 'hik', 'bike', 'canal', 'nature', 'kayak', 'dam', 'everglades', 'rock'] },
  'museums & history': { categories: ['sightseeing'], keywords: ['museum', 'temple', 'shrine', 'palace', 'castle', 'basilica', 'ruins', 'chich', 'vatican', 'tower', 'forum', 'gallery', 'space center', 'lighthouse', 'deco'] },
  'food & drinks': { categories: ['food'], keywords: [] },
  nightlife: { categories: [], keywords: ['night', 'show', 'bar', 'cocktail', 'rooftop', 'fountains', 'fremont', 'cirque', 'broadway', 'west end', 'aperitivo'] },
  shopping: { categories: ['shopping'], keywords: ['market', 'shopping', 'camden', 'harajuku'] },
  'theme parks & shows': { categories: [], keywords: ['magic kingdom', 'universal', 'disney', 'xcaret', 'xel', 'cirque', 'show', 'wheel', 'icon park', 'teamlab'] },
  'local culture': { categories: [], keywords: ['walk', 'tour', 'quarter', 'crawl', 'street', 'square', 'crossing', 'havana', 'wynwood', 'montmartre', 'trastevere'] },
}

function scoreSuggestion(s, prefs) {
  const interests = prefs.interests || []
  if (interests.length === 0) return 0
  const text = `${s.title} ${s.notes || ''}`.toLowerCase()
  let score = 0
  for (const interest of interests) {
    const m = INTEREST_MATCHERS[interest]
    if (!m) continue
    if (m.categories.includes(s.category)) score += 2
    if (m.keywords.some((k) => text.includes(k))) score += 2
  }
  return score
}

suggestionsRouter.get('/', async (req, res) => {
  const trip = req.trip
  const prefs = parsePreferences(trip)
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
      const suggestions = await aiSuggestions(trip, prefs, budgetPerPerson)
      return res.json({
        source: 'ai',
        destination: trip.destination,
        budget_per_person: budgetPerPerson,
        tailored: true,
        suggestions,
      })
    } catch (err) {
      return res.status(502).json({ error: `AI suggestions failed: ${err.message}` })
    }
  }

  const dest = findDestination(trip.destination)
  const pool = dest ? dest.suggestions : data.generic
  const tailored = (prefs.interests || []).length > 0
  const suggestions = pool
    .filter((s) => TIER_ORDER.indexOf(s.tier) <= maxIdx)
    .map((s) => ({ ...s, _score: scoreSuggestion(s, prefs) }))
    .sort((a, b) => b._score - a._score || TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
    .map(({ _score, ...s }) => ({ ...s, match: tailored && _score > 0 }))

  res.json({
    source: dest ? 'curated' : 'generic',
    destination: dest ? dest.label : trip.destination,
    budget_per_person: budgetPerPerson,
    max_tier: maxTier,
    tailored,
    ai_available: !!process.env.ANTHROPIC_API_KEY,
    suggestions,
  })
})

function buildAiPrompt(trip, prefs, budgetPerPerson) {
  const dates = tripDates(trip)
  const lines = [`Suggest 10 specific activities and food experiences for a trip to ${trip.destination}.`]
  if (dates.month) {
    lines.push(
      `The trip is in ${dates.month}${dates.days ? ` and lasts ${dates.days} day${dates.days > 1 ? 's' : ''}` : ''} (${trip.start_date}${trip.end_date ? ` to ${trip.end_date}` : ''}). Take the season, weather, and anything special happening around those dates (festivals, holidays, events) into account, and say so in the notes when relevant.`
    )
  }
  if (prefs.group_type) lines.push(`The travelers are: ${prefs.group_type}.`)
  if (prefs.vibe && prefs.vibe !== 'mix') lines.push(`They want a ${prefs.vibe} trip.`)
  if (prefs.interests?.length) lines.push(`Their interests: ${prefs.interests.join(', ')}. Prioritize these.`)
  if (prefs.notes) lines.push(`Extra context from them: "${prefs.notes}".`)
  lines.push(
    budgetPerPerson != null
      ? `The budget is about $${Math.round(budgetPerPerson)} per person for the whole trip, so keep the mix realistic for that.`
      : 'No budget was specified — cover a mix of free, budget, and splurge options.'
  )
  lines.push(
    'Respond with ONLY a JSON array, no prose. Each element: {"title": string, "category": one of "food"|"activity"|"sightseeing"|"lodging"|"transport", "tier": one of "free"|"budget"|"moderate"|"splurge", "est_cost": number (USD per person), "notes": short practical tip}'
  )
  return lines.join('\n')
}

async function aiSuggestions(trip, prefs, budgetPerPerson) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: buildAiPrompt(trip, prefs, budgetPerPerson) }],
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
