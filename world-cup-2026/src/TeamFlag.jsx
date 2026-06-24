import { flagUrl } from './api.js'

export default function TeamFlag({ abbr, logo, size = 32, className = '' }) {
  const src = flagUrl(abbr, size <= 24 ? 20 : 40) ?? logo
  if (!src) return <span style={{ fontSize: size * 0.8, lineHeight: 1 }}>🏳️</span>

  return (
    <img
      src={src}
      alt={abbr}
      width={size}
      height={Math.round(size * 0.67)}
      className={`team-flag-img ${className}`}
      style={{
        objectFit: 'cover',
        borderRadius: 3,
        display: 'block',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }}
      onError={e => {
        // fallback to ESPN logo if flagcdn fails
        if (logo && e.target.src !== logo) e.target.src = logo
        else e.target.style.display = 'none'
      }}
    />
  )
}
