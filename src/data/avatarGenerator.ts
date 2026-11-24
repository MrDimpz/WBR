/**
 * Generates crisp, expressive, 100% offline illustrated profile pictures as SVG data URIs.
 * Used for simulated TikTok viewers, test players, and fallback avatars when no external
 * TikTok profilePictureUrl is provided.
 */

const BG_GRADIENTS: Array<[string, string]> = [
  ['#0EA5E9', '#1E3A8A'],
  ['#FF2A6D', '#7C2D12'],
  ['#00F5D4', '#0F766E'],
  ['#A855F7', '#3B0764'],
  ['#F59E0B', '#9A3412'],
  ['#EC4899', '#831843'],
  ['#10B981', '#064E3B'],
  ['#6366F1', '#1E1B4B'],
  ['#FB7185', '#881337'],
  ['#38BDF8', '#0C4A6E'],
  ['#F97316', '#7C2D12'],
  ['#14B8A6', '#134E4A'],
];

const SKIN_TONES = [
  '#FDE2CC',
  '#F5CBA7',
  '#E0AC69',
  '#C68642',
  '#8D5524',
  '#6B3E26',
];

const HAIR_COLORS = [
  '#111827',
  '#3B2314',
  '#78350F',
  '#D97706',
  '#FDE68A',
  '#DC2626',
  '#EC4899',
  '#06B6D4',
  '#8B5CF6',
  '#E2E8F0',
];

const SHIRT_COLORS = [
  '#00F5D4',
  '#FF2A6D',
  '#FFD166',
  '#38BDF8',
  '#A78BFA',
  '#34D399',
  '#F97316',
  '#F43F5E',
  '#1E293B',
  '#FFFFFF',
];

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const avatarUriCache = new Map<string, string>();

