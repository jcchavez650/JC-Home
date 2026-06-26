import TeamFlag from './TeamFlag.jsx'
import { useLang } from './LangContext.jsx'

// Returns { w, ru } for each group, with a `confirmed` boolean on each team
function getGroupQualifiers(groups) {
  const map = {}
  groups.forEach(g => {
    const letter = g.name?.trim().toUpperCase()
    if (!letter) return
    if (!g.teams.length) return

    const gp = g.teams[0]?.gp ?? 0
    const complete = gp >= 3
    const thirdPts = g.teams[2]?.pts ?? 0

    const isConfirmed = (team, i) =>
      (complete && i < 2) ||
      (gp >= 2 && team.pts >= 6) ||
      (gp >= 2 && i < 2 && team.pts >= 4 && thirdPts === 0)

    // Current leader and runner-up (first two in standings, whether confirmed or not)
    const leader    = g.teams[0] ? { ...g.teams[0], confirmed: isConfirmed(g.teams[0], 0) } : null
    const runnerUp  = g.teams[1] ? { ...g.teams[1], confirmed: isConfirmed(g.teams[1], 1) } : null

    map[letter] = {
      w:  gp > 0 ? leader   : null,
      ru: gp > 0 ? runnerUp : null,
    }
  })
  return map
}

// Round of 32 official seedings (FIFA 2026)
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

