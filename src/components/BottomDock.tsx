import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  RefreshCw,
  ShoppingBag,
  SkipForward,
  SlidersHorizontal,
  Terminal,
  Trash2,
} from 'lucide-react';

export type HostDrawerTab = 'chat' | 'store' | 'rules' | 'bridge';

interface BottomDockProps {
  burnedWords: string[];
  isPaused: boolean;
  controlsCollapsed: boolean;
  coins: number;
  simEnabled: boolean;
  onTogglePause: () => void;
  onSkipPhase: () => void;
  onForceNewPrompt: () => void;
  onClearLeaderboard: () => void;
  onToggleCollapse: () => void;
  onOpenDrawer: (tab: HostDrawerTab) => void;
}

export function BottomDock({
  burnedWords,
  isPaused,
  controlsCollapsed,
  coins,
  simEnabled,
  onTogglePause,
  onSkipPhase,
  onForceNewPrompt,
  onClearLeaderboard,
  onToggleCollapse,
  onOpenDrawer,
}: BottomDockProps) {
  const recentWords = burnedWords.slice(0, 26);

  return (
    <footer className="h-[18%] min-h-[106px] w-full shrink-0 px-3 pt-1.5 pb-2 flex flex-col justify-between border-t border-white/10 bg-[#0B0E17]/96 relative z-20">
      {/* Burned Words Ticker Wall */}
      <div className="flex-1 min-h-0 flex flex-col justify-center overflow-hidden">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          <span>
            BURNED WORDS <span className="text-slate-600">·</span>{' '}
            <span className="font-mono tabular-nums text-[#FF2A6D]">
              {burnedWords.length} TAKEN
            </span>
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono tabular-nums text-[#FFD166]">
              {coins} COINS
            </span>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex items-center gap-0.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={controlsCollapsed ? 'Expand host controls' : 'Collapse host controls'}
            >
              <span>HOST</span>
              {controlsCollapsed ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Smooth Auto-Scrolling Burned Words Marquee (Zero Scrollbar) */}
        <div className="w-full overflow-hidden rounded-lg bg-[#111626] border border-white/8 py-1.5 min-h-[30px] flex items-center relative">
          {recentWords.length === 0 ? (
            <span className="text-[11px] text-slate-500 font-medium px-2.5 truncate">
              Words used in this wave appear here so chat avoids repeats…
            </span>
          ) : (
            <div className="w-full overflow-hidden ticker-fade-mask">
              <div
                className="flex w-max items-center whitespace-nowrap animate-marquee"
                style={{
                  animationDuration: `${Math.max(9, recentWords.length * 1.6)}s`,
                }}
              >
                {[0, 1].map((dupIndex) => (
                  <div
                    key={dupIndex}
                    aria-hidden={dupIndex === 1}
                    className="flex items-center shrink-0 pr-5 gap-2.5"
                  >
                    {recentWords.map((word, idx) => (
                      <span
                        key={`${dupIndex}-${word}-${idx}`}
                        className="inline-flex items-center gap-2.5 shrink-0"
                      >
                        <span
                          className={`font-mono text-[11.5px] font-bold tracking-wide ${
                            idx === 0
                              ? 'text-[#00F5D4]'
                              : idx < 4
                                ? 'text-slate-200'
                                : 'text-slate-400 line-through decoration-[#FF2A6D]/70'
                          }`}
                        >
                          {word}
                        </span>
                        <span className="text-slate-600 text-[10px]">·</span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Streamer Host Control Bar — compact fit for 9:16 width */}
      {!controlsCollapsed && (
        <div className="pt-1.5 flex items-center gap-1 w-full overflow-hidden">
          <button
            type="button"
            onClick={onTogglePause}
            title={isPaused ? 'Resume Auto-Loop' : 'Pause Auto-Loop'}
            className={`h-7 flex-1 min-w-0 px-1.5 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
              isPaused
                ? 'bg-[#FFD166] text-[#05070D]'
                : 'bg-[#161F35] hover:bg-[#1E2A47] text-slate-200 border border-white/10'
            }`}
          >
            {isPaused ? <Play className="w-3 h-3 shrink-0" /> : <Pause className="w-3 h-3 shrink-0" />}
            <span className="truncate">{isPaused ? 'Play' : 'Pause'}</span>
          </button>

          <button
            type="button"
            onClick={onSkipPhase}
            title="Skip Current Wave / Phase"
            className="h-7 flex-1 min-w-0 px-1.5 rounded-md text-[10px] font-bold bg-[#161F35] hover:bg-[#1E2A47] text-slate-200 border border-white/10 flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
          >
            <SkipForward className="w-3 h-3 text-[#00F5D4] shrink-0" />
            <span className="truncate">Skip</span>
          </button>

          <button
            type="button"
            onClick={onForceNewPrompt}
            title="Force New Prompt"
            aria-label="Force New Prompt"
            className="h-7 w-7 rounded-md bg-[#161F35] hover:bg-[#1E2A47] text-slate-200 border border-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3 text-[#FFD166]" />
          </button>

          <button
            type="button"
            onClick={onClearLeaderboard}
            title="Clear Session Hall of Fame"
            aria-label="Clear Session Hall of Fame"
            className="h-7 w-7 rounded-md bg-[#161F35] hover:bg-[#2A1624] text-slate-300 hover:text-[#FF2A6D] border border-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => onOpenDrawer('store')}
            title="Themed Avatar Store"
            className="h-7 flex-1 min-w-0 px-1.5 rounded-md text-[10px] font-bold bg-[#1A1A2E] hover:bg-[#272245] text-[#FFD166] border border-[#FFD166]/30 flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ShoppingBag className="w-3 h-3 shrink-0" />
            <span className="truncate">Store</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDrawer('rules')}
            title="Customize Game Rules"
            className="h-7 flex-1 min-w-0 px-1.5 rounded-md text-[10px] font-bold bg-[#161F35] hover:bg-[#1E2A47] text-slate-200 border border-white/10 flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3 h-3 text-[#00F5D4] shrink-0" />
            <span className="truncate">Rules</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDrawer('chat')}
            title="Open Chat Simulator & TikTok Bridge"
            className="h-7 flex-1 min-w-0 px-1.5 rounded-md text-[10px] font-extrabold bg-[#00F5D4] hover:bg-[#2BFCE0] text-[#05070D] flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Terminal className="w-3 h-3 shrink-0" />
            <span className="truncate">{simEnabled ? 'Chat' : 'Live'}</span>
          </button>
        </div>
      )}
    </footer>
  );
}
