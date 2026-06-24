import { useState, useEffect } from 'react'

// Parses ESPN displayClock strings like "45'", "90'+2'", "HT"
function parseMinute(displayClock) {
  if (!displayClock) return null
  const m = displayClock.match(/(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

function formatClock(minute, extra) {
  if (minute === null) return null
  return extra > 0 ? `${minute}'+${extra}'` : `${minute}'`
}

// Returns a live-ticking clock string for in-progress matches.
// Starts from the ESPN displayClock and increments every second.
export function useLiveClock(displayClock, isLive) {
  const [clock, setClock] = useState(displayClock)

  useEffect(() => {
    // Sync to fresh value from API on every render that updates it
    setClock(displayClock)
  }, [displayClock])

  useEffect(() => {
    if (!isLive) return

    const base = parseMinute(displayClock)
    if (base === null) return

    // Check if it's an extra-time format like "90'+2'"
    const extraMatch = displayClock?.match(/\d+'\+(\d+)'/)
    const baseExtra = extraMatch ? parseInt(extraMatch[1], 10) : 0

    const startedAt = Date.now()
    const startMinute = base
    const startExtra = baseExtra

    const id = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000)
      const totalSeconds = startMinute * 60 + startExtra * 60 + elapsedSeconds
      const mins = Math.floor(totalSeconds / 60)

      // Cap at reasonable half/full-time limits
      if (mins <= 45 && startMinute <= 45) {
        setClock(`${Math.min(mins, 45)}'`)
      } else if (mins <= 45) {
        // extra time first half
        const extra = mins - 45
        setClock(`45'+${extra}'`)
      } else if (mins <= 90 && startMinute > 45 && startMinute <= 90) {
        setClock(`${Math.min(mins, 90)}'`)
      } else if (startMinute > 45) {
        const extra = mins - 90
        setClock(`90'+${extra}'`)
      } else {
        setClock(`${mins}'`)
      }
    }, 1000)

    return () => clearInterval(id)
  }, [displayClock, isLive])

  return clock
}
