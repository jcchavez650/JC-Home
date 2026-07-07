import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { EXPENSE_CATEGORIES, normalizeCategory } from '../categories.js'

const money = (n) => `$${(n || 0).toFixed(2)}`

// Itinerary item categories map onto the canonical budget categories.
const ITIN_TO_BUDGET = {
  activity: 'activities',
  sightseeing: 'activities',
  food: 'food',
  lodging: 'hotel',
  transport: 'transport',
  other: 'other',
}

function parsePlan(str) {
  try {
    return str ? JSON.parse(str) : {}
  } catch {
    return {}
  }
}

export default function BudgetTab({ trip, members, refreshTrip }) {
  const [expenses, setExpenses] = useState(null)
  const [itinerary, setItinerary] = useState(null)
  const [plan, setPlan] = useState(() => parsePlan(trip.cost_plan))
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([api(`/trips/${trip.id}/expenses`), api(`/trips/${trip.id}/itinerary`)])
      .then(([e, i]) => {
        setExpenses(e.expenses)
        setItinerary(i.items)
      })
      .catch((err) => setError(err.message))
  }, [trip.id])

  useEffect(() => { setPlan(parsePlan(trip.cost_plan)) }, [trip.cost_plan])

  if (!expenses || !itinerary) return <p className="muted">{error || 'Loading budget…'}</p>

  const headcount = trip.party_size && trip.party_size > 0 ? trip.party_size : members.length || 1

  // Actual spend per category (expenses are group totals).
  const actual = {}
  for (const e of expenses) {
    const c = normalizeCategory(e.category)
    actual[c] = (actual[c] || 0) + e.amount
  }

  // Itinerary estimates per category — est_cost is per person, so ×headcount for the group.
  const itin = {}
  for (const item of itinerary) {
    if (item.est_cost == null) continue
    const c = ITIN_TO_BUDGET[item.category] || 'other'
    itin[c] = (itin[c] || 0) + item.est_cost * headcount
  }

  const rows = EXPENSE_CATEGORIES.map((c) => {
    const planned = Number(plan[c.value]) || 0
    const itinerary_est = itin[c.value] || 0
    const spent = actual[c.value] || 0
    return { ...c, planned, itinerary_est, est_total: planned + itinerary_est, spent }
  })
  const totalPlanned = rows.reduce((s, r) => s + r.planned, 0)
  const totalItin = rows.reduce((s, r) => s + r.itinerary_est, 0)
  const totalEst = totalPlanned + totalItin
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0)
  const balance = trip.budget != null ? trip.budget - totalEst : null

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
            Planned big-ticket items plus what your itinerary adds up to, tracked against your budget and actual spend.
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
        <div className="card stat"><span className="stat-label">Estimated total</span><strong>{money(totalEst)}</strong></div>
        <div className="card stat"><span className="stat-label">Actually spent</span><strong>{money(totalSpent)}</strong></div>
        <div className="card stat">
          <span className="stat-label">Balance left</span>
          <strong className={balance == null ? '' : balance < -0.005 ? 'neg' : 'pos'}>
            {balance == null ? '—' : balance < -0.005 ? `${money(-balance)} over` : money(balance)}
          </strong>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Category</th><th>Planned</th><th>Itinerary est.</th><th>Est. total</th><th>Spent</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.value}>
                <td>{r.icon} {r.label}</td>
                <td>
                  {editing ? (
                    <input
                      type="number" min="0" step="0.01" placeholder="0.00"
                      style={{ width: '6.5rem' }}
                      value={plan[r.value] ?? ''}
                      onChange={(e) => setPlan({ ...plan, [r.value]: e.target.value })}
                    />
                  ) : (
                    money(r.planned)
                  )}
                </td>
                <td className="muted">{r.itinerary_est > 0 ? money(r.itinerary_est) : '—'}</td>
                <td><strong>{money(r.est_total)}</strong></td>
                <td>{money(r.spent)}</td>
              </tr>
            ))}
            <tr>
              <td><strong>Total</strong></td>
              <td><strong>{money(totalPlanned)}</strong></td>
              <td><strong>{money(totalItin)}</strong></td>
              <td><strong>{money(totalEst)}</strong></td>
              <td><strong>{money(totalSpent)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="muted small">
        {totalItin > 0 && (
          <>Itinerary estimates ({money(totalItin)}) are your per-person item costs × {headcount} {headcount === 1 ? 'traveler' : 'travelers'}. </>
        )}
        {trip.budget != null
          ? balance >= 0
            ? `You're projected to spend ${money(totalEst)} of your ${money(trip.budget)} budget — ${money(balance)} to spare.`
            : `Heads up: your estimated ${money(totalEst)} is ${money(-balance)} over the ${money(trip.budget)} budget.`
          : 'Set a trip budget (Edit trip) to see your remaining balance.'}
      </p>
    </div>
  )
}
