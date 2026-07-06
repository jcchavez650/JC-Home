export const VIBES = [
  { value: 'mix', label: '🎲 A bit of everything' },
  { value: 'relaxation', label: '🏖️ Relaxation' },
  { value: 'adventure', label: '🧗 Adventure' },
  { value: 'culture', label: '🏛️ Culture & sights' },
  { value: 'nightlife', label: '🎉 Nightlife & fun' },
  { value: 'foodie', label: '🍜 Food-focused' },
]

export const GROUP_TYPES = [
  { value: 'friends', label: '👯 Friends' },
  { value: 'couple', label: '💑 Couple' },
  { value: 'family with kids', label: '👨‍👩‍👧 Family with kids' },
  { value: 'solo', label: '🎒 Solo' },
]

export const INTERESTS = [
  'beaches & water',
  'nature & outdoors',
  'museums & history',
  'food & drinks',
  'nightlife',
  'shopping',
  'theme parks & shows',
  'local culture',
]

export const EMPTY_PREFS = { vibe: 'mix', group_type: 'friends', interests: [], notes: '' }

export function parsePrefs(str) {
  try {
    return { ...EMPTY_PREFS, ...(str ? JSON.parse(str) : {}) }
  } catch {
    return { ...EMPTY_PREFS }
  }
}

// Questionnaire fields for tailoring suggestions. Controlled: value is a prefs
// object ({vibe, group_type, interests[], notes}) and onChange gets the next one.
export default function PreferencesFields({ value, onChange }) {
  const toggleInterest = (interest) => {
    const has = value.interests.includes(interest)
    onChange({
      ...value,
      interests: has ? value.interests.filter((i) => i !== interest) : [...value.interests, interest],
    })
  }

  return (
    <>
      <label>
        What kind of trip is it?
        <select value={value.vibe} onChange={(e) => onChange({ ...value, vibe: e.target.value })}>
          {VIBES.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </label>
      <label>
        Who's going?
        <select value={value.group_type} onChange={(e) => onChange({ ...value, group_type: e.target.value })}>
          {GROUP_TYPES.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </label>
      <div className="span-2">
        <p className="muted small">What are you into? (pick any)</p>
        <div className="chip-row">
          {INTERESTS.map((i) => (
            <button
              type="button"
              key={i}
              className={value.interests.includes(i) ? 'chip active' : 'chip'}
              onClick={() => toggleInterest(i)}
            >
              {i}
            </button>
          ))}
        </div>
      </div>
      <label className="span-2">
        Anything else the suggestions should know? (optional)
        <input
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          placeholder="e.g. celebrating a birthday, traveling with a toddler, vegetarian group"
          maxLength={500}
        />
      </label>
    </>
  )
}
