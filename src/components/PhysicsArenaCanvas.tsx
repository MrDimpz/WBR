import { useEffect, useRef } from 'react';
import { Crown, RotateCcw } from 'lucide-react';
import { PhysicsArenaEngine } from '../engine/physicsArena';
import { ArenaFeedbackEvent, GamePhase, Player } from '../types/game';

interface PhysicsArenaCanvasProps {
  players: Player[];
  phase: GamePhase;
  timeRemaining: number;
  feedbackEvent: ArenaFeedbackEvent | null;
  champion: Player | null;
  wipeoutMessage: string | null;
}

export function PhysicsArenaCanvas({
  players,
  phase,
  timeRemaining,
  feedbackEvent,
  champion,
  wipeoutMessage,
}: PhysicsArenaCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PhysicsArenaEngine | null>(null);

  // Initialize high-FPS physics engine once
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const engine = new PhysicsArenaEngine(canvas);
    engineRef.current = engine;
    engine.start();

    const resizeObserver = new ResizeObserver(() => {
      engine.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  // Sync phase & countdown urgency into canvas loop
  useEffect(() => {
    engineRef.current?.setPhaseState(phase, timeRemaining);
  }, [phase, timeRemaining]);

  // Sync active players list into physics bodies
  useEffect(() => {
    engineRef.current?.syncPlayers(players);
  }, [players]);

  // Dispatch one-shot visual/physics events (word bubble, explosion, feedback shake, victory burst)
  useEffect(() => {
    if (!feedbackEvent || !engineRef.current) return;
    const engine = engineRef.current;

    switch (feedbackEvent.type) {
      case 'SAFE':
        if (feedbackEvent.playerId && feedbackEvent.text) {
          engine.triggerSafeWord(feedbackEvent.playerId, feedbackEvent.text);
        }
        break;
      case 'TAKEN':
        if (feedbackEvent.playerId) {
          engine.triggerFeedback(feedbackEvent.playerId, 'TAKEN!', '#FFD166');
        }
        break;
      case 'INVALID':
        if (feedbackEvent.playerId) {
          engine.triggerFeedback(feedbackEvent.playerId, 'INVALID!', '#FF2A6D');
        }
        break;
      case 'BANNED':
        if (feedbackEvent.playerId) {
          engine.triggerFeedback(
            feedbackEvent.playerId,
            feedbackEvent.text || 'BANNED!',
            '#FF2A6D'
          );
        }
        break;
      case 'ELIMINATE':
        if (feedbackEvent.playerIds && feedbackEvent.playerIds.length > 0) {
          engine.triggerEliminations(feedbackEvent.playerIds);
        }
        break;
      case 'REVIVE':
        engine.triggerReviveFlash();
        break;
      case 'VICTORY':
        engine.triggerVictoryBurst();
        break;
      default:
        break;
    }
  }, [feedbackEvent]);

  const aliveCount = players.filter((p) => p.alive).length;

  return (
    <div
      ref={containerRef}
      className="h-[48%] w-full shrink-0 px-2 py-0.5 relative overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />

      {/* Empty Lobby Helper Overlay */}
      {phase === 'LOBBY' && aliveCount === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
          <p className="font-display font-black text-2xl uppercase tracking-wide text-white/85">
            ARENA OPEN
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-[230px]">
            Waiting for TikTok chatters or enable Bot Simulator in the Host Drawer below.
          </p>
        </div>
      )}

      {/* Wipeout Revive Dramatic Overlay */}
      {wipeoutMessage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
          <div className="bg-[#0B0E17]/92 border-2 border-[#FFD166] rounded-2xl px-5 py-3.5 text-center shadow-[0_0_32px_rgba(255,209,102,0.45)]">
            <div className="flex items-center justify-center gap-1.5 text-[#FFD166] text-xs font-extrabold uppercase tracking-widest">
              <RotateCcw className="w-4 h-4" />
              <span>EMERGENCY SAVE</span>
            </div>
            <p className="font-display font-black text-2xl text-white uppercase tracking-tight mt-0.5">
              {wipeoutMessage}
            </p>
          </div>
        </div>
      )}

      {/* Round Champion Banner Overlay */}
      {phase === 'VICTORY' && champion && (
        <div className="absolute inset-x-4 bottom-4 flex flex-col items-center pointer-events-none">
          <div className="bg-[#0B0E17]/92 border-2 border-[#FFD166] rounded-xl px-4 py-2 text-center shadow-[0_0_28px_rgba(255,209,102,0.4)]">
            <div className="flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#FFD166]">
              <Crown className="w-3.5 h-3.5" />
              <span>ROUND CHAMPION</span>
            </div>
            <div className="font-display font-black text-[26px] leading-tight text-white tracking-tight">
              {champion.username.replace(/^@/, '')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
