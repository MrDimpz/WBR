import {
  CosmeticItem,
  ElimEffectId,
  HatCosmeticId,
  PlayerLoadout,
  TrailCosmeticId,
} from '../types/game';

export const DEFAULT_LOADOUT: PlayerLoadout = {
  hat: 'none',
  trail: 'none',
  elimEffect: 'classic_sparks',
};

export const COSMETIC_CATALOG: CosmeticItem[] = [
  // HATS
  {
    id: 'none',
    category: 'hat',
    name: 'No Hat',
    description: 'Clean default avatar frame.',
    price: 0,
    accentColor: '#94A3B8',
    rarity: 'FREE',
  },
  {
    id: 'arcade_cap',
    category: 'hat',
    name: 'Arcade Snapback',
    description: 'Backwards neon cyan cap for fast typers.',
    price: 120,
    accentColor: '#00F5D4',
    rarity: 'RARE',
  },
  {
    id: 'pixel_visor',
    category: 'hat',
    name: '8-Bit Visor',
    description: 'Deal-with-it retro shades across the avatar.',
    price: 180,
    accentColor: '#38BDF8',
    rarity: 'RARE',
  },
  {
    id: 'streamer_headset',
    category: 'hat',
    name: 'Live Pro Headset',
    description: 'Dual glowing earcups + mic boom.',
    price: 260,
    accentColor: '#FF2A6D',
    rarity: 'EPIC',
  },
  {
    id: 'wizard_hat',
    category: 'hat',
    name: 'Lexicon Wizard',
    description: 'Star-studded sorcerer hat for wordsmiths.',
    price: 320,
    accentColor: '#A78BFA',
    rarity: 'EPIC',
  },
  {
    id: 'cyber_horns',
    category: 'hat',
    name: 'Cyber Demon Horns',
    description: 'Crimson twin energy horns.',
    price: 420,
    accentColor: '#FF2A6D',
    rarity: 'EPIC',
  },
  {
    id: 'plasma_halo',
    category: 'hat',
    name: 'Plasma Halo',
    description: 'Floating electric ring hovering overhead.',
    price: 550,
    accentColor: '#00F5D4',
    rarity: 'LEGENDARY',
  },
  {
    id: 'neon_crown',
    category: 'hat',
    name: 'Royale Crown',
    description: 'Jeweled gold crown worn into battle.',
    price: 750,
    accentColor: '#FFD166',
    rarity: 'LEGENDARY',
  },

  // AVATAR TRAILS
  {
    id: 'none',
    category: 'trail',
    name: 'No Trail',
    description: 'Minimal clean movement.',
    price: 0,
    accentColor: '#94A3B8',
    rarity: 'FREE',
  },
  {
    id: 'neon_comet',
    category: 'trail',
    name: 'Cyan Comet',
    description: 'Glowing electric cyan motion ribbon.',
    price: 150,
    accentColor: '#00F5D4',
    rarity: 'RARE',
  },
  {
    id: 'glitch_pixels',
    category: 'trail',
    name: 'Glitch Squares',
    description: 'Digital arcade blocks trailing behind you.',
    price: 240,
    accentColor: '#38BDF8',
    rarity: 'RARE',
  },
  {
    id: 'blaze_fire',
    category: 'trail',
    name: 'Inferno Embers',
    description: 'Hot orange-red flames & sparks as you bounce.',
    price: 350,
    accentColor: '#FF6B35',
    rarity: 'EPIC',
  },
  {
    id: 'prism_ribbon',
    category: 'trail',
    name: 'Prism Spectrum',
    description: 'Shifting rainbow energy stream.',
    price: 480,
    accentColor: '#F472B6',
    rarity: 'LEGENDARY',
  },
  {
    id: 'royal_stardust',
    category: 'trail',
    name: 'Gold Stardust',
    description: 'Twinkling golden star motes in your wake.',
    price: 600,
    accentColor: '#FFD166',
    rarity: 'LEGENDARY',
  },

  // ELIMINATION EFFECTS
  {
    id: 'classic_sparks',
    category: 'elimEffect',
    name: 'Arcade Burst',
    description: 'Classic neon spark & shockwave detonation.',
    price: 0,
    accentColor: '#FF2A6D',
    rarity: 'FREE',
  },
  {
    id: 'party_confetti',
    category: 'elimEffect',
    name: 'Confetti Cannon',
    description: 'Go out in a vibrant shower of party ribbons.',
    price: 160,
    accentColor: '#FFD166',
    rarity: 'RARE',
  },
  {
    id: 'pixel_shatter',
    category: 'elimEffect',
    name: '8-Bit Shatter',
    description: 'Explodes into crisp tumbling retro pixels.',
    price: 240,
    accentColor: '#00F5D4',
    rarity: 'RARE',
  },
  {
    id: 'lightning_bolt',
    category: 'elimEffect',
    name: 'High Voltage Zap',
    description: 'Jagged electric lightning forks on KO.',
    price: 380,
    accentColor: '#38BDF8',
    rarity: 'EPIC',
  },
  {
    id: 'void_implosion',
    category: 'elimEffect',
    name: 'Void Singularity',
    description: 'Dark violet collapse ring before outward pulse.',
    price: 520,
    accentColor: '#A78BFA',
    rarity: 'LEGENDARY',
  },
  {
    id: 'plasma_supernova',
    category: 'elimEffect',
    name: 'Solar Supernova',
    description: 'Triple golden shockwave + star burst flare.',
    price: 680,
    accentColor: '#FFD166',
    rarity: 'LEGENDARY',
  },
];

export const BOT_HATS: HatCosmeticId[] = [
  'none',
  'none',
  'none',
  'arcade_cap',
  'pixel_visor',
  'streamer_headset',
  'wizard_hat',
  'cyber_horns',
  'plasma_halo',
  'neon_crown',
];

export const BOT_TRAILS: TrailCosmeticId[] = [
  'none',
  'none',
  'none',
  'neon_comet',
  'glitch_pixels',
  'blaze_fire',
  'prism_ribbon',
  'royal_stardust',
];

export const BOT_ELIMS: ElimEffectId[] = [
  'classic_sparks',
  'classic_sparks',
  'party_confetti',
  'pixel_shatter',
  'lightning_bolt',
  'void_implosion',
  'plasma_supernova',
];

export function randomBotLoadout(enabled: boolean): PlayerLoadout {
  if (!enabled) return { ...DEFAULT_LOADOUT };
  return {
    hat: BOT_HATS[Math.floor(Math.random() * BOT_HATS.length)],
    trail: BOT_TRAILS[Math.floor(Math.random() * BOT_TRAILS.length)],
    elimEffect: BOT_ELIMS[Math.floor(Math.random() * BOT_ELIMS.length)],
  };
}