// Classify a match into a round key using slug, name, AND date
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

  // Date-based fallback — WC 2026 knockout schedule
  const d = m.date
  if (d && d.getFullYear() === 2026 && d.getMonth() === 6) { // July (0-indexed)
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

  // Build confirmed abbr set to pass into ESPN bracket rows
  const confirmedAbbrs = new Set()
  Object.values(groupMap).forEach(({ w, ru }) => {
    if (w?.confirmed)  confirmedAbbrs.add(w.abbr)
    if (ru?.confirmed) confirmedAbbrs.add(ru.abbr)
  })
  console.log('[bracket] groupMap', groupMap)
  console.log('[bracket] confirmedAbbrs', [...confirmedAbbrs])

  // ── Priority 1: ESPN bracket API ──────────────────────────────────────────
  if (bracketRounds.length > 0) {
    return (
      <div className="bracket-page">
        <div className="bracket-scroll">
          <div className="bracket-tree">
            {bracketRounds.map((round, ri) => (
              <div key={ri} className="bracket-col">
                <div className="bracket-col-label">{round.name}</div>
                <div className="bracket-col-matches">
                  {round.seeds.map((seed, i) => (
                    <div key={seed.id ?? i} className="b-match">
                      <EspnTeamRow side={seed.home} score={seed.homeScore} confirmedAbbrs={confirmedAbbrs} />
                      <EspnTeamRow side={seed.away} score={seed.awayScore} confirmedAbbrs={confirmedAbbrs} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <QualifiersSection groups={groups} groupMap={groupMap} />
      </div>
    )
  }

  // ── Priority 2: ESPN knockout games from allGames ─────────────────────────
  const byRound = {}
  ;(allGames ?? []).forEach(m => {
    const key = getRoundKey(m)
    if (!key) return
    if (!byRound[key]) byRound[key] = []
    byRound[key].push(m)
  })
  if (Object.keys(byRound).length) console.log('[bracket rounds]', Object.fromEntries(Object.entries(byRound).map(([k,v]) => [k, v.map(m => m.name + ' ' + m.group)])))

  const ROUNDS = [
    { key: 'r32', label: t.r32,   count: 16 },
    { key: 'r16', label: t.r16,   count: 8  },
    { key: 'qf',  label: t.qf,    count: 4  },
    { key: 'sf',  label: t.sf,    count: 2  },
    { key: 'f',   label: t.final, count: 1  },
  ]

  const hasKnockout = Object.keys(byRound).length > 0

  return (
    <div className="bracket-page">
      <div className="bracket-scroll">
        <div className="bracket-tree">
          {ROUNDS.map(round => (
            <div key={round.key} className="bracket-col">
              <div className="bracket-col-label">{round.label}</div>
              <div className="bracket-col-matches">
                {hasKnockout && byRound[round.key]
                  ? byRound[round.key].map(m => (
                      <BracketMatch key={m.id} match={m} />
                    ))
                  : round.key === 'r32'
                  ? R32_PAIRS.map((pair, i) => (
                      <BracketSlot
                        key={i}
                        homeTeam={resolveTeam(pair.home, groupMap)}
                        awayTeam={resolveTeam(pair.away, groupMap)}
                        homeLabel={labelFor(pair.home, t)}
                        awayLabel={labelFor(pair.away, t)}
                      />
                    ))
                  : Array.from({ length: round.count }).map((_, i) => (
                      <BracketSlot key={i} />
                    ))
                }
              </div>
            </div>
          ))}
        </div>
      </div>
      <QualifiersSection groups={groups} groupMap={groupMap} />
    </div>
  )
}

function EspnTeamRow({ side, score, confirmedAbbrs }) {
  const { tn } = useLang()
  if (!side) {
    return (
      <div className="b-team">
        <div className="b-flag-placeholder" />
        <span className="b-name b-tbd">TBD</span>
      </div>
    )
  }
  // A team is confirmed only if they've won a knockout match (side.winner)
  // or are mathematically confirmed in group standings.
  // ESPN bracket during group stage shows projected seedings — treat as leading.
  const isGroupConfirmed = side.abbr && confirmedAbbrs?.has(side.abbr)
  const isKnockoutWinner = !!side.winner
  const isConfirmed = isKnockoutWinner || isGroupConfirmed
  const isLeading   = side.abbr && !isConfirmed
  return (
    <div className={`b-team ${isKnockoutWinner ? 'b-winner' : ''} ${isConfirmed ? 'b-confirmed' : ''} ${isLeading ? 'b-leading' : ''}`}>
      {side.abbr
        ? <TeamFlag abbr={side.abbr} logo={side.logo} size={16} />
        : <div className="b-flag-placeholder" />
      }
      <span className="b-name">{tn(side.team, side.abbr)}</span>
      {isGroupConfirmed && <span className="b-check">✓</span>}
      {isLeading && <span className="b-pending">~</span>}
      {score !== null && !isKnockoutWinner && <span className="b-score">{score}</span>}
      {isKnockoutWinner && <span className="b-score" style={{ color: 'var(--green)' }}>{score}</span>}
    </div>
  )
}

function BracketMatch({ match: m }) {
  const hasScore = m.home.score !== null
  return (
    <div className="b-match">
      <BracketTeamRow side={m.home} hasScore={hasScore} />
      <BracketTeamRow side={m.away} hasScore={hasScore} />
    </div>
  )
}

function BracketTeamRow({ side, hasScore }) {
  const { tn } = useLang()
  const isKnown = !!side.abbr
  return (
    <div className={`b-team ${side.winner ? 'b-winner' : ''} ${isKnown ? 'b-confirmed' : ''}`}>
      {isKnown
        ? <TeamFlag abbr={side.abbr} logo={side.logo} size={16} />
        : <div className="b-flag-placeholder" />
      }
      <span className="b-name">{isKnown ? tn(side.team, side.abbr) : (side.team || 'TBD')}</span>
      {isKnown && !side.winner && <span className="b-check">✓</span>}
      {hasScore && <span className="b-score">{side.score}</span>}
    </div>
  )
}

function BracketSlot({ homeTeam, awayTeam, homeLabel, awayLabel }) {
  return (
    <div className="b-match">
      <SlotTeamRow team={homeTeam} label={homeLabel} />
      <SlotTeamRow team={awayTeam} label={awayLabel} />
    </div>
  )
}

function SlotTeamRow({ team, label }) {
  const { tn } = useLang()

  if (!team) {
    return (
      <div className="b-team b-slot-tbd">
        <div className="b-flag-placeholder" />
        <span className="b-name b-tbd">{label ?? 'TBD'}</span>
      </div>
    )
  }

  if (team.confirmed) {
    // Mathematically confirmed — green border + green ✓
    return (
      <div className="b-team b-confirmed">
        <TeamFlag abbr={team.abbr} logo={team.logo} size={16} />
        <span className="b-name">{tn(team.team, team.abbr)}</span>
        <span className="b-check" title="Confirmed">✓</span>
      </div>
    )
  }

  // Currently leading but not yet confirmed — show with gold tint + ~ indicator
  return (
    <div className="b-team b-leading">
      <TeamFlag abbr={team.abbr} logo={team.logo} size={16} />
      <span className="b-name">{tn(team.team, team.abbr)}</span>
      <span className="b-pending" title="Currently leading">~</span>
    </div>
  )
}

function QualifiersSection({ groups, groupMap }) {
  const { t } = useLang()
  if (!groups.length) return null
  return (
    <div style={{ padding: '0 12px 12px' }}>
      <div className="round-label" style={{ marginBottom: 8 }}>{t.qualifiers}</div>
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
