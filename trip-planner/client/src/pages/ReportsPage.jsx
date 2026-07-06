import { useEffect, useState } from 'react'
import { api, downloadCsv } from '../api.js'

const fmt = (n) => `$${(n ?? 0).toFixed(2)}`

function BarChart({ rows, labelKey, valueKey }) {
  const max = Math.max(...rows.map((r) => r[valueKey]), 1)
  return (
    <div className="bars">
      {rows.map((r) => (
        <div key={r[labelKey]} className="bar-row">
          <span className="bar-label">{r[labelKey]}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(r[valueKey] / max) * 100}%` }} />
          </div>
          <span className="bar-value">{fmt(r[valueKey])}</span>
        </div>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const [summary, setSummary] = useState(null)
  const [tripReport, setTripReport] = useState(null)
  const [selectedTrip, setSelectedTrip] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api('/reports/summary').then(setSummary).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!selectedTrip) return setTripReport(null)
    api(`/reports/trip/${selectedTrip}`).then(setTripReport).catch((e) => setError(e.message))
  }, [selectedTrip])

  if (!summary) return <p className="muted">{error || 'Loading reports…'}</p>

  const t = summary.totals

  return (
    <div>
      <h1>Reports</h1>
      {error && <p className="error">{error}</p>}

      <div className="stat-row">
        <div className="card stat"><span className="stat-label">Trips</span><strong>{t.trip_count}</strong></div>
        <div className="card stat"><span className="stat-label">Total spent (all trips)</span><strong>{fmt(t.total_spent_all_trips)}</strong></div>
        <div className="card stat"><span className="stat-label">Your share</span><strong>{fmt(t.my_share_all_trips)}</strong></div>
        <div className="card stat"><span className="stat-label">You paid</span><strong>{fmt(t.i_paid_all_trips)}</strong></div>
        <div className="card stat">
          <span className="stat-label">Your net position</span>
          <strong className={t.my_net_position > 0.005 ? 'pos' : t.my_net_position < -0.005 ? 'neg' : ''}>
            {t.my_net_position > 0.005 ? `owed ${fmt(t.my_net_position)}` : t.my_net_position < -0.005 ? `owe ${fmt(-t.my_net_position)}` : 'settled ✓'}
          </strong>
        </div>
      </div>

      {summary.by_category.length > 0 && (
        <div className="card">
          <h3>Spending by category (all your trips)</h3>
          <BarChart rows={summary.by_category} labelKey="category" valueKey="total" />
        </div>
      )}

      <div className="card">
        <h3>By trip</h3>
        <table className="table">
          <thead>
            <tr><th>Trip</th><th>Destination</th><th>Dates</th><th>Total spent</th><th>Your share</th><th>Your net</th></tr>
          </thead>
          <tbody>
            {summary.trips.map((tr) => (
              <tr key={tr.id}>
                <td><a href={`#/trips/${tr.id}`}>{tr.name}</a></td>
                <td>{tr.destination}</td>
                <td>{tr.start_date || '—'}</td>
                <td>{fmt(tr.total_spent)}</td>
                <td>{fmt(tr.my_share)}</td>
                <td className={tr.my_net > 0.005 ? 'pos' : tr.my_net < -0.005 ? 'neg' : ''}>
                  {tr.my_net > 0.005 ? `+${fmt(tr.my_net)}` : tr.my_net < -0.005 ? `-${fmt(-tr.my_net)}` : '✓'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="page-head">
          <h3>Trip deep-dive</h3>
          <select value={selectedTrip} onChange={(e) => setSelectedTrip(e.target.value)}>
            <option value="">Select a trip…</option>
            {summary.trips.map((tr) => <option key={tr.id} value={tr.id}>{tr.name}</option>)}
          </select>
        </div>

        {tripReport && (
          <>
            <div className="stat-row">
              <div className="card stat"><span className="stat-label">Total spent</span><strong>{fmt(tripReport.total_spent)}</strong></div>
              {tripReport.budget != null && (
                <div className="card stat">
                  <span className="stat-label">Budget remaining</span>
                  <strong className={tripReport.budget_remaining < 0 ? 'neg' : 'pos'}>{fmt(tripReport.budget_remaining)}</strong>
                </div>
              )}
              <div className="card stat"><span className="stat-label">Itinerary est. cost</span><strong>{fmt(tripReport.itinerary_estimated_cost)}</strong></div>
            </div>

            {tripReport.by_category.length > 0 && (
              <>
                <h4>By category</h4>
                <BarChart rows={tripReport.by_category} labelKey="category" valueKey="total" />
              </>
            )}
            {tripReport.by_person.length > 0 && (
              <>
                <h4>Paid by person</h4>
                <BarChart rows={tripReport.by_person} labelKey="name" valueKey="paid" />
              </>
            )}
            {tripReport.by_day.length > 0 && (
              <>
                <h4>By day</h4>
                <BarChart rows={tripReport.by_day} labelKey="date" valueKey="total" />
              </>
            )}

            <h4>Outstanding balances</h4>
            {tripReport.suggested_settlements.length === 0 ? (
              <p className="muted">All settled up ✓</p>
            ) : (
              <ul>
                {tripReport.suggested_settlements.map((s, i) => (
                  <li key={i}>{s.from_name} owes {s.to_name} {fmt(s.amount)}</li>
                ))}
              </ul>
            )}

            <button
              className="btn btn-primary"
              onClick={() => downloadCsv(tripReport.trip.id, tripReport.trip.name).catch((e) => setError(e.message))}
            >
              ⬇ Download expenses CSV
            </button>
          </>
        )}
      </div>
    </div>
  )
}
