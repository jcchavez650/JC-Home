import { useState } from 'react'
import TeamFlag from './TeamFlag.jsx'
import { useLang } from './LangContext.jsx'
import HighlightsModal from './HighlightsModal.jsx'
import { useLiveClock } from './useLiveClock.js'

export function formatGroupLabel(slug, date) {
  const g = (slug ?? '').match(/group[-\s]([a-l])/i)
  if (g) return `Group ${g[1].toUpperCase()}`
  if (slug) {
    if (slug.includes('round-of-32') || slug.includes('round of 32')) return 'Round of 32'
    if (slug.includes('round-of-16') || slug.includes('round of 16')) return 'Round of 16'
    if (slug.includes('quarter')) return 'Quarterfinal'
    if (slug.includes('semi')) return 'Semifinal'
    if (slug.includes('final')) return 'Final'
  }
  // ESPN's slug is often just "fifa-world-cup" — derive the round from the
  // official 2026 knockout calendar instead of showing a generic label.
  if (date instanceof Date && !isNaN(date) && date.getFullYear() === 2026) {
    const mo = date.getMonth(), day = date.getDate()
    if (mo === 5 && day >= 28) return 'Round of 32'
    if (mo === 6) {
      if (day <= 3)               return 'Round of 32'
      if (day >= 4  && day <= 7)  return 'Round of 16'
      if (day >= 9  && day <= 11) return 'Quarterfinal'
      if (day >= 14 && day <= 15) return 'Semifinal'
      if (day === 18)             return '3rd Place'
      if (day === 19)             return 'Final'
    }
  }
  const cleaned = (slug ?? '').replace(/-/g, ' ').replace(/fifa\s*world(\s*cup)?/gi, '').trim().toUpperCase()
  return cleaned || 'World Cup 2026'
}

