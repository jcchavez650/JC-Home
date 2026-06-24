import { useState, useEffect, useCallback } from 'react'
import { fetchScoreboard, fetchAllGames, fetchStandings, parseMatches, parseStandings } from './api.js'

export function useWorldCup() {
  const [matches, setMatches] = useState([])   // today / live
  const [allGames, setAllGames] = useState([]) // full tournament schedule
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      // Use allSettled so one failing endpoint doesn't kill everything
      const [scoreRes, allRes, standRes] = await Promise.allSettled([
        fetchScoreboard(),
        fetchAllGames(),
        fetchStandings(),
      ])

      if (scoreRes.status === 'fulfilled') setMatches(parseMatches(scoreRes.value))
      else throw scoreRes.reason // scores are required; surface this error

      if (allRes.status === 'fulfilled') setAllGames(parseMatches(allRes.value))
      // if full schedule fails, fall back to today's matches (already set above)

      if (standRes.status === 'fulfilled') setGroups(parseStandings(standRes.value))

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

  return { matches, allGames, groups, loading, error, lastUpdated, refreshing, refresh }
}
