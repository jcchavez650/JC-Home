import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { navigate } from '../App.jsx'

export default function JoinTripPage({ token }) {
  const [state, setState] = useState({ loading: true })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api(`/invites/${encodeURIComponent(token)}`)
      .then((d) => setState({ loading: false, trip: d.trip, already: d.already_member }))
      .catch((e) => setState({ loading: false, error: e.message }))
  }, [token])

  const accept = async () => {
    setBusy(true)
    setError('')
    try {
      const { trip_id } = await api(`/invites/${encodeURIComponent(token)}/accept`, { method: 'POST' })
      navigate(`/trips/${trip_id}`)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  if (state.loading) return <p className="muted">Checking your invite…</p>
  if (state.error) {
    return (
      <div className="card empty">
        <p className="error">{state.error}</p>
        <a href="#/">← Back to your trips</a>
      </div>
    )
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: '2rem auto', textAlign: 'center' }}>
      <h1>{state.already ? "You're on this trip" : "You're invited!"}</h1>
      <p className="muted">
        {state.already ? 'You already have access to' : 'Join'} <strong>{state.trip.name}</strong>
        {state.trip.destination ? ` · 📍 ${state.trip.destination}` : ''}
        {state.trip.start_date ? ` · 📅 ${state.trip.start_date}` : ''}
      </p>
      {error && <p className="error">{error}</p>}
      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '1rem' }}>
        <a className="btn" href="#/">Not now</a>
        <button className="btn btn-primary" disabled={busy} onClick={accept}>
          {state.already ? 'Open trip' : busy ? 'Joining…' : 'Join trip'}
        </button>
      </div>
    </div>
  )
}
