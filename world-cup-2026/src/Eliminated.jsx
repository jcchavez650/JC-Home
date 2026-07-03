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

// ── Knockout-stage eliminations (live) ───────────────────────────────────────
// The group standings freeze once the group stage ends, so knockout exits must
// come from the match results (allGames + live scores), not the standings API.
const KO_ORDER = { R32: 1, R16: 2, QF: 3, SF: 4, '3P': 5, F: 6 }
const KO_LABEL = { R32: 'roundOf32', R16: 'roundOf16', QF: 'quarterfinals', SF: 'semifinals', '3P': 'thirdPlace', F: 'final' }

function koRound(m) {
  const text = ((m.group ?? '') + ' ' + (m.name ?? '')).toLowerCase()
  if (/round.of.32|\br32\b|round.32|last.32/.test(text)) return 'R32'
  if (/round.of.16|\br16\b|round.16|last.16/.test(text)) return 'R16'
  if (/quarter|\bqf\b/.test(text)) return 'QF'
  if (/third|3rd.place/.test(text)) return '3P'
  if (/semi|\bsf\b/.test(text)) return 'SF'
  if (/\bfinal\b/.test(text)) return 'F'

  // Date fallback — ESPN's scoreboard slug/name often omits the round, so use
  // the official 2026 knockout schedule (all times are calendar-date based).
  const d = m.date
  if (!(d instanceof Date) || isNaN(d)) return null
  const y = d.getFullYear(), mo = d.getMonth(), day = d.getDate()
  if (y !== 2026) return null
  if (mo === 5 && day >= 28) return 'R32'          // Jun 28–30
  if (mo === 6) {                                  // July
    if (day <= 3)              return 'R32'         // Jul 1–3
    if (day >= 4  && day <= 7) return 'R16'         // Jul 4–7
    if (day >= 9  && day <= 11) return 'QF'         // Jul 9–11
    if (day >= 14 && day <= 15) return 'SF'         // Jul 14–15
    if (day === 18)            return '3P'          // Jul 18
    if (day === 19)            return 'F'           // Jul 19
  }
  return null
}

// ESPN uses placeholder codes like "RD16W1"/"QFW2" for undecided bracket slots
const isPlaceholder = (abbr, name) =>
  !abbr || /^(RD\d|QF[W\d]|SF[W\d]|[A-Z]{1,2}W\d|TBD)/i.test(abbr) ||
  /\b(winner|rd\d|round of|semifinal|quarterfinal)\b/i.test(name ?? '')

// Overlay live scores/winner flags onto matches, keyed by team pair
function liveIndex(liveMatches) {
  const idx = new Map()
  ;(liveMatches ?? []).forEach(m => {
    if (!m.home?.abbr || !m.away?.abbr) return
    idx.set(`${m.home.abbr}:${m.away.abbr}`, m)
    idx.set(`${m.away.abbr}:${m.home.abbr}`, { ...m, home: m.away, away: m.home })
  })
  return idx
}

// Turn ESPN bracket-API seeds into match-like objects (a reliable knockout
// source: the scoreboard date-range often omits completed knockout games, but
// the bracket API carries their scores + winner flags).
function bracketMatches(bracketRounds) {
  const roundOf = name => {
    const n = (name ?? '').toLowerCase()
    if (n.includes('32')) return 'R32'
    if (n.includes('16')) return 'R16'
    if (n.includes('quarter')) return 'QF'
    if (n.includes('semi')) return 'SF'
    if (n.includes('third') || n.includes('3rd')) return '3P'
    if (n.includes('final')) return 'F'
    return null
  }
  const out = []
  ;(bracketRounds ?? []).forEach(r => {
    const round = roundOf(r.name)
    ;(r.seeds ?? []).forEach(s => {
      if (!s.home || !s.away) return
      out.push({
        _round: round, date: null, group: '', name: '',
        statusType: (s.home.winner || s.away.winner) ? 'STATUS_FINAL' : (s.status ?? ''),
        home: { ...s.home, score: s.home.score ?? s.homeScore },
        away: { ...s.away, score: s.away.score ?? s.awayScore },
      })
    })
  })
  return out
}

