import { useState, useEffect, useCallback } from 'react'
import { fetchScoreboard, fetchAllGames, fetchStandings, fetchBracket, fetchMatchDetail, parseMatches, parseStandings, parseBracket } from './api.js'

async function enrichWithProbability(matches) {
  // Fetch summary for each of today's matches to get predictor/win-prob data
  const results = await Promise.allSettled(
    matches.map(m => fetchMatchDetail(m.id))
  )
  return matches.map((m, i) => {
    const res = results[i]
    if (res.status !== 'fulfilled') return m
    const data = res.value

    // Log first match summary shape once
    if (i === 0) {
      console.log('[summary keys]', Object.keys(data))
      console.log('[winProb]', data.winProbability)
      console.log('[predictor]', data.predictor)
    }

    // ESPN summary: data.winProbability is an array, last entry = current
    const wp = Array.isArray(data.winProbability) ? data.winProbability.at(-1) : null
    const pred = data.predictor ?? {}

    let homeWinPct = null, awayWinPct = null, drawPct = null

    if (wp?.homeWinPercentage != null) {
      homeWinPct = Math.round(wp.homeWinPercentage)
      awayWinPct = Math.round(wp.awayWinPercentage ?? 0)
      drawPct = Math.max(0, 100 - homeWinPct - awayWinPct)
    } else if (pred.homeTeam?.winProbability != null) {
      homeWinPct = Math.round(pred.homeTeam.winProbability)
      awayWinPct = Math.round(pred.awayTeam?.winProbability ?? 0)
      drawPct = Math.max(0, 100 - homeWinPct - awayWinPct)
    } else if (data.odds?.[0]?.homeTeamOdds?.winPercentage != null) {
      homeWinPct = Math.round(data.odds[0].homeTeamOdds.winPercentage)
      awayWinPct = Math.round(data.odds[0].awayTeamOdds?.winPercentage ?? 0)
      drawPct = Math.max(0, 100 - homeWinPct - awayWinPct)
    }

    return { ...m, homeWinPct, awayWinPct, drawPct }
  })
}

export function useWorldCup() {
  const [matches, setMatches] = useState([])
  const [allGames, setAllGames] = useState([])
  const [groups, setGroups] = useState([])
  const [bracketRounds, setBracketRounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [scoreRes, allRes, standRes, bracketRes] = await Promise.allSettled([
        fetchScoreboard(),
        fetchAllGames(),
        fetchStandings(),
        fetchBracket(),
      ])

      if (scoreRes.status === 'fulfilled') {
        const parsed = parseMatches(scoreRes.value)
        setMatches(parsed)
        // Fetch win probabilities for today's matches in the background
        enrichWithProbability(parsed).then(enriched => setMatches(enriched)).catch(() => {})
      } else {
        throw scoreRes.reason
      }

      if (allRes.status === 'fulfilled') setAllGames(parseMatches(allRes.value))
      if (standRes.status === 'fulfilled') setGroups(parseStandings(standRes.value))
      if (bracketRes.status === 'fulfilled') {
        const rounds = parseBracket(bracketRes.value)
        if (rounds.length) setBracketRounds(rounds)
      }

      setLastUpdated(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    const iv = setInterval(() => load(true), 60_000)
    return () => clearInterval(iv)
  }, [load])

  const refresh = () => load(true)

  return { matches, allGames, groups, bracketRounds, loading, error, lastUpdated, refreshing, refresh }
}
