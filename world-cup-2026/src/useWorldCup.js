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
      const [scoreData, allData, standData] = await Promise.all([
        fetchScoreboard(),
        fetchAllGames(),
        fetchStandings(),
      ])
      setMatches(parseMatches(scoreData))
      setAllGames(parseMatches(allData))
      setGroups(parseStandings(standData))
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
