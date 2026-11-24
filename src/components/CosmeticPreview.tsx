import { generateProfilePicture } from '../data/avatarGenerator';
import { CosmeticItem, PlayerLoadout } from '../types/game';

interface CosmeticIconProps {
  item: CosmeticItem;
}

export function CosmeticIcon({ item }: CosmeticIconProps) {
  const accent = item.accentColor;

  if (item.category === 'hat') {
    return (
      <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" aria-hidden="true">
        <circle cx="24" cy="30" r="12" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
        {item.id === 'none' && (
          <line x1="16" y1="38" x2="32" y2="22" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
        )}
        {item.id === 'neon_crown' && (
          <path
            d="M14 20 L12 10 L19 15 L24 7 L29 15 L36 10 L34 20 Z"
            fill="#FFD166"
            stroke="#92400E"
            strokeWidth="1.4"
          />
        )}
        {item.id === 'cyber_horns' && (
          <g fill="#FF2A6D" stroke="#FFFFFF" strokeWidth="1">
            <path d="M15 21 Q9 14 14 7 Q16 14 20 19 Z" />
            <path d="M33 21 Q39 14 34 7 Q32 14 28 19 Z" />
          </g>
        )}
        {item.id === 'wizard_hat' && (
          <g>
            <ellipse cx="24" cy="20" rx="14" ry="3.5" fill="#7C3AED" stroke="#DDD6FE" strokeWidth="1.2" />
            <path d="M16 20 L25 5 L32 20 Z" fill="#7C3AED" stroke="#DDD6FE" strokeWidth="1.2" />
            <circle cx="24" cy="14" r="2" fill="#FFD166" />
          </g>
        )}
        {item.id === 'arcade_cap' && (
          <g>
            <path d="M13 22 A11 11 0 0 1 35 22 Z" fill="#00F5D4" stroke="#0B0E17" strokeWidth="1.3" />
            <rect x="29" y="19" width="11" height="3.5" rx="1.5" fill="#FF2A6D" />
          </g>
        )}
        {item.id === 'plasma_halo' && (
          <ellipse cx="24" cy="12" rx="12" ry="3.5" fill="none" stroke="#00F5D4" strokeWidth="2.8" />
        )}
        {item.id === 'streamer_headset' && (
          <g>
            <path d="M11 30 A13 13 0 0 1 37 30" fill="none" stroke="#94A3B8" strokeWidth="2.5" />
            <rect x="8" y="25" width="4.5" height="10" rx="2" fill="#FF2A6D" stroke="#00F5D4" strokeWidth="1" />
            <rect x="35.5" y="25" width="4.5" height="10" rx="2" fill="#FF2A6D" stroke="#00F5D4" strokeWidth="1" />
          </g>
        )}
        {item.id === 'pixel_visor' && (
          <g>
            <rect x="13" y="26" width="22" height="6" rx="1" fill="#05070D" />
            <rect x="15" y="27.5" width="7" height="3" fill="#00F5D4" />
            <rect x="26" y="27.5" width="7" height="3" fill="#00F5D4" />
          </g>
        )}
      </svg>
    );
  }

  if (item.category === 'trail') {
    return (
      <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" aria-hidden="true">
        {item.id === 'none' ? (
          <circle cx="24" cy="24" r="9" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" strokeDasharray="3 3" />
        ) : item.id === 'glitch_pixels' ? (
          <g>
            <rect x="7" y="26" width="5" height="5" fill="#38BDF8" opacity="0.35" />
            <rect x="14" y="21" width="6" height="6" fill="#00F5D4" opacity="0.6" />
            <rect x="22" y="18" width="7" height="7" fill="#38BDF8" opacity="0.85" />
            <circle cx="34" cy="19" r="7" fill="#00F5D4" />
          </g>
        ) : item.id === 'prism_ribbon' ? (
          <g>
            <circle cx="10" cy="30" r="4" fill="#A78BFA" opacity="0.55" />
            <circle cx="17" cy="26" r="5" fill="#F472B6" opacity="0.7" />
            <circle cx="25" cy="22" r="6" fill="#FFD166" opacity="0.85" />
            <circle cx="34" cy="18" r="7.5" fill="#00F5D4" />
          </g>
        ) : (
          <g>
            <circle cx="10" cy="31" r="3.5" fill={accent} opacity="0.28" />
            <circle cx="17" cy="27" r="4.8" fill={accent} opacity="0.5" />
            <circle cx="25" cy="23" r="6" fill={accent} opacity="0.78" />
            <circle cx="34" cy="18" r="7.5" fill={accent} />
          </g>
        )}
      </svg>
    );
  }

  // Elimination effect icons
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10 shrink-0" aria-hidden="true">
      {item.id === 'lightning_bolt' ? (
        <path
          d="M27 7 L15 26 H23 L20 41 L34 21 H25 Z"
          fill="#38BDF8"
          stroke="#FFFFFF"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      ) : item.id === 'void_implosion' ? (
        <g>
          <circle cx="24" cy="24" r="15" fill="none" stroke="#A78BFA" strokeWidth="2" strokeDasharray="4 3" />
          <circle cx="24" cy="24" r="9" fill="#1E1B4B" stroke="#FF2A6D" strokeWidth="2" />
          <circle cx="24" cy="24" r="3.5" fill="#FFFFFF" />
        </g>
      ) : item.id === 'pixel_shatter' ? (
        <g>
          <rect x="10" y="10" width="7" height="7" fill="#00F5D4" />
          <rect x="29" y="9" width="6" height="6" fill="#38BDF8" />
          <rect x="20" y="20" width="8" height="8" fill="#FFFFFF" />
          <rect x="11" y="30" width="6" height="6" fill="#38BDF8" />
          <rect x="30" y="29" width="7" height="7" fill="#00F5D4" />
        </g>
      ) : item.id === 'party_confetti' ? (
        <g>
          <rect x="11" y="12" width="8" height="3.5" rx="1" transform="rotate(-25 15 14)" fill="#FF2A6D" />
          <rect x="28" y="11" width="8" height="3.5" rx="1" transform="rotate(30 32 13)" fill="#00F5D4" />
          <rect x="19" y="22" width="9" height="4" rx="1" transform="rotate(15 24 24)" fill="#FFD166" />
          <rect x="11" y="31" width="8" height="3.5" rx="1" transform="rotate(35 15 33)" fill="#A78BFA" />
          <rect x="29" y="32" width="8" height="3.5" rx="1" transform="rotate(-20 33 34)" fill="#38BDF8" />
        </g>
      ) : item.id === 'plasma_supernova' ? (
        <g>
          <circle cx="24" cy="24" r="16" fill="none" stroke="#FF2A6D" strokeWidth="1.5" opacity="0.65" />
          <circle cx="24" cy="24" r="11" fill="none" stroke="#FFD166" strokeWidth="2.2" />
          <path d="M24 12 L26.5 21.5 L36 24 L26.5 26.5 L24 36 L21.5 26.5 L12 24 L21.5 21.5 Z" fill="#FFFFFF" />
        </g>
      ) : (
        <g>
          <circle cx="24" cy="24" r="12" fill="none" stroke="#FF2A6D" strokeWidth="2.2" />
          <path d="M24 8 V14 M24 34 V40 M8 24 H14 M34 24 H40 M13 13 L17 17 M31 31 L35 35 M35 13 L31 17 M17 31 L13 35" stroke="#FFD166" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

interface LoadoutSummaryBadgeProps {
  username: string;
  loadout: PlayerLoadout;
}

export function LoadoutPreviewHeader({ username, loadout }: LoadoutSummaryBadgeProps) {
  const displayName = username.replace(/^@/, '').trim() || 'Player';
  const avatarSrc = generateProfilePicture(displayName);
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#111728] border border-white/10">
      <div className="relative w-12 h-12 rounded-full bg-[#141B2D] flex items-center justify-center border-2 border-[#00F5D4] shrink-0">
        <img
          src={avatarSrc}
          alt={displayName}
          className="w-full h-full rounded-full object-cover"
        />
        {loadout.hat !== 'none' && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#FFD166] text-[#05070D] text-[9px] font-black flex items-center justify-center border border-[#0B0E17]">
            H
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-extrabold text-white truncate">
          {displayName}
        </div>
        <div className="text-[10.5px] text-slate-400 truncate mt-0.5">
          Hat: <span className="text-[#FFD166] font-semibold">{loadout.hat.replace(/_/g, ' ')}</span>
          {' · '}
          Trail: <span className="text-[#00F5D4] font-semibold">{loadout.trail.replace(/_/g, ' ')}</span>
        </div>
        <div className="text-[10.5px] text-slate-400 truncate">
          KO: <span className="text-[#FF2A6D] font-semibold">{loadout.elimEffect.replace(/_/g, ' ')}</span>
        </div>
      </div>
    </div>
  );
}
