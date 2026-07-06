import { useState } from 'react'
import { api, storeSession } from '../api.js'

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register'
      const body =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : form
      const { token, user } = await api(path, { method: 'POST', body })
      storeSession(token, user)
      onLogin(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-shell">
        <aside className="auth-hero">
          <div className="brand">🧳 Trip Planner</div>
          <div>
            <h1>Travel well,<br />together.</h1>
            <p className="lede">Craft the itinerary, split every cost fairly, and settle up without the awkward math.</p>
            <ul>
              <li><span>✦</span> Shared trips for you and your crew</li>
              <li><span>✦</span> Effortless expense splitting &amp; settle-up</li>
              <li><span>✦</span> Tailored ideas for your destination</li>
            </ul>
          </div>
        </aside>

        <div className="auth-panel">
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="muted small">
            {mode === 'login' ? 'Log in to pick up where you left off.' : 'Start planning your next escape in seconds.'}
          </p>
          <div className="tabs">
            <button className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => setMode('login')}>
              Log in
            </button>
            <button className={mode === 'register' ? 'tab active' : 'tab'} onClick={() => setMode('register')}>
              Sign up
            </button>
          </div>
          <form onSubmit={submit}>
            {mode === 'register' && (
              <label>
                Name
                <input value={form.name} onChange={set('name')} required placeholder="Your name" />
              </label>
            )}
            <label>
              Email
              <input type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
            </label>
            <label>
              Password
              <input type="password" value={form.password} onChange={set('password')} required minLength={6} placeholder="At least 6 characters" />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn btn-primary" disabled={busy}>
              {busy ? '…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
