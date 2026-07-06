import { useEffect, useState } from 'react'
import { api } from '../api.js'

const CATEGORIES = ['activity', 'food', 'lodging', 'transport', 'sightseeing', 'other']
const CAT_ICONS = { activity: '🎯', food: '🍽️', lodging: '🏨', transport: '🚕', sightseeing: '📷', other: '📌' }
const EMPTY = { date: '', time: '', title: '', category: 'activity', location: '', notes: '', est_cost: '' }

function formatDay(dateStr) {
  if (!dateStr || dateStr === 'Unscheduled') return 'Unscheduled'
  const d = new Date(dateStr + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return t
  const period = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m || 0).padStart(2, '0')} ${period}`
}

export default function ItineraryTab({ trip }) {
  const [items, setItems] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState('timeline')
  const [error, setError] = useState('')

  useEffect(() => {
    api(`/trips/${trip.id}/itinerary`).then((d) => setItems(d.items)).catch((e) => setError(e.message))
  }, [trip.id])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const path = editingId
        ? `/trips/${trip.id}/itinerary/${editingId}`
        : `/trips/${trip.id}/itinerary`
      const d = await api(path, { method: editingId ? 'PUT' : 'POST', body: form })
      setItems(d.items)
      setForm(EMPTY)
      setEditingId(null)
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    }
  }

  const edit = (item) => {
    setEditingId(item.id)
    setForm({
      date: item.date || '', time: item.time || '', title: item.title,
      category: item.category, location: item.location || '',
      notes: item.notes || '', est_cost: item.est_cost ?? '',
    })
    setShowForm(true)
  }

  const remove = async (id) => {
    if (!confirm('Delete this itinerary item?')) return
    const d = await api(`/trips/${trip.id}/itinerary/${id}`, { method: 'DELETE' })
    setItems(d.items)
  }

  if (!items) return <p className="muted">{error || 'Loading itinerary…'}</p>

  const estTotal = items.reduce((s, i) => s + (i.est_cost || 0), 0)
  const byDate = items.reduce((acc, item) => {
    const key = item.date || 'Unscheduled'
    ;(acc[key] = acc[key] || []).push(item)
    return acc
  }, {})

  const actions = (item) => (
    <div className="item-actions">
      <button className="btn btn-ghost" onClick={() => edit(item)}>Edit</button>
      <button className="btn btn-ghost danger" onClick={() => remove(item.id)}>Delete</button>
    </div>
  )

  const metaLine = (item) => (
    <p className="muted small">
      {item.location && `📍 ${item.location}`}
      {item.location && item.est_cost != null && ' · '}
      {item.est_cost != null && `~$${item.est_cost}`}
    </p>
  )

  return (
    <div>
      <div className="page-head">
        <p className="muted">
          {items.length} item{items.length !== 1 ? 's' : ''} · estimated cost <strong>${estTotal.toFixed(2)}</strong>
        </p>
        <div className="item-actions">
          <div className="seg">
            <button className={view === 'timeline' ? 'seg-btn active' : 'seg-btn'} onClick={() => setView('timeline')}>Timeline</button>
            <button className={view === 'list' ? 'seg-btn active' : 'seg-btn'} onClick={() => setView('list')}>List</button>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowForm((s) => !s); setEditingId(null); setForm(EMPTY) }}>
            {showForm ? 'Cancel' : '+ Add item'}
          </button>
        </div>
      </div>

      {showForm && (
        <form className="card form-grid" onSubmit={submit}>
          <label>Title<input value={form.title} onChange={set('title')} required placeholder="Snorkeling at cenote" /></label>
          <label>Category
            <select value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>Date<input type="date" value={form.date} onChange={set('date')} /></label>
          <label>Time<input type="time" value={form.time} onChange={set('time')} /></label>
          <label>Location<input value={form.location} onChange={set('location')} placeholder="Dos Ojos, Tulum" /></label>
          <label>Est. cost (per group)<input type="number" min="0" step="0.01" value={form.est_cost} onChange={set('est_cost')} placeholder="80" /></label>
          <label className="span-2">Notes<input value={form.notes} onChange={set('notes')} placeholder="Bring biodegradable sunscreen" /></label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary">{editingId ? 'Save changes' : 'Add to itinerary'}</button>
        </form>
      )}

      {items.length === 0 && <div className="card empty"><p>Nothing planned yet. Add your first activity, or grab ideas from the Suggestions tab.</p></div>}

      {view === 'timeline'
        ? Object.entries(byDate).map(([date, dayItems]) => {
            const dayCost = dayItems.reduce((s, i) => s + (i.est_cost || 0), 0)
            return (
              <div key={date} className="tl-day">
                <div className="tl-day-head">
                  <span className="tl-day-badge">🗓 {formatDay(date)}</span>
                  <span className="muted small">
                    {dayItems.length} item{dayItems.length !== 1 ? 's' : ''}{dayCost > 0 ? ` · ~$${dayCost.toFixed(2)}` : ''}
                  </span>
                </div>
                <div className="tl-track">
                  {dayItems.map((item) => (
                    <div key={item.id} className="tl-node">
                      <div className="tl-time">{formatTime(item.time) || '—'}</div>
                      <div className="tl-rail"><span className="tl-dot">{CAT_ICONS[item.category] || '📌'}</span></div>
                      <div className="card tl-card">
                        <div className="tl-card-head">
                          <strong>{item.title}</strong>
                          {actions(item)}
                        </div>
                        {metaLine(item)}
                        {item.notes && <p className="muted small">{item.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        : Object.entries(byDate).map(([date, dayItems]) => (
            <div key={date} className="day-group">
              <h3>{date === 'Unscheduled' ? '🗓 Unscheduled' : `🗓 ${formatDay(date)}`}</h3>
              {dayItems.map((item) => (
                <div key={item.id} className="card itinerary-item">
                  <div className="item-main">
                    <span className="item-icon">{CAT_ICONS[item.category] || '📌'}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <p className="muted">
                        {item.time && `🕐 ${formatTime(item.time)} · `}
                        {item.location && `📍 ${item.location} · `}
                        {item.est_cost != null && `~$${item.est_cost}`}
                      </p>
                      {item.notes && <p className="muted small">{item.notes}</p>}
                    </div>
                  </div>
                  {actions(item)}
                </div>
              ))}
            </div>
          ))}
    </div>
  )
}
