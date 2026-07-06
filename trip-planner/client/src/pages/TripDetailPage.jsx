import { useEffect, useState, useCallback } from 'react'
import { api } from '../api.js'
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

  if (error) return <p className="error">{error} — <a href="#/">back to trips</a></p>
  if (!trip) return <p className="muted">Loading trip…</p>

  const tabProps = { trip, members, refreshTrip: load }

  return (
    <div>
      <a href="#/" className="muted back-link">← All trips</a>
      <div className="page-head">
        <div>
          <h1>{trip.name}</h1>
          <p className="muted">
            📍 {trip.destination}
            {trip.start_date && ` · 📅 ${trip.start_date}${trip.end_date ? ` → ${trip.end_date}` : ''}`}
            {trip.budget != null && ` · 💰 budget $${trip.budget}`}
          </p>
        </div>
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
