import { useEffect, useState, useCallback } from 'react'
import { api } from '../api.js'
import { destinationTheme } from '../destinationTheme.js'
import ItineraryTab from '../components/ItineraryTab.jsx'
import ExpensesTab from '../components/ExpensesTab.jsx'
import BalancesTab from '../components/BalancesTab.jsx'
import SuggestionsTab from '../components/SuggestionsTab.jsx'
import MembersTab from '../components/MembersTab.jsx'

const TABS = ['Itinerary', 'Expenses', 'Balances', 'Suggestions', 'Members']

export default function TripDetailPage({ tripId }) {
  const [trip, setTrip] = useState(null)
  const [members, setMembers] = useState([])
  const [tab, setTab] = useState('Itinerary')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api(`/trips/${tripId}`)
      .then((d) => {
        setTrip(d.trip)
        setMembers(d.members)
      })
      .catch((e) => setError(e.message))
  }, [tripId])

  useEffect(() => { load() }, [load])

  // Tint the whole page background to match the destination while viewing a trip.
  const destination = trip?.destination
  useEffect(() => {
    if (!destination) return
    const t = destinationTheme(destination)
    document.body.style.setProperty('--th-a', t.glowA)
    document.body.style.setProperty('--th-b', t.glowB)
    document.body.classList.add('trip-theme')
    return () => {
      document.body.classList.remove('trip-theme')
      document.body.style.removeProperty('--th-a')
      document.body.style.removeProperty('--th-b')
    }
  }, [destination])

  if (error) return <p className="error">{error} — <a href="#/">back to trips</a></p>
  if (!trip) return <p className="muted">Loading trip…</p>

  const tabProps = { trip, members, refreshTrip: load }
  const theme = destinationTheme(trip.destination)

  return (
    <div>
      <div className="trip-hero" style={{ background: theme.hero }}>
        <a href="#/" className="trip-hero-back">← All trips</a>
        <span className="trip-hero-emoji" aria-hidden="true">{theme.emoji}</span>
        <h1>{trip.name}</h1>
        <p>
          📍 {trip.destination}
          {trip.start_date && ` · 📅 ${trip.start_date}${trip.end_date ? ` → ${trip.end_date}` : ''}`}
          {trip.budget != null && ` · 💰 budget $${trip.budget}`}
        </p>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Itinerary' && <ItineraryTab {...tabProps} />}
      {tab === 'Expenses' && <ExpensesTab {...tabProps} />}
      {tab === 'Balances' && <BalancesTab {...tabProps} />}
      {tab === 'Suggestions' && <SuggestionsTab {...tabProps} goToItinerary={() => setTab('Itinerary')} />}
      {tab === 'Members' && <MembersTab {...tabProps} />}
    </div>
  )
}
