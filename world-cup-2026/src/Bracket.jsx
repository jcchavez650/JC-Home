import { countryFlag } from './api.js'

// WC 2026 has 48 teams → 32-team knockout starting at Round of 32
const ROUNDS = [
  { key: 'r32', label: 'Round of 32', slots: 16 },
  { key: 'r16', label: 'Round of 16', slots: 8 },
  { key: 'qf', label: 'Quarter-finals', slots: 4 },
  { key: 'sf', label: 'Semi-finals', slots: 2 },
  { key: 'f', label: 'Final', slots: 1 },
]

function buildBracket(matches) {
  // Group matches by status type and round
  const finished = matches.filter(
    m => m.statusType === 'STATUS_FINAL' || m.statusType === 'STATUS_FULL_TIME'
  )
  const live = matches.filter(m => m.statusType === 'STATUS_IN_PROGRESS')
  const upcoming = matches.filter(
    m =>
      m.statusType !== 'STATUS_FINAL' &&
      m.statusType !== 'STATUS_FULL_TIME' &&
      m.statusType !== 'STATUS_IN_PROGRESS'
  )

  // Try to infer rounds from event names / dates
  const knockout = [...finished, ...live, ...upcoming].filter(m => {
    const n = (m.name ?? '').toLowerCase()
    return (
      n.includes('round of') ||
      n.includes('quarter') ||
      n.includes('semi') ||
      n.includes('final') ||
      m.group?.includes('knockout')
    )
  })

  return knockout
}

function inferRound(name = '', matchCount) {
  const n = name.toLowerCase()
  if (n.includes('round of 32')) return 'r32'
  if (n.includes('round of 16')) return 'r16'
  if (n.includes('quarter')) return 'qf'
  if (n.includes('semi')) return 'sf'
  if (n.includes('final') && !n.includes('semi')) return 'f'
  return null
}

export default function Bracket({ matches }) {
  const knockoutMatches = buildBracket(matches)

  if (!knockoutMatches.length) {
    return (
      <div className="bracket-wrapper">
        <div className="empty">
          <div className="e">🏆</div>
          <div>Knockout bracket will appear once the group stage ends.</div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text2)' }}>
            World Cup 2026 group stage: Jun 11 – Jul 2, 2026
          </div>
        </div>

        {/* Static visual bracket placeholder */}
        <StaticBracket />
      </div>
    )
  }

  // Group by round
  const byRound = {}
  knockoutMatches.forEach(m => {
    const r = inferRound(m.name)
    if (r) {
      if (!byRound[r]) byRound[r] = []
      byRound[r].push(m)
    }
  })

  return (
    <div className="bracket-wrapper">
      {ROUNDS.filter(r => byRound[r.key]?.length).map(r => (
        <div className="bracket-round" key={r.key}>
          <div className="round-label">{r.label}</div>
          <div className={`bracket-grid ${r.slots === 1 ? 'single' : ''}`}>
            {byRound[r.key].map(m => (
              <BracketMatchup key={m.id} match={m} />
            ))}
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
      <div className={`bracket-team ${m.home.winner ? 'winner' : ''}`}>
        <div className="bracket-team-info">
          <span>{m.home.flag}</span>
          <span>{m.home.team}</span>
        </div>
        {hasScore && <span className="bracket-team-score">{m.home.score}</span>}
      </div>
      <div className={`bracket-team ${m.away.winner ? 'winner' : ''}`}>
        <div className="bracket-team-info">
          <span>{m.away.flag}</span>
          <span>{m.away.team}</span>
        </div>
        {hasScore && <span className="bracket-team-score">{m.away.score}</span>}
      </div>
    </div>
  )
}

function TBDMatchup() {
  return (
    <div className="bracket-matchup">
      <div className="bracket-team">
        <div className="bracket-team-info">
          <span>🏳️</span>
          <span className="tbd">TBD</span>
        </div>
      </div>
      <div className="bracket-team">
        <div className="bracket-team-info">
          <span>🏳️</span>
          <span className="tbd">TBD</span>
        </div>
      </div>
    </div>
  )
}

function StaticBracket() {
  return (
    <div>
      {ROUNDS.map(r => (
        <div className="bracket-round" key={r.key}>
          <div className="round-label">{r.label} {r.slots > 1 ? `(${r.slots} matches)` : ''}</div>
          <div className={`bracket-grid ${r.slots === 1 ? 'single' : ''}`}>
            {Array.from({ length: r.slots }).map((_, i) => (
              <TBDMatchup key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
