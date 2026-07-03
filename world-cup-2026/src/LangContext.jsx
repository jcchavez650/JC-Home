import { createContext, useContext, useState } from 'react'

// Spanish names keyed by ESPN abbreviation
const TEAM_NAMES_ES = {
  USA: 'Estados Unidos', MEX: 'México', CAN: 'Canadá',
  BRA: 'Brasil', ARG: 'Argentina', URU: 'Uruguay', COL: 'Colombia',
  ECU: 'Ecuador', PER: 'Perú', CHI: 'Chile', PAR: 'Paraguay',
  BOL: 'Bolivia', VEN: 'Venezuela',
  FRA: 'Francia', GER: 'Alemania', ENG: 'Inglaterra', ESP: 'España',
  POR: 'Portugal', ITA: 'Italia', NED: 'Países Bajos', BEL: 'Bélgica',
  CRO: 'Croacia', SER: 'Serbia', POL: 'Polonia', SUI: 'Suiza',
  AUT: 'Austria', DEN: 'Dinamarca', SWE: 'Suecia', NOR: 'Noruega',
  SCO: 'Escocia', WAL: 'Gales', SVK: 'Eslovaquia', CZE: 'República Checa',
  HUN: 'Hungría', ROM: 'Rumanía', UKR: 'Ucrania', TUR: 'Turquía',
  GRE: 'Grecia', ALB: 'Albania', GEO: 'Georgia', SLO: 'Eslovenia',
  MAR: 'Marruecos', SEN: 'Senegal', NGR: 'Nigeria', EGY: 'Egipto',
  CMR: 'Camerún', CIV: 'Costa de Marfil', GHA: 'Ghana', TUN: 'Túnez',
  RSA: 'Sudáfrica', MLI: 'Malí', COD: 'R.D. Congo',
  JPN: 'Japón', KOR: 'Corea del Sur', SAU: 'Arabia Saudita', IRN: 'Irán',
  AUS: 'Australia', QAT: 'Catar', UAE: 'Emiratos Árabes', IRQ: 'Irak',
  UZB: 'Uzbekistán', JOR: 'Jordania', CHN: 'China',
  NZL: 'Nueva Zelanda', CRI: 'Costa Rica', HON: 'Honduras',
  GUA: 'Guatemala', PAN: 'Panamá', JAM: 'Jamaica', TRI: 'Trinidad y Tobago',
  // Common ESPN display name variants
  'United States': 'Estados Unidos',
  'Mexico': 'México', 'Brazil': 'Brasil', 'France': 'Francia',
  'Germany': 'Alemania', 'England': 'Inglaterra', 'Spain': 'España',
  'Portugal': 'Portugal', 'Italy': 'Italia', 'Netherlands': 'Países Bajos',
  'Belgium': 'Bélgica', 'Croatia': 'Croacia', 'Serbia': 'Serbia',
  'Poland': 'Polonia', 'Switzerland': 'Suiza', 'Austria': 'Austria',
  'Denmark': 'Dinamarca', 'Sweden': 'Suecia', 'Norway': 'Noruega',
  'Scotland': 'Escocia', 'Wales': 'Gales', 'Slovakia': 'Eslovaquia',
  'Czech Republic': 'República Checa', 'Czechia': 'República Checa',
  'Hungary': 'Hungría', 'Romania': 'Rumanía', 'Ukraine': 'Ucrania',
  'Turkey': 'Turquía', 'Greece': 'Grecia', 'Albania': 'Albania',
  'Georgia': 'Georgia', 'Slovenia': 'Eslovenia',
  'Morocco': 'Marruecos', 'Senegal': 'Senegal', 'Nigeria': 'Nigeria',
  'Egypt': 'Egipto', 'Cameroon': 'Camerún', "Ivory Coast": 'Costa de Marfil',
  "Côte d'Ivoire": 'Costa de Marfil', 'Ghana': 'Ghana', 'Tunisia': 'Túnez',
  'South Africa': 'Sudáfrica', 'Mali': 'Malí', 'DR Congo': 'R.D. Congo',
  'Japan': 'Japón', 'South Korea': 'Corea del Sur', 'Saudi Arabia': 'Arabia Saudita',
  'Iran': 'Irán', 'Australia': 'Australia', 'Qatar': 'Catar',
  'UAE': 'Emiratos Árabes', 'Iraq': 'Irak', 'Uzbekistan': 'Uzbekistán',
  'Jordan': 'Jordania', 'China': 'China', 'New Zealand': 'Nueva Zelanda',
  'Costa Rica': 'Costa Rica', 'Honduras': 'Honduras', 'Guatemala': 'Guatemala',
  'Panama': 'Panamá', 'Jamaica': 'Jamaica', 'Trinidad & Tobago': 'Trinidad y Tobago',
  'Canada': 'Canadá', 'Argentina': 'Argentina', 'Uruguay': 'Uruguay',
  'Colombia': 'Colombia', 'Ecuador': 'Ecuador', 'Peru': 'Perú',
  'Chile': 'Chile', 'Paraguay': 'Paraguay', 'Bolivia': 'Bolivia',
  'Venezuela': 'Venezuela', 'Bosnia-Herzegovina': 'Bosnia-Herzegovina',
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
}

