import { getDictionaryForCategory } from '../data/dictionary';
import {
  CustomGameRules,
  PromptRule,
  PromptTier,
} from '../types/game';

export const DEFAULT_CUSTOM_RULES: CustomGameRules = {
  lobbyDurationSec: 15,
  baseWaveDurationSec: 14,
  waveDecaySec: 1.5,
  minWaveDurationSec: 6,
  maxPlayers: 100,
  allowWave1LateJoin: true,
  bannedLetters: [],
  enabledRuleGroups: {
    SUBSTRING: true,
    AFFIX: true,
    LENGTH: true,
    FORBIDDEN: true,
    SPECIAL: true,
  },
  globalCategory: 'ALL',
};

export const ALL_PROMPT_RULES: PromptRule[] = [
  // ===================== TIER 1 (Waves 1–2: Easy / Fast) =====================
  {
    id: 't1_contains_er',
    tier: 1,
    type: 'CONTAINS',
    categoryGroup: 'SUBSTRING',
    label: 'CONTAINS "ER"',
    sublabel: 'Any valid word with ER',
    highlightToken: 'ER',
    param: 'ER',
  },
  {
    id: 't1_contains_an',
    tier: 1,
    type: 'CONTAINS',
    categoryGroup: 'SUBSTRING',
    label: 'CONTAINS "AN"',
    sublabel: 'Any valid word with AN',
    highlightToken: 'AN',
    param: 'AN',
  },
  {
    id: 't1_contains_in',
    tier: 1,
    type: 'CONTAINS',
    categoryGroup: 'SUBSTRING',
    label: 'CONTAINS "IN"',
    sublabel: 'Any valid word with IN',
    highlightToken: 'IN',
    param: 'IN',
  },
  {
    id: 't1_contains_st',
    tier: 1,
    type: 'CONTAINS',
    categoryGroup: 'SUBSTRING',
    label: 'CONTAINS "ST"',
    sublabel: 'Any valid word with ST',
    highlightToken: 'ST',
    param: 'ST',
  },
  {
    id: 't1_starts_b',
    tier: 1,
    type: 'STARTS_WITH',
    categoryGroup: 'AFFIX',
    label: 'STARTS WITH "B"',
    sublabel: 'First letter must be B',
    highlightToken: 'B',
    param: 'B',
  },
  {
    id: 't1_starts_s',
    tier: 1,
    type: 'STARTS_WITH',
    categoryGroup: 'AFFIX',
    label: 'STARTS WITH "S"',
    sublabel: 'First letter must be S',
    highlightToken: 'S',
    param: 'S',
  },
  {
    id: 't1_starts_t',
    tier: 1,
    type: 'STARTS_WITH',
    categoryGroup: 'AFFIX',
    label: 'STARTS WITH "T"',
    sublabel: 'First letter must be T',
    highlightToken: 'T',
    param: 'T',
  },
  {
    id: 't1_ends_ed',
    tier: 1,
    type: 'ENDS_WITH',
    categoryGroup: 'AFFIX',
    label: 'ENDS WITH "ED"',
    sublabel: 'Must end in ED',
    highlightToken: 'ED',
    param: 'ED',
  },
  {
    id: 't1_ends_ly',
    tier: 1,
    type: 'ENDS_WITH',
    categoryGroup: 'AFFIX',
    label: 'ENDS WITH "LY"',
    sublabel: 'Must end in LY',
    highlightToken: 'LY',
    param: 'LY',
  },

  // ===================== TIER 2 (Waves 3–4: Medium) =====================
  {
    id: 't2_contains_qu',
    tier: 2,
    type: 'CONTAINS',
    categoryGroup: 'SUBSTRING',
    label: 'CONTAINS "QU"',
    sublabel: 'Classic Word Bomb trap!',
    highlightToken: 'QU',
    param: 'QU',
  },
  {
    id: 't2_contains_ch',
    tier: 2,
    type: 'CONTAINS',
    categoryGroup: 'SUBSTRING',
    label: 'CONTAINS "CH"',
    sublabel: 'Must contain CH anywhere',
    highlightToken: 'CH',
    param: 'CH',
  },
  {
    id: 't2_contains_th',
    tier: 2,
    type: 'CONTAINS',
    categoryGroup: 'SUBSTRING',
    label: 'CONTAINS "TH"',
    sublabel: 'Must contain TH anywhere',
    highlightToken: 'TH',
    param: 'TH',
  },
  {
    id: 't2_6plus_starts_c',
    tier: 2,
    type: 'MIN_LENGTH_STARTS',
    categoryGroup: 'LENGTH',
    label: '6+ LETTERS · STARTS WITH "C"',
    sublabel: 'At least 6 letters starting with C',
    highlightToken: '6+ / C',
    param: 'C',
    minLength: 6,
  },
  {
    id: 't2_exact_5',
    tier: 2,
    type: 'EXACT_LENGTH',
    categoryGroup: 'LENGTH',
    label: '5 LETTERS EXACTLY',
    sublabel: 'Not 4, not 6 — exactly 5 letters',
    highlightToken: '5',
    exactLength: 5,
  },
  {
    id: 't2_no_e',
    tier: 2,
    type: 'NO_LETTER',
    categoryGroup: 'FORBIDDEN',
    label: 'NO LETTER "E"',
    sublabel: '5+ letters, zero E allowed',
    highlightToken: 'NO E',
    param: 'E',
    minLength: 5,
  },
  {
    id: 't2_no_a',
    tier: 2,
    type: 'NO_LETTER',
    categoryGroup: 'FORBIDDEN',
    label: 'NO LETTER "A"',
    sublabel: '5+ letters, zero A allowed',
    highlightToken: 'NO A',
    param: 'A',
    minLength: 5,
  },
  {
    id: 't2_ends_ing_7',
    tier: 2,
    type: 'ENDS_WITH_MIN_LENGTH',
    categoryGroup: 'AFFIX',
    label: 'ENDS WITH "ING" (7+ LETTERS)',
    sublabel: 'Minimum 7 letters ending in ING',
    highlightToken: 'ING · 7+',
    param: 'ING',
    minLength: 7,
  },

  // ===================== TIER 3 (Waves 5+: Sudden Death Hardcore) =====================
  {
    id: 't3_contains_xz',
    tier: 3,
    type: 'CONTAINS_ANY',
    categoryGroup: 'SUBSTRING',
    label: 'CONTAINS "X" OR "Z"',
    sublabel: 'High-value rare letter required',
    highlightToken: 'X / Z',
    param: 'X',
    param2: 'Z',
  },
  {
    id: 't3_double_letters',
    tier: 3,
    type: 'DOUBLE_LETTERS',
    categoryGroup: 'SPECIAL',
    label: 'DOUBLE LETTERS',
    sublabel: 'e.g. BOOK, TREE, COFFEE',
    highlightToken: 'AA / EE',
  },
  {
    id: 't3_same_start_end',
    tier: 3,
    type: 'SAME_START_END',
    categoryGroup: 'SPECIAL',
    label: 'STARTS & ENDS SAME LETTER',
    sublabel: 'e.g. EAGLE, WINDOW, RIVER',
    highlightToken: 'A···A',
    minLength: 4,
  },
  {
    id: 't3_7plus_no_e',
    tier: 3,
    type: 'MIN_LENGTH_NO_LETTER',
    categoryGroup: 'FORBIDDEN',
    label: '7+ LETTERS · NO LETTER "E"',
    sublabel: 'Long word without a single E',
    highlightToken: '7+ · NO E',
    param: 'E',
    minLength: 7,
  },
  {
    id: 't3_contains_ph_gh',
    tier: 3,
    type: 'CONTAINS_ANY',
    categoryGroup: 'SUBSTRING',
    label: 'CONTAINS "PH" OR "GH"',
    sublabel: 'e.g. PHONE, GHOST, BRIGHT',
    highlightToken: 'PH / GH',
    param: 'PH',
    param2: 'GH',
  },
  {
    id: 't3_palindrome_or_6',
    tier: 3,
    type: 'PALINDROME_OR_MIN_LENGTH',
    categoryGroup: 'SPECIAL',
    label: 'PALINDROME OR 6+ LETTERS',
    sublabel: 'e.g. RADAR, KAYAK, or any 6+ letter word',
    highlightToken: 'PALINDROME',
    minLength: 6,
  },
];

