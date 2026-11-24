import { FormEvent, useState } from 'react';
import {
  Ban,
  Bot,
  Check,
  Coins,
  Copy,
  MessageSquare,
  Plug,
  RotateCcw,
  Send,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Unplug,
  UserPlus,
  X,
} from 'lucide-react';
import { COSMETIC_CATALOG } from '../data/cosmetics';
import { CATEGORY_LABELS } from '../data/dictionary';
import { DEFAULT_CUSTOM_RULES, getMatchingWordsForRule } from '../engine/prompts';
import {
  CosmeticCategory,
  CosmeticItem,
  CustomGameRules,
  GamePhase,
  GlobalWordCategory,
  IncomingChatLog,
  PlayerLoadout,
  PromptCategoryGroup,
  PromptRule,
  WsConnectionState,
} from '../types/game';
import { HostDrawerTab } from './BottomDock';
import { CosmeticIcon, LoadoutPreviewHeader } from './CosmeticPreview';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const RULE_GROUP_LABELS: Record<PromptCategoryGroup, string> = {
  SUBSTRING: 'Contains Substring (ER, QU, CH…)',
  AFFIX: 'Starts / Ends With (B, ED, ING…)',
  LENGTH: 'Exact / Min Length (5 letters, 6+)',
  FORBIDDEN: 'Forbidden Letter (No E / No A)',
  SPECIAL: 'Special (Doubles, Palindrome, Same End)',
};

interface HostDrawerProps {
  open: boolean;
  activeTab: HostDrawerTab;
  onChangeTab: (tab: HostDrawerTab) => void;
  onClose: () => void;

  // Test Chat & Bot Simulator
  phase: GamePhase;
  currentRule: PromptRule | null;
  testUsername: string;
  onChangeTestUsername: (name: string) => void;
  onSendManualChat: (username: string, comment: string) => void;
  simEnabled: boolean;
  onToggleSim: (enabled: boolean) => void;
  botCount: number;
  onChangeBotCount: (count: number) => void;
  onSpawnBotsNow: (count: number) => void;
  chatLogs: IncomingChatLog[];

  // Avatar Store
  coins: number;
  onGrantBonusCoins: () => void;
  unlockedCosmetics: Set<string>;
  playerLoadout: PlayerLoadout;
  botCosmeticsEnabled: boolean;
  onToggleBotCosmetics: (enabled: boolean) => void;
  onBuyOrEquipCosmetic: (item: CosmeticItem) => void;

  // Custom Rules
  customRules: CustomGameRules;
  onUpdateCustomRules: (next: CustomGameRules) => void;

  // TikTok WebSocket Bridge
  wsUrl: string;
  onChangeWsUrl: (url: string) => void;
  wsState: WsConnectionState;
  wsError: string | null;
  wsMessageCount: number;
  onConnectWs: () => void;
  onDisconnectWs: () => void;
}