export function generateProfilePicture(seed: string): string {
  const key = seed.trim().toLowerCase() || 'player';
  const cached = avatarUriCache.get(key);
  if (cached) return cached;

  const h = hashSeed(key);
  const [bg1, bg2] = BG_GRADIENTS[h % BG_GRADIENTS.length];
  const skin = SKIN_TONES[(h >> 3) % SKIN_TONES.length];
  const hair = HAIR_COLORS[(h >> 6) % HAIR_COLORS.length];
  const shirt = SHIRT_COLORS[(h >> 9) % SHIRT_COLORS.length];
  const hairStyle = (h >> 12) % 6;
  const mouthStyle = (h >> 15) % 4;
  const accessory = (h >> 18) % 5; // 0-2 none, 3 glasses, 4 blush/freckles

  // Hair back layer (for longer hairstyles)
  let hairBack = '';
  if (hairStyle === 1) {
    // Long flowing hair
    hairBack = `<path d="M18 46 Q14 78 24 94 L76 94 Q86 78 82 46 Z" fill="${hair}" />`;
  } else if (hairStyle === 2) {
    // Afro / curly puffs
    hairBack = `<circle cx="50" cy="40" r="32" fill="${hair}" /><circle cx="24" cy="48" r="14" fill="${hair}" /><circle cx="76" cy="48" r="14" fill="${hair}" />`;
  } else if (hairStyle === 5) {
    // Twin buns
    hairBack = `<circle cx="23" cy="28" r="11" fill="${hair}" /><circle cx="77" cy="28" r="11" fill="${hair}" />`;
  }

  // Hair front layer
  let hairFront = '';
  if (hairStyle === 0) {
    // Spiky / swoop
    hairFront = `<path d="M26 42 Q28 18 52 17 Q74 18 74 42 Q64 30 50 31 Q36 30 26 42 Z" fill="${hair}" />`;
  } else if (hairStyle === 1) {
    // Parted bangs
    hairFront = `<path d="M25 45 Q27 18 50 18 Q73 18 75 45 Q62 32 50 36 Q38 30 25 45 Z" fill="${hair}" />`;
  } else if (hairStyle === 2) {
    // Curly top
    hairFront = `<path d="M27 38 Q35 24 50 26 Q65 24 73 38 Q60 28 50 31 Q40 28 27 38 Z" fill="${hair}" />`;
  } else if (hairStyle === 3) {
    // Beanie / buzz fade
    hairFront = `<path d="M26 40 C26 20, 74 20, 74 40 C66 34, 34 34, 26 40 Z" fill="${hair}" />`;
  } else if (hairStyle === 4) {
    // Side sweep
    hairFront = `<path d="M25 44 Q26 16 54 16 Q76 18 75 42 Q58 26 25 44 Z" fill="${hair}" />`;
  } else {
    // Neat bangs with buns
    hairFront = `<path d="M26 42 Q30 20 50 20 Q70 20 74 42 Q50 33 26 42 Z" fill="${hair}" />`;
  }

  // Mouth expression
  let mouth = '';
  if (mouthStyle === 0) {
    // Big happy grin
    mouth = `<path d="M40 61 Q50 71 60 61 Z" fill="#FFFFFF" stroke="#1E293B" stroke-width="2" stroke-linejoin="round" />`;
  } else if (mouthStyle === 1) {
    // Warm smile
    mouth = `<path d="M41 62 Q50 69 59 62" fill="none" stroke="#1E293B" stroke-width="2.8" stroke-linecap="round" />`;
  } else if (mouthStyle === 2) {
    // Cool smirk
    mouth = `<path d="M43 63 Q52 67 60 60" fill="none" stroke="#1E293B" stroke-width="2.8" stroke-linecap="round" />`;
  } else {
    // Excited O
    mouth = `<ellipse cx="50" cy="63" rx="4.5" ry="5.5" fill="#7F1D1D" stroke="#1E293B" stroke-width="1.8" />`;
  }

  // Accessories
  let accMarkup = '';
  if (accessory === 3) {
    // Stylish glasses
    accMarkup = `
      <g stroke="#0F172A" stroke-width="2.4" fill="rgba(255,255,255,0.22)">
        <rect x="31" y="45" width="15" height="10" rx="3" />
        <rect x="54" y="45" width="15" height="10" rx="3" />
        <line x1="46" y1="50" x2="54" y2="50" />
      </g>
    `;
  } else if (accessory === 4) {
    // Rosy cheeks
    accMarkup = `
      <circle cx="34" cy="57" r="4" fill="#FB7185" opacity="0.45" />
      <circle cx="66" cy="57" r="4" fill="#FB7185" opacity="0.45" />
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}" />
        <stop offset="100%" stop-color="${bg2}" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#bg)" />
    <circle cx="82" cy="18" r="26" fill="rgba(255,255,255,0.09)" />
    ${hairBack}
    <path d="M16 102 C18 79, 32 74, 50 74 C68 74, 82 79, 84 102 Z" fill="${shirt}" />
    <rect x="43" y="67" width="14" height="12" rx="5" fill="${skin}" />
    <circle cx="26" cy="51" r="5" fill="${skin}" />
    <circle cx="74" cy="51" r="5" fill="${skin}" />
    <ellipse cx="50" cy="49" rx="23" ry="25" fill="${skin}" />
    <circle cx="40" cy="49" r="3.4" fill="#0F172A" />
    <circle cx="60" cy="49" r="3.4" fill="#0F172A" />
    <circle cx="41.2" cy="47.8" r="1.1" fill="#FFFFFF" />
    <circle cx="61.2" cy="47.8" r="1.1" fill="#FFFFFF" />
    <path d="M35 42 Q40 39 45 42" fill="none" stroke="${hair}" stroke-width="2.2" stroke-linecap="round" />
    <path d="M55 42 Q60 39 65 42" fill="none" stroke="${hair}" stroke-width="2.2" stroke-linecap="round" />
    ${accMarkup}
    ${mouth}
    ${hairFront}
  </svg>`;

  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  avatarUriCache.set(key, uri);
  return uri;
}
