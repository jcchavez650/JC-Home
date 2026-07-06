import { useEffect, useState } from 'react'
import { api } from '../api.js'

const TIER_BADGES = { free: '🆓 free', budget: '💲 budget', moderate: '💲💲 moderate', splurge: '💎 splurge' }

export default function SuggestionsTab({ trip, goToItinerary }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busyAi, setBusyAi] = useState(false)
  const [added, setAdded] = useState(new Set())

  const load = (ai = false) => {
    setError('')
    if (ai) setBusyAi(true)
    api(`/trips/${trip.id}/suggestions${ai ? '?ai=1' : ''}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setBusyAi(false))
  }

  useEffect(() => { load() }, [trip.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const addToItinerary = async (s, idx) => {
    try {
      await api(`/trips/${trip.id}/itinerary`, {
        method: 'POST',
        body: {
          title: s.title,
          category: ['food', 'lodging', 'transport', 'sightseeing'].includes(s.category) ? s.category : 'activity',
          notes: s.notes,
          est_cost: s.est_cost || null,
        },
      })
      setAdded(new Set([...added, idx]))
    } catch (err) {
      setError(err.message)
    }
  }

  if (!data) return <p className="muted">{error || 'Loading suggestions…'}</p>

  return (
    <div>
      <div className="page-head">
        <p className="muted">
          Ideas for <strong>{data.destination}</strong>
          {data.budget_per_person != null && <> · budget ≈ ${Math.round(data.budget_per_person)}/person</>}
          {data.source === 'generic' && ' · (general ideas — destination not in our curated list)'}
          {data.source === 'ai' && ' · ✨ AI-generated'}
        </p>
        {(data.ai_available || data.source === 'ai') && (
          <button className="btn btn-primary" disabled={busyAi} onClick={() => load(true)}>
            {busyAi ? 'Thinking…' : '✨ Get AI suggestions'}
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}

      <div className="trip-grid">
        {data.suggestions.map((s, i) => (
          <div key={i} className="card suggestion-card">
            <div className="suggestion-head">
              <strong>{s.title}</strong>
              <span className="badge">{TIER_BADGES[s.tier] || s.tier}</span>
            </div>
            <p className="muted small">
              {s.category} · {s.est_cost > 0 ? `~$${s.est_cost}/person` : 'free'}
            </p>
            {s.notes && <p className="small">{s.notes}</p>}
            <button
              className="btn btn-ghost"
              disabled={added.has(i)}
              onClick={() => addToItinerary(s, i)}
            >
              {added.has(i) ? '✓ Added' : '+ Add to itinerary'}
            </button>
          </div>
        ))}
      </div>
      {added.size > 0 && (
        <p className="muted">
          {added.size} added — <a onClick={goToItinerary} style={{ cursor: 'pointer' }}>view itinerary</a>
        </p>
      )}
    </div>
  )
}
