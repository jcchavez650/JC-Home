import { useState } from 'react'
import './App.css'
import { useWorldCup } from './useWorldCup.js'
import { useLang } from './LangContext.jsx'
import Scores from './Scores.jsx'
import Groups from './Groups.jsx'
import Bracket from './Bracket.jsx'
import Games from './Games.jsx'
import Eliminated from './Eliminated.jsx'

export default function App() {
  const [tab, setTab] = useState('scores')
  const { matches, allGames, groups, bracketRounds, loading, error, lastUpdated, refreshing, refresh } = useWorldCup()
  const { lang, toggle, t } = useLang()

  const TABS = [
    { id: 'scores',    label: t.tabs.scores,    icon: '⚽' },
    { id: 'games',     label: t.tabs.games,     icon: '📅' },
    { id: 'groups',    label: t.tabs.groups,    icon: '📊' },
    { id: 'bracket',   label: t.tabs.bracket,   icon: '🏆' },
    { id: 'eliminated',label: t.tabs.eliminated,icon: '❌' },
  ]

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: t.title, url })
    } else {
      await navigator.clipboard.writeText(url)
      alert(t.shareCopied)
    }
  }

  return (
    <>
      <header className="header">
        <div>
          <div className="header-title">
            <span>🏆</span>
            {t.title}
          </div>
          <div className="header-subtitle">{t.subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="lang-toggle" onClick={toggle} aria-label="Toggle language">
            {lang === 'en' ? '🇲🇽 ES' : '🇺🇸 EN'}
          </button>
          <button
            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={refresh}
            aria-label={t.refresh}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M8 16H3v5" /><path d="M16 8h5V3" />
            </svg>
            {t.refresh}
          </button>
        </div>
      </header>

      <nav className="nav">
        {TABS.map(tb => (
          <button
            key={tb.id}
            className={`nav-tab ${tab === tb.id ? 'active' : ''}`}
            onClick={() => setTab(tb.id)}
          >
            <span className="tab-icon">{tb.icon}</span>
            {tb.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            {t.loading}
          </div>
        ) : error ? (
          <div className="error-box">
            ⚠️ {t.errorLoad}: {error}
            <br />
            <button style={{ marginTop: 8, color: 'var(--gold)', fontSize: 12 }} onClick={refresh}>
              {t.tryAgain}
            </button>
          </div>
        ) : (
          <>
            {lastUpdated && (
              <div className="last-updated">
                {t.updated} {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · {t.autoRefresh}
              </div>
            )}
            {tab === 'scores'  && <Scores matches={matches} />}
            {tab === 'games'   && <Games matches={allGames.length ? allGames : matches} allLoaded={allGames.length > 0} />}
            {tab === 'groups'  && <Groups groups={groups} />}
            {tab === 'bracket'    && <Bracket allGames={allGames} groups={groups} bracketRounds={bracketRounds} />}
            {tab === 'eliminated' && <Eliminated groups={groups} />}
          </>
        )}
      </main>

      <div className="share-bar">
        <button className="share-btn" onClick={share}>
          {t.share}
        </button>
      </div>
    </>
  )
}
