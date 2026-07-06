// Canonical expense / cost-breakdown categories, shared across the app.
export const EXPENSE_CATEGORIES = [
  { value: 'flights', label: 'Flights', icon: '✈️' },
  { value: 'hotel', label: 'Hotel / Lodging', icon: '🏨' },
  { value: 'transport', label: 'Transport', icon: '🚕' },
  { value: 'food', label: 'Food & Drink', icon: '🍽️' },
  { value: 'activities', label: 'Activities', icon: '🎯' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'other', label: 'Other', icon: '📌' },
]

// Legacy slugs from earlier versions map onto the canonical set.
const LEGACY = { lodging: 'hotel', activity: 'activities' }

export function normalizeCategory(cat) {
  return LEGACY[cat] || cat || 'other'
}

const BY_VALUE = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c]))

export function categoryMeta(cat) {
  return BY_VALUE[normalizeCategory(cat)] || { value: 'other', label: 'Other', icon: '📌' }
}

export const categoryIcon = (cat) => categoryMeta(cat).icon
export const categoryLabel = (cat) => categoryMeta(cat).label
