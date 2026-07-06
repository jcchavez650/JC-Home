import { useState } from 'react'
import { api } from '../api.js'

// Inline editor for a trip's core details: name, destination, dates,
// number of people, budget, and currency.
export default function EditTripForm({ trip, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name: trip.name || '',
    destination: trip.destination || '',
    start_date: trip.start_date || '',
    end_date: trip.end_date || '',
    party_size: trip.party_size ?? '',
    budget: trip.budget ?? '',
    currency: trip.currency || 'USD',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api(`/trips/${trip.id}`, {
        method: 'PUT',
        body: {
          name: form.name,
          destination: form.destination,
          start_date: form.start_date,
          end_date: form.end_date,
          party_size: form.party_size === '' ? null : Number(form.party_size),
          budget: form.budget,
          currency: form.currency,
        },
      })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card form-grid" onSubmit={submit}>
      <label>Trip name<input value={form.name} onChange={set('name')} required /></label>
      <label>Destination<input value={form.destination} onChange={set('destination')} required /></label>
      <label>Start date<input type="date" value={form.start_date} onChange={set('start_date')} /></label>
      <label>End date<input type="date" value={form.end_date} onChange={set('end_date')} /></label>
      <label>Number of people<input type="number" min="1" step="1" value={form.party_size} onChange={set('party_size')} placeholder="e.g. 4" /></label>
      <label>Total budget<input type="number" min="0" step="0.01" value={form.budget} onChange={set('budget')} placeholder="2000" /></label>
      <label>Currency<input value={form.currency} onChange={set('currency')} maxLength={3} /></label>
      {error && <p className="error">{error}</p>}
      <div className="span-2 form-actions">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
    </form>
  )
}
