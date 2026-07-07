// Looks up a representative photo for an activity using Wikipedia's public REST
// API. This runs in the user's browser (which has direct internet access), so it
// works regardless of how the server's network egress is configured. Returns an
// image URL or null; never throws.
export async function findActivityImage(title, location) {
  const queries = []
  if (title) queries.push(title.trim())
  if (title && location) queries.push(`${title.trim()} ${location.trim()}`)
  if (location) queries.push(location.trim())

  for (const q of queries) {
    if (!q) continue
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}?redirect=true`,
        { headers: { accept: 'application/json' } }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (data.type === 'disambiguation') continue
      const img = data?.originalimage?.source || data?.thumbnail?.source
      if (img && /^https:\/\//.test(img)) return img
    } catch {
      /* network/parse error — try the next query */
    }
  }
  return null
}
