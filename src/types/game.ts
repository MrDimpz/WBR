export type GamePhase =
  | 'LOBBY'
  | 'WAVE_INTRO'
  | 'ACTIVE_WAVE'
  | 'ELIMINATION'
  | 'VICTORY';

export type PromptTier = 1 | 2 | 3;

export type PromptRuleType =
  | 'CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'EXACT_LENGTH'
  | 'MIN_LENGTH_STARTS'
  | 'NO_LETTER'
  | 'ENDS_WITH_MIN_LENGTH'
  | 'CONTAINS_ANY'
  | 'DOUBLE_LETTERS'
  | 'SAME_START_END'
  | 'MIN_LENGTH_NO_LETTER'
  | 'PALINDROME_OR_MIN_LENGTH';

export type PromptCategoryGroup =
  | 'SUBSTRING'
  | 'AFFIX'
  | 'LENGTH'
  | 'FORBIDDEN'
  | 'SPECIAL';

export type GlobalWordCategory =
  | 'ALL'
  | 'ANIMALS_NATURE'
  | 'FOOD_DRINK'
  | 'TECH_GAMING'
  | 'ACTIONS';

export interface PromptRule {
  id: string;
  tier: PromptTier;
  type: PromptRuleType;
  categoryGroup: PromptCategoryGroup;
  label: string;
  sublabel?: string;
  highlightToken?: string;
  param?: string;
  param2?: string;
  minLength?: number;
  exactLength?: number;
}

export type HatCosmeticId =
  | 'none'
  | 'neon_crown'
  | 'cyber_horns'
  | 'wizard_hat'
  | 'arcade_cap'
  | 'plasma_halo'
  | 'streamer_headset'
  | 'pixel_visor';

export type TrailCosmeticId =
  | 'none'
  | 'neon_comet'
  | 'blaze_fire'
  | 'prism_ribbon'
  | 'glitch_pixels'
  | 'royal_stardust';

export type ElimEffectId =
  | 'classic_sparks'
  | 'pixel_shatter'
  | 'void_implosion'
  | 'party_confetti'
  | 'lightning_bolt'
  | 'plasma_supernova';

export interface PlayerLoadout {
  hat: HatCosmeticId;
  trail: TrailCosmeticId;
  elimEffect: ElimEffectId;
}

export type CosmeticCategory = 'hat' | 'trail' | 'elimEffect';

export interface CosmeticItem {
  id: HatCosmeticId | TrailCosmeticId | ElimEffectId;
  category: CosmeticCategory;
  name: string;
  description: string;
  price: number;
  accentColor: string;
  rarity: 'FREE' | 'RARE' | 'EPIC' | 'LEGENDARY';
}

export interface CustomGameRules {
  lobbyDurationSec: number;
  baseWaveDurationSec: number;
  waveDecaySec: number;
  minWaveDurationSec: number;
  maxPlayers: number;
  allowWave1LateJoin: boolean;
  bannedLetters: string[];
  enabledRuleGroups: Record<PromptCategoryGroup, boolean>;
  globalCategory: GlobalWordCategory;
}

export interface Player {
  id: string;
  username: string;
  avatarUrl?: string;
  color: string;
  accentColor: string;
  initials: string;
  alive: boolean;
  safe: boolean;
  lastWord?: string;
  lastWordTimestamp?: number;
  isBot?: boolean;
  loadout: PlayerLoadout;
}

export interface HallOfFameEntry {
  username: string;
  avatarUrl?: string;
  color: string;
  initials: string;
  wins: number;
}

export interface ChatMessagePayload {
  username: string;
  avatarUrl?: string;
  comment: string;
  isBot?: boolean;
}

export interface IncomingChatLog {
  id: string;
  username: string;
  comment: string;
  result: 'JOINED' | 'SAFE' | 'TAKEN' | 'INVALID' | 'BANNED' | 'IGNORED';
  timestamp: number;
}

export type WsConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export interface ArenaFeedbackEvent {
  type: 'JOIN' | 'SAFE' | 'TAKEN' | 'INVALID' | 'BANNED' | 'ELIMINATE' | 'REVIVE' | 'VICTORY';
  playerId?: string;
  playerIds?: string[];
  text?: string;
  timestamp: number;
}
