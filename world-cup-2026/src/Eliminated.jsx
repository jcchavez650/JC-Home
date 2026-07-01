import TeamFlag from './TeamFlag.jsx'
import { useLang } from './LangContext.jsx'

// ── 2026 format ────────────────────────────────────────────────────────────
// 12 groups of 4. Top 2 of each group (24) + the 8 best 3rd-place teams (8)
// advance to the Round of 32. So only the 4 last-place teams AND the 4 worst
// 3rd-place teams are eliminated in the group stage.
const GROUP_COUNT = 12
const THIRD_PLACE_SLOTS = 8

const isGroupComplete = g => Math.max(...g.teams.map(t => t.gp), 0) >= 3
const groupLetter = g => g.name?.trim().toUpperCase() ?? ''
const sortByRank = arr =>
  [...arr].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)

// Teams eliminated in the group stage.
//   status 'group' → finished last (4th) in a completed group
//   status 'math'  → cannot mathematically reach the top 3 of its group yet
//   status 'third' → 3rd place but missed the best-8 wildcard cut
export function getEliminatedTeams(groups) {
  const eliminated = []

  groups.forEach(g => {
    const letter = groupLetter(g)
    const complete = isGroupComplete(g)

    g.teams.forEach((team, i) => {
      // 4th place in a finished group can never be top-2 nor a 3rd-place team
      if (complete && i === 3) {
        eliminated.push({ ...team, group: letter, status: 'group' })
        return
      }
      if (complete || team.gp === 0) return

      // Mid-group: eliminated only if it cannot reach the top 3 of its group.
      // (3rd place still has a wildcard path, so "can't reach 2nd" is NOT out.)
      const left = Math.max(0, 3 - team.gp)
      const maxPossible = team.pts + left * 3
      const surelyAbove = g.teams.filter((o, j) => j !== i && o.pts > maxPossible).length
      if (surelyAbove >= 3) {
        eliminated.push({ ...team, group: letter, status: 'math' })
      }
    })
  })

  return dedupe(eliminated)
}

// Resolve the 3rd-place wildcard race.
//   pending    → groups still in progress; race not yet decided
//   advancing  → best 8 third-place teams (advanced as wildcards)
//   eliminated → the remaining third-place teams (missed the cut)
export function getThirdPlaceResolution(groups) {
  const completedThirds = []
  let completedGroups = 0

  groups.forEach(g => {
    if (!isGroupComplete(g)) return
    completedGroups++
    if (g.teams[2]) completedThirds.push({ ...g.teams[2], group: groupLetter(g) })
  })

  // The cut can only be decided once every group has finished.
  const allDone = completedGroups >= Math.min(GROUP_COUNT, groups.length) &&
                  groups.length >= GROUP_COUNT
  if (!allDone) {
    return { pending: completedThirds, advancing: [], eliminated: [] }
  }

  const ranked = sortByRank(completedThirds)
  return {
    pending: [],
    advancing: ranked.slice(0, THIRD_PLACE_SLOTS),
    eliminated: ranked.slice(THIRD_PLACE_SLOTS).map(t => ({ ...t, status: 'third' })),
  }
}

function dedupe(list) {
  const seen = new Set()
  return list.filter(t => {
    const key = t.abbr + t.group
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function Eliminated({ groups }) {
  const { t } = useLang()

  if (!groups.length) {
    return <div className="empty"><div className="e">🏆</div>{t.eliminatedNone}</div>
  }

  const third = getThirdPlaceResolution(groups)
  // Group-stage exits = last-place teams + math-eliminated + missed-cut thirds
  const out = dedupe([...getEliminatedTeams(groups), ...third.eliminated])

  const groupElim = out.filter(x => x.status === 'group' || x.status === 'third')
  const mathElim  = out.filter(x => x.status === 'math')
  const advancing = third.advancing
  const pending   = third.pending

  const totalTeams = groups.reduce((n, g) => n + g.teams.length, 0)

  if (!out.length && !pending.length && !advancing.length) {
    return <div className="empty"><div className="e">✅</div>{t.eliminatedNone}</div>
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      {out.length > 0 && (
        <div className="elim-summary">
          <span className="elim-summary-out">{out.length}</span> {t.outLabel}
          {totalTeams > 0 && (
            <span className="elim-summary-alive"> · {totalTeams - out.length} {t.aliveLabel}</span>
          )}
        </div>
      )}

      {advancing.length > 0 && (
        <Section title={t.wildcardIn} teams={advancing} variant="advanced" reason={t.reasonWildcardIn} />
      )}
      {pending.length > 0 && (
        <Section title={t.wildcardPending} teams={pending} variant="wildcard" reason={t.reasonPending} />
      )}
      {groupElim.length > 0 && (
        <Section title={t.eliminatedGroupStage} teams={groupElim} />
      )}
      {mathElim.length > 0 && (
        <Section title={t.eliminatedMath} teams={mathElim} reason={t.reasonMath} />
      )}
    </div>
  )
}

function reasonFor(team, t) {
  if (team.status === 'group') return t.reasonFourth
  if (team.status === 'third') return t.reasonThirdCut
  if (team.status === 'math')  return t.reasonMath
  return null
}

function Section({ title, teams, variant, reason }) {
  const { t, tn } = useLang()
  const advanced = variant === 'advanced'
  const wildcard = variant === 'wildcard'
  const cls = advanced ? 'elim-card-advanced' : wildcard ? 'elim-card-wildcard' : ''
  const mark = advanced ? '✓' : wildcard ? '?' : '✕'

  return (
    <div>
      <div className="section-header">{title} · {teams.length} {teams.length === 1 ? t.teamOne : t.teamMany}</div>
      <div className="elim-grid">
        {teams.map((team, idx) => {
          const line = reason ?? reasonFor(team, t)
          return (
            <div key={team.abbr + team.group} className={`elim-card ${cls}`}>
              <div className="elim-card-top">
                {advanced && <span className="elim-seed">#{idx + 1}</span>}
                <TeamFlag abbr={team.abbr} logo={team.logo} size={36} />
                <div className="elim-card-info">
                  <div className="elim-team-name">{tn(team.team, team.abbr)}</div>
                  <div className="elim-group-badge">
                    {t.group} {team.group}{line ? ` · ${line}` : ''}
                  </div>
                </div>
                <span className={`elim-x ${advanced ? 'elim-x-ok' : wildcard ? 'elim-x-pending' : ''}`}>{mark}</span>
              </div>
              <div className="elim-stats">
                <StatPill label={t.gp} val={team.gp} />
                <StatPill label={t.w}  val={team.w} />
                <StatPill label={t.d}  val={team.d} />
                <StatPill label={t.l}  val={team.l} />
                <StatPill label={t.gf ?? 'GF'} val={team.gf} />
                <StatPill label={t.ga ?? 'GA'} val={team.ga} />
                <StatPill label={t.gd ?? 'GD'} val={fmtGD(team.gd)} />
                <StatPill label={t.pts} val={team.pts} highlight={!advanced} highlightGood={advanced} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const fmtGD = gd => (gd > 0 ? `+${gd}` : `${gd}`)

function StatPill({ label, val, highlight, highlightGood }) {
  const cls = highlightGood ? 'elim-stat-good' : highlight ? 'elim-stat-pts' : ''
  return (
    <div className={`elim-stat ${cls}`}>
      <span className="elim-stat-val">{val}</span>
      <span className="elim-stat-label">{label}</span>
    </div>
  )
}
