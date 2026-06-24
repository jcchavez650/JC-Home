import { useState, useEffect, useCallback } from 'react'
import { fetchScoreboard, fetchStandings, parseMatches, parseStandings } from './api.js'

export function useWorldCup() {
  const [matches, setMatches] = useState([])
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
      const [scoreData, standData] = await Promise.all([
        fetchScoreboard(),
        fetchStandings(),
      ])
      setMatches(parseMatches(scoreData))
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
    // Auto-refresh every 60s
    const iv = setInterval(() => load(true), 60_000)
    return () => clearInterval(iv)
  }, [load])

  const refresh = () => load(true)

  return { matches, groups, loading, error, lastUpdated, refreshing, refresh }
}
