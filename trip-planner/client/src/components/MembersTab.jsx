import { useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'

export default function MembersTab({ trip, members, refreshTrip }) {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [inviteToken, setInviteToken] = useState(trip.invite_token || null)
  const [copied, setCopied] = useState(false)

  const isOwner = trip.my_role === 'owner'
  const inviteLink = inviteToken
    ? `${window.location.origin}${window.location.pathname}#/join/${inviteToken}`
    : null

  const generateInvite = async () => {
    setError('')
    try {
      const { invite_token } = await api(`/trips/${trip.id}/invite`, { method: 'POST' })
      setInviteToken(invite_token)
    } catch (err) {
      setError(err.message)
    }
  }

  const revokeInvite = async () => {
    if (!confirm('Revoke the invite link? Anyone still holding it will no longer be able to join.')) return
    setError('')
    try {
      await api(`/trips/${trip.id}/invite`, { method: 'DELETE' })
      setInviteToken(null)
      setCopied(false)
    } catch (err) {
      setError(err.message)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

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
      <div className="card">
        <h3 style={{ marginTop: 0 }}>🔗 Invite link</h3>
        <p className="muted small">Share this link so friends can join the trip — they'll sign up (or log in) and be added automatically. No need to know their email.</p>
        {inviteLink ? (
          <>
            <div className="img-field">
              <input readOnly value={inviteLink} onClick={(e) => e.target.select()} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={copyLink}>{copied ? '✓ Copied' : 'Copy'}</button>
            </div>
            <button className="btn btn-ghost danger" style={{ marginTop: '0.5rem' }} onClick={revokeInvite}>Revoke link</button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={generateInvite}>Create invite link</button>
        )}
      </div>

      <h3>Add by email</h3>
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
      <p className="muted small">Adding by email only works if they already have a Trip Planner account — otherwise use the invite link above.</p>
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
