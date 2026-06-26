import { useState, useMemo } from 'react'
import TeamFlag from './TeamFlag.jsx'
import { useLang } from './LangContext.jsx'
import HighlightsModal from './HighlightsModal.jsx'
import { useLiveClock } from './useLiveClock.js'
import { WinProbBar, formatGroupLabel } from './Scores.jsx'

export default function Games({ matches, allLoaded }) {
  const [filter, setFilter] = useState('all')
  const [teamFilter, setTeamFilter] = useState('')
  const [teamSearch, setTeamSearch] = useState('')
  const [showTeamPicker, setShowTeamPicker] = useState(false)
  const { t, tn, lang } = useLang()

  // Collect unique teams from all matches
  const allTeams = useMemo(() => {
    const seen = new Map()
    matches.forEach(m => {
      if (m.home.abbr && !seen.has(m.home.abbr)) seen.set(m.home.abbr, { abbr: m.home.abbr, team: m.home.team, logo: m.home.logo })
      if (m.away.abbr && !seen.has(m.away.abbr)) seen.set(m.away.abbr, { abbr: m.away.abbr, team: m.away.team, logo: m.away.logo })
    })
    return [...seen.values()].sort((a, b) => a.team.localeCompare(b.team))
  }, [matches])

  const filteredTeams = useMemo(() =>
    teamSearch
      ? allTeams.filter(t => t.team.toLowerCase().includes(teamSearch.toLowerCase()) || t.abbr.toLowerCase().includes(teamSearch.toLowerCase()))
      : allTeams,
    [allTeams, teamSearch]
  )

  const grouped = useMemo(() => {
    let sorted = [...matches].sort((a, b) => a.date - b.date)

    // Apply team filter first
    if (teamFilter) {
      sorted = sorted.filter(m => m.home.abbr === teamFilter || m.away.abbr === teamFilter)
    }

    const filtered = filter === 'all' ? sorted
      : filter === 'live' ? sorted.filter(m => {
          const fin = m.statusType === 'STATUS_FINAL' || m.statusType === 'STATUS_FULL_TIME'
          const nowF = new Date()
          return m.statusType === 'STATUS_IN_PROGRESS' || (!fin && m.date <= nowF && nowF - m.date < 2 * 60 * 60 * 1000)
        })
      : filter === 'done' ? sorted.filter(m => m.statusType === 'STATUS_FINAL' || m.statusType === 'STATUS_FULL_TIME')
      : sorted.filter(m => {
          const fin = m.statusType === 'STATUS_FINAL' || m.statusType === 'STATUS_FULL_TIME'
          const nowF = new Date()
          const probLive = m.statusType === 'STATUS_IN_PROGRESS' || (!fin && m.date <= nowF && nowF - m.date < 2 * 60 * 60 * 1000)
          return !fin && !probLive
        })

    // Group by date
    const byDate = {}
    filtered.forEach(m => {
      const key = m.date.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      if (!byDate[key]) byDate[key] = []
      byDate[key].push(m)
    })
    return byDate
  }, [matches, filter, teamFilter])

  const nowLc = new Date()
  const liveCount = matches.filter(m => {
    const fin = m.statusType === 'STATUS_FINAL' || m.statusType === 'STATUS_FULL_TIME'
    return m.statusType === 'STATUS_IN_PROGRESS' || (!fin && m.date <= nowLc && nowLc - m.date < 2 * 60 * 60 * 1000)
  }).length
  const selectedTeam = allTeams.find(t => t.abbr === teamFilter)

  return (
    <div>
      {!allLoaded && (
        <div style={{ padding: '6px 12px 0', fontSize: 11, color: 'var(--text2)', textAlign: 'center' }}>
          {t.todayOnly}
        </div>
      )}

      {/* Team filter */}
      <div className="team-filter-bar">
        <button
          className={`team-filter-btn ${teamFilter ? 'active' : ''}`}
          onClick={() => setShowTeamPicker(p => !p)}
        >
          {selectedTeam ? (
            <>
              <TeamFlag abbr={selectedTeam.abbr} logo={selectedTeam.logo} size={16} />
              <span>{tn(selectedTeam.team, selectedTeam.abbr)}</span>
              <span className="team-filter-clear" onClick={e => { e.stopPropagation(); setTeamFilter(''); setShowTeamPicker(false) }}>✕</span>
            </>
          ) : (
            <span>{t.filterByTeam ?? 'Filter by Team'}</span>
          )}
        </button>
      </div>

      {showTeamPicker && (
        <div className="team-picker">
          <input
            className="team-search-input"
            placeholder={t.searchTeam ?? 'Search team…'}
            value={teamSearch}
            onChange={e => setTeamSearch(e.target.value)}
            autoFocus
          />
          <div className="team-picker-list">
            {filteredTeams.map(team => (
              <button
                key={team.abbr}
                className={`team-picker-item ${teamFilter === team.abbr ? 'active' : ''}`}
                onClick={() => { setTeamFilter(team.abbr); setShowTeamPicker(false); setTeamSearch('') }}
              >
                <TeamFlag abbr={team.abbr} logo={team.logo} size={20} />
                <span>{tn(team.team, team.abbr)}</span>
                <span className="team-picker-abbr">{team.abbr}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status filter pills */}
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
  const [showClips, setShowClips] = useState(false)
  const isFinal = m.statusType === 'STATUS_FINAL' || m.statusType === 'STATUS_FULL_TIME'
  const nowGr = new Date()
  const isLive = m.statusType === 'STATUS_IN_PROGRESS' || (!isFinal && m.date <= nowGr && nowGr - m.date < 2 * 60 * 60 * 1000)
  const canHighlight = isFinal || isLive
  const hasScore = m.home.score !== null
  const liveClock = useLiveClock(m.displayClock, isLive)

  return (
    <>
    {showClips && <HighlightsModal match={m} onClose={() => setShowClips(false)} />}
    <div className="game-row">
      {/* Status column */}
      <div className="game-status-col">
        {isLive ? (
          <span className="game-status-live">
            <span className="live-dot" style={{ background: 'var(--red)' }} />
            {liveClock || t.live}
          </span>
        ) : isFinal ? (
          <span className="game-status-ft">{t.ft}</span>
        ) : (
          <span className="game-status-time">
            {m.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <span className="game-group-label">{formatGroupLabel(m.group)}</span>
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

      {/* Highlights button */}
      {canHighlight && (
        <button className="highlights-btn" onClick={() => setShowClips(true)}>
          ▶
        </button>
      )}
    </div>
    {m.homeWinPct != null && !isFinal && (
      <WinProbBar home={m.homeWinPct} draw={m.drawPct} away={m.awayWinPct}
        homeAbbr={m.home.abbr} awayAbbr={m.away.abbr} />
    )}
    </>
  )
}
