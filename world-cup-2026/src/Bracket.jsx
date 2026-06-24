import TeamFlag from './TeamFlag.jsx'

const ROUNDS = [
  { key: 'r32', label: 'Round of 32', slots: 16 },
  { key: 'r16', label: 'Round of 16', slots: 8 },
  { key: 'qf',  label: 'Quarter-finals', slots: 4 },
  { key: 'sf',  label: 'Semi-finals', slots: 2 },
  { key: 'f',   label: 'Final', slots: 1 },
]

function inferRound(name = '') {
  const n = name.toLowerCase()
  if (n.includes('round of 32')) return 'r32'
  if (n.includes('round of 16')) return 'r16'
  if (n.includes('quarter')) return 'qf'
  if (n.includes('semi')) return 'sf'
  if (n.includes('final') && !n.includes('semi')) return 'f'
  return null
}

export default function Bracket({ matches }) {
  const knockout = matches.filter(m => {
    const n = (m.name ?? '').toLowerCase()
    return (
      n.includes('round of') ||
      n.includes('quarter') ||
      n.includes('semi') ||
      n.includes('final') ||
      m.group?.includes('knockout')
    )
  })

  const byRound = {}
  knockout.forEach(m => {
    const r = inferRound(m.name)
    if (r) {
      if (!byRound[r]) byRound[r] = []
      byRound[r].push(m)
    }
  })

  const hasData = Object.keys(byRound).length > 0

  return (
    <div className="bracket-wrapper">
      {!hasData && (
        <div className="empty" style={{ marginBottom: 16 }}>
          <div className="e">🏆</div>
          <div>Bracket populates after the group stage ends.</div>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text2)' }}>
            Group stage: Jun 11 – Jul 2, 2026
          </div>
        </div>
      )}

      {ROUNDS.filter(r => hasData ? byRound[r.key]?.length : true).map(r => (
        <div className="bracket-round" key={r.key}>
          <div className="round-label">{r.label}</div>
          <div className={`bracket-grid ${r.slots === 1 ? 'single' : ''}`}>
            {hasData && byRound[r.key]
              ? byRound[r.key].map(m => <BracketMatchup key={m.id} match={m} />)
              : Array.from({ length: r.slots }).map((_, i) => <TBDMatchup key={i} />)
            }
          </div>
        </div>
      ))}
    </div>
  )
}

function BracketMatchup({ match: m }) {
  const hasScore = m.home.score !== null
  return (
    <div className="bracket-matchup">
      <BracketTeam side={m.home} hasScore={hasScore} />
      <BracketTeam side={m.away} hasScore={hasScore} />
    </div>
  )
}

function BracketTeam({ side, hasScore }) {
  return (
    <div className={`bracket-team ${side.winner ? 'winner' : ''}`}>
      <div className="bracket-team-info">
        <TeamFlag abbr={side.abbr} logo={side.logo} size={20} />
        <span>{side.team}</span>
      </div>
      {hasScore && <span className="bracket-team-score">{side.score}</span>}
    </div>
  )
}

function TBDMatchup() {
  return (
    <div className="bracket-matchup">
      {[0, 1].map(i => (
        <div key={i} className="bracket-team">
          <div className="bracket-team-info">
            <div style={{ width: 28, height: 19, background: 'var(--border)', borderRadius: 3 }} />
            <span className="tbd">TBD</span>
          </div>
        </div>
      ))}
    </div>
  )
}
