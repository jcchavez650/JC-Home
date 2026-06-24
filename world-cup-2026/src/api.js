// ESPN unofficial API – no key required
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
const ESPN_V2 = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world'

const CORS = 'https://corsproxy.io/?url='

async function get(url) {
  const res = await fetch(CORS + encodeURIComponent(url))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchScoreboard() {
  return get(`${ESPN_BASE}/scoreboard`)
}

export async function fetchStandings() {
  return get(`${ESPN_V2}/standings`)
}

// Parse scoreboard into structured matches
export function parseMatches(data) {
  if (!data?.events) return []
  return data.events.map(event => {
    const comp = event.competitions?.[0] ?? {}
    const home = comp.competitors?.find(c => c.homeAway === 'home')
    const away = comp.competitors?.find(c => c.homeAway === 'away')
    const status = comp.status ?? {}

    return {
      id: event.id,
      date: new Date(event.date),
      name: event.name,
      group: event.season?.slug ?? '',
      venue: comp.venue?.fullName ?? '',
      statusType: status.type?.name ?? '',
      displayClock: status.displayClock ?? '',
      period: status.period ?? 0,
      home: {
        team: home?.team?.displayName ?? 'TBD',
        abbr: home?.team?.abbreviation ?? '',
        flag: countryFlag(home?.team?.abbreviation),
        score: home?.score ?? null,
        winner: home?.winner ?? false,
      },
      away: {
        team: away?.team?.displayName ?? 'TBD',
        abbr: away?.team?.abbreviation ?? '',
        flag: countryFlag(away?.team?.abbreviation),
        score: away?.score ?? null,
        winner: away?.winner ?? false,
      },
    }
  })
}

// Parse standings into groups
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
        flag: countryFlag(entry.team?.abbreviation),
        gp: stats.gamesPlayed ?? 0,
        w: stats.wins ?? 0,
        d: stats.ties ?? 0,
        l: stats.losses ?? 0,
        gf: stats.pointsFor ?? 0,
        ga: stats.pointsAgainst ?? 0,
        gd: stats.pointDifferential ?? 0,
        pts: stats.points ?? 0,
      }
    }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf),
  }))
}

// Country code → flag emoji
export function countryFlag(abbr) {
  const map = {
    USA: '🇺🇸', MEX: '🇲🇽', CAN: '🇨🇦',
    BRA: '🇧🇷', ARG: '🇦🇷', URU: '🇺🇾', COL: '🇨🇴', ECU: '🇪🇨', PER: '🇵🇪', CHI: '🇨🇱', PAR: '🇵🇾', BOL: '🇧🇴', VEN: '🇻🇪',
    FRA: '🇫🇷', GER: '🇩🇪', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', ESP: '🇪🇸', POR: '🇵🇹', ITA: '🇮🇹', NED: '🇳🇱', BEL: '🇧🇪',
    CRO: '🇭🇷', SER: '🇷🇸', POL: '🇵🇱', SUI: '🇨🇭', AUT: '🇦🇹', DEN: '🇩🇰', SWE: '🇸🇪', NOR: '🇳🇴',
    SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', WAL: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', SVK: '🇸🇰', CZE: '🇨🇿', HUN: '🇭🇺', ROM: '🇷🇴', UKR: '🇺🇦',
    TUR: '🇹🇷', GRE: '🇬🇷', ALB: '🇦🇱', GEO: '🇬🇪', SLO: '🇸🇮',
    MAR: '🇲🇦', SEN: '🇸🇳', NGR: '🇳🇬', EGY: '🇪🇬', CMR: '🇨🇲', CIV: '🇨🇮', GHA: '🇬🇭', TUN: '🇹🇳', RSA: '🇿🇦', MLI: '🇲🇱', COD: '🇨🇩', GAB: '🇬🇦',
    JPN: '🇯🇵', KOR: '🇰🇷', SAU: '🇸🇦', IRN: '🇮🇷', AUS: '🇦🇺', QAT: '🇶🇦', UAE: '🇦🇪', IRQ: '🇮🇶', UZB: '🇺🇿', JOR: '🇯🇴', THA: '🇹🇭', IND: '🇮🇳', CHN: '🇨🇳',
    NZL: '🇳🇿', PNG: '🇵🇬',
    CRI: '🇨🇷', HON: '🇭🇳', GUA: '🇬🇹', PAN: '🇵🇦', JAM: '🇯🇲', TRI: '🇹🇹',
  }
  return map[abbr] ?? '🏳️'
}
