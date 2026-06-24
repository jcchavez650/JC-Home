import { useState } from 'react'
import './App.css'
import { useWorldCup } from './useWorldCup.js'
import Scores from './Scores.jsx'
import Groups from './Groups.jsx'
import Bracket from './Bracket.jsx'

const TABS = [
  { id: 'scores', label: 'Scores', icon: '⚽' },
  { id: 'groups', label: 'Groups', icon: '📊' },
  { id: 'bracket', label: 'Bracket', icon: '🏆' },
]

export default function App() {
  const [tab, setTab] = useState('scores')
  const { matches, groups, loading, error, lastUpdated, refreshing, refresh } = useWorldCup()

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: 'World Cup 2026 Tracker', url })
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copied!')
    }
  }

  return (
    <>
      <header className="header">
        <div>
          <div className="header-title">
            <span>🏆</span>
            World Cup 2026
          </div>
          <div className="header-subtitle">USA · Canada · Mexico</div>
        </div>
        <button
          className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick={refresh}
          aria-label="Refresh"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M8 16H3v5" /><path d="M16 8h5V3" />
          </svg>
          Refresh
        </button>
      </header>

      <nav className="nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`nav-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            Loading World Cup 2026 data…
          </div>
        ) : error ? (
          <div className="error-box">
            ⚠️ Could not load data: {error}
            <br />
            <button style={{ marginTop: 8, color: 'var(--gold)', fontSize: 12 }} onClick={refresh}>
              Try again
            </button>
          </div>
        ) : (
          <>
            {lastUpdated && (
              <div className="last-updated">
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · auto-refreshes every 60s
              </div>
            )}
            {tab === 'scores' && <Scores matches={matches} />}
            {tab === 'groups' && <Groups groups={groups} />}
            {tab === 'bracket' && <Bracket matches={matches} />}
          </>
        )}
      </main>

      <div className="share-bar">
        <button className="share-btn" onClick={share}>
          📤 Share this tracker
        </button>
      </div>
    </>
  )
}
