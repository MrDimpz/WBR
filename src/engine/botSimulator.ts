import { generateProfilePicture } from '../data/avatarGenerator';
import { getMatchingWordsForRule } from './prompts';
import { CustomGameRules, PromptRule } from '../types/game';

export interface BotProfile {
  username: string;
  avatarUrl: string;
  skill: number; // 0.35 (slow/mistake-prone) to 0.96 (fast/sharp)
  color: string;
}

const BOT_NICKNAMES: string[] = [
  'Alex Vibes',
  'Sarah K',
  'Jayden',
  'Luna Plays',
  'Drifty',
  'Maya',
  'Kai Zen',
  'Chloe Edits',
  'Neo Spark',
  'Tyler GG',
  'Zoe Mint',
  'Marcus',
  'Nina Nova',
  'Owen BMX',
  'Aria Glow',
  'Devon',
  'Skylar',
  'Liam Rush',
  'Jade Pixel',
  'Mateo 24K',
  'Ruby Blitz',
  'Ethan FPS',
  'Mila Star',
  'Noah Beats',
  'Sienna Sky',
  'Lucas Pro',
  'Ivy Glitch',
  'Diego Runs',
  'Harper V',
  'Finn Turbo',
  'Elena Lux',
  'Cole Drift',
  'Ava Storm',
  'Ryder 99',
  'Clara Zen',
  'Jax Arcade',
  'Piper Pop',
  'Theo Volt',
  'Nora Wave',
  'Ezra Dash',
  'Bella Ray',
  'Milo King',
  'Hazel Ace',
  'Leo Hyper',
  'Freya GG',
  'Jude Byte',
  'Stella FX',
  'Asher Win',
  'Iris Core',
  'Zane Zero',
  'Willow',
  'Ace Orbit',
  'Tessa Joy',
  'Cruz Flip',
  'Quinn',
  'Roman 77',
  'Lyra Neon',
  'Knox Play',
  'Vera Mint',
  'Axel Boom',
];

export const AVATAR_PALETTE = [
  '#00F5D4',
  '#FF2A6D',
  '#FFD166',
  '#38BDF8',
  '#A78BFA',
  '#FB7185',
  '#34D399',
  '#F97316',
  '#E879F9',
  '#22D3EE',
  '#FACC15',
  '#4ADE80',
];

export const BOT_POOL: BotProfile[] = BOT_NICKNAMES.map((username, idx) => ({
  username,
  avatarUrl: generateProfilePicture(username),
  // Varied human skill curve so games naturally eliminate players down to 1 champion
  skill: 0.42 + ((idx * 17) % 54) / 100,
  color: AVATAR_PALETTE[idx % AVATAR_PALETTE.length],
}));

const JOIN_MESSAGES = [
  'JOIN',
  'join',
  'LETS GO',
  'im in!',
  'JOIN!',
  'ready',
  'play',
  'W',
  'join me',
  'hype',
];

export function pickRandomJoinMessage(): string {
  return JOIN_MESSAGES[Math.floor(Math.random() * JOIN_MESSAGES.length)];
}

export function getBotSubset(count: number): BotProfile[] {
  const clamped = Math.max(5, Math.min(count, BOT_POOL.length));
  // Shuffle deterministically per round or randomly
  const copy = [...BOT_POOL];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, clamped);
}

/**
 * Picks a realistic bot submission for an active wave:
 * - Most of the time, picks an unused valid word from the embedded dictionary.
 * - Occasionally (~12%) mimics a human collision by typing a recently burned word ("TAKEN!").
 * - Rarely (~6%) makes a typo/invalid word ("INVALID!").
 */
export function pickBotWordForWave(
  rule: PromptRule,
  customRules: CustomGameRules,
  burnedWords: Set<string>,
  recentBurnedList: string[]
): string | null {
  const roll = Math.random();

  // Occasional realistic collision: types a word burned seconds ago
  if (roll < 0.13 && recentBurnedList.length > 0) {
    const recent = recentBurnedList[Math.floor(Math.random() * Math.min(5, recentBurnedList.length))];
    if (recent) return recent;
  }

  // Rare human typo / rule slip
  if (roll < 0.19) {
    const mistakes = ['ZZZZ', 'HELLO', 'TEST', 'WHAT', 'WAIT', 'NOOO', 'BRUH'];
    return mistakes[Math.floor(Math.random() * mistakes.length)];
  }

  const validPool = getMatchingWordsForRule(rule, customRules);
  if (validPool.length === 0) return null;

  // Prefer shorter/common words (4-8 letters) like real human chatters
  for (let attempt = 0; attempt < 24; attempt++) {
    const candidate = validPool[Math.floor(Math.random() * validPool.length)];
    if (!burnedWords.has(candidate) && candidate.length <= 9) {
      return candidate;
    }
  }

  // Fallback linear scan for any unused matching word
  for (let i = 0; i < validPool.length; i++) {
    if (!burnedWords.has(validPool[i])) {
      return validPool[i];
    }
  }

  return null;
}

/**
 * Computes whether a bot survives this wave and its reaction delay (in ms).
 * Scales survival rate gracefully with wave number & alive count so every match
 * builds tension and reaches an exciting 1-winner finale!
 */
export function computeBotWaveAction(
  botSkill: number,
  wave: number,
  waveDurationSec: number,
  aliveCount: number
): { willSubmitValid: boolean; delayMs: number; retryDelayMs?: number } {
  // Base survival probability decreases gently each wave
  const tierDifficultyPenalty = wave === 1 ? 0.14 : wave === 2 ? 0.24 : wave === 3 ? 0.34 : 0.44 + (wave - 4) * 0.07;
  // Slightly higher survival chance if only 2-3 left so sudden death feels tense
  const finaleBoost = aliveCount <= 3 ? 0.12 : 0;
  const survivalChance = Math.max(0.18, Math.min(0.88, botSkill - tierDifficultyPenalty + finaleBoost));

  const willSurvive = Math.random() < survivalChance;

  const minMs = 1100;
  const maxMs = Math.max(2200, (waveDurationSec - 0.8) * 1000);

  if (willSurvive) {
    // Faster bots respond sooner; stagger naturally across the wave
    const normalized = Math.pow(Math.random(), 0.75 + (botSkill - 0.5) * 0.6);
    const delayMs = minMs + normalized * (maxMs - minMs);
    return {
      willSubmitValid: true,
      delayMs,
      retryDelayMs: Math.min(maxMs, delayMs + 1400 + Math.random() * 1400),
    };
  }

  // Non-surviving bot either times out silently or panics with a wrong/taken word late
  return {
    willSubmitValid: false,
    delayMs: minMs + (0.45 + Math.random() * 0.5) * (maxMs - minMs),
  };
}
