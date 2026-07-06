import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { EXPENSE_CATEGORIES, normalizeCategory, categoryMeta } from '../categories.js'

const money = (n) => `$${(n || 0).toFixed(2)}`

function parsePlan(str) {
  try {
    return str ? JSON.parse(str) : {}
  } catch {
    return {}
  }
}

export default function BudgetTab({ trip, members, refreshTrip }) {
  const [expenses, setExpenses] = useState(null)
  const [plan, setPlan] = useState(() => parsePlan(trip.cost_plan))
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api(`/trips/${trip.id}/expenses`).then((d) => setExpenses(d.expenses)).catch((e) => setError(e.message))
  }, [trip.id])

  useEffect(() => { setPlan(parsePlan(trip.cost_plan)) }, [trip.cost_plan])

  if (!expenses) return <p className="muted">{error || 'Loading budget…'}</p>

  // Actual spend per canonical category.
  const actual = {}
  for (const e of expenses) {
    const c = normalizeCategory(e.category)
    actual[c] = (actual[c] || 0) + e.amount
  }

  const headcount = trip.party_size && trip.party_size > 0 ? trip.party_size : members.length || 1
  const rows = EXPENSE_CATEGORIES.map((c) => ({
    ...c,
    planned: Number(plan[c.value]) || 0,
    spent: actual[c.value] || 0,
  }))
  const totalPlanned = rows.reduce((s, r) => s + r.planned, 0)
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0)

  const savePlan = async () => {
    setBusy(true)
    setError('')
    try {
      const cleaned = {}
      for (const c of EXPENSE_CATEGORIES) {
        const v = Number(plan[c.value])
        if (Number.isFinite(v) && v > 0) cleaned[c.value] = v
      }
      await api(`/trips/${trip.id}`, { method: 'PUT', body: { cost_plan: cleaned } })
      setEditing(false)
      refreshTrip()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h3 style={{ margin: 0 }}>Cost breakdown</h3>
          <p className="muted small" style={{ margin: '0.2rem 0 0' }}>
            Plan your big-ticket items (flights, hotel, …) and track them against what you actually spend.
          </p>
        </div>
        {editing ? (
          <div className="item-actions">
            <button className="btn" onClick={() => { setPlan(parsePlan(trip.cost_plan)); setEditing(false) }}>Cancel</button>
            <button className="btn btn-primary" disabled={busy} onClick={savePlan}>Save plan</button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => setEditing(true)}>✎ Edit planned costs</button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="stat-row">
        <div className="card stat"><span className="stat-label">Trip budget</span><strong>{trip.budget != null ? money(trip.budget) : '—'}</strong></div>
        <div className="card stat"><span className="stat-label">Total planned</span><strong>{money(totalPlanned)}</strong></div>
        <div className="card stat"><span className="stat-label">Actually spent</span><strong>{money(totalSpent)}</strong></div>
        <div className="card stat">
          <span className="stat-label">Est. per person{headcount ? ` (÷${headcount})` : ''}</span>
          <strong>{money((totalPlanned || totalSpent) / (headcount || 1))}</strong>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Category</th><th>Planned</th><th>Spent</th><th>Difference</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const diff = r.planned - r.spent
              return (
                <tr key={r.value}>
                  <td>{r.icon} {r.label}</td>
                  <td>
                    {editing ? (
                      <input
                        type="number" min="0" step="0.01" placeholder="0.00"
                        style={{ width: '7rem' }}
                        value={plan[r.value] ?? ''}
                        onChange={(e) => setPlan({ ...plan, [r.value]: e.target.value })}
                      />
                    ) : (
                      money(r.planned)
                    )}
                  </td>
                  <td>{money(r.spent)}</td>
                  <td className={r.planned === 0 ? '' : diff < -0.005 ? 'neg' : 'pos'}>
                    {r.planned === 0 ? '—' : diff < -0.005 ? `${money(-diff)} over` : `${money(diff)} left`}
                  </td>
                </tr>
              )
            })}
            <tr>
              <td><strong>Total</strong></td>
              <td><strong>{money(totalPlanned)}</strong></td>
              <td><strong>{money(totalSpent)}</strong></td>
              <td className={totalPlanned === 0 ? '' : totalPlanned - totalSpent < -0.005 ? 'neg' : 'pos'}>
                <strong>{totalPlanned === 0 ? '—' : totalPlanned - totalSpent < -0.005 ? `${money(totalSpent - totalPlanned)} over` : `${money(totalPlanned - totalSpent)} left`}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {trip.budget != null && totalPlanned > 0 && (
        <p className="muted small">
          Your planned costs are {money(totalPlanned)} against a {money(trip.budget)} budget
          {totalPlanned > trip.budget
            ? ` — that's ${money(totalPlanned - trip.budget)} over budget.`
            : ` — ${money(trip.budget - totalPlanned)} still unallocated.`}
        </p>
      )}
    </div>
  )
}