function isPalindrome(word: string): boolean {
  if (word.length < 3) return false;
  let left = 0;
  let right = word.length - 1;
  while (left < right) {
    if (word[left] !== word[right]) return false;
    left++;
    right--;
  }
  return true;
}

/**
 * Exact validation for every prompt rule type with zero false positives/negatives.
 */
export function validatePromptRule(word: string, rule: PromptRule): boolean {
  const clean = word.trim().toUpperCase();
  if (clean.length < 3 || !/^[A-Z]+$/.test(clean)) return false;

  switch (rule.type) {
    case 'CONTAINS':
      return !!rule.param && clean.includes(rule.param);

    case 'STARTS_WITH':
      return !!rule.param && clean.startsWith(rule.param);

    case 'ENDS_WITH':
      return !!rule.param && clean.endsWith(rule.param);

    case 'EXACT_LENGTH':
      return rule.exactLength !== undefined && clean.length === rule.exactLength;

    case 'MIN_LENGTH_STARTS':
      return (
        !!rule.param &&
        rule.minLength !== undefined &&
        clean.length >= rule.minLength &&
        clean.startsWith(rule.param)
      );

    case 'NO_LETTER':
      return (
        !!rule.param &&
        clean.length >= (rule.minLength ?? 4) &&
        !clean.includes(rule.param)
      );

    case 'ENDS_WITH_MIN_LENGTH':
      return (
        !!rule.param &&
        rule.minLength !== undefined &&
        clean.length >= rule.minLength &&
        clean.endsWith(rule.param)
      );

    case 'CONTAINS_ANY': {
      const hasFirst = !!rule.param && clean.includes(rule.param);
      const hasSecond = !!rule.param2 && clean.includes(rule.param2);
      return hasFirst || hasSecond;
    }

    case 'DOUBLE_LETTERS':
      return /([A-Z])\1/.test(clean);

    case 'SAME_START_END':
      return (
        clean.length >= (rule.minLength ?? 4) &&
        clean[0] === clean[clean.length - 1]
      );

    case 'MIN_LENGTH_NO_LETTER':
      return (
        !!rule.param &&
        rule.minLength !== undefined &&
        clean.length >= rule.minLength &&
        !clean.includes(rule.param)
      );

    case 'PALINDROME_OR_MIN_LENGTH':
      return isPalindrome(clean) || clean.length >= (rule.minLength ?? 6);

    default:
      return false;
  }
}

