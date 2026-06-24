import TeamFlag from './TeamFlag.jsx'

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
  const now = new Date()
  const today = matches.filter(m => {
    const d = m.date
    return (
      m.statusType !== 'STATUS_IN_PROGRESS' &&
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  })
  const upcoming = matches
    .filter(m => m.statusType !== 'STATUS_IN_PROGRESS' && !today.includes(m) && m.date > now)
    .slice(0, 20)
  const recent = matches
    .filter(m => (m.statusType === 'STATUS_FINAL' || m.statusType === 'STATUS_FULL_TIME') && !today.includes(m))
    .slice(0, 10)

  const sections = []
  if (live.length) sections.push({ label: '🔴 Live Now', games: live })
  if (today.length) sections.push({ label: "Today's Matches", games: today })
  if (upcoming.length) sections.push({ label: 'Upcoming', games: upcoming })
  if (recent.length) sections.push({ label: 'Recent Results', games: recent })

  if (!sections.length) {
    sections.push({ label: 'All Matches', games: matches.slice(0, 30) })
  }

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
        <span>{m.group ? m.group.replace(/-/g, ' ').toUpperCase() : 'World Cup 2026'}</span>
        {m.venue && <span>· {m.venue}</span>}
      </div>

      <div className="match-body">
        {/* Home team */}
        <div className="match-team">
          <TeamFlag abbr={m.home.abbr} logo={m.home.logo} size={36} />
          <div className="team-info">
            <div className="team-name" style={m.home.winner ? { color: 'var(--green)' } : {}}>
              {m.home.team}
            </div>
            <div className="team-abbr">{m.home.abbr}</div>
          </div>
        </div>

        {/* Center: score or time */}
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
              ? `${m.displayClock || "'"}`
              : isFinal
              ? 'FT'
              : m.date.toLocaleString([], {
                  month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
          </div>
        </div>

        {/* Away team */}
        <div className="match-team away">
          <div className="team-info" style={{ textAlign: 'right' }}>
            <div className="team-name" style={m.away.winner ? { color: 'var(--green)' } : {}}>
              {m.away.team}
            </div>
            <div className="team-abbr">{m.away.abbr}</div>
          </div>
          <TeamFlag abbr={m.away.abbr} logo={m.away.logo} size={36} />
        </div>
      </div>
    </div>
  )
}
