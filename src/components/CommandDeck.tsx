import { Ban, Flame, Sparkles, Tag, Timer } from 'lucide-react';
import { CATEGORY_LABELS } from '../data/dictionary';
import { CustomGameRules, GamePhase, PromptRule } from '../types/game';

interface CommandDeckProps {
  phase: GamePhase;
  wave: number;
  currentRule: PromptRule | null;
  spinDisplayRule: PromptRule | null;
  timeRemaining: number;
  totalPhaseDuration: number;
  customRules: CustomGameRules;
  isPaused: boolean;
  wipeoutMessage: string | null;
}

export function CommandDeck({
  phase,
  wave,
  currentRule,
  spinDisplayRule,
  timeRemaining,
  totalPhaseDuration,
  customRules,
  isPaused,
  wipeoutMessage,
}: CommandDeckProps) {
  const ratio =
    totalPhaseDuration > 0
      ? Math.max(0, Math.min(1, timeRemaining / totalPhaseDuration))
      : 0;

  const isActiveWave = phase === 'ACTIVE_WAVE';
  const isDanger = isActiveWave && timeRemaining <= 3.05 && timeRemaining > 0;
  const isWarning = isActiveWave && timeRemaining <= 6.0 && timeRemaining > 3.05;

  // Fuse color shifts green/cyan -> gold/yellow -> flashing hot pink/red
  let fuseBarColor = 'bg-[#00F5D4]';
  let timerTextColor = 'text-[#00F5D4]';
  let sparkColor = '#00F5D4';

  if (phase === 'VICTORY') {
    fuseBarColor = 'bg-[#FFD166]';
    timerTextColor = 'text-[#FFD166]';
    sparkColor = '#FFD166';
  } else if (isDanger || phase === 'ELIMINATION') {
    fuseBarColor = 'bg-[#FF2A6D]';
    timerTextColor = 'text-[#FF2A6D]';
    sparkColor = '#FF2A6D';
  } else if (isWarning) {
    fuseBarColor = 'bg-[#FFD166]';
    timerTextColor = 'text-[#FFD166]';
    sparkColor = '#FFD166';
  } else if (phase === 'LOBBY') {
    fuseBarColor = 'bg-[#38BDF8]';
    timerTextColor = 'text-[#38BDF8]';
    sparkColor = '#38BDF8';
  }

  const displayedRule = phase === 'WAVE_INTRO' ? spinDisplayRule ?? currentRule : currentRule;

  const hasModifiers =
    customRules.bannedLetters.length > 0 || customRules.globalCategory !== 'ALL';

  const tierLabel =
    displayedRule?.tier === 3
      ? 'TIER 3 · SUDDEN DEATH'
      : displayedRule?.tier === 2
        ? 'TIER 2 · MEDIUM'
        : 'TIER 1 · FAST';

  return (
    <section className="h-[22%] min-h-[138px] w-full shrink-0 px-3 py-2 flex flex-col justify-between gap-1.5 relative z-20">
      {/* Main Rule / Prompt Card */}
      <div
        className={`flex-1 rounded-xl border px-3.5 py-2 flex flex-col justify-center items-center text-center relative overflow-hidden transition-colors duration-150 ${
          isDanger
            ? 'bg-[#1F0F1B] border-[#FF2A6D] animate-danger-pulse'
            : phase === 'VICTORY'
              ? 'bg-[#1D180F] border-[#FFD166]/70'
              : 'bg-[#121829]/95 border-white/14'
        }`}
      >
        {/* Top micro-meta row (clean unboxed text with · separators) */}
        <div className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
          <span className="truncate">
            {phase === 'LOBBY'
              ? 'CHAT TO ENTER ARENA'
              : phase === 'WAVE_INTRO'
                ? `LOCKING WAVE ${wave} RULE...`
                : phase === 'ELIMINATION'
                  ? 'DETONATING UNSAFE PLAYERS'
                  : phase === 'VICTORY'
                    ? 'SOLE SURVIVOR CROWNED'
                    : tierLabel}
          </span>
          {isPaused ? (
            <span className="text-[#FFD166] shrink-0">PAUSED</span>
          ) : (
            <span className="font-mono tabular-nums text-slate-300 shrink-0">
              {phase === 'ACTIVE_WAVE' ? '1 WORD · NO REPEATS' : `MAX ${customRules.maxPlayers}`}
            </span>
          )}
        </div>

        {/* Giant Unmistakable Rule Prompt */}
        {wipeoutMessage ? (
          <div className="font-display font-black text-[23px] sm:text-[26px] leading-tight tracking-tight text-[#FFD166] uppercase">
            {wipeoutMessage}
          </div>
        ) : phase === 'LOBBY' ? (
          <div className="flex flex-col items-center">
            <div className="font-display font-black text-[25px] sm:text-[28px] leading-none tracking-tight text-white uppercase">
              TYPE <span className="text-[#00F5D4]">"JOIN"</span> OR ANY WORD!
            </div>
            <p className="text-[11px] font-semibold text-slate-300 mt-1">
              Comment in TikTok Live chat to drop your avatar in the arena
            </p>
          </div>
        ) : phase === 'VICTORY' ? (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 font-display font-black text-[27px] leading-none tracking-tight text-[#FFD166] uppercase">
              <Sparkles className="w-5 h-5 shrink-0" />
              <span>CHAMPION CROWNED!</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-300 mt-1">
              Next round lobby opens automatically
            </p>
          </div>
        ) : displayedRule ? (
          <div className="flex flex-col items-center w-full">
            <div
              className={`font-display font-black text-[27px] sm:text-[31px] leading-none tracking-tight uppercase transition-transform duration-75 ${
                phase === 'WAVE_INTRO'
                  ? 'text-[#FFD166] scale-[1.03]'
                  : isDanger
                    ? 'text-white'
                    : 'text-white'
              }`}
            >
              {displayedRule.label}
            </div>
            {displayedRule.sublabel && (
              <p className="text-[11px] font-medium text-slate-300 mt-1 truncate max-w-full">
                {displayedRule.sublabel}
              </p>
            )}
          </div>
        ) : null}

        {/* Active Custom Rules Modifiers Strip (only shown if streamer customized banned letters or category) */}
        {hasModifiers && (
          <div className="mt-1 flex items-center justify-center gap-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-300 flex-wrap">
            {customRules.globalCategory !== 'ALL' && (
              <span className="flex items-center gap-1 text-[#00F5D4]">
                <Tag className="w-3 h-3" />
                {CATEGORY_LABELS[customRules.globalCategory]}
              </span>
            )}
            {customRules.bannedLetters.length > 0 && (
              <span className="flex items-center gap-1 text-[#FF2A6D]">
                <Ban className="w-3 h-3" />
                BANNED: {customRules.bannedLetters.join(', ')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* High-Tension Fuse Countdown Bar */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex items-center gap-1 shrink-0 min-w-[66px]">
          {isDanger ? (
            <Flame className="w-4 h-4 text-[#FF2A6D] shrink-0" />
          ) : (
            <Timer className={`w-4 h-4 shrink-0 ${timerTextColor}`} />
          )}
          <span
            className={`font-mono tabular-nums font-extrabold text-[17px] leading-none ${timerTextColor}`}
          >
            {Math.max(0, timeRemaining).toFixed(1)}s
          </span>
        </div>

        {/* Fuse track */}
        <div className="flex-1 h-3 rounded-full bg-[#151D31] border border-white/10 relative overflow-visible">
          <div
            className={`h-full rounded-full transition-[width,background-color] duration-75 ${fuseBarColor}`}
            style={{
              width: `${Math.max(0, Math.min(100, ratio * 100))}%`,
              boxShadow: `0 0 12px ${sparkColor}`,
            }}
          />
          {/* Sizzling spark tip */}
          {ratio > 0.01 && !isPaused && (
            <span
              className="w-3.5 h-3.5 rounded-full absolute top-1/2 -ml-1.5 pointer-events-none animate-fuse-spark"
              style={{
                left: `${Math.min(100, ratio * 100)}%`,
                backgroundColor: '#FFFFFF',
                boxShadow: `0 0 10px 3px ${sparkColor}`,
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
