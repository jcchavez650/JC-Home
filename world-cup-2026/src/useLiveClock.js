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
      // startExtra is in minutes (e.g. 2 from "90'+2'"), convert to seconds
      const totalSeconds = startMinute * 60 + startExtra * 60 + elapsedSeconds
      const mins = Math.floor(totalSeconds / 60)

      if (startMinute <= 45) {
        // First half — cap at 45, then show stoppage
        if (mins < 45) {
          setClock(`${mins}'`)
        } else {
          const extra = Math.floor((totalSeconds - 45 * 60) / 60)
          setClock(extra > 0 ? `45'+${extra}'` : `45'`)
        }
      } else {
        // Second half (startMinute > 45, including 90'+N' starts) — cap at 90
        if (mins < 90) {
          setClock(`${mins}'`)
        } else {
          const extra = Math.floor((totalSeconds - 90 * 60) / 60)
          setClock(extra > 0 ? `90'+${extra}'` : `90'`)
        }
      }
    }, 1000)

    return () => clearInterval(id)
  }, [displayClock, isLive])

  return clock
}
