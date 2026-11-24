import { Bomb, Crown, Users, Volume2, VolumeX } from 'lucide-react';
import { generateProfilePicture } from '../data/avatarGenerator';
import { GamePhase, HallOfFameEntry } from '../types/game';

interface TopHeaderProps {
  phase: GamePhase;
  wave: number;
  aliveCount: number;
  totalJoinedCount: number;
  safeCount: number;
  hallOfFame: HallOfFameEntry[];
  muted: boolean;
  onToggleMute: () => void;
}

export function TopHeader({
  phase,
  wave,
  aliveCount,
  totalJoinedCount,
  safeCount,
  hallOfFame,
  muted,
  onToggleMute,
}: TopHeaderProps) {
  const phaseSubtitle =
    phase === 'LOBBY'
      ? 'LOBBY · OPEN ENTRY'
      : phase === 'VICTORY'
        ? `ROUND COMPLETE · WAVE ${wave}`
        : wave >= 5
          ? `WAVE ${wave} · SUDDEN DEATH`
          : wave >= 3
            ? `WAVE ${wave} · ESCALATION`
            : `WAVE ${wave} · WARMUP`;

  const subtitleColor =
    phase === 'VICTORY'
      ? 'text-[#FFD166]'
      : wave >= 5 && phase !== 'LOBBY'
        ? 'text-[#FF2A6D]'
        : 'text-[#00F5D4]';

  const topThree = hallOfFame.slice(0, 3);
  const rankColors = ['text-[#FFD166]', 'text-slate-300', 'text-[#F97316]'];

  return (
    <header className="h-[12%] min-h-[78px] w-full shrink-0 px-3 pt-2 pb-1.5 flex flex-col justify-between border-b border-white/10 bg-[#0B0E17]/95 relative z-20">
      {/* Row 1: Logo + Wave Info | Alive Counter + Mute */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF2A6D] to-[#FF6B35] flex items-center justify-center shrink-0 shadow-[0_0_14px_rgba(255,42,109,0.45)]">
            <Bomb className="w-4.5 h-4.5 text-white stroke-[2.4]" />
          </div>
          <div className="min-w-0 leading-none">
            <h1 className="font-display font-black text-[19px] tracking-tight text-white uppercase leading-none truncate">
              WORD BOMB <span className="text-[#00F5D4]">ROYALE</span>
            </h1>
            <p className={`text-[10.5px] font-bold tracking-wider uppercase mt-0.5 truncate ${subtitleColor}`}>
              {phaseSubtitle}
            </p>
          </div>
        </div>

        {/* Alive Counter & Audio Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right leading-none">
            <div className="flex items-center justify-end gap-1 font-mono tabular-nums font-extrabold text-[14px] text-white">
              <Users className="w-3.5 h-3.5 text-[#00F5D4] shrink-0" />
              <span>{aliveCount}</span>
              <span className="text-slate-500 text-[11px]">/ {Math.max(totalJoinedCount, aliveCount)}</span>
            </div>
            <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mt-0.5 tabular-nums">
              {phase === 'ACTIVE_WAVE' ? (
                <span className="text-[#00F5D4]">{safeCount} SAFE</span>
              ) : (
                <span>ALIVE</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
            title={muted ? 'Unmute Sound' : 'Mute Sound'}
            className="w-8 h-8 rounded-lg border border-white/12 bg-[#141B2D] hover:bg-[#1D2740] text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[#00F5D4]"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-[#FF2A6D]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#00F5D4]" />
            )}
          </button>
        </div>
      </div>

      {/* Row 2: Compact Live Hall of Fame Strip */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/6 min-h-[22px]">
        <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#FFD166] shrink-0">
          <Crown className="w-3 h-3 shrink-0" />
          <span>HOF</span>
        </div>

        {topThree.length === 0 ? (
          <div className="text-[10.5px] text-slate-400 truncate flex-1 text-right">
            Awaiting first champion...
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2.5 overflow-hidden flex-1">
            {topThree.map((entry, idx) => (
              <div
                key={entry.username}
                className="flex items-center gap-1 min-w-0 shrink-0 max-w-[33%]"
              >
                <span className={`font-mono text-[10px] font-extrabold ${rankColors[idx]}`}>
                  #{idx + 1}
                </span>
                <span
                  className="w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 border border-white/25 overflow-hidden bg-[#141B2D]"
                >
                  <img
                    src={entry.avatarUrl || generateProfilePicture(entry.username)}
                    alt={entry.username}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </span>
                <span className="text-[10.5px] font-semibold text-slate-200 truncate max-w-[66px]">
                  {entry.username.replace(/^@/, '')}
                </span>
                <span className="font-mono text-[10px] font-bold text-[#FFD166] tabular-nums shrink-0">
                  {entry.wins}W
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