export function hasBannedLetter(word: string, bannedLetters: string[]): string | null {
  if (!bannedLetters.length) return null;
  const upper = word.toUpperCase();
  for (const letter of bannedLetters) {
    if (upper.includes(letter.toUpperCase())) {
      return letter.toUpperCase();
    }
  }
  return null;
}

/**
 * Checks if a prompt rule is compatible with the streamer's custom banned letters
 * and ensures enough valid words exist in the active word category.
 */
function isRuleCompatible(rule: PromptRule, customRules: CustomGameRules): boolean {
  if (!customRules.enabledRuleGroups[rule.categoryGroup]) return false;

  const banned = new Set(customRules.bannedLetters.map((l) => l.toUpperCase()));
  if (banned.size > 0) {
    // Reject rules that directly require a banned letter
    if (
      (rule.type === 'CONTAINS' ||
        rule.type === 'STARTS_WITH' ||
        rule.type === 'ENDS_WITH' ||
        rule.type === 'MIN_LENGTH_STARTS' ||
        rule.type === 'ENDS_WITH_MIN_LENGTH') &&
      rule.param
    ) {
      for (const ch of rule.param) {
        if (banned.has(ch)) return false;
      }
    }
    if (rule.type === 'CONTAINS_ANY' && rule.param && rule.param2) {
      const p1Blocked = [...rule.param].some((ch) => banned.has(ch));
      const p2Blocked = [...rule.param2].some((ch) => banned.has(ch));
      if (p1Blocked && p2Blocked) return false;
    }
  }

  // Verify at least 12 valid words exist in the active dictionary/category
  const matches = getMatchingWordsForRule(rule, customRules, 15);
  return matches.length >= 12;
}

export function getTierForWave(wave: number): PromptTier {
  if (wave <= 2) return 1;
  if (wave <= 4) return 2;
  return 3;
}

export function getWaveDurationSec(wave: number, rules: CustomGameRules): number {
  const raw = rules.baseWaveDurationSec - (wave - 1) * rules.waveDecaySec;
  return Math.max(rules.minWaveDurationSec, Math.round(raw * 10) / 10);
}

export function pickNextPromptRule(
  wave: number,
  customRules: CustomGameRules,
  previousRuleId?: string
): PromptRule {
  const tier = getTierForWave(wave);
  let candidates = ALL_PROMPT_RULES.filter(
    (r) => r.tier === tier && r.id !== previousRuleId && isRuleCompatible(r, customRules)
  );

  // Fallback across all tiers if strict custom rules filtered out current tier
  if (candidates.length === 0) {
    candidates = ALL_PROMPT_RULES.filter(
      (r) => r.id !== previousRuleId && isRuleCompatible(r, customRules)
    );
  }

  // Final safety fallback if user banned almost the entire alphabet
  if (candidates.length === 0) {
    candidates = ALL_PROMPT_RULES.filter((r) => r.id !== previousRuleId);
  }

  return candidates[Math.floor(Math.random() * candidates.length)] ?? ALL_PROMPT_RULES[0];
}

export function getMatchingWordsForRule(
  rule: PromptRule,
  customRules: CustomGameRules,
  limit?: number
): string[] {
  const dict = getDictionaryForCategory(customRules.globalCategory);
  const results: string[] = [];
  for (let i = 0; i < dict.length; i++) {
    const w = dict[i];
    if (validatePromptRule(w, rule) && !hasBannedLetter(w, customRules.bannedLetters)) {
      results.push(w);
      if (limit && results.length >= limit) break;
    }
  }
  return results;
}
