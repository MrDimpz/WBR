import { generateProfilePicture } from '../data/avatarGenerator';
import {
  ElimEffectId,
  GamePhase,
  HatCosmeticId,
  Player,
  TrailCosmeticId,
} from '../types/game';

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

interface PhysicsBody {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  targetRadius: number;
  scale: number;
  shakeTimer: number;
  safePopTimer: number;
  wordBubble?: {
    word: string;
    timer: number;
    maxTimer: number;
  };
  trail: TrailPoint[];
  trailTick: number;
  player: Player;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: 'circle' | 'square' | 'confetti' | 'star' | 'spark';
  rotation: number;
  vRot: number;
  gravity: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  lineWidth: number;
  life: number;
  maxLife: number;
  implode?: boolean;
}

interface LightningBolt {
  points: Array<{ x: number; y: number }>;
  color: string;
  life: number;
  maxLife: number;
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  bgColor?: string;
  life: number;
  maxLife: number;
  scale: number;
}

export class PhysicsArenaEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 400;
  private height: number = 400;
  private dpr: number = 1;

  private bodies: Map<string, PhysicsBody> = new Map();
  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private lightningBolts: LightningBolt[] = [];
  private floatingTexts: FloatingText[] = [];
  private imageCache: Map<string, HTMLImageElement | 'error'> = new Map();

  private phase: GamePhase = 'LOBBY';
  private timeRemaining: number = 15;
  private isUrgent: boolean = false;
  private screenShake: number = 0;
  private elapsedTime: number = 0;
  private confettiCooldown: number = 0;

  private rafId: number | null = null;
  private lastFrameTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to acquire 2D canvas context');
    }
    this.ctx = context;
    this.resize();
  }

  public start(): void {
    if (this.rafId !== null) return;
    this.lastFrameTime = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) / 1000));
      this.lastFrameTime = now;
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  public setPhaseState(phase: GamePhase, timeRemaining: number): void {
    this.phase = phase;
    this.timeRemaining = timeRemaining;
    this.isUrgent = phase === 'ACTIVE_WAVE' && timeRemaining <= 3.1 && timeRemaining > 0;
  }

  public syncPlayers(players: Player[]): void {
    const alivePlayers = players.filter((p) => p.alive);
    const activeIds = new Set(alivePlayers.map((p) => p.id));

    // Remove non-alive bodies (note: triggerElimination should be called before removing them for explosions)
    for (const id of Array.from(this.bodies.keys())) {
      if (!activeIds.has(id)) {
        this.bodies.delete(id);
      }
    }

    const baseRadius = this.computeTargetRadius(alivePlayers.length);
    const pad = Math.max(26, baseRadius + 14);

    for (const player of alivePlayers) {
      const existing = this.bodies.get(player.id);
      if (existing) {
        existing.player = player;
        existing.targetRadius = baseRadius;
      } else {
        // Spawn organically near center/upper arena with gentle velocity
        const spawnX = pad + Math.random() * Math.max(20, this.width - pad * 2);
        const spawnY = pad + Math.random() * Math.max(20, this.height - pad * 2);
        const angle = Math.random() * Math.PI * 2;
        const speed = 28 + Math.random() * 44;

        this.bodies.set(player.id, {
          id: player.id,
          x: spawnX,
          y: spawnY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: baseRadius * 0.25,
          targetRadius: baseRadius,
          scale: 0.2,
          shakeTimer: 0,
          safePopTimer: 0,
          trail: [],
          trailTick: 0,
          player,
        });

        // Preload player's profile picture (or offline illustrated fallback avatar)
        const primaryUrl = player.avatarUrl || generateProfilePicture(player.username);
        if (!this.imageCache.has(primaryUrl)) {
          this.preloadAvatar(primaryUrl);
        }
        const fallbackUrl = generateProfilePicture(player.username);
        if (fallbackUrl !== primaryUrl && !this.imageCache.has(fallbackUrl)) {
          this.preloadAvatar(fallbackUrl);
        }

        // Join burst particles
        this.spawnSimpleSparks(spawnX, spawnY, player.color, 7);
      }
    }
  }

  private preloadAvatar(url: string): void {
    const img = new Image();
    if (!url.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
    }
    img.onload = () => {
      this.imageCache.set(url, img);
    };
    img.onerror = () => {
      this.imageCache.set(url, 'error');
    };
    img.src = url;
  }

  private computeTargetRadius(count: number): number {
    const minDim = Math.min(this.width, this.height);
    const scaleFactor = minDim / 380;
    let base: number;
    if (count <= 1) base = 36;
    else if (count <= 6) base = 28;
    else if (count <= 16) base = 23;
    else if (count <= 32) base = 19;
    else if (count <= 55) base = 16;
    else if (count <= 80) base = 14;
    else base = 12.5;
    return Math.max(11, Math.min(38, base * scaleFactor));
  }

  public triggerSafeWord(playerId: string, word: string): void {
    const body = this.bodies.get(playerId);
    if (!body) return;

    // Bounce avatar upward enthusiastically!
    body.vy = -170 - Math.random() * 60;
    body.vx += (Math.random() - 0.5) * 90;
    body.safePopTimer = 0.45;
    body.wordBubble = {
      word,
      timer: 2.2,
      maxTimer: 2.2,
    };

    this.spawnSimpleSparks(body.x, body.y, '#00F5D4', 12);
    this.shockwaves.push({
      x: body.x,
      y: body.y,
      radius: body.radius * 0.8,
      maxRadius: body.radius * 2.5,
      color: '#00F5D4',
      lineWidth: 2.5,
      life: 0.35,
      maxLife: 0.35,
    });
  }

  public triggerFeedback(
    playerId: string,
    text: string,
    color: string = '#FF2A6D'
  ): void {
    const body = this.bodies.get(playerId);
    if (!body) return;

    body.shakeTimer = 0.42;
    this.floatingTexts.push({
      x: body.x,
      y: body.y - body.radius - 10,
      vy: -42,
      text,
      color,
      bgColor: 'rgba(11, 14, 23, 0.88)',
      life: 1.05,
      maxLife: 1.05,
      scale: 1,
    });
  }

  public triggerEliminations(eliminatedIds: string[]): void {
    if (eliminatedIds.length === 0) return;

    this.screenShake = Math.min(18, 7 + eliminatedIds.length * 0.45);

    const blastOrigins: Array<{ x: number; y: number }> = [];

    for (const id of eliminatedIds) {
      const body = this.bodies.get(id);
      if (!body) continue;
      blastOrigins.push({ x: body.x, y: body.y });
      this.spawnEliminationEffect(
        body.x,
        body.y,
        body.radius,
        body.player.color,
        body.player.loadout.elimEffect
      );
      this.bodies.delete(id);
    }

    // Apply radial shockwave knockback to remaining survivors
    for (const survivor of this.bodies.values()) {
      for (const origin of blastOrigins) {
        const dx = survivor.x - origin.x;
        const dy = survivor.y - origin.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 150) {
          const force = ((150 - dist) / 150) * 180;
          survivor.vx += (dx / dist) * force;
          survivor.vy += (dy / dist) * force;
        }
      }
    }
  }

  public triggerReviveFlash(): void {
    this.screenShake = 10;
    this.shockwaves.push({
      x: this.width / 2,
      y: this.height / 2,
      radius: 10,
      maxRadius: Math.max(this.width, this.height) * 0.85,
      color: '#FFD166',
      lineWidth: 5,
      life: 0.75,
      maxLife: 0.75,
    });
  }

  public triggerVictoryBurst(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    this.spawnConfettiCannon(cx, cy - 30, 65);
    this.shockwaves.push({
      x: cx,
      y: cy,
      radius: 16,
      maxRadius: Math.min(this.width, this.height) * 0.6,
      color: '#FFD166',
      lineWidth: 4,
      life: 0.7,
      maxLife: 0.7,
    });
  }

  private spawnSimpleSparks(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.2 + Math.random() * 2.8,
        color,
        alpha: 1,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        shape: 'spark',
        rotation: angle,
        vRot: 0,
        gravity: 90,
      });
    }
  }

  private spawnConfettiCannon(x: number, y: number, count: number): void {
    const colors = ['#00F5D4', '#FF2A6D', '#FFD166', '#38BDF8', '#A78BFA', '#FFFFFF'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 260;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 90,
        size: 4 + Math.random() * 4.5,
        color: colors[i % colors.length],
        alpha: 1,
        life: 1.1 + Math.random() * 0.9,
        maxLife: 2.0,
        shape: 'confetti',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 14,
        gravity: 230,
      });
    }
  }

  private spawnEliminationEffect(
    x: number,
    y: number,
    radius: number,
    playerColor: string,
    effect: ElimEffectId
  ): void {
    switch (effect) {
      case 'party_confetti': {
        this.spawnConfettiCannon(x, y, 26);
        this.shockwaves.push({
          x,
          y,
          radius: radius * 0.5,
          maxRadius: radius * 3.2,
          color: '#FFD166',
          lineWidth: 3,
          life: 0.42,
          maxLife: 0.42,
        });
        break;
      }

      case 'pixel_shatter': {
        const colors = ['#00F5D4', '#38BDF8', playerColor, '#FFFFFF'];
        for (let i = 0; i < 22; i++) {
          const angle = (Math.PI * 2 * i) / 22 + (Math.random() - 0.5) * 0.25;
          const speed = 90 + Math.random() * 190;
          this.particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 5 + Math.random() * 4,
            color: colors[i % colors.length],
            alpha: 1,
            life: 0.65 + Math.random() * 0.35,
            maxLife: 1.0,
            shape: 'square',
            rotation: 0,
            vRot: (Math.random() - 0.5) * 8,
            gravity: 210,
          });
        }
        this.shockwaves.push({
          x,
          y,
          radius: radius * 0.6,
          maxRadius: radius * 2.9,
          color: '#00F5D4',
          lineWidth: 3,
          life: 0.35,
          maxLife: 0.35,
        });
        break;
      }

      case 'lightning_bolt': {
        for (let b = 0; b < 5; b++) {
          const angle = (Math.PI * 2 * b) / 5 + Math.random() * 0.5;
          const pts: Array<{ x: number; y: number }> = [{ x, y }];
          let cx = x;
          let cy = y;
          for (let seg = 1; seg <= 4; seg++) {
            const dist = seg * (radius * 0.95);
            const jitter = (Math.random() - 0.5) * 22;
            cx = x + Math.cos(angle) * dist + Math.cos(angle + Math.PI / 2) * jitter;
            cy = y + Math.sin(angle) * dist + Math.sin(angle + Math.PI / 2) * jitter;
            pts.push({ x: cx, y: cy });
          }
          this.lightningBolts.push({
            points: pts,
            color: b % 2 === 0 ? '#38BDF8' : '#FFFFFF',
            life: 0.32,
            maxLife: 0.32,
          });
        }
        this.spawnSimpleSparks(x, y, '#38BDF8', 18);
        this.shockwaves.push({
          x,
          y,
          radius: radius * 0.4,
          maxRadius: radius * 3.5,
          color: '#38BDF8',
          lineWidth: 3.5,
          life: 0.36,
          maxLife: 0.36,
        });
        break;
      }

      case 'void_implosion': {
        this.shockwaves.push({
          x,
          y,
          radius: radius * 3.4,
          maxRadius: 4,
          color: '#A78BFA',
          lineWidth: 4,
          life: 0.32,
          maxLife: 0.32,
          implode: true,
        });
        this.shockwaves.push({
          x,
          y,
          radius: radius * 0.3,
          maxRadius: radius * 3.2,
          color: '#FF2A6D',
          lineWidth: 2.5,
          life: 0.48,
          maxLife: 0.48,
        });
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 70 + Math.random() * 170;
          this.particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3.5 + Math.random() * 3.5,
            color: i % 2 === 0 ? '#A78BFA' : '#1E1B4B',
            alpha: 1,
            life: 0.65 + Math.random() * 0.3,
            maxLife: 0.95,
            shape: 'circle',
            rotation: 0,
            vRot: 0,
            gravity: 20,
          });
        }
        break;
      }

      case 'plasma_supernova': {
        [1, 1.6, 2.3].forEach((mult, idx) => {
          this.shockwaves.push({
            x,
            y,
            radius: radius * 0.4,
            maxRadius: radius * 2.2 * mult,
            color: idx === 0 ? '#FFFFFF' : idx === 1 ? '#FFD166' : '#FF2A6D',
            lineWidth: 4 - idx,
            life: 0.38 + idx * 0.12,
            maxLife: 0.38 + idx * 0.12,
          });
        });
        for (let i = 0; i < 24; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 100 + Math.random() * 220;
          this.particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 4 + Math.random() * 3.5,
            color: i % 2 === 0 ? '#FFD166' : '#FFF7ED',
            alpha: 1,
            life: 0.7 + Math.random() * 0.35,
            maxLife: 1.05,
            shape: 'star',
            rotation: Math.random() * Math.PI,
            vRot: (Math.random() - 0.5) * 10,
            gravity: 60,
          });
        }
        break;
      }

      case 'classic_sparks':
      default: {
        const colors = ['#FF2A6D', '#FFD166', '#FF6B35', playerColor];
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 80 + Math.random() * 210;
          this.particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 3.5,
            color: colors[i % colors.length],
            alpha: 1,
            life: 0.55 + Math.random() * 0.4,
            maxLife: 0.95,
            shape: i % 3 === 0 ? 'confetti' : 'spark',
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 12,
            gravity: 190,
          });
        }
        this.shockwaves.push({
          x,
          y,
          radius: radius * 0.6,
          maxRadius: radius * 3.0,
          color: '#FF2A6D',
          lineWidth: 3.5,
          life: 0.38,
          maxLife: 0.38,
        });
        break;
      }
    }
  }

  private update(dt: number): void {
    this.elapsedTime += dt;

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 38);
    }

    const bodyArray = Array.from(this.bodies.values());
    const padX = 18;
    const padTop = 24;
    const padBottom = 26;

    // Victory mode: champion glides smoothly to center & grows 3x
    if (this.phase === 'VICTORY' && bodyArray.length === 1) {
      const champ = bodyArray[0];
      const targetX = this.width / 2;
      const targetY = this.height / 2 + 10;
      champ.x += (targetX - champ.x) * Math.min(1, dt * 6);
      champ.y += (targetY - champ.y) * Math.min(1, dt * 6);
      const champRadius = Math.min(this.width, this.height) * 0.165;
      champ.radius += (champRadius - champ.radius) * Math.min(1, dt * 5);
      champ.scale += (1 - champ.scale) * Math.min(1, dt * 7);
      champ.vx = 0;
      champ.vy = 0;

      this.confettiCooldown -= dt;
      if (this.confettiCooldown <= 0) {
        this.confettiCooldown = 0.55;
        this.spawnConfettiCannon(
          this.width * (0.2 + Math.random() * 0.6),
          this.height * 0.2,
          16
        );
      }
    } else {
      // Standard 2D physics simulation
      for (const b of bodyArray) {
        b.radius += (b.targetRadius - b.radius) * Math.min(1, dt * 8);
        b.scale += (1 - b.scale) * Math.min(1, dt * 10);

        if (b.shakeTimer > 0) b.shakeTimer = Math.max(0, b.shakeTimer - dt);
        if (b.safePopTimer > 0) b.safePopTimer = Math.max(0, b.safePopTimer - dt);
        if (b.wordBubble) {
          b.wordBubble.timer -= dt;
          if (b.wordBubble.timer <= 0) {
            b.wordBubble = undefined;
          }
        }

        // Gentle organic float / drift impulse so the arena always feels alive
        const jitterScale =
          this.isUrgent && !b.player.safe ? 120 : 24;
        b.vx += (Math.random() - 0.5) * jitterScale * dt;
        b.vy += (Math.random() - 0.5) * jitterScale * dt;

        // Mild center gravity in Lobby/Active so avatars stay clustered nicely inside stadium
        const cx = this.width / 2;
        const cy = this.height / 2;
        b.vx += (cx - b.x) * 0.12 * dt;
        b.vy += (cy - b.y) * 0.12 * dt;

        // Velocity damping & speed clamping
        const damping = Math.pow(0.985, dt * 60);
        b.vx *= damping;
        b.vy *= damping;

        const maxSpeed = b.safePopTimer > 0 ? 280 : 125;
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > maxSpeed) {
          b.vx = (b.vx / speed) * maxSpeed;
          b.vy = (b.vy / speed) * maxSpeed;
        } else if (speed < 18) {
          const ang = Math.random() * Math.PI * 2;
          b.vx += Math.cos(ang) * 14 * dt;
          b.vy += Math.sin(ang) * 14 * dt;
        }

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // Stadium wall collisions
        const minX = padX + b.radius;
        const maxX = this.width - padX - b.radius;
        const minY = padTop + b.radius;
        const maxY = this.height - padBottom - b.radius;

        if (b.x < minX) {
          b.x = minX;
          b.vx = Math.abs(b.vx) * 0.88;
        } else if (b.x > maxX) {
          b.x = maxX;
          b.vx = -Math.abs(b.vx) * 0.88;
        }

        if (b.y < minY) {
          b.y = minY;
          b.vy = Math.abs(b.vy) * 0.88;
        } else if (b.y > maxY) {
          b.y = maxY;
          b.vy = -Math.abs(b.vy) * 0.88;
        }

        // Update cosmetic trail points
        if (b.player.loadout.trail !== 'none') {
          b.trailTick += dt;
          if (b.trailTick >= 0.032) {
            b.trailTick = 0;
            b.trail.push({ x: b.x, y: b.y, age: 0 });
            if (b.trail.length > 10) b.trail.shift();
          }
          for (let t = b.trail.length - 1; t >= 0; t--) {
            b.trail[t].age += dt;
            if (b.trail[t].age > 0.36) {
              b.trail.splice(t, 1);
            }
          }
        } else if (b.trail.length > 0) {
          b.trail.length = 0;
        }
      }

      // Circle-to-circle elastic collision resolution
      const n = bodyArray.length;
      for (let i = 0; i < n; i++) {
        const a = bodyArray[i];
        for (let j = i + 1; j < n; j++) {
          const b = bodyArray[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const minDist = a.radius + b.radius + 5;
          const distSq = dx * dx + dy * dy;

          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.01;
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minDist - dist) * 0.5;

            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;

            // Relative velocity along normal
            const rvx = b.vx - a.vx;
            const rvy = b.vy - a.vy;
            const velAlongNormal = rvx * nx + rvy * ny;
            if (velAlongNormal < 0) {
              const restitution = 0.78;
              const impulse = (-(1 + restitution) * velAlongNormal) / 2;
              a.vx -= impulse * nx;
              a.vy -= impulse * ny;
              b.vx += impulse * nx;
              b.vy += impulse * ny;
            }
          }
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      p.rotation += p.vRot * dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      const progress = 1 - s.life / s.maxLife;
      if (s.implode) {
        s.radius = s.radius + (s.maxRadius - s.radius) * Math.min(1, dt * 10);
      } else {
        s.radius = s.maxRadius * (0.18 + 0.82 * Math.sqrt(progress));
      }
    }

    // Update lightning bolts
    for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
      this.lightningBolts[i].life -= dt;
      if (this.lightningBolts[i].life <= 0) {
        this.lightningBolts.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      ft.y += ft.vy * dt;
      ft.vy *= 0.96;
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    // Apply screen shake if active
    if (this.screenShake > 0.2) {
      const sx = (Math.random() - 0.5) * this.screenShake * 2;
      const sy = (Math.random() - 0.5) * this.screenShake * 2;
      ctx.translate(sx, sy);
    }

    this.drawStadiumFloor(ctx);

    // Draw Victory Spotlight Rays behind champion
    if (this.phase === 'VICTORY' && this.bodies.size === 1) {
      this.drawVictorySpotlight(ctx);
    }

    // Draw shockwaves
    for (const s of this.shockwaves) {
      const alpha = Math.max(0, s.life / s.maxLife);
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(1, s.radius), 0, Math.PI * 2);
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = alpha * 0.85;
      ctx.lineWidth = s.lineWidth * alpha;
      ctx.stroke();
      ctx.restore();
    }

    // Draw avatar trails first (underneath avatars)
    const bodyArray = Array.from(this.bodies.values());
    for (const b of bodyArray) {
      if (b.player.loadout.trail !== 'none' && b.trail.length > 1) {
        this.drawAvatarTrail(ctx, b, b.player.loadout.trail);
      }
    }

    // Draw avatars (unsafe first, safe on top so word bubbles stand out)
    bodyArray.sort((a, b) => Number(a.player.safe) - Number(b.player.safe));
    for (const b of bodyArray) {
      this.drawAvatar(ctx, b);
    }

    // Draw word bubbles on very top layer so they are never occluded by neighbors
    for (const b of bodyArray) {
      if (b.wordBubble) {
        this.drawWordBubble(ctx, b);
      }
    }

    // Draw lightning bolts
    for (const bolt of this.lightningBolts) {
      const alpha = bolt.life / bolt.maxLife;
      ctx.save();
      ctx.strokeStyle = bolt.color;
      ctx.lineWidth = 2.6;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      bolt.points.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    // Draw particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === 'confetti') {
        ctx.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9);
      } else if (p.shape === 'square') {
        ctx.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size);
      } else if (p.shape === 'star') {
        this.drawStarPath(ctx, 0, 0, 4, p.size, p.size * 0.42);
        ctx.fill();
      } else if (p.shape === 'spark') {
        ctx.fillRect(-p.size * 1.4, -p.size * 0.35, p.size * 2.8, p.size * 0.7);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Draw floating feedback texts ("TAKEN!", "INVALID!", "BANNED!")
    for (const ft of this.floatingTexts) {
      const alpha = Math.min(1, (ft.life / ft.maxLife) * 1.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '800 12px "Barlow Condensed", sans-serif';
      const metrics = ctx.measureText(ft.text);
      const padX = 7;
      const boxW = metrics.width + padX * 2;
      const boxH = 19;

      if (ft.bgColor) {
        ctx.fillStyle = ft.bgColor;
        this.roundRect(ctx, ft.x - boxW / 2, ft.y - boxH / 2, boxW, boxH, 5);
        ctx.fill();
        ctx.strokeStyle = ft.color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ft.text, ft.x, ft.y + 0.5);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawStadiumFloor(ctx: CanvasRenderingContext2D): void {
    const pad = 8;
    const w = this.width - pad * 2;
    const h = this.height - pad * 2;
    const cornerRadius = 26;

    // Subtle dark stadium pit fill
    const bgGrad = ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      10,
      this.width / 2,
      this.height / 2,
      Math.max(w, h) * 0.68
    );
    bgGrad.addColorStop(0, '#141B2D');
    bgGrad.addColorStop(1, '#0A0E19');

    ctx.save();
    this.roundRect(ctx, pad, pad, w, h, cornerRadius);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Subtle concentric arena rings on floor
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const r1 = Math.min(w, h) * 0.2;
    const r2 = Math.min(w, h) * 0.38;
    ctx.beginPath();
    ctx.arc(cx, cy, r1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r2, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair lines
    ctx.beginPath();
    ctx.moveTo(cx - r2 - 14, cy);
    ctx.lineTo(cx + r2 + 14, cy);
    ctx.moveTo(cx, cy - r2 - 14);
    ctx.lineTo(cx, cy + r2 + 14);
    ctx.stroke();

    // Outer neon stadium rim reacting to game tension
    let rimColor = 'rgba(0, 245, 212, 0.35)';
    let rimWidth = 2;
    if (this.phase === 'VICTORY') {
      rimColor = 'rgba(255, 209, 102, 0.78)';
      rimWidth = 2.6;
    } else if (this.isUrgent) {
      const pulse = 0.5 + 0.5 * Math.sin(this.elapsedTime * 18);
      rimColor = `rgba(255, 42, 109, ${0.45 + pulse * 0.5})`;
      rimWidth = 2.4 + pulse * 1.4;
    } else if (this.phase === 'ELIMINATION') {
      rimColor = 'rgba(255, 42, 109, 0.7)';
      rimWidth = 2.5;
    }

    this.roundRect(ctx, pad, pad, w, h, cornerRadius);
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = rimWidth;
    ctx.stroke();
    ctx.restore();
  }

  private drawVictorySpotlight(ctx: CanvasRenderingContext2D): void {
    const cx = this.width / 2;
    const cy = this.height / 2 + 10;
    const rayLen = Math.max(this.width, this.height) * 0.7;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.elapsedTime * 0.45);
    const numRays = 12;
    for (let i = 0; i < numRays; i++) {
      const startAngle = (i * Math.PI * 2) / numRays;
      const endAngle = startAngle + Math.PI / numRays / 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, rayLen, startAngle, endAngle);
      ctx.closePath();
      const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, rayLen);
      grad.addColorStop(0, 'rgba(255, 209, 102, 0.24)');
      grad.addColorStop(1, 'rgba(255, 209, 102, 0)');
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();
  }

  private drawAvatarTrail(
    ctx: CanvasRenderingContext2D,
    body: PhysicsBody,
    trailId: TrailCosmeticId
  ): void {
    const pts = body.trail;
    if (pts.length < 2) return;

    ctx.save();
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      const ratio = (i + 1) / pts.length;
      const alpha = ratio * 0.55;

      if (trailId === 'neon_comet') {
        ctx.fillStyle = `rgba(0, 245, 212, ${alpha})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, body.radius * 0.55 * ratio, 0, Math.PI * 2);
        ctx.fill();
      } else if (trailId === 'blaze_fire') {
        const color =
          ratio > 0.6 ? `rgba(255, 209, 102, ${alpha})` : `rgba(255, 42, 109, ${alpha})`;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(
          pt.x + (Math.random() - 0.5) * 3,
          pt.y + (Math.random() - 0.5) * 3,
          body.radius * 0.52 * ratio,
          0,
          Math.PI * 2
        );
        ctx.fill();
      } else if (trailId === 'prism_ribbon') {
        const hue = (this.elapsedTime * 220 + i * 32) % 360;
        ctx.fillStyle = `hsla(${hue}, 95%, 64%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, body.radius * 0.52 * ratio, 0, Math.PI * 2);
        ctx.fill();
      } else if (trailId === 'glitch_pixels') {
        ctx.fillStyle = i % 2 === 0 ? `rgba(56, 189, 248, ${alpha})` : `rgba(0, 245, 212, ${alpha})`;
        const sz = Math.max(3, body.radius * 0.45 * ratio);
        ctx.fillRect(pt.x - sz / 2, pt.y - sz / 2, sz, sz);
      } else if (trailId === 'royal_stardust') {
        ctx.fillStyle = `rgba(255, 209, 102, ${alpha + 0.15})`;
        this.drawStarPath(ctx, pt.x, pt.y, 4, body.radius * 0.44 * ratio, body.radius * 0.18 * ratio);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawAvatar(ctx: CanvasRenderingContext2D, body: PhysicsBody): void {
    const r = body.radius * body.scale;
    if (r < 2) return;

    const shakeOffset =
      body.shakeTimer > 0 ? Math.sin(body.shakeTimer * 55) * 5.5 : 0;
    const popScale =
      body.safePopTimer > 0 ? 1 + Math.sin((body.safePopTimer / 0.45) * Math.PI) * 0.22 : 1;

    const drawX = body.x + shakeOffset;
    const drawY = body.y;
    const finalR = r * popScale;
    const player = body.player;

    ctx.save();
    ctx.translate(drawX, drawY);

    // 1) Status ring color & pulse
    let ringColor = '#00F5D4';
    let glowBlur = 10;
    let ringWidth = Math.max(2.2, finalR * 0.14);

    if (this.phase === 'VICTORY') {
      ringColor = '#FFD166';
      glowBlur = 22;
      ringWidth = 4.5;
    } else if (this.phase === 'LOBBY' || this.phase === 'WAVE_INTRO') {
      ringColor = '#00F5D4';
      glowBlur = 8;
    } else if (player.safe) {
      ringColor = '#00F5D4';
      glowBlur = 14;
      ringWidth = Math.max(2.8, finalR * 0.17);
    } else {
      // IN DANGER: pulsing red/orange ring
      const pulseSpeed = this.isUrgent ? 16 : 6.5;
      const pulse = 0.5 + 0.5 * Math.sin(this.elapsedTime * pulseSpeed + body.x);
      ringColor = pulse > 0.5 ? '#FF2A6D' : '#FF6B35';
      glowBlur = this.isUrgent ? 18 : 11;
      ringWidth = Math.max(2.5, finalR * (0.14 + pulse * 0.06));
    }

    // Outer glow ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, finalR + ringWidth * 0.45, 0, Math.PI * 2);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = ringWidth;
    ctx.shadowColor = ringColor;
    ctx.shadowBlur = glowBlur;
    ctx.stroke();
    ctx.restore();

    // 2) Inner circular profile picture (real TikTok photo or illustrated profile picture)
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, finalR - 0.5, 0, Math.PI * 2);
    ctx.clip();

    const primaryUrl = player.avatarUrl || generateProfilePicture(player.username);
    const fallbackUrl = generateProfilePicture(player.username);
    let cachedImg = this.imageCache.get(primaryUrl);
    if (!cachedImg) {
      this.preloadAvatar(primaryUrl);
    }
    if (!cachedImg || cachedImg === 'error') {
      cachedImg = this.imageCache.get(fallbackUrl);
      if (!cachedImg) {
        this.preloadAvatar(fallbackUrl);
      }
    }

    if (cachedImg && cachedImg !== 'error' && cachedImg.complete && cachedImg.naturalWidth > 0) {
      ctx.drawImage(cachedImg, -finalR, -finalR, finalR * 2, finalR * 2);
    } else {
      // Smooth solid avatar circle while SVG decodes on first frame
      const grad = ctx.createLinearGradient(-finalR, -finalR, finalR, finalR);
      grad.addColorStop(0, player.color);
      grad.addColorStop(1, '#141B2D');
      ctx.fillStyle = grad;
      ctx.fillRect(-finalR, -finalR, finalR * 2, finalR * 2);
    }
    ctx.restore();

    // 3) Hat Cosmetic OR Victory Crown
    if (this.phase === 'VICTORY') {
      const bob = Math.sin(this.elapsedTime * 5) * 4;
      this.drawHat(ctx, 'neon_crown', finalR * 1.15, bob - finalR * 0.08);
    } else if (player.loadout.hat !== 'none') {
      this.drawHat(ctx, player.loadout.hat, finalR, 0);
    }

    // 4) SAFE Checkmark Badge (top right)
    if (player.safe && this.phase === 'ACTIVE_WAVE') {
      const badgeR = Math.max(5.5, finalR * 0.34);
      const bx = finalR * 0.72;
      const by = -finalR * 0.72;
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = '#00F5D4';
      ctx.fill();
      ctx.strokeStyle = '#0B0E17';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Checkmark path
      ctx.beginPath();
      ctx.moveTo(bx - badgeR * 0.42, by + badgeR * 0.02);
      ctx.lineTo(bx - badgeR * 0.1, by + badgeR * 0.36);
      ctx.lineTo(bx + badgeR * 0.45, by - badgeR * 0.34);
      ctx.strokeStyle = '#0B0E17';
      ctx.lineWidth = Math.max(1.6, badgeR * 0.28);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }

    // 5) Crisp Nickname label underneath (no @ prefix)
    if (this.phase !== 'VICTORY') {
      const labelFontSize = finalR < 15 ? 8.5 : finalR < 20 ? 9.5 : 10.5;
      const rawName = player.username.replace(/^@/, '').trim();
      const displayLabel =
        rawName.length > 11 ? `${rawName.slice(0, 10)}…` : rawName;

      ctx.font = `700 ${labelFontSize}px "Plus Jakarta Sans", sans-serif`;
      const tw = ctx.measureText(displayLabel).width;
      const pillW = tw + 8;
      const pillH = labelFontSize + 4;
      const ly = finalR + pillH * 0.5 + 3;

      ctx.fillStyle = 'rgba(11, 14, 23, 0.82)';
      this.roundRect(ctx, -pillW / 2, ly - pillH / 2, pillW, pillH, 4);
      ctx.fill();

      ctx.fillStyle = player.safe ? '#00F5D4' : '#F8FAFC';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayLabel, 0, ly + 0.5);
    }

    ctx.restore();
  }

  private drawHat(
    ctx: CanvasRenderingContext2D,
    hat: HatCosmeticId,
    r: number,
    yOffset: number
  ): void {
    ctx.save();
    ctx.translate(0, -r + yOffset);

    switch (hat) {
      case 'neon_crown': {
        const w = r * 1.1;
        const h = r * 0.68;
        ctx.fillStyle = '#FFD166';
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = Math.max(1.2, r * 0.06);
        ctx.beginPath();
        ctx.moveTo(-w * 0.5, 2);
        ctx.lineTo(-w * 0.58, -h * 0.85);
        ctx.lineTo(-w * 0.2, -h * 0.35);
        ctx.lineTo(0, -h);
        ctx.lineTo(w * 0.2, -h * 0.35);
        ctx.lineTo(w * 0.58, -h * 0.85);
        ctx.lineTo(w * 0.5, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Crown gem
        ctx.fillStyle = '#FF2A6D';
        ctx.beginPath();
        ctx.arc(0, -h * 0.25, Math.max(2, r * 0.1), 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'cyber_horns': {
        ctx.fillStyle = '#FF2A6D';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        // Left horn
        ctx.beginPath();
        ctx.moveTo(-r * 0.55, r * 0.12);
        ctx.quadraticCurveTo(-r * 0.95, -r * 0.35, -r * 0.5, -r * 0.65);
        ctx.quadraticCurveTo(-r * 0.45, -r * 0.2, -r * 0.22, r * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Right horn
        ctx.beginPath();
        ctx.moveTo(r * 0.55, r * 0.12);
        ctx.quadraticCurveTo(r * 0.95, -r * 0.35, r * 0.5, -r * 0.65);
        ctx.quadraticCurveTo(r * 0.45, -r * 0.2, r * 0.22, r * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'wizard_hat': {
        ctx.fillStyle = '#7C3AED';
        ctx.strokeStyle = '#DDD6FE';
        ctx.lineWidth = 1.2;
        // Brim
        ctx.beginPath();
        ctx.ellipse(0, 2, r * 0.92, r * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Cone
        ctx.beginPath();
        ctx.moveTo(-r * 0.55, 0);
        ctx.lineTo(r * 0.08, -r * 1.05);
        ctx.lineTo(r * 0.55, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Gold star
        ctx.fillStyle = '#FFD166';
        this.drawStarPath(ctx, 0, -r * 0.4, 4, r * 0.17, r * 0.07);
        ctx.fill();
        break;
      }

      case 'arcade_cap': {
        ctx.fillStyle = '#00F5D4';
        ctx.strokeStyle = '#0B0E17';
        ctx.lineWidth = 1.3;
        // Dome
        ctx.beginPath();
        ctx.arc(0, r * 0.18, r * 0.72, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Backwards brim
        ctx.fillStyle = '#FF2A6D';
        ctx.fillRect(r * 0.32, r * 0.02, r * 0.62, r * 0.2);
        break;
      }

      case 'plasma_halo': {
        ctx.strokeStyle = '#00F5D4';
        ctx.lineWidth = Math.max(2, r * 0.11);
        ctx.shadowColor = '#00F5D4';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.28, r * 0.68, r * 0.2, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'streamer_headset': {
        // Headband over top
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = Math.max(2.5, r * 0.16);
        ctx.beginPath();
        ctx.arc(0, r, r * 1.06, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
        // Glowing neon earcups
        ctx.fillStyle = '#FF2A6D';
        ctx.strokeStyle = '#00F5D4';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(-r * 1.15, r * 0.62, r * 0.26, r * 0.64, 4);
        ctx.roundRect(r * 0.89, r * 0.62, r * 0.26, r * 0.64, 4);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'pixel_visor': {
        // Drawn across the upper-middle face of the avatar
        ctx.fillStyle = '#0B0E17';
        ctx.fillRect(-r * 0.72, r * 0.68, r * 1.44, r * 0.34);
        ctx.fillStyle = '#00F5D4';
        ctx.fillRect(-r * 0.58, r * 0.74, r * 0.42, r * 0.16);
        ctx.fillRect(r * 0.16, r * 0.74, r * 0.42, r * 0.16);
        break;
      }

      default:
        break;
    }

    ctx.restore();
  }

  private drawWordBubble(ctx: CanvasRenderingContext2D, body: PhysicsBody): void {
    const bubble = body.wordBubble;
    if (!bubble) return;

    const progress = 1 - bubble.timer / bubble.maxTimer;
    const alpha = bubble.timer < 0.35 ? bubble.timer / 0.35 : 1;
    const rise = Math.min(1, progress * 4) * 6;

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    const word = bubble.word;
    ctx.font = '800 12px "JetBrains Mono", monospace';
    const tw = ctx.measureText(word).width;
    const bw = tw + 14;
    const bh = 21;
    const bx = Math.max(bw / 2 + 10, Math.min(this.width - bw / 2 - 10, body.x));
    const by = Math.max(bh + 8, body.y - body.radius - 16 - rise);

    ctx.fillStyle = '#00F5D4';
    ctx.shadowColor = 'rgba(0, 245, 212, 0.55)';
    ctx.shadowBlur = 10;
    this.roundRect(ctx, bx - bw / 2, by - bh / 2, bw, bh, 6);
    ctx.fill();

    // Pointer triangle
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(bx - 4, by + bh / 2 - 1);
    ctx.lineTo(bx + 4, by + bh / 2 - 1);
    ctx.lineTo(bx, by + bh / 2 + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#05070D';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(word, bx, by + 0.5);
    ctx.restore();
  }

  private drawStarPath(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerR: number,
    innerR: number
  ): void {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.closePath();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}
