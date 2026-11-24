import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomDock, HostDrawerTab } from './components/BottomDock';
import { CommandDeck } from './components/CommandDeck';
import { HostDrawer } from './components/HostDrawer';
import { PhysicsArenaCanvas } from './components/PhysicsArenaCanvas';
import { TopHeader } from './components/TopHeader';
import { generateProfilePicture } from './data/avatarGenerator';
import { DEFAULT_LOADOUT, randomBotLoadout } from './data/cosmetics';
import { isValidEnglishWord } from './data/dictionary';
import {
  AVATAR_PALETTE,
  BOT_POOL,
  computeBotWaveAction,
  getBotSubset,
  pickBotWordForWave,
  pickRandomJoinMessage,
} from './engine/botSimulator';
import {
  ALL_PROMPT_RULES,
  DEFAULT_CUSTOM_RULES,
  getWaveDurationSec,
  hasBannedLetter,
  pickNextPromptRule,
  validatePromptRule,
} from './engine/prompts';
import { soundEngine } from './engine/soundEngine';
import { TikTokBridgeClient } from './engine/tiktokBridge';
import {
  ArenaFeedbackEvent,
  ChatMessagePayload,
  CosmeticItem,
  CustomGameRules,
  GamePhase,
  HallOfFameEntry,
  IncomingChatLog,
  Player,
  PlayerLoadout,
  PromptRule,
  WsConnectionState,
} from './types/game';

const STORAGE_KEYS = {
  COINS: 'wbr_coins_v1',
  UNLOCKED: 'wbr_unlocked_v1',
  LOADOUT: 'wbr_loadout_v1',
  HOF: 'wbr_hof_v1',
};

const WAVE_INTRO_DURATION = 2.5;
const ELIMINATION_DURATION = 2.5;
const VICTORY_DURATION = 8.0;

function makePlayerId(username: string): string {
  return username.trim().replace(/^@/, '').toLowerCase();
}

function makeInitials(username: string): string {
  const clean = username.replace(/^@/, '').replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length >= 2) return clean.slice(0, 2).toUpperCase();
  return (clean || 'PL').toUpperCase();
}

function hashColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function loadNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  // Core Game State Machine
  const [phase, setPhase] = useState<GamePhase>('LOBBY');
  const [wave, setWave] = useState<number>(1);
  const [customRules, setCustomRules] = useState<CustomGameRules>(DEFAULT_CUSTOM_RULES);
  const [timeRemaining, setTimeRemaining] = useState<number>(DEFAULT_CUSTOM_RULES.lobbyDurationSec);
  const [totalPhaseDuration, setTotalPhaseDuration] = useState<number>(
    DEFAULT_CUSTOM_RULES.lobbyDurationSec
  );
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRule, setCurrentRule] = useState<PromptRule | null>(null);
  const [spinDisplayRule, setSpinDisplayRule] = useState<PromptRule | null>(null);
  const [burnedWordsList, setBurnedWordsList] = useState<string[]>([]);
  const [feedbackEvent, setFeedbackEvent] = useState<ArenaFeedbackEvent | null>(null);
  const [wipeoutMessage, setWipeoutMessage] = useState<string | null>(null);

  // Audio & UI Controls
  const [muted, setMuted] = useState<boolean>(false);
  const [controlsCollapsed, setControlsCollapsed] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<HostDrawerTab>('chat');

  // Hall of Fame
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>(() =>
    loadJson<HallOfFameEntry[]>(STORAGE_KEYS.HOF, [])
  );

  // Avatar Store & Economy
  const [coins, setCoins] = useState<number>(() => loadNumber(STORAGE_KEYS.COINS, 450));
  const [unlockedCosmetics, setUnlockedCosmetics] = useState<Set<string>>(() => {
    const saved = loadJson<string[]>(STORAGE_KEYS.UNLOCKED, [
      'hat:none',
      'trail:none',
      'elimEffect:classic_sparks',
    ]);
    return new Set(saved);
  });
  const [playerLoadout, setPlayerLoadout] = useState<PlayerLoadout>(() =>
    loadJson<PlayerLoadout>(STORAGE_KEYS.LOADOUT, DEFAULT_LOADOUT)
  );
  const [botCosmeticsEnabled, setBotCosmeticsEnabled] = useState<boolean>(true);

  // Simulator & Manual Chat State
  const [testUsername, setTestUsername] = useState<string>('You Live');
  const [simEnabled, setSimEnabled] = useState<boolean>(true);
  const [botCount, setBotCount] = useState<number>(35);
  const [chatLogs, setChatLogs] = useState<IncomingChatLog[]>([]);

  // TikTok Live WebSocket Bridge State
  const [wsUrl, setWsUrl] = useState<string>('ws://localhost:21213');
  const [wsState, setWsState] = useState<WsConnectionState>('DISCONNECTED');
  const [wsError, setWsError] = useState<string | null>(null);
  const [wsMessageCount, setWsMessageCount] = useState<number>(0);

  // Mutable Refs for Zero-Stale-Closure High-Frequency Loop & Chat Ingestion
  const phaseRef = useRef<GamePhase>(phase);
  const waveRef = useRef<number>(wave);
  const playersRef = useRef<Player[]>(players);
  const currentRuleRef = useRef<PromptRule | null>(currentRule);
  const burnedWordsSetRef = useRef<Set<string>>(new Set());
  const burnedWordsListRef = useRef<string[]>([]);
  const customRulesRef = useRef<CustomGameRules>(customRules);
  const waveComboRef = useRef<number>(0);
  const lastTickSecRef = useRef<number>(99);
  const isPausedRef = useRef<boolean>(isPaused);
  const testUsernameRef = useRef<string>(testUsername);
  const playerLoadoutRef = useRef<PlayerLoadout>(playerLoadout);
  const botCosmeticsRef = useRef<boolean>(botCosmeticsEnabled);
  const botTimersRef = useRef<number[]>([]);
  const bridgeRef = useRef<TikTokBridgeClient | null>(null);

  // Keep refs synchronized with state
  phaseRef.current = phase;
  waveRef.current = wave;
  playersRef.current = players;
  currentRuleRef.current = currentRule;
  customRulesRef.current = customRules;
  isPausedRef.current = isPaused;
  testUsernameRef.current = testUsername;
  playerLoadoutRef.current = playerLoadout;
  botCosmeticsRef.current = botCosmeticsEnabled;

  // Persist Coins, Cosmetics, Loadout, Hall of Fame
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COINS, String(coins));
    } catch {
      // ignore storage quota errors
    }
  }, [coins]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.UNLOCKED, JSON.stringify(Array.from(unlockedCosmetics)));
    } catch {
      // ignore
    }
  }, [unlockedCosmetics]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOADOUT, JSON.stringify(playerLoadout));
    } catch {
      // ignore
    }
  }, [playerLoadout]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HOF, JSON.stringify(hallOfFame));
    } catch {
      // ignore
    }
  }, [hallOfFame]);

  // Unlock Web Audio on first user interaction anywhere in viewport
  useEffect(() => {
    const unlockAudio = () => {
      soundEngine.unlock();
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Immediately reflect loadout changes onto the player's live avatar in the arena
  useEffect(() => {
    const myId = makePlayerId(testUsername);
    if (!myId) return;
    setPlayers((prev) =>
      prev.map((p) => (p.id === myId ? { ...p, loadout: { ...playerLoadout } } : p))
    );
  }, [playerLoadout, testUsername]);

  const clearBotTimers = useCallback(() => {
    for (const tid of botTimersRef.current) {
      window.clearTimeout(tid);
    }
    botTimersRef.current = [];
  }, []);

  const pushChatLog = useCallback(
    (username: string, comment: string, result: IncomingChatLog['result']) => {
      setChatLogs((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          username,
          comment,
          result,
          timestamp: Date.now(),
        },
        ...prev.slice(0, 24),
      ]);
    },
    []
  );

  /**
   * Core Incoming Chat Validation Pipeline
   * Used identically by Manual Test Chat, Built-In 35-Bot Simulator, WebSocket Bridge, and window.onTikTokChatMessage()
   */
  const processChatMessage = useCallback(
    (payload: ChatMessagePayload) => {
      const rawUser = (payload.username || '').trim().replace(/^@/, '');
      const rawComment = (payload.comment || '').trim();
      if (!rawUser || !rawComment) return;

      const playerId = makePlayerId(rawUser);
      const currentPhase = phaseRef.current;
      const rules = customRulesRef.current;
      const myTestId = makePlayerId(testUsernameRef.current);

      const currentPlayers = playersRef.current;
      let existingPlayer = currentPlayers.find((p) => p.id === playerId);

      // Helper to spawn a new player into the arena
      const spawnPlayer = (): Player | null => {
        if (currentPlayers.length >= rules.maxPlayers) return null;
        const color = hashColor(rawUser);
        const isMyTestUser = playerId === myTestId;
        const newPlayer: Player = {
          id: playerId,
          username: rawUser,
          avatarUrl: payload.avatarUrl || generateProfilePicture(rawUser),
          color,
          accentColor: color,
          initials: makeInitials(rawUser),
          alive: true,
          safe: false,
          isBot: payload.isBot ?? false,
          loadout: isMyTestUser
            ? { ...playerLoadoutRef.current }
            : payload.isBot
              ? randomBotLoadout(botCosmeticsRef.current)
              : { ...DEFAULT_LOADOUT },
        };
        const updated = [...playersRef.current, newPlayer];
        playersRef.current = updated;
        setPlayers(updated);
        soundEngine.playJoin();
        return newPlayer;
      };

      // 1) LOBBY PHASE: Any incoming message joins the player
      if (currentPhase === 'LOBBY') {
        if (!existingPlayer) {
          const spawned = spawnPlayer();
          if (spawned) {
            pushChatLog(rawUser, rawComment, 'JOINED');
          }
        }
        return;
      }

      // 2) ACTIVE WAVE PHASE: Validate words for ALIVE + UNSAFE players (and optional Wave 1 latecomers)
      if (currentPhase !== 'ACTIVE_WAVE') {
        return;
      }

      if (!existingPlayer) {
        if (waveRef.current === 1 && rules.allowWave1LateJoin) {
          existingPlayer = spawnPlayer() ?? undefined;
        }
        if (!existingPlayer) {
          return;
        }
      }

      if (!existingPlayer.alive || existingPlayer.safe) {
        return;
      }

      const activeRule = currentRuleRef.current;
      if (!activeRule) return;

      // Clean and uppercase the first word token
      const firstToken = rawComment.split(/\s+/)[0] || '';
      const cleanWord = firstToken.replace(/[^a-zA-Z]/g, '').toUpperCase();

      if (cleanWord.length < 3) {
        soundEngine.playError();
        setFeedbackEvent({
          type: 'INVALID',
          playerId,
          timestamp: Date.now() + Math.random(),
        });
        pushChatLog(rawUser, firstToken, 'INVALID');
        return;
      }

      // Check globally banned letters first
      const bannedHit = hasBannedLetter(cleanWord, rules.bannedLetters);
      if (bannedHit) {
        soundEngine.playError();
        setFeedbackEvent({
          type: 'BANNED',
          playerId,
          text: `NO "${bannedHit}"!`,
          timestamp: Date.now() + Math.random(),
        });
        pushChatLog(rawUser, cleanWord, 'BANNED');
        return;
      }

      // Check Burned Words Set
      if (burnedWordsSetRef.current.has(cleanWord)) {
        soundEngine.playError();
        setFeedbackEvent({
          type: 'TAKEN',
          playerId,
          timestamp: Date.now() + Math.random(),
        });
        pushChatLog(rawUser, cleanWord, 'TAKEN');
        return;
      }

      // Check Dictionary + Current Wave Prompt Rule
      const validDict = isValidEnglishWord(cleanWord, rules.globalCategory);
      const validRule = validatePromptRule(cleanWord, activeRule);

      if (!validDict || !validRule) {
        soundEngine.playError();
        setFeedbackEvent({
          type: 'INVALID',
          playerId,
          timestamp: Date.now() + Math.random(),
        });
        pushChatLog(rawUser, cleanWord, 'INVALID');
        return;
      }

      // VALID & UNIQUE WORD -> Mark player SAFE!
      burnedWordsSetRef.current.add(cleanWord);
      const nextBurned = [cleanWord, ...burnedWordsListRef.current];
      burnedWordsListRef.current = nextBurned;
      setBurnedWordsList(nextBurned);

      const nextPlayers = playersRef.current.map((p) =>
        p.id === playerId
          ? {
              ...p,
              safe: true,
              lastWord: cleanWord,
              lastWordTimestamp: Date.now(),
            }
          : p
      );
      playersRef.current = nextPlayers;
      setPlayers(nextPlayers);

      waveComboRef.current += 1;
      soundEngine.playSafe(waveComboRef.current);

      setFeedbackEvent({
        type: 'SAFE',
        playerId,
        text: cleanWord,
        timestamp: Date.now() + Math.random(),
      });
      pushChatLog(rawUser, cleanWord, 'SAFE');

      // Award Royale Coins when test player or real live viewer scores a safe word
      if (!payload.isBot) {
        setCoins((c) => c + 15);
      }

      // Early Wave End: If 100% of alive players are SAFE, fast-forward timer to 0.5s!
      const aliveList = nextPlayers.filter((p) => p.alive);
      if (aliveList.length > 0 && aliveList.every((p) => p.safe)) {
        setTimeRemaining((prev) => (prev > 0.5 ? 0.5 : prev));
      }
    },
    [pushChatLog]
  );

  // Attach global window.onTikTokChatMessage & WebSocket Bridge client
  useEffect(() => {
    const client = new TikTokBridgeClient(
      (msg) => {
        setWsMessageCount((c) => c + 1);
        processChatMessage(msg);
      },
      (status, error) => {
        setWsState(status);
        setWsError(error ?? null);
      }
    );
    bridgeRef.current = client;
    const detachHook = client.attachWindowHook();

    return () => {
      detachHook();
      client.disconnect();
      bridgeRef.current = null;
    };
  }, [processChatMessage]);

  // Phase Transition Helpers
  const startLobbyPhase = useCallback(() => {
    clearBotTimers();
    const dur = customRulesRef.current.lobbyDurationSec;
    playersRef.current = [];
    setPlayers([]);
    burnedWordsSetRef.current = new Set();
    burnedWordsListRef.current = [];
    setBurnedWordsList([]);
    setCurrentRule(null);
    setSpinDisplayRule(null);
    setWipeoutMessage(null);
    setWave(1);
    setPhase('LOBBY');
    setTotalPhaseDuration(dur);
    setTimeRemaining(dur);
    lastTickSecRef.current = 99;
  }, [clearBotTimers]);

  const startWaveIntroPhase = useCallback(
    (nextWave: number) => {
      clearBotTimers();
      setWipeoutMessage(null);
      burnedWordsSetRef.current = new Set();
      burnedWordsListRef.current = [];
      setBurnedWordsList([]);
      waveComboRef.current = 0;

      // Reset safe status for all alive players
      const resetPlayers = playersRef.current.map((p) =>
        p.alive ? { ...p, safe: false, lastWord: undefined } : p
      );
      playersRef.current = resetPlayers;
      setPlayers(resetPlayers);

      const chosen = pickNextPromptRule(
        nextWave,
        customRulesRef.current,
        currentRuleRef.current?.id
      );
      currentRuleRef.current = chosen;
      setCurrentRule(chosen);
      setWave(nextWave);
      setPhase('WAVE_INTRO');
      setTotalPhaseDuration(WAVE_INTRO_DURATION);
      setTimeRemaining(WAVE_INTRO_DURATION);
      lastTickSecRef.current = 99;
    },
    [clearBotTimers]
  );

  const startActiveWavePhase = useCallback(() => {
    const dur = getWaveDurationSec(waveRef.current, customRulesRef.current);
    setSpinDisplayRule(null);
    setPhase('ACTIVE_WAVE');
    setTotalPhaseDuration(dur);
    setTimeRemaining(dur);
    lastTickSecRef.current = 99;
  }, []);

  const startVictoryPhase = useCallback(
    (winner: Player) => {
      clearBotTimers();
      setPhase('VICTORY');
      setTotalPhaseDuration(VICTORY_DURATION);
      setTimeRemaining(VICTORY_DURATION);
      soundEngine.playVictory();
      setFeedbackEvent({
        type: 'VICTORY',
        playerId: winner.id,
        timestamp: Date.now() + Math.random(),
      });

      // Award coins for round completion
      setCoins((c) => c + (winner.isBot ? 35 : 120));

      // Update Live Hall of Fame
      setHallOfFame((prev) => {
        const idx = prev.findIndex(
          (e) => e.username.toLowerCase() === winner.username.toLowerCase()
        );
        let updated: HallOfFameEntry[];
        if (idx >= 0) {
          updated = prev.map((entry, i) =>
            i === idx ? { ...entry, wins: entry.wins + 1 } : entry
          );
        } else {
          updated = [
            ...prev,
            {
              username: winner.username,
              avatarUrl: winner.avatarUrl,
              color: winner.color,
              initials: winner.initials,
              wins: 1,
            },
          ];
        }
        return updated.sort((a, b) => b.wins - a.wins).slice(0, 12);
      });
    },
    [clearBotTimers]
  );

  const runEliminationResolution = useCallback(() => {
    clearBotTimers();
    const alivePlayers = playersRef.current.filter((p) => p.alive);
    const unsafePlayers = alivePlayers.filter((p) => !p.safe);
    const safePlayers = alivePlayers.filter((p) => p.safe);

    // Edge case: 0 survivors -> TOTAL WIPEOUT REVIVE!
    if (alivePlayers.length > 0 && safePlayers.length === 0) {
      soundEngine.playRevive();
      setWipeoutMessage('TOTAL WIPEOUT! REVIVING LAST WAVE!');
      setFeedbackEvent({
        type: 'REVIVE',
        timestamp: Date.now() + Math.random(),
      });
      setPhase('ELIMINATION');
      setTotalPhaseDuration(ELIMINATION_DURATION);
      setTimeRemaining(ELIMINATION_DURATION);
      return;
    }

    // Standard Elimination: detonate all unsafe players
    if (unsafePlayers.length > 0) {
      const eliminatedIds = unsafePlayers.map((p) => p.id);
      soundEngine.playExplosion();
      setFeedbackEvent({
        type: 'ELIMINATE',
        playerIds: eliminatedIds,
        timestamp: Date.now() + Math.random(),
      });

      const elimSet = new Set(eliminatedIds);
      const nextPlayers = playersRef.current.map((p) =>
        elimSet.has(p.id) ? { ...p, alive: false, safe: false } : p
      );
      playersRef.current = nextPlayers;
      setPlayers(nextPlayers);
    }

    setPhase('ELIMINATION');
    setTotalPhaseDuration(ELIMINATION_DURATION);
    setTimeRemaining(ELIMINATION_DURATION);
  }, [clearBotTimers]);

  // Handle transition when a phase timer reaches 0.0s
  const advanceFromCurrentPhase = useCallback(() => {
    const current = phaseRef.current;

    if (current === 'LOBBY') {
      const alive = playersRef.current.filter((p) => p.alive);
      if (alive.length < 2) {
        // Need at least 2 players (or if solo testing with 1 player and sim off, allow 1-player practice!)
        if (alive.length === 1 && !simEnabled) {
          startWaveIntroPhase(1);
        } else {
          // Extend lobby smoothly while waiting for chatters
          const dur = customRulesRef.current.lobbyDurationSec;
          setTotalPhaseDuration(dur);
          setTimeRemaining(dur);
        }
        return;
      }
      startWaveIntroPhase(1);
      return;
    }

    if (current === 'WAVE_INTRO') {
      startActiveWavePhase();
      return;
    }

    if (current === 'ACTIVE_WAVE') {
      runEliminationResolution();
      return;
    }

    if (current === 'ELIMINATION') {
      setWipeoutMessage(null);
      const survivors = playersRef.current.filter((p) => p.alive);
      if (survivors.length === 1) {
        startVictoryPhase(survivors[0]);
      } else if (survivors.length === 0) {
        startLobbyPhase();
      } else {
        startWaveIntroPhase(waveRef.current + 1);
      }
      return;
    }

    if (current === 'VICTORY') {
      startLobbyPhase();
    }
  }, [
    runEliminationResolution,
    simEnabled,
    startActiveWavePhase,
    startLobbyPhase,
    startVictoryPhase,
    startWaveIntroPhase,
  ]);

  // Master 100ms Precision State Machine Countdown Clock
  useEffect(() => {
    if (isPaused) return;

    const interval = window.setInterval(() => {
      setTimeRemaining((prev) => {
        const next = Math.max(0, Math.round((prev - 0.1) * 10) / 10);

        // Countdown tick SFX in last 3 seconds of ACTIVE_WAVE
        if (phaseRef.current === 'ACTIVE_WAVE' && next <= 3.0 && next > 0) {
          const wholeSec = Math.ceil(next);
          if (wholeSec < lastTickSecRef.current) {
            lastTickSecRef.current = wholeSec;
            soundEngine.playTick(wholeSec === 1);
          }
        }

        if (next <= 0) {
          window.setTimeout(() => advanceFromCurrentPhase(), 0);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [isPaused, advanceFromCurrentPhase]);

  // Dramatic Slot-Machine Spin Animation during WAVE_INTRO
  useEffect(() => {
    if (phase !== 'WAVE_INTRO' || isPaused) return;

    let ticks = 0;
    const maxTicks = 17;
    const spinInterval = window.setInterval(() => {
      ticks += 1;
      if (ticks >= maxTicks) {
        setSpinDisplayRule(currentRuleRef.current);
        window.clearInterval(spinInterval);
        return;
      }
      const randomRule =
        ALL_PROMPT_RULES[Math.floor(Math.random() * ALL_PROMPT_RULES.length)];
      setSpinDisplayRule(randomRule);
      soundEngine.playSlotTick();
    }, 105);

    return () => window.clearInterval(spinInterval);
  }, [phase, isPaused]);

  // Built-In Realistic Bot Simulator: Lobby Organic Spawning & Active Wave Gameplay
  useEffect(() => {
    clearBotTimers();
    if (!simEnabled || isPaused) return;

    if (phase === 'LOBBY') {
      const targetBots = getBotSubset(
        Math.min(botCount, customRulesRef.current.maxPlayers)
      );
      const joinWindowMs = Math.max(
        3500,
        (customRulesRef.current.lobbyDurationSec - 3.5) * 1000
      );

      targetBots.forEach((bot, idx) => {
        // First 4 bots join quickly in 1.2s so the arena immediately feels lively
        const delayMs =
          idx < 4
            ? 250 + idx * 240
            : 800 + Math.random() * Math.max(1500, joinWindowMs - 800);

        const tid = window.setTimeout(() => {
          if (phaseRef.current !== 'LOBBY' || isPausedRef.current) return;
          processChatMessage({
            username: bot.username,
            avatarUrl: bot.avatarUrl,
            comment: pickRandomJoinMessage(),
            isBot: true,
          });
        }, delayMs);
        botTimersRef.current.push(tid);
      });
    } else if (phase === 'ACTIVE_WAVE') {
      const activeRule = currentRuleRef.current;
      if (!activeRule) return;

      const aliveBots = playersRef.current.filter((p) => p.alive && p.isBot);
      const waveDurSec = getWaveDurationSec(waveRef.current, customRulesRef.current);

      aliveBots.forEach((botPlayer) => {
        const profile = BOT_POOL.find(
          (b) => makePlayerId(b.username) === botPlayer.id
        );
        const skill = profile?.skill ?? 0.65;

        const plan = computeBotWaveAction(
          skill,
          waveRef.current,
          waveDurSec,
          aliveBots.length
        );

        const tid = window.setTimeout(() => {
          if (phaseRef.current !== 'ACTIVE_WAVE' || isPausedRef.current) return;
          const livePlayer = playersRef.current.find((p) => p.id === botPlayer.id);
          if (!livePlayer || !livePlayer.alive || livePlayer.safe) return;

          if (plan.willSubmitValid) {
            const word = pickBotWordForWave(
              activeRule,
              customRulesRef.current,
              burnedWordsSetRef.current,
              burnedWordsListRef.current
            );
            if (word) {
              processChatMessage({
                username: botPlayer.username,
                comment: word,
                isBot: true,
              });
            }

            // If their first try hit TAKEN or INVALID, give them a realistic retry!
            if (plan.retryDelayMs) {
              const retryTid = window.setTimeout(() => {
                if (phaseRef.current !== 'ACTIVE_WAVE' || isPausedRef.current) return;
                const stillUnsafe = playersRef.current.find(
                  (p) => p.id === botPlayer.id && p.alive && !p.safe
                );
                if (!stillUnsafe || !currentRuleRef.current) return;
                const retryWord = pickBotWordForWave(
                  currentRuleRef.current,
                  customRulesRef.current,
                  burnedWordsSetRef.current,
                  []
                );
                if (retryWord) {
                  processChatMessage({
                    username: botPlayer.username,
                    comment: retryWord,
                    isBot: true,
                  });
                }
              }, Math.max(700, plan.retryDelayMs - plan.delayMs));
              botTimersRef.current.push(retryTid);
            }
          } else if (Math.random() < 0.35) {
            // Non-surviving bot occasionally panics with a wrong/already-taken word!
            const panicWord =
              burnedWordsListRef.current[0] ||
              ['WAIT', 'NOOO', 'HELP', 'UHHH'][Math.floor(Math.random() * 4)];
            processChatMessage({
              username: botPlayer.username,
              comment: panicWord,
              isBot: true,
            });
          }
        }, plan.delayMs);

        botTimersRef.current.push(tid);
      });
    }

    return () => {
      clearBotTimers();
    };
  }, [phase, wave, simEnabled, botCount, isPaused, clearBotTimers, processChatMessage]);

  // Host Control Handlers
  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundEngine.setMuted(next);
    if (!next) soundEngine.unlock();
  };

  const handleForceNewPrompt = () => {
    if (phase === 'LOBBY') {
      startWaveIntroPhase(1);
      return;
    }
    if (phase === 'VICTORY') {
      startLobbyPhase();
      return;
    }
    const nextRule = pickNextPromptRule(
      wave,
      customRulesRef.current,
      currentRuleRef.current?.id
    );
    currentRuleRef.current = nextRule;
    setCurrentRule(nextRule);
    burnedWordsSetRef.current = new Set();
    burnedWordsListRef.current = [];
    setBurnedWordsList([]);
    waveComboRef.current = 0;

    // Reset everyone back to unsafe for the new prompt
    const resetPlayers = playersRef.current.map((p) =>
      p.alive ? { ...p, safe: false, lastWord: undefined } : p
    );
    playersRef.current = resetPlayers;
    setPlayers(resetPlayers);

    const dur = getWaveDurationSec(wave, customRulesRef.current);
    setPhase('ACTIVE_WAVE');
    setTotalPhaseDuration(dur);
    setTimeRemaining(dur);
    soundEngine.playSlotTick();
  };

  const handleSpawnBotsNow = (count: number) => {
    const existingIds = new Set(playersRef.current.map((p) => p.id));
    const available = BOT_POOL.filter((b) => !existingIds.has(makePlayerId(b.username)));
    const picks = available.slice(0, count);
    picks.forEach((bot, idx) => {
      window.setTimeout(() => {
        if (phaseRef.current === 'LOBBY' || (phaseRef.current === 'ACTIVE_WAVE' && waveRef.current === 1)) {
          processChatMessage({
            username: bot.username,
            avatarUrl: bot.avatarUrl,
            comment: pickRandomJoinMessage(),
            isBot: true,
          });
        } else {
          // Force spawn directly into arena for quick testing
          if (playersRef.current.length >= customRulesRef.current.maxPlayers) return;
          const color = hashColor(bot.username);
          const p: Player = {
            id: makePlayerId(bot.username),
            username: bot.username,
            avatarUrl: bot.avatarUrl,
            color,
            accentColor: color,
            initials: makeInitials(bot.username),
            alive: true,
            safe: false,
            isBot: true,
            loadout: randomBotLoadout(botCosmeticsRef.current),
          };
          const next = [...playersRef.current, p];
          playersRef.current = next;
          setPlayers(next);
          soundEngine.playJoin();
        }
      }, idx * 75);
    });
  };

  const handleBuyOrEquipCosmetic = (item: CosmeticItem) => {
    const key = `${item.category}:${item.id}`;
    const alreadyOwned = item.price === 0 || unlockedCosmetics.has(key);

    if (!alreadyOwned) {
      if (coins < item.price) return;
      setCoins((c) => c - item.price);
      setUnlockedCosmetics((prev) => new Set([...prev, key]));
      soundEngine.playPurchase();
    } else {
      soundEngine.playJoin();
    }

    setPlayerLoadout((prev) => ({
      ...prev,
      [item.category]: item.id,
    }));
  };

  // Derived counters for TopHeader & Arena
  const alivePlayers = useMemo(() => players.filter((p) => p.alive), [players]);
  const safeCount = useMemo(
    () => alivePlayers.filter((p) => p.safe).length,
    [alivePlayers]
  );
  const champion = phase === 'VICTORY' && alivePlayers.length === 1 ? alivePlayers[0] : null;

  return (
    <main className="w-full h-dvh bg-[#05070D] flex items-center justify-center overflow-hidden relative select-none">
      {/* Ambient Desktop Studio Backdrop (invisible on narrow mobile screens) */}
      <div
        className="hidden sm:block absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(0, 245, 212, 0.08) 0%, rgba(11, 14, 23, 0.4) 45%, #05070D 100%)',
        }}
      />

      {/* 9:16 Vertical Broadcast Frame (Centered on Desktop, Full-Screen on Mobile) */}
      <div className="relative w-full h-dvh sm:h-[calc(100dvh-16px)] sm:w-auto sm:aspect-[9/16] max-w-full sm:max-w-[calc((100dvh-16px)*9/16)] studio-grid-bg sm:rounded-[24px] sm:border sm:border-white/15 sm:shadow-[0_0_60px_rgba(0,0,0,0.85),0_0_24px_rgba(0,245,212,0.12)] flex flex-col overflow-hidden">
        {/* Subtle CRT Scanline Overlay */}
        <div className="absolute inset-0 crt-scanlines z-30 opacity-45" />

        {/* ZONE 1: Top Header (12%) */}
        <TopHeader
          phase={phase}
          wave={wave}
          aliveCount={alivePlayers.length}
          totalJoinedCount={players.length}
          safeCount={safeCount}
          hallOfFame={hallOfFame}
          muted={muted}
          onToggleMute={handleToggleMute}
        />

        {/* ZONE 2: Command & Timer Deck (22%) */}
        <CommandDeck
          phase={phase}
          wave={wave}
          currentRule={currentRule}
          spinDisplayRule={spinDisplayRule}
          timeRemaining={timeRemaining}
          totalPhaseDuration={totalPhaseDuration}
          customRules={customRules}
          isPaused={isPaused}
          wipeoutMessage={wipeoutMessage}
        />

        {/* ZONE 3: Physics Avatar Arena (48%) */}
        <PhysicsArenaCanvas
          players={players}
          phase={phase}
          timeRemaining={timeRemaining}
          feedbackEvent={feedbackEvent}
          champion={champion}
          wipeoutMessage={wipeoutMessage}
        />

        {/* ZONE 4: Burned Words Ticker & Streamer Host Dock (18%) */}
        <BottomDock
          burnedWords={burnedWordsList}
          isPaused={isPaused}
          controlsCollapsed={controlsCollapsed}
          coins={coins}
          simEnabled={simEnabled}
          onTogglePause={() => setIsPaused((p) => !p)}
          onSkipPhase={advanceFromCurrentPhase}
          onForceNewPrompt={handleForceNewPrompt}
          onClearLeaderboard={() => setHallOfFame([])}
          onToggleCollapse={() => setControlsCollapsed((c) => !c)}
          onOpenDrawer={(tab) => {
            setDrawerTab(tab);
            setDrawerOpen(true);
          }}
        />

        {/* Slide-Up Host Studio Drawer (Test Chat + Bot Sim + Themed Avatar Store + Custom Rules + TikTok Bridge) */}
        <HostDrawer
          open={drawerOpen}
          activeTab={drawerTab}
          onChangeTab={setDrawerTab}
          onClose={() => setDrawerOpen(false)}
          phase={phase}
          currentRule={currentRule}
          testUsername={testUsername}
          onChangeTestUsername={setTestUsername}
          onSendManualChat={(username, comment) =>
            processChatMessage({ username, comment, isBot: false })
          }
          simEnabled={simEnabled}
          onToggleSim={setSimEnabled}
          botCount={botCount}
          onChangeBotCount={setBotCount}
          onSpawnBotsNow={handleSpawnBotsNow}
          chatLogs={chatLogs}
          coins={coins}
          onGrantBonusCoins={() => {
            setCoins((c) => c + 250);
            soundEngine.playPurchase();
          }}
          unlockedCosmetics={unlockedCosmetics}
          playerLoadout={playerLoadout}
          botCosmeticsEnabled={botCosmeticsEnabled}
          onToggleBotCosmetics={setBotCosmeticsEnabled}
          onBuyOrEquipCosmetic={handleBuyOrEquipCosmetic}
          customRules={customRules}
          onUpdateCustomRules={setCustomRules}
          wsUrl={wsUrl}
          onChangeWsUrl={setWsUrl}
          wsState={wsState}
          wsError={wsError}
          wsMessageCount={wsMessageCount}
          onConnectWs={() => bridgeRef.current?.connect(wsUrl)}
          onDisconnectWs={() => bridgeRef.current?.disconnect()}
        />
      </div>
    </main>
  );
}