export function HostDrawer({
  open,
  activeTab,
  onChangeTab,
  onClose,
  phase,
  currentRule,
  testUsername,
  onChangeTestUsername,
  onSendManualChat,
  simEnabled,
  onToggleSim,
  botCount,
  onChangeBotCount,
  onSpawnBotsNow,
  chatLogs,
  coins,
  onGrantBonusCoins,
  unlockedCosmetics,
  playerLoadout,
  botCosmeticsEnabled,
  onToggleBotCosmetics,
  onBuyOrEquipCosmetic,
  customRules,
  onUpdateCustomRules,
  wsUrl,
  onChangeWsUrl,
  wsState,
  wsError,
  wsMessageCount,
  onConnectWs,
  onDisconnectWs,
}: HostDrawerProps) {
  const [commentInput, setCommentInput] = useState('');
  const [storeCategory, setStoreCategory] = useState<CosmeticCategory>('hat');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  if (!open) return null;

  const handleChatSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanedUser = testUsername.trim().replace(/^@/, '') || 'streamer_test';
    const cleanedComment = commentInput.trim();
    if (!cleanedComment) return;
    onSendManualChat(cleanedUser, cleanedComment);
    setCommentInput('');
  };

  const handleQuickValidWord = () => {
    const cleanedUser = testUsername.trim().replace(/^@/, '') || 'streamer_test';
    if (phase === 'LOBBY') {
      onSendManualChat(cleanedUser, 'JOIN');
      return;
    }
    if (currentRule) {
      const sampleWords = getMatchingWordsForRule(currentRule, customRules, 30);
      if (sampleWords.length > 0) {
        const pick = sampleWords[Math.floor(Math.random() * sampleWords.length)];
        onSendManualChat(cleanedUser, pick);
      }
    }
  };

  const toggleBannedLetter = (letter: string) => {
    const exists = customRules.bannedLetters.includes(letter);
    const next = exists
      ? customRules.bannedLetters.filter((l) => l !== letter)
      : [...customRules.bannedLetters, letter].sort();
    onUpdateCustomRules({ ...customRules, bannedLetters: next });
  };

  const toggleRuleGroup = (group: PromptCategoryGroup) => {
    const nextGroups = {
      ...customRules.enabledRuleGroups,
      [group]: !customRules.enabledRuleGroups[group],
    };
    // Ensure at least one rule group remains enabled
    const activeCount = Object.values(nextGroups).filter(Boolean).length;
    if (activeCount === 0) return;
    onUpdateCustomRules({ ...customRules, enabledRuleGroups: nextGroups });
  };

  const filteredCosmetics = COSMETIC_CATALOG.filter((c) => c.category === storeCategory);

  const isEquipped = (item: CosmeticItem) => {
    if (item.category === 'hat') return playerLoadout.hat === item.id;
    if (item.category === 'trail') return playerLoadout.trail === item.id;
    return playerLoadout.elimEffect === item.id;
  };

  const hookSnippet = `window.onTikTokChatMessage({ nickname: "Luna Plays", avatarUrl: "", comment: "QUARTZ" });`;

  const handleCopySnippet = () => {
    navigator.clipboard?.writeText(hookSnippet).catch(() => {});
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 1800);
  };

  const tabs: Array<{ id: HostDrawerTab; label: string; icon: typeof MessageSquare }> = [
    { id: 'chat', label: 'Chat & Sim', icon: MessageSquare },
    { id: 'store', label: 'Avatar Store', icon: ShoppingBag },
    { id: 'rules', label: 'Game Rules', icon: SlidersHorizontal },
    { id: 'bridge', label: 'TikTok Live', icon: Plug },
  ];

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/60 backdrop-blur-[2px]">
      {/* Click backdrop to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-up panel occupying lower 68% of the 9:16 frame */}
      <div className="h-[68%] w-full bg-[#0E1322] border-t-2 border-[#00F5D4]/50 rounded-t-2xl flex flex-col overflow-hidden shadow-[0_-16px_48px_rgba(0,0,0,0.85)]">
        {/* Drawer Header + Segmented Tabs */}
        <div className="px-3 pt-2.5 pb-2 border-b border-white/10 bg-[#0B0E17] shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-lg tracking-wide uppercase text-white">
                HOST STUDIO
              </span>
              <span className="text-[11px] font-mono font-bold text-[#FFD166] tabular-nums">
                · {coins} COINS
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Host Drawer"
              className="w-7 h-7 rounded-lg bg-[#161F35] hover:bg-[#233050] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[#141B2D]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeTab(tab.id)}
                  className={`py-1.5 px-1 rounded-md text-[10.5px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#00F5D4] text-[#05070D]'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto thin-scroll p-3 space-y-3">
          {/* ==================== TAB 1: CHAT & SIMULATOR ==================== */}
          {activeTab === 'chat' && (
            <>
              {/* Manual Test Chat Input */}
              <div className="rounded-xl bg-[#131A2C] border border-white/10 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                    Manual Test Chat Input
                  </h3>
                  <button
                    type="button"
                    onClick={handleQuickValidWord}
                    className="text-[11px] font-bold text-[#00F5D4] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{phase === 'LOBBY' ? 'Quick Join' : 'Auto-Submit Word'}</span>
                  </button>
                </div>

                <form onSubmit={handleChatSubmit} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={testUsername}
                      onChange={(e) => onChangeTestUsername(e.target.value)}
                      placeholder="Nickname"
                      aria-label="Test nickname"
                      className="w-[38%] h-9 px-2.5 rounded-lg bg-[#0B0E17] border border-white/12 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-[#00F5D4]"
                    />
                    <input
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder={
                        phase === 'LOBBY'
                          ? 'Type JOIN or any word...'
                          : 'Type a word matching the rule...'
                      }
                      aria-label="Chat message"
                      className="flex-1 h-9 px-2.5 rounded-lg bg-[#0B0E17] border border-white/12 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-[#00F5D4]"
                    />
                    <button
                      type="submit"
                      className="h-9 px-3 rounded-lg bg-[#00F5D4] hover:bg-[#2BFCE0] text-[#05070D] font-extrabold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
                <p className="text-[10.5px] text-slate-400">
                  Your equipped Avatar Store cosmetics automatically appear on <strong className="text-slate-200">{testUsername.replace(/^@/, '') || 'You Live'}</strong>.
                </p>
              </div>

              {/* Bot Simulator Controls */}
              <div className="rounded-xl bg-[#131A2C] border border-white/10 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Bot className="w-4 h-4 text-[#00F5D4] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white truncate">
                        Simulate Live TikTok Chat ({botCount} Bots)
                      </div>
                      <div className="text-[10.5px] text-slate-400">
                        Bots join organically &amp; type staggered dictionary words
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={simEnabled}
                    onClick={() => onToggleSim(!simEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                      simEnabled ? 'bg-[#00F5D4]' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-[#05070D] transition-transform ${
                        simEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <label className="text-[11px] font-bold text-slate-300 shrink-0">
                    Bot Pool: <span className="font-mono text-[#00F5D4] tabular-nums">{botCount}</span>
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={60}
                    step={5}
                    value={botCount}
                    onChange={(e) => onChangeBotCount(Number(e.target.value))}
                    className="flex-1 accent-[#00F5D4] cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => onSpawnBotsNow(10)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1C2640] hover:bg-[#273558] text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#00F5D4]" />
                    <span>+10 Bots</span>
                  </button>
                </div>
              </div>

              {/* Recent Processed Chat Feed */}
              <div className="rounded-xl bg-[#131A2C] border border-white/10 p-3">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Live Chat Ingestion Feed
                </div>
                {chatLogs.length === 0 ? (
                  <p className="text-xs text-slate-500">No chat events processed yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto thin-scroll">
                    {chatLogs.slice(0, 12).map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between gap-2 text-[11px] border-b border-white/5 pb-1 last:border-0"
                      >
                        <div className="truncate min-w-0">
                          <span className="font-bold text-slate-200">{log.username.replace(/^@/, '')}</span>{' '}
                          <span className="font-mono text-slate-400">{log.comment}</span>
                        </div>
                        <span
                          className={`font-mono text-[10px] font-extrabold shrink-0 ${
                            log.result === 'SAFE'
                              ? 'text-[#00F5D4]'
                              : log.result === 'JOINED'
                                ? 'text-[#38BDF8]'
                                : log.result === 'TAKEN'
                                  ? 'text-[#FFD166]'
                                  : log.result === 'INVALID' || log.result === 'BANNED'
                                    ? 'text-[#FF2A6D]'
                                    : 'text-slate-500'
                          }`}
                        >
                          {log.result}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ==================== TAB 2: THEMED AVATAR STORE ==================== */}
          {activeTab === 'store' && (
            <>
              {/* Coin Balance & Equipped Preview */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm font-mono font-extrabold text-[#FFD166] tabular-nums">
                  <Coins className="w-4 h-4" />
                  <span>{coins} ROYALE COINS</span>
                </div>
                <button
                  type="button"
                  onClick={onGrantBonusCoins}
                  className="px-2.5 py-1 rounded-lg bg-[#FFD166]/15 hover:bg-[#FFD166]/25 text-[#FFD166] border border-[#FFD166]/35 text-[11px] font-bold cursor-pointer"
                >
                  +250 Demo Coins
                </button>
              </div>

              <LoadoutPreviewHeader username={testUsername || 'streamer_test'} loadout={playerLoadout} />

              {/* Bot Cosmetics Toggle */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#131A2C] border border-white/8">
                <span className="text-[11px] font-bold text-slate-300">
                  Show random store cosmetics on arena bots
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={botCosmeticsEnabled}
                  onClick={() => onToggleBotCosmetics(!botCosmeticsEnabled)}
                  className={`w-10 h-5.5 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                    botCosmeticsEnabled ? 'bg-[#00F5D4]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4.5 h-4.5 rounded-full bg-[#05070D] transition-transform ${
                      botCosmeticsEnabled ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Category Filter Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[#141B2D]">
                {(
                  [
                    { id: 'hat', label: 'Hats' },
                    { id: 'trail', label: 'Avatar Trails' },
                    { id: 'elimEffect', label: 'KO Effects' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setStoreCategory(cat.id)}
                    className={`py-1.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                      storeCategory === cat.id
                        ? 'bg-[#FFD166] text-[#05070D]'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Cosmetic Catalog Grid */}
              <div className="grid grid-cols-2 gap-2">
                {filteredCosmetics.map((item) => {
                  const key = `${item.category}:${item.id}`;
                  const owned = item.price === 0 || unlockedCosmetics.has(key);
                  const equipped = isEquipped(item);
                  const canAfford = coins >= item.price;

                  return (
                    <div
                      key={key}
                      className={`rounded-xl p-2.5 border flex flex-col justify-between gap-2 transition-colors ${
                        equipped
                          ? 'bg-[#122531] border-[#00F5D4]'
                          : 'bg-[#131A2C] border-white/10'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <CosmeticIcon item={item} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-extrabold text-white leading-tight truncate">
                            {item.name}
                          </div>
                          <div
                            className="text-[9.5px] font-bold uppercase tracking-wider mt-0.5"
                            style={{ color: item.accentColor }}
                          >
                            {item.rarity}
                          </div>
                        </div>
                      </div>

                      <p className="text-[10.5px] text-slate-400 leading-snug">
                        {item.description}
                      </p>

                      <button
                        type="button"
                        disabled={!owned && !canAfford}
                        onClick={() => onBuyOrEquipCosmetic(item)}
                        className={`w-full py-1.5 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                          equipped
                            ? 'bg-[#00F5D4] text-[#05070D]'
                            : owned
                              ? 'bg-[#1F2C4A] hover:bg-[#2A3B63] text-white'
                              : canAfford
                                ? 'bg-[#FFD166] hover:bg-[#FFE08A] text-[#05070D]'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {equipped ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Equipped</span>
                          </>
                        ) : owned ? (
                          <span>Equip</span>
                        ) : (
                          <>
                            <Coins className="w-3 h-3" />
                            <span>Unlock · {item.price}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ==================== TAB 3: CUSTOMIZABLE GAME RULES ==================== */}
          {activeTab === 'rules' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                    Match Timing &amp; Capacity
                  </h3>
                  <p className="text-[10.5px] text-slate-400">
                    Applies live to upcoming waves &amp; lobbies
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateCustomRules({ ...DEFAULT_CUSTOM_RULES })}
                  className="px-2.5 py-1 rounded-lg bg-[#1B243B] hover:bg-[#263354] text-[11px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Numeric Sliders */}
              <div className="rounded-xl bg-[#131A2C] border border-white/10 p-3 space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-300">Base Wave Duration</span>
                    <span className="font-mono text-[#00F5D4] tabular-nums">
                      {customRules.baseWaveDurationSec}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={24}
                    step={1}
                    value={customRules.baseWaveDurationSec}
                    onChange={(e) =>
                      onUpdateCustomRules({
                        ...customRules,
                        baseWaveDurationSec: Number(e.target.value),
                      })
                    }
                    className="w-full accent-[#00F5D4] cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-300">Min Wave Timer</span>
                      <span className="font-mono text-[#FFD166] tabular-nums">
                        {customRules.minWaveDurationSec}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={12}
                      step={1}
                      value={customRules.minWaveDurationSec}
                      onChange={(e) =>
                        onUpdateCustomRules({
                          ...customRules,
                          minWaveDurationSec: Math.min(
                            Number(e.target.value),
                            customRules.baseWaveDurationSec
                          ),
                        })
                      }
                      className="w-full accent-[#FFD166] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-300">Lobby Timer</span>
                      <span className="font-mono text-[#38BDF8] tabular-nums">
                        {customRules.lobbyDurationSec}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={30}
                      step={1}
                      value={customRules.lobbyDurationSec}
                      onChange={(e) =>
                        onUpdateCustomRules({
                          ...customRules,
                          lobbyDurationSec: Number(e.target.value),
                        })
                      }
                      className="w-full accent-[#38BDF8] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-300">Maximum Player Count</span>
                    <span className="font-mono text-white tabular-nums">
                      {customRules.maxPlayers} players
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={customRules.maxPlayers}
                    onChange={(e) =>
                      onUpdateCustomRules({
                        ...customRules,
                        maxPlayers: Number(e.target.value),
                      })
                    }
                    className="w-full accent-[#00F5D4] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/8">
                  <span className="text-[11px] font-bold text-slate-300">
                    Allow Late Join During Wave 1
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={customRules.allowWave1LateJoin}
                    onClick={() =>
                      onUpdateCustomRules({
                        ...customRules,
                        allowWave1LateJoin: !customRules.allowWave1LateJoin,
                      })
                    }
                    className={`w-10 h-5.5 rounded-full transition-colors p-0.5 cursor-pointer ${
                      customRules.allowWave1LateJoin ? 'bg-[#00F5D4]' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-4.5 h-4.5 rounded-full bg-[#05070D] transition-transform ${
                        customRules.allowWave1LateJoin ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Global Word Category Filter */}
              <div className="rounded-xl bg-[#131A2C] border border-white/10 p-3 space-y-2">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                  Global Word Category Lock
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(CATEGORY_LABELS) as GlobalWordCategory[]).map((cat) => {
                    const active = customRules.globalCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          onUpdateCustomRules({ ...customRules, globalCategory: cat })
                        }
                        className={`px-2.5 py-2 rounded-lg text-[11px] font-bold text-left transition-colors cursor-pointer border ${
                          active
                            ? 'bg-[#00F5D4]/15 border-[#00F5D4] text-[#00F5D4]'
                            : 'bg-[#0B0E17] border-white/8 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        {CATEGORY_LABELS[cat]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Globally Banned Letters A-Z Grid */}
              <div className="rounded-xl bg-[#131A2C] border border-white/10 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
                    <Ban className="w-3.5 h-3.5 text-[#FF2A6D]" />
                    <span>Globally Banned Letters</span>
                  </div>
                  {customRules.bannedLetters.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateCustomRules({ ...customRules, bannedLetters: [] })
                      }
                      className="text-[10.5px] font-bold text-[#FF2A6D] hover:underline cursor-pointer"
                    >
                      Clear ({customRules.bannedLetters.length})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-9 gap-1">
                  {ALPHABET.map((letter) => {
                    const banned = customRules.bannedLetters.includes(letter);
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => toggleBannedLetter(letter)}
                        className={`h-7 rounded-md font-mono text-xs font-extrabold transition-colors cursor-pointer ${
                          banned
                            ? 'bg-[#FF2A6D] text-white shadow-[0_0_8px_rgba(255,42,109,0.5)]'
                            : 'bg-[#0B0E17] text-slate-300 hover:bg-[#1C2640] border border-white/8'
                        }`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Enabled Prompt Rule Groups */}
              <div className="rounded-xl bg-[#131A2C] border border-white/10 p-3 space-y-2">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                  Enabled Prompt Rule Categories
                </div>
                <div className="space-y-1.5">
                  {(Object.keys(RULE_GROUP_LABELS) as PromptCategoryGroup[]).map((group) => {
                    const enabled = customRules.enabledRuleGroups[group];
                    return (
                      <button
                        key={group}
                        type="button"
                        onClick={() => toggleRuleGroup(group)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#0B0E17] border border-white/8 hover:border-white/20 text-left cursor-pointer"
                      >
                        <span className="text-[11px] font-semibold text-slate-200">
                          {RULE_GROUP_LABELS[group]}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase ${
                            enabled ? 'text-[#00F5D4]' : 'text-slate-500'
                          }`}
                        >
                          {enabled ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ==================== TAB 4: TIKTOK LIVE BRIDGE ==================== */}
          {activeTab === 'bridge' && (
            <>
              <div className="rounded-xl bg-[#131A2C] border border-white/10 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                    TikFinity / WebSocket Bridge
                  </h3>
                  <span
                    className={`text-[10.5px] font-mono font-extrabold ${
                      wsState === 'CONNECTED'
                        ? 'text-[#00F5D4]'
                        : wsState === 'CONNECTING'
                          ? 'text-[#FFD166]'
                          : wsState === 'ERROR'
                            ? 'text-[#FF2A6D]'
                            : 'text-slate-400'
                    }`}
                  >
                    {wsState}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Connect to a local TikFinity, EulerStream, or TikTok-Live-Connector WebSocket server. Parses standard <code className="text-slate-200">event: &quot;chat&quot;</code> payloads automatically.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={wsUrl}
                    onChange={(e) => onChangeWsUrl(e.target.value)}
                    placeholder="ws://localhost:21213"
                    aria-label="WebSocket URL"
                    className="flex-1 h-9 px-2.5 rounded-lg bg-[#0B0E17] border border-white/12 font-mono text-xs text-white focus:outline-none focus:border-[#00F5D4]"
                  />
                  {wsState === 'CONNECTED' || wsState === 'CONNECTING' ? (
                    <button
                      type="button"
                      onClick={onDisconnectWs}
                      className="h-9 px-3 rounded-lg bg-[#FF2A6D] text-white font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Unplug className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onConnectWs}
                      className="h-9 px-3 rounded-lg bg-[#00F5D4] text-[#05070D] font-extrabold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plug className="w-3.5 h-3.5" />
                      <span>Connect</span>
                    </button>
                  )}
                </div>

                {wsError && (
                  <p className="text-[11px] text-[#FF2A6D] font-medium">{wsError}</p>
                )}

                <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                  Bridge messages received: <span className="text-white font-bold">{wsMessageCount}</span>
                </div>
              </div>

              {/* Global Window Hook Documentation */}
              <div className="rounded-xl bg-[#131A2C] border border-white/10 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                    Global Browser Hook API
                  </h3>
                  <button
                    type="button"
                    onClick={handleCopySnippet}
                    className="text-[11px] font-bold text-[#00F5D4] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSnippet ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <pre className="p-2.5 rounded-lg bg-[#0B0E17] border border-white/8 text-[10.5px] font-mono text-[#00F5D4] overflow-x-auto">
                  {hookSnippet}
                </pre>

                <button
                  type="button"
                  onClick={() => {
                    window.onTikTokChatMessage?.({
                      nickname: 'Live Viewer ' + Math.floor(10 + Math.random() * 89),
                      comment: phase === 'LOBBY' ? 'JOIN' : 'SPARK',
                    });
                  }}
                  className="w-full py-2 rounded-lg bg-[#1C2640] hover:bg-[#263457] text-xs font-bold text-white cursor-pointer"
                >
                  Trigger Test Event via window.onTikTokChatMessage()
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
