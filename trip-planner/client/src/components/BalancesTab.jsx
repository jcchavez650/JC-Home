import { useEffect, useState, useCallback } from 'react'
import { api } from '../api.js'

export default function BalancesTab({ trip }) {
  const [data, setData] = useState(null)
  const [settlements, setSettlements] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    Promise.all([api(`/trips/${trip.id}/balances`), api(`/trips/${trip.id}/settlements`)])
      .then(([b, s]) => {
        setData(b)
        setSettlements(s.settlements)
      })
      .catch((e) => setError(e.message))
  }, [trip.id])

  useEffect(() => { load() }, [load])

  const recordPayment = async (s) => {
    if (!confirm(`Record that ${s.from_name} paid ${s.to_name} $${s.amount.toFixed(2)}?`)) return
    setBusy(true)
    try {
      await api(`/trips/${trip.id}/settlements`, {
        method: 'POST',
        body: { from_user: s.from_user, to_user: s.to_user, amount: s.amount },
      })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!data) return <p className="muted">{error || 'Loading balances…'}</p>

  const allSettled = data.suggested_settlements.length === 0

  return (
    <div>
      <h3>Balances</h3>
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Member</th><th>Paid</th><th>Their share</th><th>Paid back</th><th>Received</th><th>Net</th></tr>
          </thead>
          <tbody>
            {data.balances.map((b) => (
              <tr key={b.user_id}>
                <td>{b.name}</td>
                <td>${b.paid.toFixed(2)}</td>
                <td>${b.share.toFixed(2)}</td>
                <td>${b.settled_out.toFixed(2)}</td>
                <td>${b.settled_in.toFixed(2)}</td>
                <td className={b.net > 0.005 ? 'pos' : b.net < -0.005 ? 'neg' : ''}>
                  {b.net > 0.005 ? `is owed $${b.net.toFixed(2)}` : b.net < -0.005 ? `owes $${(-b.net).toFixed(2)}` : 'settled up ✓'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Settle up</h3>
      {allSettled ? (
        <div className="card empty"><p>🎉 Everyone is settled up!</p></div>
      ) : (
        data.suggested_settlements.map((s, i) => (
          <div key={i} className="card settle-row">
            <span>
              <strong>{s.from_name}</strong> pays <strong>{s.to_name}</strong>{' '}
              <span className="amount">${s.amount.toFixed(2)}</span>
            </span>
            <button className="btn btn-primary" disabled={busy} onClick={() => recordPayment(s)}>
              Record payment
            </button>
          </div>
        ))
      )}
      {error && <p className="error">{error}</p>}

      {settlements.length > 0 && (
        <>
          <h3>Payment history</h3>
          {settlements.map((s) => (
            <div key={s.id} className="card settle-row muted">
              <span>
                ✅ {s.date}: <strong>{s.from_name}</strong> paid <strong>{s.to_name}</strong> ${s.amount.toFixed(2)}
                {s.note && ` — ${s.note}`}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