// Losers of completed knockout matches — each team appears once (first exit).
// Draws from every available source so a completed game is caught regardless of
// which ESPN endpoint carries it.
export function getKnockoutEliminated(allGames, liveMatches, bracketRounds) {
  const live = liveIndex(liveMatches)
  const candidates = [
    ...(allGames ?? []),
    ...(liveMatches ?? []),
    ...bracketMatches(bracketRounds),
  ]
  const out = []

  candidates.forEach(g => {
    const round = g._round ?? koRound(g)
    if (!round) return
    // Prefer live scores/flags when we have a live copy of this fixture
    const m = live.get(`${g.home?.abbr}:${g.away?.abbr}`) ?? g
    const done = /FINAL|FULL_TIME|\bFT\b/i.test(m.statusType ?? '')
    if (!done) return

    const hs = m.home?.score != null ? +m.home.score : NaN
    const as = m.away?.score != null ? +m.away.score : NaN
    let loser = null, winner = null
    if (m.home?.winner) { loser = m.away;  winner = m.home }
    else if (m.away?.winner) { loser = m.home; winner = m.away }
    else if (!isNaN(hs) && !isNaN(as) && hs !== as) {
      const homeWon = hs > as
      loser  = homeWon ? m.away : m.home
      winner = homeWon ? m.home : m.away
    }
    if (!loser?.abbr || isPlaceholder(loser.abbr, loser.team)) return

    const ls = loser === m.home ? hs : as
    const ws = loser === m.home ? as : hs
    out.push({
      ...loser, round, date: m.date ?? null,
      koScore: (!isNaN(ls) && !isNaN(ws)) ? `${ls}–${ws}` : null,
      koOpponent: winner && !isPlaceholder(winner.abbr, winner.team) ? winner.abbr : null,
    })
  })

  // A team can lose at most once; keep its exit, newest round/date first
  const seen = new Set()
  return out
    .sort((a, b) => (KO_ORDER[b.round] - KO_ORDER[a.round]) ||
                    ((b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)))
    .filter(t => { if (seen.has(t.abbr)) return false; seen.add(t.abbr); return true })
}

export default function Eliminated({ groups, allGames, liveMatches, bracketRounds }) {
  const { t } = useLang()

  const knockout = getKnockoutEliminated(allGames, liveMatches, bracketRounds)

  if (!groups.length && !knockout.length) {
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
  const totalOut   = out.length + knockout.length

  if (!totalOut && !pending.length && !advancing.length) {
    return <div className="empty"><div className="e">✅</div>{t.eliminatedNone}</div>
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      {totalOut > 0 && (
        <div className="elim-summary">
          <span className="elim-summary-out">{totalOut}</span> {t.outLabel}
          {totalTeams > 0 && (
            <span className="elim-summary-alive"> · {Math.max(0, totalTeams - totalOut)} {t.aliveLabel}</span>
          )}
        </div>
      )}

      {knockout.length > 0 && (
        <KnockoutSection title={t.knockoutExits} teams={knockout} />
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

// Knockout exits — compact cards showing the round and scoreline of the loss.
function KnockoutSection({ title, teams }) {
  const { t, tn } = useLang()
  return (
    <div>
      <div className="section-header">{title} · {teams.length} {teams.length === 1 ? t.teamOne : t.teamMany}</div>
      <div className="elim-grid">
        {teams.map(team => {
          const roundLabel = t[KO_LABEL[team.round]] ?? team.round
          return (
            <div key={team.abbr} className="elim-card elim-card-ko">
              <div className="elim-card-top" style={{ marginBottom: 0 }}>
                <TeamFlag abbr={team.abbr} logo={team.logo} size={34} />
                <div className="elim-card-info">
                  <div className="elim-team-name">{tn(team.team, team.abbr)}</div>
                  <div className="elim-group-badge">
                    {t.lostIn} {roundLabel}
                    {team.koOpponent ? ` · ${t.vs} ${team.koOpponent}` : ''}
                  </div>
                </div>
                <div className="elim-ko-right">
                  <span className="elim-ko-round">{team.round}</span>
                  {team.koScore && <span className="elim-ko-score">{team.koScore}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
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
