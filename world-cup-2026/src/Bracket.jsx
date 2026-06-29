import { useMemo, useRef, useEffect } from 'react'
import TeamFlag from './TeamFlag.jsx'
import { useLang } from './LangContext.jsx'

// ESPN returns placeholder codes like "RD16W1", "QFW2" for undecided slots
function isPlaceholder(abbr, name) {
  if (!abbr) return true
  if (/^(RD\d|QF[W\d]|SF[W\d]|[A-Z]{1,2}W\d|TBD)/i.test(abbr)) return true
  if (/\b(winner|rd\d|round\s*of|semifinal|quarterfinal|loser)\b/i.test(name ?? '')) return true
  return false
}

// ── Layout constants ──────────────────────────────────────────────────────────
const MATCH_H = 52   // px – height of one match card (2 team rows × 26px)
const UNIT    = 64   // px – slot height at R32 level (must be ≥ MATCH_H)
const COL_W   = 96   // px – width of a round column
const CONN_W  = 20   // px – width of the SVG connector strip
const HALF_H  = 8 * UNIT  // px – total height of each bracket half (512)

// Center y of a match given its round index and position within that round
function cy(roundIdx, matchIdx) {
  const slotH = UNIT * Math.pow(2, roundIdx)
  return matchIdx * slotH + slotH / 2
}
// Top y of the match card
function ty(roundIdx, matchIdx) { return cy(roundIdx, matchIdx) - MATCH_H / 2 }

// ── Derive group qualifiers directly from allGames match results ──────────────
// This is more reliable than the standings API: it reads from allGames
// (which refreshes every 30s) and extracts group letter from the match slug.
function deriveGroupMap(allGames) {
  const buckets = {} // letter → Map<abbr, stats>

  ;(allGames ?? []).forEach(m => {
    // Skip if it looks like a knockout game
    if (getRoundKey(m) !== null) return

    // Extract group letter from ESPN season slug, e.g. "fifa-world-cup-2026-group-b"
    const slug = (m.group ?? '').toLowerCase()
    const lm = slug.match(/group[-_.\s]?([a-l])\b/i) ||
               slug.match(/group[-_.\s]?([a-l])$/i)
    if (!lm) return
    const letter = lm[1].toUpperCase()

    if (!buckets[letter]) buckets[letter] = new Map()
    const gt = buckets[letter]

    const ensure = t => {
      if (!t?.abbr || gt.has(t.abbr)) return
      gt.set(t.abbr, { abbr: t.abbr, team: t.team, logo: t.logo,
                       pts: 0, gd: 0, gf: 0, ga: 0, gp: 0 })
    }
    ensure(m.home); ensure(m.away)

    const hs = m.home.score != null ? +m.home.score : null
    const as_ = m.away.score != null ? +m.away.score : null
    if (hs == null || as_ == null) return // not played yet

    const h = gt.get(m.home.abbr)
    const a = gt.get(m.away.abbr)
    if (!h || !a) return

    h.gp++; a.gp++
    h.gf += hs; h.ga += as_; h.gd += hs - as_
    a.gf += as_; a.ga += hs; a.gd += as_ - hs
    if (hs > as_) h.pts += 3
    else if (hs < as_) a.pts += 3
    else { h.pts += 1; a.pts += 1 }
  })

  const map = {}
  Object.entries(buckets).forEach(([letter, teamMap]) => {
    const sorted = [...teamMap.values()].sort((a, b) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf
    )
    const maxGp = Math.max(...sorted.map(t => t.gp), 0)
    const complete = maxGp >= 3
    const thirdPts = sorted[2]?.pts ?? 0

    const isConf = (t, i) =>
      (complete && i < 2) ||
      (maxGp >= 2 && t.pts >= 6) ||
      (maxGp >= 2 && i < 2 && t.pts >= 4 && thirdPts === 0)

    map[letter] = {
      w:  sorted[0] ? { ...sorted[0], confirmed: isConf(sorted[0], 0) } : null,
      ru: sorted[1] ? { ...sorted[1], confirmed: isConf(sorted[1], 1) } : null,
      third: sorted[2] ?? null,
    }
  })
  return map
}

