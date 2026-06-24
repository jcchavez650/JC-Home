import { useState, useEffect, useRef } from 'react'
import { fetchMatchDetail } from './api.js'
import TeamFlag from './TeamFlag.jsx'
import { useLang } from './LangContext.jsx'

export default function HighlightsModal({ match, onClose }) {
  const { tn } = useLang()
  const [videos, setVideos] = useState(match.videos ?? [])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const overlayRef = useRef()

  const isFinal = match.statusType === 'STATUS_FINAL' || match.statusType === 'STATUS_FULL_TIME'
  const isLive  = match.statusType === 'STATUS_IN_PROGRESS'

  useEffect(() => {
    // Fetch detailed match data to get video clips
    if (!fetched) {
      setFetched(true)
      setLoading(true)
      fetchMatchDetail(match.id)
        .then(data => {
          const clips = []
          // ESPN summary has highlights, videos, playByPlay
          const sources = [
            data.videos,
            data.article?.images,
            data.news?.stories,
          ]
          for (const arr of sources) {
            if (!Array.isArray(arr)) continue
            for (const v of arr) {
              const mp4 = v.links?.source?.href ?? v.links?.mobile?.href ?? v.source?.mezzanine?.href ?? null
              const embed = v.links?.web?.href ?? null
              if (mp4 || embed) {
                clips.push({
                  title: v.headline ?? v.caption ?? v.title ?? 'Highlight',
                  thumbnail: v.thumbnail ?? v.posterImages?.default?.href ?? v.images?.[0]?.url ?? null,
                  mp4,
                  embed,
                  duration: v.duration ?? null,
                })
              }
            }
          }
          if (clips.length) setVideos(clips)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [match.id, fetched])

  // Close on overlay click
  const handleOverlayClick = e => {
    if (e.target === overlayRef.current) onClose()
  }

  // Close on Escape
  useEffect(() => {
    const handler = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const current = videos[active]

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-match-title">
            <div className="modal-team">
              <TeamFlag abbr={match.home.abbr} logo={match.home.logo} size={20} />
              <span>{tn(match.home.team, match.home.abbr)}</span>
            </div>
            {match.home.score != null && (
              <span className="modal-score">
                {match.home.score} – {match.away.score}
              </span>
            )}
            <div className="modal-team">
              <TeamFlag abbr={match.away.abbr} logo={match.away.logo} size={20} />
              <span>{tn(match.away.team, match.away.abbr)}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Video area */}
        <div className="modal-video-area">
          {loading ? (
            <div className="modal-loading">
              <div className="spinner" />
              <span>Loading highlights…</span>
            </div>
          ) : !videos.length ? (
            <NoHighlights isFinal={isFinal} isLive={isLive} />
          ) : current ? (
            <VideoPlayer clip={current} />
          ) : null}
        </div>

        {/* Clip list */}
        {videos.length > 1 && (
          <div className="modal-clips">
            {videos.map((v, i) => (
              <button
                key={i}
                className={`clip-thumb ${i === active ? 'active' : ''}`}
                onClick={() => setActive(i)}
              >
                {v.thumbnail ? (
                  <img src={v.thumbnail} alt={v.title} />
                ) : (
                  <div className="clip-thumb-placeholder">▶</div>
                )}
                <span className="clip-title">{v.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function VideoPlayer({ clip }) {
  if (clip.mp4) {
    return (
      <video
        key={clip.mp4}
        className="modal-video"
        controls
        autoPlay
        playsInline
        poster={clip.thumbnail ?? undefined}
      >
        <source src={clip.mp4} type="video/mp4" />
      </video>
    )
  }
  if (clip.embed) {
    // Convert page URLs to embeddable URLs where possible
    const embedSrc = toEmbedUrl(clip.embed)
    return (
      <iframe
        key={embedSrc}
        className="modal-video"
        src={embedSrc}
        allow="autoplay; fullscreen"
        allowFullScreen
        frameBorder="0"
        title={clip.title}
      />
    )
  }
  return <NoHighlights />
}

function toEmbedUrl(url) {
  // YouTube watch → embed
  const yt = url.match(/youtube\.com\/watch\?v=([^&]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`
  const ytShort = url.match(/youtu\.be\/([^?]+)/)
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}?autoplay=1`
  return url
}

function NoHighlights({ isFinal, isLive }) {
  return (
    <div className="modal-no-clips">
      <div style={{ fontSize: 40, marginBottom: 12 }}>
        {isLive ? '⚽' : isFinal ? '🎬' : '📅'}
      </div>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        {isLive
          ? 'Game in progress'
          : isFinal
          ? 'No highlight clips available'
          : 'Match hasn\'t started yet'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text2)' }}>
        {isFinal
          ? 'ESPN hasn\'t published video clips for this match yet.'
          : isLive
          ? 'Clips will appear here after the match ends.'
          : 'Check back after kick-off.'}
      </div>
    </div>
  )
}
