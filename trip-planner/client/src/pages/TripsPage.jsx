import { useEffect, useState } from 'react'
import { api } from '../api.js'
import PreferencesFields, { EMPTY_PREFS } from '../components/PreferencesFields.jsx'

const fmtMoney = (n, c = 'USD') =>
  n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n)

export default function TripsPage() {
  const [trips, setTrips] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', destination: '', start_date: '', end_date: '', budget: '', currency: 'USD' })
  const [prefs, setPrefs] = useState(EMPTY_PREFS)
  const [error, setError] = useState('')

  const load = () => api('/trips').then((d) => setTrips(d.trips)).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const create = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api('/trips', { method: 'POST', body: { ...form, preferences: prefs } })
      setForm({ name: '', destination: '', start_date: '', end_date: '', budget: '', currency: 'USD' })
      setPrefs(EMPTY_PREFS)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!trips) return <p className="muted">{error || 'Loading trips…'}</p>

  return (
    <div>
      <div className="page-head">
        <h1>Your trips</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New trip'}
        </button>
      </div>

      {showForm && (
        <form className="card form-grid" onSubmit={create}>
          <label>Trip name<input value={form.name} onChange={set('name')} required placeholder="Summer in Cancún" /></label>
          <label>Destination<input value={form.destination} onChange={set('destination')} required placeholder="Cancún, Mexico" /></label>
          <label>Start date<input type="date" value={form.start_date} onChange={set('start_date')} /></label>
          <label>End date<input type="date" value={form.end_date} onChange={set('end_date')} /></label>
          <label>Total budget<input type="number" min="0" step="0.01" value={form.budget} onChange={set('budget')} placeholder="2000" /></label>
          <label>Currency<input value={form.currency} onChange={set('currency')} maxLength={3} /></label>
          <div className="span-2 prefs-section">
            <h3>✨ Tailor your suggestions</h3>
            <p className="muted small">A few quick questions so the ideas we suggest actually fit your trip.</p>
          </div>
          <PreferencesFields value={prefs} onChange={setPrefs} />
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary">Create trip</button>
        </form>
      )}

      {trips.length === 0 && !showForm && (
        <div className="card empty">
          <p>No trips yet. Create your first trip to start planning!</p>
        </div>
      )}

      <div className="trip-grid">
        {trips.map((t) => (
          <a key={t.id} className="card trip-card" href={`#/trips/${t.id}`}>
            <h2>{t.name}</h2>
            <p className="muted">📍 {t.destination}</p>
            <p className="muted">
              {t.start_date ? `📅 ${t.start_date}${t.end_date ? ` → ${t.end_date}` : ''}` : '📅 Dates TBD'}
            </p>
            <p className="muted">👥 {t.member_count} member{t.member_count !== 1 ? 's' : ''}</p>
            <div className="trip-spend">
              <strong>{fmtMoney(t.total_spent, t.currency)}</strong> spent
              {t.budget != null && <span className="muted"> of {fmtMoney(t.budget, t.currency)} budget</span>}
            </div>
            {t.budget != null && t.budget > 0 && (
              <div className="progress">
                <div
                  className={`progress-fill${t.total_spent > t.budget ? ' over' : ''}`}
                  style={{ width: `${Math.min(100, (t.total_spent / t.budget) * 100)}%` }}
                />
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
