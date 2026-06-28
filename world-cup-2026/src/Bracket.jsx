import { useState } from 'react'
import TeamFlag from './TeamFlag.jsx'
import { useLang } from './LangContext.jsx'

function getGroupQualifiers(groups) {
  const map = {}
  groups.forEach(g => {
    const letter = g.name?.trim().toUpperCase()
    if (!letter || !g.teams.length) return

    const gp = g.teams[0]?.gp ?? 0
    const complete = gp >= 3
    const thirdPts = g.teams[2]?.pts ?? 0

    const isConfirmed = (team, i) =>
      (complete && i < 2) ||
      (gp >= 2 && team.pts >= 6) ||
      (gp >= 2 && i < 2 && team.pts >= 4 && thirdPts === 0)

    const leader   = g.teams[0] ? { ...g.teams[0], confirmed: isConfirmed(g.teams[0], 0) } : null
    const runnerUp = g.teams[1] ? { ...g.teams[1], confirmed: isConfirmed(g.teams[1], 1) } : null

    map[letter] = {
      w:  gp > 0 ? leader   : null,
      ru: gp > 0 ? runnerUp : null,
    }
  })
  return map
}

const R32_PAIRS = [
  { home: ['A','w'], away: ['B','ru'] },
  { home: ['C','w'], away: ['D','ru'] },
  { home: ['E','w'], away: ['F','ru'] },
  { home: ['G','w'], away: ['H','ru'] },
  { home: ['I','w'], away: ['J','ru'] },
  { home: ['K','w'], away: ['L','ru'] },
  { home: ['*3rd',''], away: ['*3rd',''] },
  { home: ['*3rd',''], away: ['*3rd',''] },
  { home: ['B','w'], away: ['A','ru'] },
  { home: ['D','w'], away: ['C','ru'] },
  { home: ['F','w'], away: ['E','ru'] },
  { home: ['H','w'], away: ['G','ru'] },
  { home: ['J','w'], away: ['I','ru'] },
  { home: ['L','w'], away: ['K','ru'] },
  { home: ['*3rd',''], away: ['*3rd',''] },
  { home: ['*3rd',''], away: ['*3rd',''] },
]

function resolveTeam(ref, groupMap) {
  const [g, pos] = ref
  if (g.startsWith('*')) return null
  return groupMap[g]?.[pos] ?? null
}

function labelFor([g, pos], t) {
  if (g.startsWith('*')) return t?.thirdPlace ?? '3rd Place'
  return `${pos === 'w' ? (t?.confirmed ?? '1st') : (t?.runnerUp ?? '2nd')} ${t?.group ?? 'Group'} ${g}`
}

function getRoundKey(m) {
  const slug = (m.group ?? '').toLowerCase()
  const name = (m.name ?? '').toLowerCase()
  const text = slug + ' ' + name

  if (text.includes('round-of-32') || text.includes('round of 32')) return 'r32'
  if (text.includes('round-of-16') || text.includes('round of 16')) return 'r16'
  if (text.includes('quarter')) return 'qf'
  if (text.includes('semi')) return 'sf'
  if (text.includes('third') || text.includes('3rd place')) return '3p'
  if (text.includes('final')) return 'f'

  const d = m.date
  if (d && d.getFullYear() === 2026 && d.getMonth() === 6) {
    const day = d.getDate()
    if (day >= 4  && day <= 7)  return 'r32'
    if (day >= 10 && day <= 12) return 'r16'
    if (day >= 15 && day <= 16) return 'qf'
    if (day >= 18 && day <= 19) return 'sf'
    if (day === 21)              return '3p'
    if (day >= 22)               return 'f'
  }
  return null
}

