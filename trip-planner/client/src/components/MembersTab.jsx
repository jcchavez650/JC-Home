import { useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

export default function MembersTab({ trip, members, refreshTrip }) {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const isOwner = trip.my_role === 'owner'

  const add = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await api(`/trips/${trip.id}/members`, { method: 'POST', body: { email } })
      setMessage(`Added ${email}`)
      setEmail('')
      refreshTrip()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (m) => {
    if (!confirm(`Remove ${m.name} from this trip?`)) return
    setError('')
    try {
      await api(`/trips/${trip.id}/members/${m.id}`, { method: 'DELETE' })
      refreshTrip()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <form className="card settle-row" onSubmit={add}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@example.com"
          required
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary">Add member</button>
      </form>
      <p className="muted small">People must have a Trip Planner account before they can be added.</p>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      {members.map((m) => (
        <div key={m.id} className="card settle-row">
          <span>
            <strong>{m.name}</strong> <span className="muted">({m.email})</span>
            {m.role === 'owner' && <span className="badge"> owner</span>}
            {m.id === user.id && <span className="muted"> — you</span>}
          </span>
          {m.role !== 'owner' && (isOwner || m.id === user.id) && (
            <button className="btn btn-ghost danger" onClick={() => remove(m)}>
              {m.id === user.id ? 'Leave trip' : 'Remove'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