// Merge standings-API data over derived data (standings API is authoritative when available)
function getGroupQualifiers(groups, allGames) {
  // Start with data derived from live match results
  const base = deriveGroupMap(allGames)

  // Overlay with standings API data where available
  ;(groups ?? []).forEach(g => {
    const rawName = g.name?.trim() ?? ''
    // Normalize: "Group A" → "A", "A" → "A", "1" → keep as-is
    const lm = rawName.match(/^(?:group\s+)?([a-l])/i)
    const letter = lm ? lm[1].toUpperCase() : rawName.toUpperCase()
    if (!letter || !g.teams.length) return

    const gp = g.teams[0]?.gp ?? 0
    if (gp === 0) return
    const thirdPts = g.teams[2]?.pts ?? 0
    const isConf = (team, i) =>
      (gp >= 3 && i < 2) ||
      (gp >= 2 && team.pts >= 6) ||
      (gp >= 2 && i < 2 && team.pts >= 4 && thirdPts === 0)

    base[letter] = {
      w:     g.teams[0] ? { ...g.teams[0], confirmed: isConf(g.teams[0], 0) } : null,
      ru:    g.teams[1] ? { ...g.teams[1], confirmed: isConf(g.teams[1], 1) } : null,
      third: g.teams[2] ?? null,
    }
  })

  return base
}

// ── R32 projected pairings (left half indices 0-7, right half 8-15) ───────────
const R32_PAIRS = [
  { home: ['A','w'], away: ['B','ru'] }, // 0
  { home: ['C','w'], away: ['D','ru'] }, // 1
  { home: ['E','w'], away: ['F','ru'] }, // 2
  { home: ['G','w'], away: ['H','ru'] }, // 3
  { home: ['I','w'], away: ['J','ru'] }, // 4
  { home: ['K','w'], away: ['L','ru'] }, // 5
  { home: ['*3rd',''], away: ['*3rd',''] }, // 6
  { home: ['*3rd',''], away: ['*3rd',''] }, // 7
  { home: ['B','w'], away: ['A','ru'] }, // 8
  { home: ['D','w'], away: ['C','ru'] }, // 9
  { home: ['F','w'], away: ['E','ru'] }, // 10
  { home: ['H','w'], away: ['G','ru'] }, // 11
  { home: ['J','w'], away: ['I','ru'] }, // 12
  { home: ['L','w'], away: ['K','ru'] }, // 13
  { home: ['*3rd',''], away: ['*3rd',''] }, // 14
  { home: ['*3rd',''], away: ['*3rd',''] }, // 15
]

function slotTeam(ref, groupMap) {
  const [g, pos] = ref
  if (g.startsWith('*')) return null
  return groupMap[g]?.[pos] ?? null
}

function slotLabel([g, pos], t) {
  if (g.startsWith('*')) return t?.thirdPlace ?? '3rd Place'
  return `${pos === 'w' ? '1st' : '2nd'} Group ${g}`
}