export default function Bracket({ allGames, groups, bracketRounds }) {
  const { t } = useLang()
  const groupMap = getGroupQualifiers(groups)

  const confirmedAbbrs = new Set()
  Object.values(groupMap).forEach(({ w, ru }) => {
    if (w?.confirmed)  confirmedAbbrs.add(w.abbr)
    if (ru?.confirmed) confirmedAbbrs.add(ru.abbr)
  })

  const ROUNDS = [
    { key: 'r32', label: t.roundOf32  ?? 'Round of 32',    full: t.roundOf32  ?? 'Round of 32',    count: 16 },
    { key: 'r16', label: t.roundOf16  ?? 'Round of 16',    full: t.roundOf16  ?? 'Round of 16',    count: 8  },
    { key: 'qf',  label: t.quarterfinals ?? 'Quarterfinals', full: t.quarterfinals ?? 'Quarterfinals', count: 4  },
    { key: 'sf',  label: t.semifinals ?? 'Semifinals',     full: t.semifinals ?? 'Semifinals',     count: 2  },
    { key: 'f',   label: t.final,                           full: t.final,                           count: 1  },
  ]

  // ── Priority 1: ESPN bracket API ─────────────────────────────────────────
  if (bracketRounds.length > 0) {
    return (
      <div className="bk-page">
        {bracketRounds.map((round, ri) => (
          <RoundSection key={ri} title={round.name} defaultOpen={ri === 0}>
            {round.seeds.map((seed, i) => (
              <EspnMatchCard key={seed.id ?? i} seed={seed} confirmedAbbrs={confirmedAbbrs} />
            ))}
          </RoundSection>
        ))}
        <QualifiersSection groups={groups} groupMap={groupMap} />
      </div>
    )
  }

  // ── Priority 2: allGames classified by round ──────────────────────────────
  const byRound = {}
  ;(allGames ?? []).forEach(m => {
    const key = getRoundKey(m)
    if (!key) return
    if (!byRound[key]) byRound[key] = []
    byRound[key].push(m)
  })
  const hasKnockout = Object.keys(byRound).length > 0

  return (
    <div className="bk-page">
      {ROUNDS.map((round, ri) => {
        const games = hasKnockout ? byRound[round.key] : null
        const isFirst = ri === 0
        return (
          <RoundSection key={round.key} title={round.full} defaultOpen={isFirst || !!games?.some(m => m.home.score !== null)}>
            {games
              ? games.map(m => (
                  <LiveMatchCard key={m.id} match={m} confirmedAbbrs={confirmedAbbrs} />
                ))
              : round.key === 'r32'
              ? R32_PAIRS.map((pair, i) => (
                  <SlotCard
                    key={i}
                    homeTeam={resolveTeam(pair.home, groupMap)}
                    awayTeam={resolveTeam(pair.away, groupMap)}
                    homeLabel={labelFor(pair.home, t)}
                    awayLabel={labelFor(pair.away, t)}
                  />
                ))
              : Array.from({ length: round.count }).map((_, i) => (
                  <SlotCard key={i} />
                ))
            }
          </RoundSection>
        )
      })}
      <QualifiersSection groups={groups} groupMap={groupMap} />
    </div>
  )
}

// ── Collapsible round section ─────────────────────────────────────────────
function RoundSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const count = Array.isArray(children) ? children.length : 1
  return (
    <div className="bk-round">
      <button className="bk-round-header" onClick={() => setOpen(o => !o)}>
        <span className="bk-round-title">{title}</span>
        <span className="bk-round-meta">{count} {count === 1 ? 'match' : 'matches'}</span>
        <span className="bk-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="bk-round-body">{children}</div>}
    </div>
  )
}

