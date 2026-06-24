import { useState, useMemo } from 'react'
import TeamFlag from './TeamFlag.jsx'
import { useLang } from './LangContext.jsx'

export default function Games({ matches, allLoaded }) {
  const [filter, setFilter] = useState('all')
  const { t } = useLang()

  const grouped = useMemo(() => {
    const sorted = [...matches].sort((a, b) => a.date - b.date)
    const filtered = filter === 'all' ? sorted
      : filter === 'live' ? sorted.filter(m => m.statusType === 'STATUS_IN_PROGRESS')
      : filter === 'done' ? sorted.filter(m => m.statusType === 'STATUS_FINAL' || m.statusType === 'STATUS_FULL_TIME')
      : sorted.filter(m => m.statusType !== 'STATUS_FINAL' && m.statusType !== 'STATUS_FULL_TIME' && m.statusType !== 'STATUS_IN_PROGRESS')

    // Group by date — use a sortable key so dates stay in order
    const byDate = {}
    filtered.forEach(m => {
      const key = m.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      if (!byDate[key]) byDate[key] = []
      byDate[key].push(m)
    })
    return byDate
  }, [matches, filter])

  const liveCount = matches.filter(m => m.statusType === 'STATUS_IN_PROGRESS').length

  return (
    <div>
      {!allLoaded && (
        <div style={{ padding: '6px 12px 0', fontSize: 11, color: 'var(--text2)', textAlign: 'center' }}>
          {t.todayOnly}
        </div>
      )}
      {/* Filter pills */}
      <div className="filter-bar">
        {[
          { key: 'all', label: t.all },
          { key: 'live', label: liveCount ? `${t.live} (${liveCount})` : t.live },
          { key: 'upcoming', label: t.upcoming },
          { key: 'done', label: t.finished },
        ].map(f => (
          <button
            key={f.key}
            className={`filter-pill ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="empty"><div className="e">📅</div>{t.noGamesFound}</div>
      ) : (
        Object.entries(grouped).map(([date, games]) => (
          <div key={date}>
            <div className="section-header">{date}</div>
            {games.map(m => <GameRow key={m.id} match={m} />)}
          </div>
        ))
      )}
    </div>
  )
}

function GameRow({ match: m }) {
  const { t, tn } = useLang()
  const isLive = m.statusType === 'STATUS_IN_PROGRESS'
  const isFinal = m.statusType === 'STATUS_FINAL' || m.statusType === 'STATUS_FULL_TIME'
  const hasScore = m.home.score !== null

  return (
    <div className="game-row">
      {/* Status column */}
      <div className="game-status-col">
        {isLive ? (
          <span className="game-status-live">
            <span className="live-dot" style={{ background: 'var(--red)' }} />
            {m.displayClock || t.live}
          </span>
        ) : isFinal ? (
          <span className="game-status-ft">{t.ft}</span>
        ) : (
          <span className="game-status-time">
            {m.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <span className="game-group-label">
          {m.group ? m.group.replace(/-/g, ' ').replace(/fifa world/i, '').trim().toUpperCase() : ''}
        </span>
      </div>

      {/* Teams + score */}
      <div className="game-teams">
        <div className={`game-team ${m.home.winner ? 'game-winner' : ''}`}>
          <TeamFlag abbr={m.home.abbr} logo={m.home.logo} size={18} />
          <span className="game-team-name">{tn(m.home.team, m.home.abbr)}</span>
        </div>
        <div className={`game-team ${m.away.winner ? 'game-winner' : ''}`}>
          <TeamFlag abbr={m.away.abbr} logo={m.away.logo} size={18} />
          <span className="game-team-name">{tn(m.away.team, m.away.abbr)}</span>
        </div>
      </div>

      {/* Score column */}
      <div className="game-score-col">
        {hasScore ? (
          <>
            <span className={`game-score-num ${m.home.winner ? 'game-winner' : ''}`}>{m.home.score}</span>
            <span className={`game-score-num ${m.away.winner ? 'game-winner' : ''}`}>{m.away.score}</span>
          </>
        ) : (
          <>
            <span className="game-score-dash">—</span>
            <span className="game-score-dash">—</span>
          </>
        )}
      </div>
    </div>
  )
}
