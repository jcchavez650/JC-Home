import TeamFlag from './TeamFlag.jsx'

// Derive confirmed qualifiers from standings
function getGroupQualifiers(groups) {
  const map = {} // { 'A': { '1': team, '2': team } }
  groups.forEach(g => {
    const letter = g.name?.replace(/^Group\s*/i, '').trim().toUpperCase()
    if (!letter) return
    const gp = g.teams[0]?.gp ?? 0
    const complete = gp >= 3
    const qualified = []

    g.teams.forEach((t, i) => {
      const isThrough =
        complete && i < 2 ||
        gp >= 2 && t.pts >= 6 ||
        gp >= 2 && i < 2 && t.pts >= 4 && (g.teams[2]?.pts ?? 0) <= 1
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

function labelFor([g, pos]) {
  if (g.startsWith('*')) return '3rd Place'
  return `${pos === 'w' ? '1st' : '2nd'} Group ${g}`
}

export default function Bracket({ matches, groups }) {
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
    { key: 'r32', label: 'R32', count: 16 },
    { key: 'r16', label: 'R16', count: 8 },
    { key: 'qf',  label: 'QF',  count: 4 },
    { key: 'sf',  label: 'SF',  count: 2 },
    { key: 'f',   label: 'Final', count: 1 },
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
                        homeLabel={labelFor(pair.home)}
                        awayLabel={labelFor(pair.away)}
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
          <div className="round-label" style={{ marginBottom: 8 }}>Group Qualifiers</div>
          <div className="qualifiers-grid">
            {groups.map(g => {
              const letter = g.name?.replace(/^Group\s*/i, '').trim().toUpperCase()
              const q = groupMap[letter]
              return (
                <div key={letter} className="qual-mini">
                  <div className="qual-mini-header">Group {letter}</div>
                  <QualRow team={q?.w}  label={`1st`} />
                  <QualRow team={q?.ru} label={`2nd`} />
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
  if (!team) {
    return (
      <div className="qual-mini-row">
        <span className="qual-mini-pos">{label}</span>
        <div style={{ width: 22, height: 15, background: 'var(--border)', borderRadius: 2 }} />
        <span className="tbd" style={{ fontSize: 11 }}>TBD</span>
      </div>
    )
  }
  return (
    <div className="qual-mini-row confirmed">
      <span className="qual-mini-pos">{label}</span>
      <TeamFlag abbr={team.abbr} logo={team.logo} size={22} />
      <span className="qual-mini-name">{team.team}</span>
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
  return (
    <div className={`b-team ${side.winner ? 'b-winner' : ''}`}>
      <TeamFlag abbr={side.abbr} logo={side.logo} size={16} />
      <span className="b-name">{side.abbr || side.team}</span>
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
  if (team) {
    return (
      <div className="b-team b-confirmed">
        <TeamFlag abbr={team.abbr} logo={team.logo} size={16} />
        <span className="b-name">{team.abbr}</span>
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
