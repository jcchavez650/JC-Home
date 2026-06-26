import TeamFlag from './TeamFlag.jsx'
import { useLang } from './LangContext.jsx'

// Returns list of eliminated teams with their group info
export function getEliminatedTeams(groups) {
  const eliminated = []

  groups.forEach(g => {
    const letter = g.name?.trim().toUpperCase()
    const maxGp = Math.max(...g.teams.map(t => t.gp), 0)
    const gamesLeft = (team) => 3 - team.gp

    g.teams.forEach((team, i) => {
      // Skip if no games played yet
      if (team.gp === 0) return

      const left = gamesLeft(team)
      const maxPossiblePts = team.pts + left * 3

      // 4th place after group complete → definitely eliminated
      if (maxGp >= 3 && i === 3) {
        eliminated.push({ ...team, group: letter, status: 'group' })
        return
      }

      // Mathematical elimination: even if team wins all remaining games,
      // they can't catch the team currently in 2nd place
      if (left < 3) { // at least one game played
        const secondPts = g.teams[1]?.pts ?? 0
        // 2nd place team's minimum points (they could lose all remaining)
        // If our max < 2nd's current, we can never catch them AND
        // the team above us also can't be displaced below us
        const cannotReach2nd = maxPossiblePts < secondPts

        // Also check: can the team above 3rd place (i=2) be passed?
        // If we're in 3rd or 4th and can't reach 2nd place's current pts
        if (i >= 2 && cannotReach2nd && maxGp >= 2) {
          eliminated.push({ ...team, group: letter, status: 'math' })
        }
      }
    })
  })

  const seen = new Set()
  return eliminated.filter(t => {
    const key = t.abbr + t.group
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// 3rd-place teams from completed groups — may still advance as wildcards
export function getThirdPlaceTeams(groups) {
  const thirds = []
  groups.forEach(g => {
    const letter = g.name?.trim().toUpperCase()
    const maxGp = Math.max(...g.teams.map(t => t.gp), 0)
    if (maxGp >= 3 && g.teams[2]) {
      thirds.push({ ...g.teams[2], group: letter })
    }
  })
  return thirds
}

export default function Eliminated({ groups }) {
  const { t, tn } = useLang()

  if (!groups.length) {
    return (
      <div className="empty">
        <div className="e">❌</div>
        {t.eliminatedNone}
      </div>
    )
  }

  const teams = getEliminatedTeams(groups)
  const wildcards = getThirdPlaceTeams(groups)
  // Filter out wildcards that are already math-eliminated
  const eliminatedAbbrs = new Set(teams.map(t => t.abbr + t.group))
  const pendingWildcards = wildcards.filter(w => !eliminatedAbbrs.has(w.abbr + w.group))

  if (!teams.length && !pendingWildcards.length) {
    return (
      <div className="empty">
        <div className="e">🏆</div>
        {t.eliminatedNone}
      </div>
    )
  }

  const groupElim = teams.filter(t => t.status === 'group')
  const mathElim  = teams.filter(t => t.status === 'math')

  return (
    <div style={{ paddingBottom: 24 }}>
      {pendingWildcards.length > 0 && (
        <Section title={t.wildcardPending ?? '🔶 Awaiting Wildcard Draw (3rd Place)'} teams={pendingWildcards} variant="wildcard" />
      )}
      {groupElim.length > 0 && (
        <Section title={t.eliminatedGroupStage} teams={groupElim} />
      )}
      {mathElim.length > 0 && (
        <Section title={t.eliminatedMath} teams={mathElim} />
      )}
    </div>
  )
}

function Section({ title, teams, variant }) {
  const { t, tn } = useLang()
  const isWildcard = variant === 'wildcard'
  return (
    <div>
      <div className="section-header">{title} · {teams.length} {teams.length === 1 ? 'team' : 'teams'}</div>
      <div className="elim-grid">
        {teams.map(team => (
          <div key={team.abbr + team.group} className={`elim-card ${isWildcard ? 'elim-card-wildcard' : ''}`}>
            <div className="elim-card-top">
              <TeamFlag abbr={team.abbr} logo={team.logo} size={36} />
              <div className="elim-card-info">
                <div className="elim-team-name">{tn(team.team, team.abbr)}</div>
                <div className="elim-group-badge">{t.group} {team.group}</div>
              </div>
              <span className="elim-x">{isWildcard ? '?' : '✕'}</span>
            </div>
            <div className="elim-stats">
              <StatPill label={t.gp} val={team.gp} />
              <StatPill label={t.w}  val={team.w} />
              <StatPill label={t.d}  val={team.d} />
              <StatPill label={t.l}  val={team.l} />
              <StatPill label={t.gf ?? 'GF'} val={team.gf} />
              <StatPill label={t.ga ?? 'GA'} val={team.ga} />
              <StatPill label={t.pts} val={team.pts} highlight />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatPill({ label, val, highlight }) {
  return (
    <div className={`elim-stat ${highlight ? 'elim-stat-pts' : ''}`}>
      <span className="elim-stat-val">{val}</span>
      <span className="elim-stat-label">{label}</span>
    </div>
  )
}
