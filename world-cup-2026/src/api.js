// ESPN unofficial API – no key required
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
const ESPN_V2 = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world'
const ESPN_CORE = 'https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world'

const PROXIES = [
  u => u,
  u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  u => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
]

async function get(url) {
  let lastErr
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(url))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

export async function fetchScoreboard() {
  // Fetch today for live scores
  return get(`${ESPN_BASE}/scoreboard`)
}

// WC 2026 runs Jun 11 – Jul 22, 2026
// ESPN accepts ?dates=YYYYMMDD-YYYYMMDD for a range
export async function fetchAllGames() {
  const data = await get(`${ESPN_BASE}/scoreboard?dates=20260611-20260722&limit=200`)
  return data
}

export async function fetchStandings() {
  return get(`${ESPN_V2}/standings`)
}

// Fetch the full knockout bracket from ESPN
export async function fetchBracket() {
  return get(`${ESPN_V2}/bracket`)
}

export function parseBracket(data) {
  // Log actual shape so we can debug ESPN's bracket response
  if (data) console.log('[bracket]', JSON.stringify(data).slice(0, 400))

  // Try multiple possible ESPN bracket shapes
  const rounds =
    data?.bracket?.rounds ??
    data?.rounds ??
    data?.bracket?.entries ??
    data?.children ??
    []

  if (!rounds.length) return []

  return rounds.map(r => ({
    name: r.name ?? r.displayName ?? '',
    seeds: ((r.seeds ?? r.entries ?? r.competitors ?? [])).map(seed => ({
      id: seed.id,
      home: extractBracketTeam(seed.teams?.[0] ?? seed.competitors?.[0] ?? seed.home),
      away: extractBracketTeam(seed.teams?.[1] ?? seed.competitors?.[1] ?? seed.away),
      homeScore: seed.teams?.[0]?.score ?? null,
      awayScore: seed.teams?.[1]?.score ?? null,
      status: seed.status?.type?.name ?? '',
    })),
  })).filter(r => r.seeds.length > 0)
}

function extractBracketTeam(t) {
  if (!t) return null
  const team = t.team ?? t
  return {
    team: team.displayName ?? team.name ?? 'TBD',
    abbr: team.abbreviation ?? '',
    logo: team.logo ?? null,
    score: t.score ?? null,
    winner: t.winner ?? false,
  }
}

// Fetch detailed match data including videos/highlights
export async function fetchMatchDetail(eventId) {
  return get(`${ESPN_BASE}/summary?event=${eventId}`)
}

export function parseMatches(data) {
  if (!data?.events) return []
  return data.events.map(event => {
    const comp = event.competitions?.[0] ?? {}
    const home = comp.competitors?.find(c => c.homeAway === 'home')
    const away = comp.competitors?.find(c => c.homeAway === 'away')
    const status = comp.status ?? {}

    // Extract any highlight videos directly in the scoreboard payload
    const videos = extractVideos(comp, event)

    return {
      id: event.id,
      date: new Date(event.date),
      name: event.name,
      group: event.season?.slug ?? '',
      venue: comp.venue?.fullName ?? '',
      statusType: status.type?.name ?? '',
      displayClock: status.displayClock ?? '',
      period: status.period ?? 0,
      videos,
      homeWinPct: null,
      awayWinPct: null,
      drawPct: null,
      home: {
        team: home?.team?.displayName ?? 'TBD',
        abbr: home?.team?.abbreviation ?? '',
        logo: home?.team?.logo ?? null,
        score: home?.score ?? null,
        winner: home?.winner ?? false,
      },
      away: {
        team: away?.team?.displayName ?? 'TBD',
        abbr: away?.team?.abbreviation ?? '',
        logo: away?.team?.logo ?? null,
        score: away?.score ?? null,
        winner: away?.winner ?? false,
      },
    }
  })
}

function extractVideos(comp, event) {
  const clips = []

  // ESPN embeds videos directly in competition or event objects
  const sources = [comp.videos, event.videos, comp.highlights]
  for (const arr of sources) {
    if (!Array.isArray(arr)) continue
    for (const v of arr) {
      const mp4 = v.links?.source?.href ?? v.links?.mobile?.href ?? null
      const embed = v.links?.web?.href ?? null
      clips.push({
        title: v.headline ?? v.caption ?? 'Highlight',
        thumbnail: v.thumbnail ?? v.images?.[0]?.url ?? null,
        mp4,
        embed,
        duration: v.duration ?? null,
      })
    }
  }
  return clips
}

export function parseStandings(data) {
  if (!data?.children) return []
  return data.children.map(group => ({
    name: group.name ?? group.abbreviation,
    teams: (group.standings?.entries ?? []).map(entry => {
      const stats = {}
      entry.stats?.forEach(s => { stats[s.name] = s.value })
      return {
        team: entry.team?.displayName ?? '',
        abbr: entry.team?.abbreviation ?? '',
        logo: entry.team?.logo ?? null,
        gp: stats.gamesPlayed ?? 0,
        w: stats.wins ?? 0,
        d: stats.ties ?? 0,
        l: stats.losses ?? 0,
        gf: stats.pointsFor ?? 0,
        ga: stats.pointsAgainst ?? 0,
        gd: stats.pointDifferential ?? 0,
        pts: stats.points ?? 0,
      }
    }), // keep ESPN's ordering — it includes head-to-head tiebreakers we don't have
  }))
}

// ESPN 3-letter → ISO 2-letter for flagcdn.com
const ISO2 = {
  USA: 'us', MEX: 'mx', CAN: 'ca',
  BRA: 'br', ARG: 'ar', URU: 'uy', COL: 'co', ECU: 'ec', PER: 'pe', CHI: 'cl', PAR: 'py', BOL: 'bo', VEN: 've',
  FRA: 'fr', GER: 'de', ENG: 'gb-eng', ESP: 'es', POR: 'pt', ITA: 'it', NED: 'nl', BEL: 'be',
  CRO: 'hr', SER: 'rs', POL: 'pl', SUI: 'ch', AUT: 'at', DEN: 'dk', SWE: 'se', NOR: 'no',
  SCO: 'gb-sct', WAL: 'gb-wls', SVK: 'sk', CZE: 'cz', HUN: 'hu', ROM: 'ro', UKR: 'ua',
  TUR: 'tr', GRE: 'gr', ALB: 'al', GEO: 'ge', SLO: 'si',
  MAR: 'ma', SEN: 'sn', NGR: 'ng', EGY: 'eg', CMR: 'cm', CIV: 'ci', GHA: 'gh', TUN: 'tn', RSA: 'za', MLI: 'ml', COD: 'cd',
  JPN: 'jp', KOR: 'kr', SAU: 'sa', IRN: 'ir', AUS: 'au', QAT: 'qa', UAE: 'ae', IRQ: 'iq', UZB: 'uz', JOR: 'jo', CHN: 'cn',
  NZL: 'nz', CRI: 'cr', HON: 'hn', GUA: 'gt', PAN: 'pa', JAM: 'jm', TRI: 'tt',
}

export function flagUrl(abbr, size = 40) {
  const iso = ISO2[abbr]
  return iso ? `https://flagcdn.com/w${size}/${iso}.png` : null
}
