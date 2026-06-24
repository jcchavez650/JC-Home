import { createContext, useContext, useState } from 'react'

const translations = {
  en: {
    title: 'World Cup 2026',
    subtitle: 'USA · Canada · Mexico',
    refresh: 'Refresh',
    tabs: { scores: 'Scores', games: 'Games', groups: 'Groups', bracket: 'Bracket' },
    updated: 'Updated',
    autoRefresh: 'auto-refreshes every 60s',
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
  },
  es: {
    title: 'Copa del Mundo 2026',
    subtitle: 'EUA · Canadá · México',
    refresh: 'Actualizar',
    tabs: { scores: 'Marcadores', games: 'Partidos', groups: 'Grupos', bracket: 'Llave' },
    updated: 'Actualizado',
    autoRefresh: 'se actualiza cada 60s',
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
  return useContext(LangContext)
}