export default function Scores({ matches }) {
  const { t } = useLang()

  if (!matches.length) {
    return (
      <div className="empty">
        <div className="e">⚽</div>
        {t.noMatches}
      </div>
    )
  }

  const now = new Date()
  const isFinished = m => m.statusType === 'STATUS_FINAL' || m.statusType === 'STATUS_FULL_TIME'
  const isLiveStatus = m => m.statusType === 'STATUS_IN_PROGRESS'
  // Treat a game as live if ESPN says so, OR if its start time has passed (within ~2hrs) and it's not finished
  const isProbablyLive = m => isLiveStatus(m) || (!isFinished(m) && m.date <= now && now - m.date < 2 * 60 * 60 * 1000)

  const live = matches.filter(isProbablyLive)
  const today = matches.filter(m => {
    const d = m.date
    return (
      !isProbablyLive(m) &&
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  })
  const upcoming = matches
    .filter(m => !isProbablyLive(m) && !today.includes(m) && m.date > now)
    .slice(0, 20)
  const recent = matches
    .filter(m => isFinished(m) && !today.includes(m))
    .slice(0, 10)

  const sections = []
  if (live.length) sections.push({ label: t.liveNow, games: live })
  if (today.length) sections.push({ label: t.todayMatches, games: today })
  if (upcoming.length) sections.push({ label: t.upcoming, games: upcoming })
  if (recent.length) sections.push({ label: t.recentResults, games: recent })

  if (!sections.length) {
    sections.push({ label: t.allMatches, games: matches.slice(0, 30) })
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
  const { t, tn } = useLang()
  const [showClips, setShowClips] = useState(false)
  const isFinal = m.statusType === 'STATUS_FINAL' || m.statusType === 'STATUS_FULL_TIME'
  const now2 = new Date()
  const isLive = m.statusType === 'STATUS_IN_PROGRESS' || (!isFinal && m.date <= now2 && now2 - m.date < 2 * 60 * 60 * 1000)
  const hasScore = m.home.score !== null
  const canHighlight = isFinal || isLive
  const liveClock = useLiveClock(m.displayClock, isLive)

  const shareMatch = async () => {
    const home = tn(m.home.team, m.home.abbr)
    const away = tn(m.away.team, m.away.abbr)
    const score = hasScore ? `${m.home.score}–${m.away.score}` : 'vs'
    const status = isFinal ? ' (FT)' : isLive ? ` (${liveClock || 'Live'})` : ` · ${m.date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    const text = `${home} ${score} ${away}${status} — World Cup 2026`
    if (navigator.share) {
      await navigator.share({ title: text, url: window.location.href }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(text).catch(() => {})
    }
  }

  return (
    <>
    {showClips && <HighlightsModal match={m} onClose={() => setShowClips(false)} />}
    <div className="match-card">
      <div className="match-meta">
        {isLive && (
          <span className="live-badge">
            <span className="live-dot" />
            {t.live}
          </span>
        )}
        <span>{formatGroupLabel(m.group, m.date)}</span>
        {m.venue && <span>· {m.venue}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {canHighlight && (
            <button className="highlights-btn" onClick={() => setShowClips(true)}>
              ▶ Highlights
            </button>
          )}
          <button className="highlights-btn" onClick={shareMatch} title="Share this match">
            📤
          </button>
        </div>
      </div>

      <div className="match-body">
        {/* Home team */}
        <div className="match-team">
          <TeamFlag abbr={m.home.abbr} logo={m.home.logo} size={36} />
          <div className="team-info">
            <div className="team-name" style={m.home.winner ? { color: 'var(--green)' } : {}}>
              {tn(m.home.team, m.home.abbr)}
            </div>
            <div className="team-abbr">{m.home.abbr}</div>
          </div>
        </div>

        {/* Center: score or time */}
        <div className="match-center">
          {hasScore ? (
            <div className={`score-display ${isLive && !isFinal ? 'score-live' : ''}`}>
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
              ? `${liveClock || "'"}`
              : isFinal
              ? t.ft
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
              {tn(m.away.team, m.away.abbr)}
            </div>
            <div className="team-abbr">{m.away.abbr}</div>
          </div>
          <TeamFlag abbr={m.away.abbr} logo={m.away.logo} size={36} />
        </div>
      </div>

      {/* Win probability bar */}
      {m.homeWinPct != null && !isFinal && (
        <WinProbBar home={m.homeWinPct} draw={m.drawPct} away={m.awayWinPct}
          homeAbbr={m.home.abbr} awayAbbr={m.away.abbr} />
      )}
    </div>
    </>
  )
}

export function WinProbBar({ home, draw, away, homeAbbr, awayAbbr }) {
  // Proportion bar: home-win ↔ draw ↔ away-win. Colors follow the data-viz
  // diverging pattern — blue pole / neutral gray midpoint / red pole — with
  // direct labels + 2px surface gaps as secondary (non-color) encoding.
  const d = draw ?? 0
  const label = `${homeAbbr} ${home}% · Draw ${d}% · ${awayAbbr} ${away}%`
  return (
    <div className="prob-bar-wrap">
      <div className="prob-caption">Win probability</div>
      <div className="prob-bar" role="img" aria-label={label}>
        <div className="prob-seg prob-home" style={{ width: `${home}%` }} title={`${homeAbbr} ${home}%`} />
        {d > 0 && <div className="prob-seg prob-draw" style={{ width: `${d}%` }} title={`Draw ${d}%`} />}
        <div className="prob-seg prob-away" style={{ width: `${away}%` }} title={`${awayAbbr} ${away}%`} />
      </div>
      <div className="prob-legend">
        <span className="prob-key"><i className="prob-chip prob-chip-home" />{homeAbbr} {home}%</span>
        <span className="prob-key"><i className="prob-chip prob-chip-draw" />Draw {d}%</span>
        <span className="prob-key"><i className="prob-chip prob-chip-away" />{awayAbbr} {away}%</span>
      </div>
    </div>
  )
}
