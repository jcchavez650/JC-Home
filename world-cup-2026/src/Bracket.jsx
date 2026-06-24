import TeamFlag from './TeamFlag.jsx'

// WC 2026: 12 groups (A–L), top 2 + 8 best 3rd-place = 32 teams → Round of 32
// A team is confirmed to advance if they cannot be caught:
//  - 6 pts after 2 games (clinched top 2 with one game to go)
//  - top 2 after 3 games (group complete)
function getConfirmed(group) {
  const gp = group.teams[0]?.gp ?? 0
  const confirmed = []
  const inContention = []

  group.teams.forEach((t, i) => {
    // All 3 games played → top 2 are through
    if (gp >= 3 && i < 2) {
      confirmed.push({ ...t, slot: i === 0 ? '1st' : '2nd' })
    }
    // 2 games played, 6 pts → can't be caught
    else if (gp >= 2 && t.pts >= 6) {
      confirmed.push({ ...t, slot: '1st' })
    }
    // 2 games played, top 2 with 4+ pts and 3rd has ≤ 1 → effectively through
    else if (gp >= 2 && i < 2 && t.pts >= 4 && (group.teams[2]?.pts ?? 0) <= 1) {
      confirmed.push({ ...t, slot: i === 0 ? '1st' : '2nd' })
    }
    else {
      inContention.push(t)
    }
  })

  return { confirmed, inContention, complete: gp >= 3 }
}

// WC 2026 Round of 32 bracket pairings (group winner vs runner-up seeding)
// Official draw: 1A vs 2B, 1B vs 2A, 1C vs 2D, 1D vs 2C, etc.
const BRACKET_PAIRS = [
  ['A', '1st', 'B', '2nd'],
  ['C', '1st', 'D', '2nd'],
  ['E', '1st', 'F', '2nd'],
  ['G', '1st', 'H', '2nd'],
  ['I', '1st', 'J', '2nd'],
  ['K', '1st', 'L', '2nd'],
  ['B', '1st', 'A', '2nd'],
  ['D', '1st', 'C', '2nd'],
  ['F', '1st', 'E', '2nd'],
  ['H', '1st', 'G', '2nd'],
  ['J', '1st', 'I', '2nd'],
  ['L', '1st', 'K', '2nd'],
  // 8 best 3rd-place spots TBD
  ['*3rd', '', '*3rd', ''],
  ['*3rd', '', '*3rd', ''],
  ['*3rd', '', '*3rd', ''],
  ['*3rd', '', '*3rd', ''],
]

export default function Bracket({ matches, groups }) {
  // Build a lookup: { 'A': { '1st': team, '2nd': team, inContention: [] } }
  const groupMap = {}
  groups.forEach(g => {
    const letter = g.name?.replace(/^Group\s*/i, '').trim().toUpperCase()
    if (!letter) return
    const { confirmed, inContention, complete } = getConfirmed(g)
    groupMap[letter] = { confirmed, inContention, complete, raw: g }
  })

  const hasGroups = Object.keys(groupMap).length > 0

  // Try ESPN knockout data first
  const knockoutMatches = matches.filter(m => {
    const n = (m.name ?? '').toLowerCase()
    return n.includes('round of') || n.includes('quarter') || n.includes('semi') || n.includes('final')
  })

  return (
    <div className="bracket-wrapper">
      {/* Qualified teams section */}
      {hasGroups && (
        <>
          <div className="round-label" style={{ marginBottom: 10 }}>Confirmed Qualifiers</div>
          <div className="qualifiers-grid">
            {groups.map(g => {
              const letter = g.name?.replace(/^Group\s*/i, '').trim().toUpperCase()
              const info = groupMap[letter]
              if (!info) return null
              return (
                <GroupQualCard
                  key={letter}
                  letter={letter}
                  group={g}
                  info={info}
                />
              )
            })}
          </div>
        </>
      )}

      {/* Knockout bracket */}
      <div className="round-label" style={{ marginTop: 20, marginBottom: 10 }}>Round of 32 Bracket</div>
      <div className="bracket-grid">
        {knockoutMatches.length > 0
          ? knockoutMatches.map(m => <BracketMatchup key={m.id} match={m} />)
          : BRACKET_PAIRS.map((pair, i) => {
              const home = pair[0].startsWith('*')
                ? null
                : groupMap[pair[0]]?.confirmed.find(t => t.slot === pair[1])
              const away = pair[2].startsWith('*')
                ? null
                : groupMap[pair[2]]?.confirmed.find(t => t.slot === pair[3])
              const labelHome = pair[0].startsWith('*') ? '3rd Place' : `${pair[1]} Group ${pair[0]}`
              const labelAway = pair[2].startsWith('*') ? '3rd Place' : `${pair[3]} Group ${pair[2]}`
              return (
                <BracketSlot key={i} home={home} away={away} labelHome={labelHome} labelAway={labelAway} />
              )
            })
        }
      </div>
    </div>
  )
}

