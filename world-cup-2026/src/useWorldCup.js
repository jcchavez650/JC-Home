import { useState, useEffect, useCallback } from 'react'
import { fetchScoreboard, fetchAllGames, fetchStandings, fetchBracket, parseMatches, parseStandings, parseBracket } from './api.js'
import { enrichWithProbability } from './winProbability.js'

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
