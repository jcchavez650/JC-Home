import { useEffect, useState } from 'react'
import { api } from '../api.js'

const CATEGORIES = ['food', 'lodging', 'transport', 'activity', 'shopping', 'other']
const CAT_ICONS = { food: '🍽️', lodging: '🏨', transport: '🚕', activity: '🎯', shopping: '🛍️', other: '📌' }

export default function ExpensesTab({ trip, members }) {
  const [expenses, setExpenses] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    description: '', amount: '', category: 'food',
    paid_by: members[0]?.id || '', date: new Date().toISOString().slice(0, 10),
    split_type: 'equal',
  })
  const [participants, setParticipants] = useState(() => new Set(members.map((m) => m.id)))
  const [customShares, setCustomShares] = useState({})

  useEffect(() => {
    api(`/trips/${trip.id}/expenses`).then((d) => setExpenses(d.expenses)).catch((e) => setError(e.message))
  }, [trip.id])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const toggleParticipant = (id) => {
    const next = new Set(participants)
    next.has(id) ? next.delete(id) : next.add(id)
    setParticipants(next)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const body = { ...form, paid_by: Number(form.paid_by), amount: Number(form.amount) }
    if (form.split_type === 'equal') {
      body.splits = [...participants].map((user_id) => ({ user_id }))
      if (body.splits.length === 0) return setError('pick at least one person to split with')
    } else {
      body.splits = members
        .filter((m) => Number(customShares[m.id] || 0) > 0)
        .map((m) => ({ user_id: m.id, share_amount: Number(customShares[m.id]) }))
      if (body.splits.length === 0) return setError('enter at least one share amount')
    }
    try {
      const d = await api(`/trips/${trip.id}/expenses`, { method: 'POST', body })
      setExpenses(d.expenses)
      setForm({ ...form, description: '', amount: '' })
      setCustomShares({})
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    if (!confirm('Delete this expense?')) return
    const d = await api(`/trips/${trip.id}/expenses/${id}`, { method: 'DELETE' })
    setExpenses(d.expenses)
  }

  if (!expenses) return <p className="muted">{error || 'Loading expenses…'}</p>

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const customTotal = Object.values(customShares).reduce((s, v) => s + (Number(v) || 0), 0)

  return (
    <div>
      <div className="page-head">
        <p className="muted">
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''} · total <strong>${total.toFixed(2)}</strong>
          {trip.budget != null && <span> of ${trip.budget} budget</span>}
        </p>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add expense'}
        </button>
      </div>

      {showForm && (
        <form className="card form-grid" onSubmit={submit}>
          <label>Description<input value={form.description} onChange={set('description')} required placeholder="Group dinner" /></label>
          <label>Amount<input type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')} required placeholder="120.00" /></label>
          <label>Category
            <select value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>Paid by
            <select value={form.paid_by} onChange={set('paid_by')}>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label>Date<input type="date" value={form.date} onChange={set('date')} /></label>
          <label>Split
            <select value={form.split_type} onChange={set('split_type')}>
              <option value="equal">Split equally</option>
              <option value="custom">Custom amounts</option>
            </select>
          </label>

          {form.split_type === 'equal' ? (
            <div className="span-2">
              <p className="muted small">Split between:</p>
              <div className="chip-row">
                {members.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    className={participants.has(m.id) ? 'chip active' : 'chip'}
                    onClick={() => toggleParticipant(m.id)}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="span-2">
              <p className="muted small">
                Each person's share (must add up to ${Number(form.amount || 0).toFixed(2)} — currently ${customTotal.toFixed(2)}):
              </p>
              <div className="share-grid">
                {members.map((m) => (
                  <label key={m.id}>{m.name}
                    <input
                      type="number" min="0" step="0.01" placeholder="0.00"
                      value={customShares[m.id] || ''}
                      onChange={(e) => setCustomShares({ ...customShares, [m.id]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary">Add expense</button>
        </form>
      )}

      {expenses.length === 0 && <div className="card empty"><p>No expenses yet. Add one and it'll be split automatically.</p></div>}

      {expenses.map((e) => (
        <div key={e.id} className="card expense-item">
          <div className="item-main">
            <span className="item-icon">{CAT_ICONS[e.category] || '📌'}</span>
            <div>
              <strong>{e.description}</strong> <span className="amount">${e.amount.toFixed(2)}</span>
              <p className="muted small">
                {e.date} · paid by <strong>{e.paid_by_name}</strong> ·{' '}
                {e.splits.map((s) => `${s.name} $${s.share_amount.toFixed(2)}`).join(' · ')}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost danger" onClick={() => remove(e.id)}>Delete</button>
        </div>
      ))}
    </div>
  )
}