// ── Match card used for Priority 2 (allGames) ────────────────────────────
function LiveMatchCard({ match: m, confirmedAbbrs }) {
  const { tn } = useLang()
  const hasScore = m.home.score !== null
  const isFinal  = m.statusType === 'STATUS_FINAL' || m.statusType === 'STATUS_FULL_TIME'
  const isLive   = m.statusType === 'STATUS_IN_PROGRESS'

  return (
    <div className="bk-card">
      <TeamSide
        side={m.home}
        score={hasScore ? m.home.score : null}
        isWinner={!!m.home.winner}
        confirmedAbbrs={confirmedAbbrs}
        align="left"
      />
      <div className="bk-card-center">
        {hasScore ? (
          <>
            <div className={`bk-score ${isLive ? 'bk-score-live' : ''}`}>
              <span style={m.home.winner ? { color: 'var(--green)' } : {}}>{m.home.score}</span>
              <span className="bk-score-dash">–</span>
              <span style={m.away.winner ? { color: 'var(--green)' } : {}}>{m.away.score}</span>
            </div>
            <div className="bk-status">{isLive ? '🔴 Live' : isFinal ? 'FT' : ''}</div>
          </>
        ) : (
          <>
            <div className="bk-vs">vs</div>
            <div className="bk-date">
              {m.date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </div>
          </>
        )}
      </div>
      <TeamSide
        side={m.away}
        score={hasScore ? m.away.score : null}
        isWinner={!!m.away.winner}
        confirmedAbbrs={confirmedAbbrs}
        align="right"
      />
    </div>
  )
}

// ── Match card used for Priority 1 (ESPN bracket seeds) ──────────────────
function EspnMatchCard({ seed, confirmedAbbrs }) {
  const hasScore = seed.homeScore !== null
  return (
    <div className="bk-card">
      <EspnSide side={seed.home} score={seed.homeScore} confirmedAbbrs={confirmedAbbrs} align="left" />
      <div className="bk-card-center">
        {hasScore ? (
          <div className="bk-score">
            <span style={seed.home?.winner ? { color: 'var(--green)' } : {}}>{seed.homeScore}</span>
            <span className="bk-score-dash">–</span>
            <span style={seed.away?.winner ? { color: 'var(--green)' } : {}}>{seed.awayScore}</span>
          </div>
        ) : (
          <div className="bk-vs">vs</div>
        )}
      </div>
      <EspnSide side={seed.away} score={seed.awayScore} confirmedAbbrs={confirmedAbbrs} align="right" />
    </div>
  )
}

// ── Pre-group-stage slot card (projected seedings) ────────────────────────
function SlotCard({ homeTeam, awayTeam, homeLabel, awayLabel }) {
  return (
    <div className="bk-card">
      <SlotSide team={homeTeam} label={homeLabel} align="left" />
      <div className="bk-card-center"><div className="bk-vs">vs</div></div>
      <SlotSide team={awayTeam} label={awayLabel} align="right" />
    </div>
  )
}

// ── Team side components ──────────────────────────────────────────────────
function TeamSide({ side, isWinner, confirmedAbbrs, align }) {
  const { tn } = useLang()
  const isKnown = !!side?.abbr
  const isGroupConfirmed = isKnown && confirmedAbbrs?.has(side.abbr)
  const isConfirmed = isWinner || isGroupConfirmed
  const isLeading   = isKnown && !isConfirmed
  const right = align === 'right'

  return (
    <div className={`bk-side ${right ? 'bk-side-right' : ''} ${isWinner ? 'bk-side-winner' : ''} ${isConfirmed ? 'bk-side-confirmed' : ''} ${isLeading ? 'bk-side-leading' : ''}`}>
      <TeamFlag abbr={side?.abbr} logo={side?.logo} size={32} />
      <div className={`bk-side-info ${right ? 'bk-side-info-right' : ''}`}>
        <span className="bk-side-name">{isKnown ? tn(side.team, side.abbr) : 'TBD'}</span>
        <span className="bk-side-abbr">{side?.abbr || '—'}</span>
      </div>
      {isGroupConfirmed && <span className="bk-badge bk-badge-confirmed">✓</span>}
      {isLeading         && <span className="bk-badge bk-badge-leading">~</span>}
    </div>
  )
}

function EspnSide({ side, confirmedAbbrs, align }) {
  const { tn } = useLang()
  if (!side) return <TbdSide align={align} />
  const isGroupConfirmed = side.abbr && confirmedAbbrs?.has(side.abbr)
  const isKnockoutWinner = !!side.winner
  const isConfirmed = isKnockoutWinner || isGroupConfirmed
  const isLeading   = side.abbr && !isConfirmed
  const right = align === 'right'

  return (
    <div className={`bk-side ${right ? 'bk-side-right' : ''} ${isKnockoutWinner ? 'bk-side-winner' : ''} ${isConfirmed ? 'bk-side-confirmed' : ''} ${isLeading ? 'bk-side-leading' : ''}`}>
      <TeamFlag abbr={side.abbr} logo={side.logo} size={32} />
      <div className={`bk-side-info ${right ? 'bk-side-info-right' : ''}`}>
        <span className="bk-side-name">{tn(side.team, side.abbr)}</span>
        <span className="bk-side-abbr">{side.abbr || '—'}</span>
      </div>
      {isGroupConfirmed  && <span className="bk-badge bk-badge-confirmed">✓</span>}
      {isLeading         && <span className="bk-badge bk-badge-leading">~</span>}
    </div>
  )
}

function SlotSide({ team, label, align }) {
  const { tn } = useLang()
  const right = align === 'right'
  if (!team) {
    return (
      <div className={`bk-side bk-side-tbd ${right ? 'bk-side-right' : ''}`}>
        <div className="bk-flag-ph" />
        <div className={`bk-side-info ${right ? 'bk-side-info-right' : ''}`}>
          <span className="bk-side-name bk-tbd-text">{label ?? 'TBD'}</span>
        </div>
      </div>
    )
  }
  return (
    <div className={`bk-side ${right ? 'bk-side-right' : ''} ${team.confirmed ? 'bk-side-confirmed' : 'bk-side-leading'}`}>
      <TeamFlag abbr={team.abbr} logo={team.logo} size={32} />
      <div className={`bk-side-info ${right ? 'bk-side-info-right' : ''}`}>
        <span className="bk-side-name">{tn(team.team, team.abbr)}</span>
        <span className="bk-side-abbr">{team.abbr}</span>
      </div>
      {team.confirmed
        ? <span className="bk-badge bk-badge-confirmed">✓</span>
        : <span className="bk-badge bk-badge-leading">~</span>
      }
    </div>
  )
}

function TbdSide({ align }) {
  const right = align === 'right'
  return (
    <div className={`bk-side bk-side-tbd ${right ? 'bk-side-right' : ''}`}>
      <div className="bk-flag-ph" />
      <div className={`bk-side-info ${right ? 'bk-side-info-right' : ''}`}>
        <span className="bk-side-name bk-tbd-text">TBD</span>
      </div>
    </div>
  )
}

// ── Qualifiers grid (unchanged logic, refreshed style) ────────────────────
function QualifiersSection({ groups, groupMap }) {
  const { t } = useLang()
  if (!groups.length) return null
  return (
    <div className="bk-qual-section">
      <div className="bk-qual-title">{t.qualifiers}</div>
      <div className="qualifiers-grid">
        {groups.map(g => {
          const letter = g.name?.trim().toUpperCase()
          const q = groupMap[letter]
          return (
            <div key={letter} className="qual-mini">
              <div className="qual-mini-header">{t.group} {letter}</div>
              <QualRow team={q?.w}  label={t.confirmed} />
              <QualRow team={q?.ru} label={t.runnerUp} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function QualRow({ team, label }) {
  const { t, tn } = useLang()
  if (!team) {
    return (
      <div className="qual-mini-row">
        <span className="qual-mini-pos">{label}</span>
        <div style={{ width: 22, height: 15, background: 'var(--border)', borderRadius: 2 }} />
        <span className="tbd" style={{ fontSize: 11 }}>{t.tbd}</span>
      </div>
    )
  }
  if (team.confirmed) {
    return (
      <div className="qual-mini-row confirmed">
        <span className="qual-mini-pos">{label}</span>
        <TeamFlag abbr={team.abbr} logo={team.logo} size={22} />
        <span className="qual-mini-name">{tn(team.team, team.abbr)}</span>
        <span className="qual-check">✓</span>
      </div>
    )
  }
  return (
    <div className="qual-mini-row leading">
      <span className="qual-mini-pos">{label}</span>
      <TeamFlag abbr={team.abbr} logo={team.logo} size={22} />
      <span className="qual-mini-name">{tn(team.team, team.abbr)}</span>
      <span className="qual-pending">~</span>
    </div>
  )
}
