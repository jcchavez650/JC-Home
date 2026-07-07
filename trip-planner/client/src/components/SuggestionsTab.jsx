import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { findActivityImage } from '../imageSearch.js'
import PreferencesFields, { parsePrefs, VIBES, GROUP_TYPES } from './PreferencesFields.jsx'

const TIER_BADGES = { free: '🆓 free', budget: '💲 budget', moderate: '💲💲 moderate', splurge: '💎 splurge' }

export default function SuggestionsTab({ trip, refreshTrip, goToItinerary }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busyAi, setBusyAi] = useState(false)
  const [added, setAdded] = useState(new Set())
  const [editing, setEditing] = useState(false)
  const [prefs, setPrefs] = useState(() => parsePrefs(trip.preferences))

  const load = (ai = false) => {
    setError('')
    if (ai) setBusyAi(true)
    api(`/trips/${trip.id}/suggestions${ai ? '?ai=1' : ''}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setBusyAi(false))
  }

  useEffect(() => { load() }, [trip.id, trip.preferences]) // eslint-disable-line react-hooks/exhaustive-deps

  const savePrefs = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api(`/trips/${trip.id}`, { method: 'PUT', body: { preferences: prefs } })
      setEditing(false)
      refreshTrip() // updated trip.preferences re-triggers load()
    } catch (err) {
      setError(err.message)
    }
  }

  const addToItinerary = async (s, idx) => {
    try {
      // Best-effort: find a photo for the chosen activity (browser-side, may be null).
      const image_url = await findActivityImage(s.title, trip.destination)
      await api(`/trips/${trip.id}/itinerary`, {
        method: 'POST',
        body: {
          title: s.title,
          category: ['food', 'lodging', 'transport', 'sightseeing'].includes(s.category) ? s.category : 'activity',
          notes: s.notes,
          est_cost: s.est_cost || null,
          image_url,
        },
      })
      setAdded(new Set([...added, idx]))
    } catch (err) {
      setError(err.message)
    }
  }

  if (!data) return <p className="muted">{error || 'Loading suggestions…'}</p>

  const activePrefs = parsePrefs(trip.preferences)
  const vibeLabel = VIBES.find((v) => v.value === activePrefs.vibe)?.label
  const groupLabel = GROUP_TYPES.find((g) => g.value === activePrefs.group_type)?.label

  return (
    <div>
      <div className="page-head">
        <p className="muted">
          Ideas for <strong>{data.destination}</strong>
          {data.budget_per_person != null && <> · budget ≈ ${Math.round(data.budget_per_person)}/person</>}
          {data.source === 'generic' && ' · (general ideas — destination not in our curated list)'}
          {data.source === 'ai' && ' · ✨ AI-generated for your trip'}
        </p>
        <div className="item-actions">
          <button className="btn" onClick={() => setEditing((s) => !s)}>
            {editing ? 'Close' : '🎯 Tailor'}
          </button>
          {(data.ai_available || data.source === 'ai') && (
            <button className="btn btn-primary" disabled={busyAi} onClick={() => load(true)}>
              {busyAi ? 'Thinking…' : '✨ Get AI suggestions'}
            </button>
          )}
        </div>
      </div>

      {!editing && (
        <p className="muted small">
          Tailored to: {vibeLabel} · {groupLabel}
          {activePrefs.interests.length > 0 && <> · {activePrefs.interests.join(', ')}</>}
          {trip.start_date && <> · 📅 {trip.start_date}{trip.end_date ? ` → ${trip.end_date}` : ''}</>}
        </p>
      )}

      {editing && (
        <form className="card form-grid" onSubmit={savePrefs}>
          <PreferencesFields value={prefs} onChange={setPrefs} />
          <button className="btn btn-primary">Save & refresh suggestions</button>
        </form>
      )}

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
              {s.match && <span className="match-tag"> · 🎯 matches your interests</span>}
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
