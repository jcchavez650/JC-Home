// Maps a trip's destination to a self-contained visual theme (pure CSS gradients,
// no external images) used for the trip hero banner and page background wash.

function theme(key, emoji, hero, glowA, glowB) {
  return { key, emoji, hero, glowA, glowB }
}

const THEMES = {
  ocean: theme(
    'ocean',
    '🏝️',
    'linear-gradient(120deg, #036695, #0891b2 48%, #f0b429)',
    'rgba(8, 145, 178, 0.22)',
    'rgba(240, 180, 41, 0.16)'
  ),
  sakura: theme(
    'sakura',
    '🌸',
    'linear-gradient(125deg, #4c1d95, #9333ea 50%, #f4a6c4)',
    'rgba(236, 72, 153, 0.18)',
    'rgba(147, 51, 234, 0.16)'
  ),
  alpine: theme(
    'alpine',
    '🏔️',
    'linear-gradient(120deg, #1e3a5f, #3b6ea5 55%, #cbd5e1)',
    'rgba(59, 110, 165, 0.20)',
    'rgba(148, 163, 184, 0.18)'
  ),
  desert: theme(
    'desert',
    '🏜️',
    'linear-gradient(120deg, #9a3412, #d97706 55%, #fcd34d)',
    'rgba(217, 119, 6, 0.22)',
    'rgba(252, 211, 77, 0.16)'
  ),
  jungle: theme(
    'jungle',
    '🌿',
    'linear-gradient(120deg, #14532d, #15803d 55%, #a3e635)',
    'rgba(21, 128, 61, 0.22)',
    'rgba(163, 230, 53, 0.16)'
  ),
  metro: theme(
    'metro',
    '🌆',
    'linear-gradient(120deg, #312e81, #4338ca 52%, #e879b9)',
    'rgba(67, 56, 202, 0.20)',
    'rgba(217, 70, 239, 0.14)'
  ),
  classic: theme(
    'classic',
    '✨',
    'linear-gradient(120deg, #0c3b2e, #10553f 55%, #b78d3f)',
    'rgba(16, 85, 63, 0.18)',
    'rgba(183, 141, 63, 0.16)'
  ),
}

const RULES = [
  ['ocean', ['beach', 'coast', 'island', 'tropic', 'cancun', 'cancún', 'maldive', 'hawaii', 'honolulu', 'maui', 'bali', 'amalfi', 'miami', 'caribbean', 'fiji', 'phuket', 'ibiza', 'bahamas', 'tulum', 'goa', 'seychelles', 'santorini', 'mykonos', 'aruba', 'cabo', 'riviera', 'bora bora', 'tahiti', 'gulf', 'bay', 'cape']],
  ['sakura', ['japan', 'tokyo', 'kyoto', 'osaka', 'hokkaido', 'okinawa', 'korea', 'seoul', 'taiwan', 'taipei']],
  ['alpine', ['mountain', 'alps', 'alpine', 'ski', 'aspen', 'denver', 'swiss', 'switzerland', 'zermatt', 'banff', 'tahoe', 'whistler', 'snow', 'patagonia', 'himalaya', 'nepal', 'andes', 'rockies', 'colorado', 'chamonix', 'dolomites']],
  ['desert', ['desert', 'dubai', 'abu dhabi', 'vegas', 'sahara', 'arizona', 'morocco', 'marrakech', 'sedona', 'phoenix', 'doha', 'qatar', 'petra', 'jordan', 'egypt', 'cairo', 'palm springs']],
  ['jungle', ['jungle', 'rainforest', 'amazon', 'costa rica', 'forest', 'safari', 'kenya', 'tanzania', 'serengeti', 'borneo', 'congo', 'galapagos', 'yucatan']],
  ['metro', ['new york', 'nyc', 'manhattan', 'chicago', 'london', 'paris', 'berlin', 'toronto', 'hong kong', 'singapore', 'shanghai', 'city', 'metropolis', 'los angeles', 'san francisco', 'boston', 'seattle', 'washington']],
]

export function destinationTheme(destination = '') {
  const q = String(destination).toLowerCase()
  for (const [key, keywords] of RULES) {
    if (keywords.some((k) => q.includes(k))) return THEMES[key]
  }
  return THEMES.classic
}
