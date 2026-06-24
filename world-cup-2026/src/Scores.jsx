export default function Scores({ matches }) {
  if (!matches.length) {
    return (
      <div className="empty">
        <div className="e">⚽</div>
        No matches found. Check back soon!
      </div>
    )
  }

  const live = matches.filter(m => m.statusType === 'STATUS_IN_PROGRESS')
  const today = matches.filter(m => {
    const now = new Date()
    const d = m.date
    return (
      m.statusType !== 'STATUS_IN_PROGRESS' &&
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  })
  const other = matches.filter(m =>
    m.statusType !== 'STATUS_IN_PROGRESS' &&
    !today.includes(m)
  )

  const sections = []
  if (live.length) sections.push({ label: '🔴 Live Now', games: live })
  if (today.length) sections.push({ label: "Today's Matches", games: today })
  if (other.length) sections.push({ label: 'Schedule', games: other.slice(0, 30) })

  return (
    <div>
      {sections.map(sec => (
        <div key={sec.label}>
          <div className="section-header">{sec.label}</div>
          {sec.games.map(m => <MatchCard key={m.id} match={m} />)}
        </div>
      ))}
    </div>
  )
}

function MatchCard({ match: m }) {
  const isLive = m.statusType === 'STATUS_IN_PROGRESS'
  const isFinal = m.statusType === 'STATUS_FINAL' || m.statusType === 'STATUS_FULL_TIME'
  const hasScore = m.home.score !== null

  return (
    <div className="match-card">
      <div className="match-meta">
        {isLive && (
          <span className="live-badge">
            <span className="live-dot" />
            Live
          </span>
        )}
        <span>{m.group ? m.group.toUpperCase() : 'World Cup 2026'}</span>
        {m.venue && <span>· {m.venue}</span>}
      </div>
      <div className="match-body">
        <div className="match-team">
          <div className="team-flag-name">
            <span className="team-flag">{m.home.flag}</span>
            <span className="team-name">{m.home.team}</span>
          </div>
        </div>

        <div className="match-center">
          {hasScore ? (
            <div className="score-display">
              <span className="score-num" style={m.home.winner ? { color: 'var(--green)' } : {}}>
                {m.home.score}
              </span>
              <span className="score-dash">–</span>
              <span className="score-num" style={m.away.winner ? { color: 'var(--green)' } : {}}>
                {m.away.score}
              </span>
            </div>
          ) : (
            <span className="vs-text">vs</span>
          )}
          <div className={`match-status ${isLive ? 'status-live' : isFinal ? 'status-ft' : 'status-upcoming'}`}>
            {isLive
              ? `${m.displayClock} ${m.period > 0 ? `(${m.period}')` : ''}`
              : isFinal
              ? 'FT'
              : m.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="match-team away">
          <div className="team-flag-name">
            <span className="team-name">{m.away.team}</span>
            <span className="team-flag">{m.away.flag}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