function GroupQualCard({ letter, group, info }) {
  const total = group.teams.length
  const confirmedCount = info.confirmed.length

  return (
    <div className="qual-card">
      <div className="qual-card-header">
        <span className="qual-letter">Group {letter}</span>
        <span className="qual-status">
          {info.complete
            ? '✅ Complete'
            : confirmedCount > 0
            ? `${confirmedCount} confirmed`
            : 'In progress'}
        </span>
      </div>
      {group.teams.slice(0, 3).map((t, i) => {
        const isConfirmed = info.confirmed.some(c => c.abbr === t.abbr)
        const isEliminated = info.complete && i >= 2
        return (
          <div key={t.team} className={`qual-team ${isConfirmed ? 'qual-confirmed' : isEliminated ? 'qual-eliminated' : ''}`}>
            <div className="qual-team-left">
              <span className="pos-sm">{i + 1}</span>
              <TeamFlag abbr={t.abbr} logo={t.logo} size={20} />
              <span className="qual-name">{t.team}</span>
            </div>
            <div className="qual-right">
              <span className="qual-pts">{t.pts} pts</span>
              {isConfirmed && <span className="qual-check">✓</span>}
            </div>
          </div>
        )
      })}
      {group.teams.length > 3 && (
        <div className="qual-team qual-eliminated">
          <div className="qual-team-left">
            <span className="pos-sm">4</span>
            <TeamFlag abbr={group.teams[3].abbr} logo={group.teams[3].logo} size={20} />
            <span className="qual-name">{group.teams[3].team}</span>
          </div>
          <div className="qual-right">
            <span className="qual-pts">{group.teams[3].pts} pts</span>
          </div>
        </div>
      )}
    </div>
  )
}

function BracketSlot({ home, away, labelHome, labelAway }) {
  return (
    <div className="bracket-matchup">
      <SlotTeam team={home} label={labelHome} />
      <SlotTeam team={away} label={labelAway} />
    </div>
  )
}

function SlotTeam({ team, label }) {
  if (team) {
    return (
      <div className="bracket-team">
        <div className="bracket-team-info">
          <TeamFlag abbr={team.abbr} logo={team.logo} size={20} />
          <span>{team.team}</span>
        </div>
      </div>
    )
  }
  return (
    <div className="bracket-team">
      <div className="bracket-team-info">
        <div style={{ width: 28, height: 19, background: 'var(--border)', borderRadius: 3, flexShrink: 0 }} />
        <span className="tbd">{label}</span>
      </div>
    </div>
  )
}

function BracketMatchup({ match: m }) {
  const hasScore = m.home.score !== null
  return (
    <div className="bracket-matchup">
      {[m.home, m.away].map((side, i) => (
        <div key={i} className={`bracket-team ${side.winner ? 'winner' : ''}`}>
          <div className="bracket-team-info">
            <TeamFlag abbr={side.abbr} logo={side.logo} size={20} />
            <span>{side.team}</span>
          </div>
          {hasScore && <span className="bracket-team-score">{side.score}</span>}
        </div>
      ))}
    </div>
  )
}
