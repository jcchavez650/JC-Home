import TeamFlag from './TeamFlag.jsx'
import { useLang } from './LangContext.jsx'

// Derive confirmed qualifiers from standings
function getGroupQualifiers(groups) {
  const map = {} // { 'A': { '1': team, '2': team } }
  groups.forEach(g => {
    const letter = g.name?.replace(/^Group\s*/i, '').trim().toUpperCase()
    if (!letter) return
    const gp = g.teams[0]?.gp ?? 0
    const complete = gp >= 3
    const thirdPts = g.teams[2]?.pts ?? 0
    const qualified = []

    g.teams.forEach((t, i) => {
      const isThrough =
        // Group finished: top 2 are through
        (complete && i < 2) ||
        // 6 pts from 2 games: won both, mathematically safe regardless of last game
        (gp >= 2 && t.pts >= 6) ||
        // 4 pts AND 3rd place has 0 pts: 3rd can reach max 3, can't catch us
        (gp >= 2 && i < 2 && t.pts >= 4 && thirdPts === 0)
      if (isThrough) qualified.push(t)
    })

    map[letter] = {
      w: qualified[0] ?? null,
      ru: qualified[1] ?? null,
    }
  })
  return map
}

// WC 2026 official R32 pairings
const R32_PAIRS = [
  // Left half (top bracket)
  { home: ['A','w'], away: ['B','ru'] },
  { home: ['C','w'], away: ['D','ru'] },
  { home: ['E','w'], away: ['F','ru'] },
  { home: ['G','w'], away: ['H','ru'] },
  { home: ['I','w'], away: ['J','ru'] },
  { home: ['K','w'], away: ['L','ru'] },
  { home: ['*3rd',''], away: ['*3rd',''] },
  { home: ['*3rd',''], away: ['*3rd',''] },
  // Right half (bottom bracket)
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

export default function Bracket({ matches, groups }) {
  const { t } = useLang()
  const groupMap = getGroupQualifiers(groups)

  // Check if ESPN has live knockout data
  const knockoutMatches = matches.filter(m => {
    const n = (m.name ?? '').toLowerCase()
    return n.includes('round of') || n.includes('quarter') || n.includes('semi') || n.includes('final')
  })

  // Build rounds from ESPN data if available
  const espnRounds = {}
  knockoutMatches.forEach(m => {
    const n = (m.name ?? '').toLowerCase()
    const r = n.includes('round of 32') ? 'r32'
      : n.includes('round of 16') ? 'r16'
      : n.includes('quarter') ? 'qf'
      : n.includes('semi') ? 'sf'
      : n.includes('final') ? 'f'
      : null
    if (r) {
      if (!espnRounds[r]) espnRounds[r] = []
      espnRounds[r].push(m)
    }
  })

  const hasESPN = Object.keys(espnRounds).length > 0

  const ROUNDS = [
    { key: 'r32', label: t.r32,   count: 16 },
    { key: 'r16', label: t.r16,   count: 8 },
    { key: 'qf',  label: t.qf,    count: 4 },
    { key: 'sf',  label: t.sf,    count: 2 },
    { key: 'f',   label: t.final, count: 1 },
  ]

  return (
    <div className="bracket-page">
      <div className="bracket-scroll">
        <div className="bracket-tree">
          {ROUNDS.map((round, ri) => (
            <div key={round.key} className="bracket-col">
              <div className="bracket-col-label">{round.label}</div>
              <div className="bracket-col-matches">
                {hasESPN && espnRounds[round.key]
                  ? espnRounds[round.key].map((m, i) => (
                      <BracketMatch key={m.id} match={m} round={round.key} index={i} total={espnRounds[round.key].length} />
                    ))
                  : round.key === 'r32'
                  ? R32_PAIRS.map((pair, i) => (
                      <BracketSlot
                        key={i}
                        homeTeam={resolveTeam(pair.home, groupMap)}
                        awayTeam={resolveTeam(pair.away, groupMap)}
                        homeLabel={labelFor(pair.home, t)}
                        awayLabel={labelFor(pair.away, t)}
                        index={i}
                        total={16}
                        round={round.key}
                      />
                    ))
                  : Array.from({ length: round.count }).map((_, i) => (
                      <BracketSlot key={i} index={i} total={round.count} round={round.key} />
                    ))
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Group qualifier status below */}
      {groups.length > 0 && (
        <div style={{ padding: '0 12px 12px' }}>
          <div className="round-label" style={{ marginBottom: 8 }}>{t.qualifiers}</div>
          <div className="qualifiers-grid">
            {groups.map(g => {
              const letter = g.name?.replace(/^Group\s*/i, '').trim().toUpperCase()
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
      )}
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
  return (
    <div className="qual-mini-row confirmed">
      <span className="qual-mini-pos">{label}</span>
      <TeamFlag abbr={team.abbr} logo={team.logo} size={22} />
      <span className="qual-mini-name">{tn(team.team, team.abbr)}</span>
      <span className="qual-check">✓</span>
    </div>
  )
}

function BracketMatch({ match: m, round }) {
  const hasScore = m.home.score !== null
  return (
    <div className={`b-match ${round}`}>
      <BracketTeamRow side={m.home} hasScore={hasScore} />
      <BracketTeamRow side={m.away} hasScore={hasScore} />
    </div>
  )
}

function BracketTeamRow({ side, hasScore }) {
  const { tn } = useLang()
  return (
    <div className={`b-team ${side.winner ? 'b-winner' : ''}`}>
      <TeamFlag abbr={side.abbr} logo={side.logo} size={16} />
      <span className="b-name">{side.abbr || tn(side.team, side.abbr)}</span>
      {hasScore && <span className="b-score">{side.score}</span>}
    </div>
  )
}

function BracketSlot({ homeTeam, awayTeam, homeLabel, awayLabel, round }) {
  return (
    <div className={`b-match ${round}`}>
      <SlotTeamRow team={homeTeam} label={homeLabel} />
      <SlotTeamRow team={awayTeam} label={awayLabel} />
    </div>
  )
}

function SlotTeamRow({ team, label }) {
  const { tn } = useLang()
  if (team) {
    return (
      <div className="b-team b-confirmed">
        <TeamFlag abbr={team.abbr} logo={team.logo} size={16} />
        <span className="b-name">{tn(team.team, team.abbr)}</span>
        <span className="b-check">✓</span>
      </div>
    )
  }
  return (
    <div className="b-team">
      <div className="b-flag-placeholder" />
      <span className="b-name b-tbd">{label ?? 'TBD'}</span>
    </div>
  )
}