// ── Classify allGames match by round ─────────────────────────────────────────
function getRoundKey(m) {
  const text = ((m.group ?? '') + ' ' + (m.name ?? '')).toLowerCase()
  // ESPN uses various slug formats — cover all known variants
  if (/round.of.32|r32|round.32/.test(text)) return 'r32'
  if (/round.of.16|r16|round.16/.test(text)) return 'r16'
  if (/quarter/.test(text)) return 'qf'
  if (/third|3rd.place|third.place/.test(text)) return '3p'
  if (/semi/.test(text)) return 'sf'
  if (/\bfinal\b/.test(text)) return 'f'
  // Date-based fallback (July 2026)
  const d = m.date
  if (d?.getFullYear() === 2026 && d.getMonth() === 6) {
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

// Build a lookup map from team pair → live match for real-time score overlay
function buildLiveIndex(liveMatches) {
  const idx = new Map()
  ;(liveMatches ?? []).forEach(m => {
    if (!m.home?.abbr || !m.away?.abbr) return
    const key = `${m.home.abbr}:${m.away.abbr}`
    const rev = `${m.away.abbr}:${m.home.abbr}`
    idx.set(key, m)
    idx.set(rev, { ...m, home: m.away, away: m.home, _flipped: true })
  })
  return idx
}

// Overlay live match data onto an allGames match (if available)
function withLive(match, liveIdx) {
  if (!match || !liveIdx) return match
  const key = `${match.home?.abbr}:${match.away?.abbr}`
  const live = liveIdx.get(key)
  if (!live) return match
  // Merge live scores and status into the bracket match
  return {
    ...match,
    statusType: live.statusType,
    displayClock: live.displayClock,
    home: { ...match.home, score: live.home.score ?? match.home?.score, winner: live.home.winner },
    away: { ...match.away, score: live.away.score ?? match.away?.score, winner: live.away.winner },
  }
}

// ── Bracket advancement helpers ───────────────────────────────────────────────

// Extract the winning team from a completed match (clears score/winner for display in next round)
function getWinner(match) {
  if (!match) return null
  // Primary: explicit winner flag
  const check = t => t?.winner && t.abbr && !isPlaceholder(t.abbr, t.team)
    ? { abbr: t.abbr, team: t.team, logo: t.logo, score: null, winner: false }
    : null
  const byFlag = check(match.home) ?? check(match.away)
  if (byFlag) return byFlag
  // Fallback: completed match with scores (winner flag may not be set by ESPN API)
  const done = /FINAL|FULL_TIME/i.test(match.statusType ?? '')
  const hs = match.home?.score != null ? +match.home.score : NaN
  const as = match.away?.score != null ? +match.away.score : NaN
  if (done && !isNaN(hs) && !isNaN(as) && hs !== as) {
    const w = hs > as ? match.home : match.away
    if (w?.abbr && !isPlaceholder(w.abbr, w.team))
      return { abbr: w.abbr, team: w.team, logo: w.logo, score: null, winner: false }
  }
  return null
}

// Given an array of N completed matches, return N/2 next-round matches
// pairing winners: [0,1]→[0], [2,3]→[1], [4,5]→[2], [6,7]→[3]
function advanceRound(matches) {
  const next = []
  for (let i = 0; i + 1 < matches.length; i += 2) {
    const w1 = getWinner(matches[i])
    const w2 = getWinner(matches[i + 1])
    next.push((w1 || w2) ? { computed: true, home: w1, away: w2, statusType: '' } : null)
  }
  return next
}

// Prefer data from source A if it has real teams; fall back to source B
function bestOf(a, b, n) {
  const hasReal = arr => arr.some(m => m?.home?.abbr && !isPlaceholder(m.home.abbr, m.home.team))
  return hasReal(a) ? a : (hasReal(b) ? b : Array(n).fill(null))
}

// ── Build unified bracket structure ─────────────────────────────────────────
function buildBracketData(bracketRounds, allGames, groupMap, liveIdx) {
  const fill = (games, n) => Array.from({ length: n }, (_, i) => games[i] ?? null)

  // Classify allGames by round
  const byRound = { r32:[], r16:[], qf:[], sf:[], f:[] }
  ;(allGames ?? []).forEach(m => {
    const k = getRoundKey(m)
    if (k && byRound[k]) byRound[k].push(m)
  })

  // ── Priority 1: ESPN bracket API has R32 live data ─────────────────────────
  if (bracketRounds.length > 0) {
    const findSeeds = (...keys) => {
      for (const r of bracketRounds) {
        const name = (r.name ?? '').toLowerCase()
        if (keys.some(k => name.includes(k))) return r.seeds ?? []
      }
      return []
    }
    const espnR32seeds = findSeeds('32', 'round of 32')

    if (espnR32seeds.length) {
      const toMatch = s => s ? {
        id: s.id, date: null,
        home: s.home ?? null, away: s.away ?? null,
        statusType: s.status ?? '', isEspnSeed: true,
      } : null
      const mapSeeds = (seeds, n) => fill(seeds.map(toMatch), n)

      // Apply live data so getWinner can detect completed matches
      const overlay = m => withLive(m, liveIdx)

      const leftR32  = mapSeeds(espnR32seeds.slice(0, 8),  8).map(m => m ? overlay(m) : m)
      const rightR32 = mapSeeds(espnR32seeds.slice(8, 16), 8).map(m => m ? overlay(m) : m)

      // Compute R16 from R32 winners; fall back to allGames R16 fixtures
      const computedLeftR16  = advanceRound(leftR32)
      const computedRightR16 = advanceRound(rightR32)
      const leftR16  = bestOf(fill(byRound.r16.slice(0, 4), 4), fill(computedLeftR16, 4), 4)
      const rightR16 = bestOf(fill(byRound.r16.slice(4, 8), 4), fill(computedRightR16, 4), 4)

      // Compute QF from R16 winners; fall back to allGames QF fixtures
      const computedLeftQF  = advanceRound(leftR16)
      const computedRightQF = advanceRound(rightR16)
      const leftQF  = bestOf(fill(byRound.qf.slice(0, 2), 2), fill(computedLeftQF, 2), 2)
      const rightQF = bestOf(fill(byRound.qf.slice(2, 4), 2), fill(computedRightQF, 2), 2)

      // Compute SF from QF winners
      const computedLeftSF  = advanceRound(leftQF)
      const computedRightSF = advanceRound(rightQF)
      const leftSF  = bestOf(fill(byRound.sf.slice(0, 1), 1), fill(computedLeftSF, 1), 1)
      const rightSF = bestOf(fill(byRound.sf.slice(1, 2), 1), fill(computedRightSF, 1), 1)

      // Compute Final from SF winners
      const computedFinal = advanceRound([...leftSF, ...rightSF])[0] ?? null
      const final = byRound.f[0] ?? computedFinal

      return { leftR32, leftR16, leftQF, leftSF, final, rightSF, rightQF, rightR16, rightR32 }
    }
  }

  // ── Priority 2: allGames has knockout data ─────────────────────────────────
  if (byRound.r32.length > 0 || byRound.r16.length > 0 || byRound.qf.length > 0) {
    const leftR32  = fill(byRound.r32.slice(0, 8),  8)
    const rightR32 = fill(byRound.r32.slice(8, 16), 8)

    const computedLeftR16  = advanceRound(leftR32)
    const computedRightR16 = advanceRound(rightR32)
    const leftR16  = bestOf(fill(byRound.r16.slice(0, 4), 4), fill(computedLeftR16, 4), 4)
    const rightR16 = bestOf(fill(byRound.r16.slice(4, 8), 4), fill(computedRightR16, 4), 4)

    const leftQF  = fill(byRound.qf.slice(0, 2), 2)
    const rightQF = fill(byRound.qf.slice(2, 4), 2)

    return {
      leftR32, leftR16, leftQF,
      leftSF:  fill(byRound.sf.slice(0, 1), 1),
      final:   byRound.f[0] ?? null,
      rightSF: fill(byRound.sf.slice(1, 2), 1),
      rightQF, rightR16, rightR32,
    }
  }

  // ── Priority 3: Group-stage projected R32 pairings ─────────────────────────
  const projected = R32_PAIRS.map(pair => ({
    id: null, projected: true,
    home: slotTeam(pair.home, groupMap), away: slotTeam(pair.away, groupMap),
    homeLabel: pair.home, awayLabel: pair.away,
  }))
  return {
    leftR32:  projected.slice(0, 8),
    leftR16:  fill([], 4), leftQF: fill([], 2), leftSF: fill([], 1),
    final:    null,
    rightSF:  fill([], 1), rightQF: fill([], 2), rightR16: fill([], 4),
    rightR32: projected.slice(8, 16),
  }
}

// ── Root component ─────────────────────────────────────────────────────────
export default function Bracket({ allGames, groups, bracketRounds, liveMatches }) {
  const { t } = useLang()
  const scrollRef = useRef(null)

  const groupMap = getGroupQualifiers(groups, allGames)
  const confirmedAbbrs = new Set()
  Object.values(groupMap).forEach(({ w, ru }) => {
    if (w?.confirmed)  confirmedAbbrs.add(w.abbr)
    if (ru?.confirmed) confirmedAbbrs.add(ru.abbr)
  })

  const liveIdx = useMemo(() => buildLiveIndex(liveMatches), [liveMatches])

  const bd = useMemo(
    () => buildBracketData(bracketRounds, allGames, groupMap, liveIdx),
    [bracketRounds, allGames, groups, groupMap, liveIdx]
  )

  // Scroll to center (Final column) on mount
  useEffect(() => {
    if (!scrollRef.current) return
    const el = scrollRef.current
    // Center column is at position 4 out of 9 columns
    const centerX = (COL_W + CONN_W) * 4 + COL_W / 2
    el.scrollLeft = centerX - el.clientWidth / 2
  }, [])

  const roundLabels = [
    t.roundOf32    ?? 'Round of 32',
    t.roundOf16    ?? 'Round of 16',
    t.quarterfinals ?? 'QF',
    t.semifinals   ?? 'SF',
    t.final        ?? 'Final',
  ]

  // Columns: [r32L, conn, r16L, conn, qfL, conn, sfL, conn, F, conn, sfR, conn, qfR, conn, r16R, conn, r32R]
  const leftMatches  = [bd.leftR32, bd.leftR16, bd.leftQF, bd.leftSF]
  const rightMatches = [bd.rightSF, bd.rightQF, bd.rightR16, bd.rightR32]

  return (
    <div className="tb-page">
      <div className="tb-scroll" ref={scrollRef}>
        {/* Header row: 9 round cols + 8 connector strips = 17 elements */}
        <div className="tb-header-row">
          {[0,-1,1,-1,2,-1,3,-1,4,-1,3,-1,2,-1,1,-1,0].map((ri, col) => (
            <div key={col}
              className={`tb-header${ri === 4 ? ' tb-header-final' : ''}`}
              style={{ width: ri === -1 ? CONN_W : COL_W }}>
              {ri >= 0 ? roundLabels[ri] : ''}
            </div>
          ))}
        </div>

        {/* Bracket main area */}
        <div className="tb-main" style={{ height: HALF_H }}>
          {/* Left half columns */}
          {leftMatches.map((matches, col) => (
            <>
              <RoundCol key={`lc${col}`} matches={matches} roundIdx={col} confirmedAbbrs={confirmedAbbrs} liveIdx={liveIdx} t={t} />
              <ConnSvg key={`lv${col}`}
                fromRound={col} toRound={col + 1}
                count={matches.length / 2 || 1}
                side="left"
                single={col === 3}
              />
            </>
          ))}

          {/* Final */}
          <div className="tb-col" style={{ width: COL_W, position: 'relative', height: HALF_H }}>
            <div style={{ position: 'absolute', top: ty(3, 0), left: 0, width: COL_W }}>
              <MatchCard match={withLive(bd.final, liveIdx)} confirmedAbbrs={confirmedAbbrs} isFinal t={t} />
            </div>
          </div>

          {/* Right half */}
          {rightMatches.map((matches, col) => {
            const roundIdx = 3 - col  // SF=3, QF=2, R16=1, R32=0
            return (
              <>
                <ConnSvg key={`rv${col}`}
                  fromRound={roundIdx} toRound={roundIdx + 1}
                  count={col === 0 ? 1 : matches.length / 2}
                  side="right"
                  single={col === 0}
                />
                <RoundCol key={`rc${col}`} matches={matches} roundIdx={roundIdx} confirmedAbbrs={confirmedAbbrs} liveIdx={liveIdx} t={t} />
              </>
            )
          })}
        </div>
      </div>

      <QualifiersSection groupMap={groupMap} />
    </div>
  )
}

// ── Round column ──────────────────────────────────────────────────────────────
function RoundCol({ matches, roundIdx, confirmedAbbrs, liveIdx, t }) {
  return (
    <div className="tb-col" style={{ width: COL_W, position: 'relative', height: HALF_H }}>
      {matches.map((match, i) => (
        <div key={match?.id ?? i} style={{ position: 'absolute', top: ty(roundIdx, i), left: 0, width: COL_W }}>
          <MatchCard match={withLive(match, liveIdx)} confirmedAbbrs={confirmedAbbrs} t={t} />
        </div>
      ))}
    </div>
  )
}

// ── SVG connector between columns ─────────────────────────────────────────────
// side='left': "from" column is left, lines go left→right
// side='right': "from" column is right, lines go right→left
// single=true: 1:1 horizontal connector (SF→Final)
function ConnSvg({ fromRound, toRound, count, side, single }) {
  const paths = []

  if (single) {
    const y = cy(fromRound, 0)
    paths.push(`M 0 ${y} H ${CONN_W}`)
  } else {
    for (let i = 0; i < count; i++) {
      const topY = cy(fromRound, i * 2)
      const botY = cy(fromRound, i * 2 + 1)
      const midY = cy(toRound, i)
      if (side === 'left') {
        paths.push(`M 0 ${topY} H ${CONN_W / 2} V ${botY} H 0 M ${CONN_W / 2} ${midY} H ${CONN_W}`)
      } else {
        paths.push(`M ${CONN_W} ${topY} H ${CONN_W / 2} V ${botY} H ${CONN_W} M ${CONN_W / 2} ${midY} H 0`)
      }
    }
  }

  return (
    <svg width={CONN_W} height={HALF_H} style={{ display: 'block', flexShrink: 0 }}>
      <path d={paths.join(' ')} stroke="var(--border)" strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </svg>
  )
}

// ── Match card (two stacked team rows) ────────────────────────────────────────
function MatchCard({ match, confirmedAbbrs, t }) {
  if (!match) {
    return (
      <div className="tb-match tb-match-empty">
        <div className="tb-team tb-team-tbd"><span className="tb-abbr tb-tbd-text">TBD</span></div>
        <div className="tb-match-divider" />
        <div className="tb-team tb-team-tbd"><span className="tb-abbr tb-tbd-text">TBD</span></div>
      </div>
    )
  }

  if (match.projected) {
    return (
      <div className="tb-match">
        <ProjectedTeamRow ref_={match.homeLabel} team={match.home} confirmedAbbrs={confirmedAbbrs} t={t} />
        <div className="tb-match-divider" />
        <ProjectedTeamRow ref_={match.awayLabel} team={match.away} confirmedAbbrs={confirmedAbbrs} t={t} />
      </div>
    )
  }

  // Computed from bracket advancement (winner of previous round)
  if (match.computed) {
    return (
      <div className="tb-match">
        <AdvancedTeamRow team={match.home} confirmedAbbrs={confirmedAbbrs} />
        <div className="tb-match-divider" />
        <AdvancedTeamRow team={match.away} confirmedAbbrs={confirmedAbbrs} />
      </div>
    )
  }

  const isFinal = match.statusType === 'STATUS_FINAL' || match.statusType === 'STATUS_FULL_TIME'
  const isLive  = match.statusType === 'STATUS_IN_PROGRESS'

  if (match.isEspnSeed) {
    return (
      <div className={`tb-match${isLive ? ' tb-match-live' : ''}`}>
        <EspnTeamRow team={match.home} isFinal={isFinal} confirmedAbbrs={confirmedAbbrs} score={match.home?.score} />
        <div className="tb-match-divider" />
        <EspnTeamRow team={match.away} isFinal={isFinal} confirmedAbbrs={confirmedAbbrs} score={match.away?.score} />
      </div>
    )
  }

  return (
    <div className={`tb-match${isLive ? ' tb-match-live' : ''}`}>
      <LiveTeamRow team={match.home} isFinal={isFinal} confirmedAbbrs={confirmedAbbrs} />
      <div className="tb-match-divider" />
      <LiveTeamRow team={match.away} isFinal={isFinal} confirmedAbbrs={confirmedAbbrs} />
    </div>
  )
}

// ── Team rows ─────────────────────────────────────────────────────────────────
function LiveTeamRow({ team, isFinal, confirmedAbbrs }) {
  const { tn } = useLang()
  if (!team?.abbr) return <div className="tb-team tb-team-tbd"><span className="tb-abbr tb-tbd-text">TBD</span></div>
  const isGroupConf = confirmedAbbrs?.has(team.abbr)
  const isWinner = !!team.winner
  const isConf = isWinner || isGroupConf
  const cls = `tb-team${isWinner ? ' tb-winner' : ''}${isConf ? ' tb-confirmed' : (!isFinal ? ' tb-leading' : '')}`
  return (
    <div className={cls}>
      <TeamFlag abbr={team.abbr} logo={team.logo} size={18} />
      <span className="tb-abbr">{team.abbr}</span>
      {team.score != null && <span className="tb-score">{team.score}</span>}
    </div>
  )
}

function EspnTeamRow({ team, isFinal, confirmedAbbrs, score }) {
  const { tn } = useLang()
  if (!team?.abbr || isPlaceholder(team.abbr, team.team))
    return <div className="tb-team tb-team-tbd"><span className="tb-abbr tb-tbd-text">TBD</span></div>
  const isGroupConf = confirmedAbbrs?.has(team.abbr)
  const isWinner = !!team.winner
  const isConf = isWinner || isGroupConf
  const cls = `tb-team${isWinner ? ' tb-winner' : ''}${isConf ? ' tb-confirmed' : (!isFinal ? ' tb-leading' : '')}`
  return (
    <div className={cls}>
      <TeamFlag abbr={team.abbr} logo={team.logo} size={18} />
      <span className="tb-abbr">{team.abbr}</span>
      {score != null && <span className="tb-score">{score}</span>}
    </div>
  )
}

// Team that advanced from a previous round (confirmed, no score yet)
function AdvancedTeamRow({ team, confirmedAbbrs }) {
  const { tn } = useLang()
  if (!team?.abbr || isPlaceholder(team.abbr, team.team)) {
    return <div className="tb-team tb-team-tbd"><span className="tb-abbr tb-tbd-text">TBD</span></div>
  }
  const isConf = confirmedAbbrs?.has(team.abbr)
  return (
    <div className={`tb-team${isConf ? ' tb-confirmed' : ' tb-leading'}`}>
      <TeamFlag abbr={team.abbr} logo={team.logo} size={18} />
      <span className="tb-abbr">{team.abbr}</span>
    </div>
  )
}

function ProjectedTeamRow({ ref_, team, confirmedAbbrs, t }) {
  const { tn } = useLang()
  if (!team) {
    const label = slotLabel(ref_, t)
    return (
      <div className="tb-team tb-team-tbd">
        <div className="tb-flag-ph" />
        <span className="tb-abbr tb-tbd-text" style={{ fontSize: 9 }}>{label}</span>
      </div>
    )
  }
  const isConf = team.confirmed || confirmedAbbrs?.has(team.abbr)
  return (
    <div className={`tb-team${isConf ? ' tb-confirmed' : ' tb-leading'}`}>
      <TeamFlag abbr={team.abbr} logo={team.logo} size={18} />
      <span className="tb-abbr">{team.abbr}</span>
    </div>
  )
}

// ── Qualifiers mini grid ──────────────────────────────────────────────────────
function QualifiersSection({ groupMap }) {
  const { t, tn } = useLang()
  const entries = Object.entries(groupMap).sort(([a], [b]) => a.localeCompare(b))
  if (!entries.length) return null
  return (
    <div className="bk-qual-section">
      <div className="bk-qual-title">{t.qualifiers}</div>
      <div className="qualifiers-grid">
        {entries.map(([letter, q]) => (
          <div key={letter} className="qual-mini">
            <div className="qual-mini-header">{t.group} {letter}</div>
            <QualRow team={q?.w}  label={t.confirmed} />
            <QualRow team={q?.ru} label={t.runnerUp} />
          </div>
        ))}
      </div>
    </div>
  )
}

function QualRow({ team, label }) {
  const { t, tn } = useLang()
  if (!team) return (
    <div className="qual-mini-row">
      <span className="qual-mini-pos">{label}</span>
      <div style={{ width: 22, height: 15, background: 'var(--border)', borderRadius: 2 }} />
      <span className="tbd" style={{ fontSize: 11 }}>{t.tbd}</span>
    </div>
  )
  if (team.confirmed) return (
    <div className="qual-mini-row confirmed">
      <span className="qual-mini-pos">{label}</span>
      <TeamFlag abbr={team.abbr} logo={team.logo} size={22} />
      <span className="qual-mini-name">{tn(team.team, team.abbr)}</span>
      <span className="qual-check">✓</span>
    </div>
  )
  return (
    <div className="qual-mini-row leading">
      <span className="qual-mini-pos">{label}</span>
      <TeamFlag abbr={team.abbr} logo={team.logo} size={22} />
      <span className="qual-mini-name">{tn(team.team, team.abbr)}</span>
      <span className="qual-pending">~</span>
    </div>
  )
}
