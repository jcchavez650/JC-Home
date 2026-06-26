// Win probability from multiple sources, tried in order

const PROXIES = [
  u => u,
  u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  u => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
]

async function tryGet(url) {
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(url), { headers: { 'Accept': 'application/json' } })
      if (!res.ok) continue
      return await res.json()
    } catch { /* try next */ }
  }
  return null
}

// ── Source 1: ESPN core predictor endpoint ────────────────────────────────
async function fromEspnPredictor(eventId) {
  const base = `https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world`
  const data = await tryGet(`${base}/events/${eventId}/competitions/${eventId}/predictor`)
  if (!data) return null

  const home = data.homeTeam ?? data.home
  const away = data.awayTeam ?? data.away
  if (home?.winProbability == null) return null

  const h = Math.round(home.winProbability)
  const a = Math.round(away?.winProbability ?? 0)
  return { homeWinPct: h, awayWinPct: a, drawPct: Math.max(0, 100 - h - a) }
}

// ── Source 2: ESPN core odds endpoint ─────────────────────────────────────
async function fromEspnOdds(eventId) {
  const base = `https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world`
  const data = await tryGet(`${base}/events/${eventId}/competitions/${eventId}/odds`)
  if (!data) return null

  const item = Array.isArray(data.items) ? data.items[0] : data
  const h = item?.homeTeamOdds?.winPercentage ?? item?.homeWinPercentage
  const a = item?.awayTeamOdds?.winPercentage ?? item?.awayWinPercentage
  if (h == null) return null

  const hr = Math.round(h)
  const ar = Math.round(a ?? 0)
  return { homeWinPct: hr, awayWinPct: ar, drawPct: Math.max(0, 100 - hr - ar) }
}

// ── Source 3: Sofascore – match today and extract probabilities ───────────
let sofascoreCache = null
async function loadSofascore(dateStr) {
  if (sofascoreCache?.date === dateStr) return sofascoreCache.events
  const data = await tryGet(`https://api.sofascore.com/api/v1/sport/football/scheduled-events/${dateStr}`)
  const events = data?.events ?? []
  sofascoreCache = { date: dateStr, events }
  return events
}

async function fromSofascore(homeAbbr, awayAbbr, dateStr) {
  const events = await loadSofascore(dateStr)
  // Find matching event by abbreviation or partial name
  const match = events.find(e => {
    const h = (e.homeTeam?.nameCode ?? '').toUpperCase()
    const a = (e.awayTeam?.nameCode ?? '').toUpperCase()
    return h === homeAbbr && a === awayAbbr
  })
  if (!match) return null

  // Sofascore win probability is in event.winnerCode or estimated from odds
  // Try the featured-odds endpoint
  const odds = await tryGet(`https://api.sofascore.com/api/v1/event/${match.id}/featured-odds`)
  if (!odds) return null

  // Sofascore odds: odds.oddItems[] with id 1=home win, 2=draw, 3=away win
  const items = odds.featuredOdds?.odds ?? odds.oddItems ?? []
  const homeOdd = items.find(o => o.name === '1' || o.id === 1 || o.name === 'Home')?.fractionalValue
  const drawOdd = items.find(o => o.name === 'X' || o.id === 2 || o.name === 'Draw')?.fractionalValue
  const awayOdd = items.find(o => o.name === '2' || o.id === 3 || o.name === 'Away')?.fractionalValue

  if (!homeOdd) return null

  const toProb = f => f != null ? 1 / (f + 1) : null
  const hp = toProb(homeOdd), dp = toProb(drawOdd), ap = toProb(awayOdd)
  if (!hp) return null

  const total = (hp ?? 0) + (dp ?? 0) + (ap ?? 0)
  return {
    homeWinPct: Math.round((hp / total) * 100),
    drawPct:    Math.round(((dp ?? 0) / total) * 100),
    awayWinPct: Math.round((ap ?? 0) / total * 100),
  }
}

// ── Source 4: Elo-based estimate (always available) ───────────────────────
// Approximate World Football Elo ratings as of June 2026
const ELO = {
  ARG: 2109, FRA: 2058, ESP: 2051, ENG: 2034, BRA: 2030, POR: 2012,
  GER: 1996, NED: 1972, BEL: 1959, ITA: 1948, MAR: 1929, USA: 1908,
  URU: 1905, MEX: 1884, JPN: 1876, CRO: 1869, SEN: 1861, ECU: 1858,
  COL: 1856, AUS: 1843, SUI: 1853, DEN: 1844, POL: 1841, SER: 1835,
  KOR: 1828, UKR: 1823, AUT: 1822, TUR: 1818, IRN: 1804, CAN: 1802,
  CHI: 1783, PER: 1781, SAU: 1782, HUN: 1774, NZL: 1762, SCO: 1772,
  GHA: 1768, NGR: 1760, EGY: 1754, CMR: 1752, CIV: 1749, TUN: 1744,
  MLI: 1740, COD: 1738, RSA: 1730, SLO: 1726, GEO: 1720, ALB: 1715,
  SVK: 1712, GRE: 1708, UZB: 1702, JOR: 1698, IRQ: 1695, QAT: 1690,
  UAE: 1685, CHN: 1680, HON: 1672, GUA: 1668, PAN: 1664, JAM: 1658,
  TRI: 1650, CRI: 1645, BOL: 1640, VEN: 1638, PAR: 1635, WAL: 1720,
  ROM: 1710, CZE: 1705, NOR: 1760, SWE: 1752,
}

function eloProbability(homeAbbr, awayAbbr) {
  const eloH = ELO[homeAbbr] ?? 1750
  const eloA = ELO[awayAbbr] ?? 1750
  const homeAdv = 40 // standard home advantage in Elo

  // Expected score (win probability) for each side
  const expH = 1 / (1 + Math.pow(10, (eloA - eloH - homeAdv) / 400))
  const expA = 1 / (1 + Math.pow(10, (eloH - eloA + homeAdv) / 400))

  // Estimate draw probability (higher when teams are evenly matched)
  const diff = Math.abs(eloH - eloA)
  const drawBase = 0.28 - (diff / 400) * 0.08
  const drawPct = Math.max(0.10, Math.min(0.35, drawBase))

  const scale = 1 - drawPct
  const h = Math.round(expH * scale * 100)
  const a = Math.round(expA * scale * 100)
  const d = 100 - h - a

  return { homeWinPct: h, awayWinPct: a, drawPct: Math.max(0, d) }
}

// ── Public: enrich matches with win probabilities ─────────────────────────
export function enrichWithProbability(matches) {
  // ESPN predictor/odds return 400 and Sofascore is CORS-blocked — skip them
  // to avoid console noise. Elo is instant and always available.
  return matches.map(m => ({ ...m, ...eloProbability(m.home.abbr, m.away.abbr) }))
}