export function getTeamName(displayName, abbr, lang) {
  if (lang === 'en') return displayName
  return TEAM_NAMES_ES[abbr] ?? TEAM_NAMES_ES[displayName] ?? displayName
}

const translations = {
  en: {
    title: 'World Cup 2026',
    subtitle: 'USA · Canada · Mexico',
    refresh: 'Refresh',
    tabs: { scores: 'Scores', games: 'Games', groups: 'Groups', bracket: 'Bracket', eliminated: 'Eliminated' },
    updated: 'Updated',
    autoRefresh: 'auto-refreshes every 30s',
    loading: 'Loading World Cup 2026 data…',
    errorLoad: 'Could not load data',
    tryAgain: 'Try again',
    share: '📤 Share this tracker',
    shareCopied: 'Link copied!',
    // Scores
    liveNow: '🔴 Live Now',
    todayMatches: "Today's Matches",
    upcoming: 'Upcoming',
    recentResults: 'Recent Results',
    allMatches: 'All Matches',
    noMatches: 'No matches found. Check back soon!',
    ft: 'FT',
    live: 'Live',
    // Games
    all: 'All',
    finished: 'Finished',
    todayOnly: 'Showing today only — full schedule unavailable',
    noGamesFound: 'No matches found.',
    filterByTeam: 'Filter by Team',
    searchTeam: 'Search team…',
    // Groups
    noGroups: 'Group standings not available yet.',
    group: 'Group',
    gp: 'GP', w: 'W', d: 'D', l: 'L', gd: 'GD', pts: 'PTS',
    // Bracket
    roundOf32: 'Round of 32', roundOf16: 'Round of 16',
    quarterfinals: 'Quarter-finals', semifinals: 'Semi-finals', final: 'Final',
    r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF',
    qualifiers: 'Group Qualifiers',
    bracketNote: 'Bracket populates after the group stage ends.',
    groupStage: 'Group stage: Jun 11 – Jul 2, 2026',
    confirmed: '1st', runnerUp: '2nd',
    tbd: 'TBD', thirdPlace: '3rd Place',
    // Eliminated
    eliminatedTitle: 'Eliminated Teams',
    eliminatedNone: 'No teams have been eliminated yet.',
    eliminatedGroupStage: '❌ Group Stage Exit',
    eliminatedMath: '➗ Mathematically Eliminated',
    teamCol: 'Team',
    record: 'Record',
    gf: 'GF', ga: 'GA',
    thirdPlaceNote: 'Best 8 third-place teams also advance to the Round of 32',
    wildcardPending: '🔶 3rd Place — Awaiting Wildcard Cut',
    wildcardIn: '✅ Advanced — Best 3rd Places',
    teamOne: 'team', teamMany: 'teams',
    outLabel: 'eliminated',
    aliveLabel: 'still in',
    reasonFourth: 'Finished last',
    reasonMath: "Can't reach top 3",
    reasonThirdCut: 'Missed the 3rd-place cut',
    reasonPending: 'Group done — awaiting cut',
    reasonWildcardIn: 'Best 3rd place',
    knockoutExits: '🏳️ Knockout Exits',
    lostIn: 'Lost in', vs: 'vs', pens: '(pens)',
  },
  es: {
    title: 'Copa del Mundo 2026',
    subtitle: 'EUA · Canadá · México',
    refresh: 'Actualizar',
    tabs: { scores: 'Marcadores', games: 'Partidos', groups: 'Grupos', bracket: 'Llave', eliminated: 'Eliminados' },
    updated: 'Actualizado',
    autoRefresh: 'se actualiza cada 30s',
    loading: 'Cargando datos de Copa del Mundo 2026…',
    errorLoad: 'No se pudo cargar',
    tryAgain: 'Intentar de nuevo',
    share: '📤 Compartir',
    shareCopied: '¡Enlace copiado!',
    // Scores
    liveNow: '🔴 En Vivo',
    todayMatches: 'Partidos de Hoy',
    upcoming: 'Próximos',
    recentResults: 'Resultados Recientes',
    allMatches: 'Todos los Partidos',
    noMatches: 'No hay partidos. ¡Vuelve pronto!',
    ft: 'FT',
    live: 'En Vivo',
    // Games
    all: 'Todos',
    finished: 'Terminados',
    todayOnly: 'Solo mostrando hoy — horario completo no disponible',
    noGamesFound: 'No se encontraron partidos.',
    filterByTeam: 'Filtrar por Equipo',
    searchTeam: 'Buscar equipo…',
    // Groups
    noGroups: 'Posiciones de grupos no disponibles aún.',
    group: 'Grupo',
    gp: 'PJ', w: 'G', d: 'E', l: 'P', gd: 'DG', pts: 'PTS',
    // Bracket
    roundOf32: 'Ronda de 32', roundOf16: 'Ronda de 16',
    quarterfinals: 'Cuartos de Final', semifinals: 'Semifinales', final: 'Final',
    r32: 'R32', r16: 'R16', qf: 'CF', sf: 'SF',
    qualifiers: 'Clasificados por Grupo',
    bracketNote: 'La llave aparece al terminar la fase de grupos.',
    groupStage: 'Fase de grupos: 11 Jun – 2 Jul, 2026',
    confirmed: '1°', runnerUp: '2°',
    tbd: 'PD', thirdPlace: '3er Lugar',
    eliminatedTitle: 'Equipos Eliminados',
    eliminatedNone: 'Ningún equipo ha sido eliminado aún.',
    eliminatedGroupStage: '❌ Eliminados en Grupos',
    eliminatedMath: '➗ Eliminados Matemáticamente',
    teamCol: 'Equipo',
    record: 'Record',
    gf: 'GF', ga: 'GC',
    thirdPlaceNote: 'Los mejores 8 equipos en 3er lugar también avanzan a la Ronda de 32',
    wildcardPending: '🔶 3er Lugar — Esperando el Corte',
    wildcardIn: '✅ Clasificados — Mejores 3ros',
    teamOne: 'equipo', teamMany: 'equipos',
    outLabel: 'eliminados',
    aliveLabel: 'siguen',
    reasonFourth: 'Terminó último',
    reasonMath: 'No alcanza el top 3',
    reasonThirdCut: 'Quedó fuera del corte',
    reasonPending: 'Grupo terminado — esperando corte',
    reasonWildcardIn: 'Mejor 3er lugar',
    knockoutExits: '🏳️ Eliminados en Eliminatorias',
    lostIn: 'Perdió en', vs: 'vs', pens: '(pen.)',
  },
}

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState('en')
  const toggle = () => setLang(l => l === 'en' ? 'es' : 'en')
  const t = translations[lang]
  return (
    <LangContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  // Convenience: translate a team name
  const tn = (displayName, abbr) => getTeamName(displayName, abbr, ctx.lang)
  return { ...ctx, tn }
}
