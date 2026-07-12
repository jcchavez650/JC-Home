import { useEffect, useState } from 'react'
import { api } from '../api.js'

// A few sensible defaults offered as one-tap adds on an empty list.
const QUICK_ADD = ['Passport / ID', 'Phone charger', 'Medications', 'Toiletries', 'Sunscreen', 'Adapter plug', 'Chargers & cables', 'Reusable water bottle']

export default function PackingTab({ trip }) {
  const [items, setItems] = useState(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const load = () =>
    api(`/trips/${trip.id}/packing`).then((d) => setItems(d.items)).catch((e) => setError(e.message))
  useEffect(() => { load() }, [trip.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (value) => {
    const t = (value ?? text).trim()
    if (!t) return
    setError('')
    try {
      const d = await api(`/trips/${trip.id}/packing`, { method: 'POST', body: { text: t } })
      setItems(d.items)
      if (value == null) setText('')
    } catch (e) {
      setError(e.message)
    }
  }

  const toggle = async (item) => {
    const d = await api(`/trips/${trip.id}/packing/${item.id}`, { method: 'PUT', body: { checked: !item.checked } })
    setItems(d.items)
  }

  const remove = async (item) => {
    const d = await api(`/trips/${trip.id}/packing/${item.id}`, { method: 'DELETE' })
    setItems(d.items)
  }

  if (!items) return <p className="muted">{error || 'Loading packing list…'}</p>

  const packed = items.filter((i) => i.checked).length
  const pct = items.length ? Math.round((packed / items.length) * 100) : 0

  return (
    <div>
      <div className="page-head">
        <p className="muted">
          {items.length === 0 ? 'Nothing on the list yet' : <><strong>{packed}/{items.length}</strong> packed</>}
        </p>
      </div>
      {items.length > 0 && (
        <div className="progress" style={{ marginBottom: '1rem' }}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      )}

      <form className="card settle-row" onSubmit={(e) => { e.preventDefault(); add() }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add an item (e.g. sunglasses)" style={{ flex: 1 }} />
        <button className="btn btn-primary">Add</button>
      </form>
      {error && <p className="error">{error}</p>}

      {items.length === 0 && (
        <div className="card">
          <p className="muted small">Quick add:</p>
          <div className="chip-row">
            {QUICK_ADD.map((q) => (
              <button key={q} type="button" className="chip" onClick={() => add(q)}>+ {q}</button>
            ))}
          </div>
        </div>
      )}

      {items.map((item) => (
        <div key={item.id} className="card settle-row">
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', flex: 1, fontWeight: 400 }}>
            <input type="checkbox" checked={item.checked} onChange={() => toggle(item)} style={{ width: 'auto' }} />
            <span style={{ textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? 'var(--muted)' : 'var(--text)' }}>
              {item.text}
            </span>
          </label>
          <button className="btn btn-ghost danger" onClick={() => remove(item)}>Delete</button>
        </div>
      ))}
    </div>
  )
}
