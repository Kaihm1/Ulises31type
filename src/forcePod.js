import { COLORS, HEIGHT, POD, WIDTH } from "./constants.js";
import { sound } from "./audio.js";
import { sprites } from "./sprites.js?v=2";

export class ForcePod {
  constructor(player) {
    this.player = player;
    this.reset();
  }

  reset() {
    this.state = "attached_front"; // attached_front | attached_back | launched | deployed | returning
    this.x = this.player.x + POD.attachOffsetX;
    this.y = this.player.y;
    this.vx = 0;
    this.vy = 0;
    this.targetX = this.x;
    this.pulse = 0;
    this.shieldFlash = 0;
  }

  get isAttached() {
    return this.state === "attached_front" || this.state === "attached_back";
  }

  get statusLabel() {
    switch (this.state) {
      case "attached_front":
        return "NONO-POD: FRONTAL";
      case "attached_back":
        return "NONO-POD: TRASERO";
      case "launched":
      case "deployed":
        return "NONO-POD: DESPLEGADO";
      case "returning":
        return "NONO-POD: REGRESANDO";
      default:
        return "NONO-POD";
    }
  }

  onBlock() {
    this.shieldFlash = 0.22;
  }

  toggle(particles) {
    if (!this.player.alive) return;

    if (this.state === "attached_front") {
      this.state = "launched";
      this.vx = POD.launchSpeed;
      this.vy = 0;
      this.targetX = Math.min(WIDTH - 64, this.player.x + 260);
      sound.playPodToggle(false);
      particles.ring(this.x, this.y, COLORS.cyan, 28, 0.22);
    } else if (this.state === "attached_back") {
      this.state = "launched";
      this.vx = -POD.launchSpeed * 0.8;
      this.vy = 0;
      this.targetX = Math.max(54, this.player.x - 210);
      sound.playPodToggle(false);
      particles.ring(this.x, this.y, COLORS.cyan, 28, 0.22);
    } else if (this.state === "launched" || this.state === "deployed") {
      this.state = "returning";
      sound.playPodToggle(true);
    }
  }

  update(dt, particles) {
    this.pulse += dt * 6;
    if (this.shieldFlash > 0) this.shieldFlash = Math.max(0, this.shieldFlash - dt);
    if (!this.player.alive) return;

    if (this.state === "attached_front") {
      this.x = this.player.x + POD.attachOffsetX;
      this.y = this.player.y;
    } else if (this.state === "attached_back") {
      this.x = this.player.x - POD.attachOffsetX;
      this.y = this.player.y;
    } else if (this.state === "launched") {
      this.x += this.vx * dt;
      this.vx *= 0.94;
      const reachedForward = this.vx >= 0 && (this.x >= this.targetX || this.x >= WIDTH - 48);
      const reachedBack = this.vx < 0 && (this.x <= this.targetX || this.x <= 48);
      if (reachedForward || reachedBack || Math.abs(this.vx) < 70) {
        this.state = "deployed";
        this.vx = 0;
      }
    } else if (this.state === "deployed") {
      const dy = this.player.y - this.y;
      this.y += dy * Math.min(1, dt * 2.4);
      this.x = Math.max(40, Math.min(WIDTH - 40, this.x));
      this.y = Math.max(30, Math.min(HEIGHT - 30, this.y));
    } else if (this.state === "returning") {
      const dx = this.player.x - this.x;
      const dy = this.player.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 30) {
        this.state = this.x >= this.player.x ? "attached_front" : "attached_back";
        sound.playPodToggle(true);
        particles.ring(this.x, this.y, COLORS.gold, 26, 0.2);
      } else {
        this.x += (dx / dist) * POD.returnSpeed * dt;
        this.y += (dy / dist) * POD.returnSpeed * dt;
      }
    }
  }

  shootSynced(bullets, weaponLevel = 1, crystal = null) {
    const dir = this.state === "attached_back" ? -1 : 1;

    if (this.isAttached && crystal === "red") {
      // LÁSER HELICOIDAL ROJO/AZUL (Counter-Air Laser de R-Type)
      for (const phase of [0, Math.PI]) {
        bullets.push({
          type: "helix",
          x: this.x + dir * 18,
          y: this.y,
          baseY: this.y,
          vx: dir * 740,
          vy: 0,
          w: 28,
          h: 6,
          t: 0,
          phase,
          damage: 1.45 + weaponLevel * 0.2,
          pierce: false,
          color: phase === 0 ? COLORS.crimson : COLORS.cyan,
        });
      }
      return;
    }

    if (this.isAttached && crystal === "blue") {
      // LÁSER DE REBOTE AZUL (Rebound Laser de R-Type: rebota en techo y suelo)
      const slopes = weaponLevel >= 3 ? [-320, 0, 320] : [-290, 290];
      for (const vy of slopes) {
        bullets.push({
          type: "rebound",
          x: this.x + dir * 16,
          y: this.y,
          vx: dir * 610,
          vy,
          w: 22,
          h: 4.5,
          bounces: 3,
          damage: 1.35,
          pierce: false,
          color: COLORS.cyan,
        });
      }
      return;
    }

    if (this.isAttached && crystal === "yellow") {
      // LÁSER RASTRERO AMARILLO (Counter-Ground Laser de R-Type: corre por techo y suelo)
      for (const surface of ["ceiling", "floor"]) {
        bullets.push({
          type: "ground",
          surface,
          x: this.x + dir * 14,
          y: this.y,
          vx: dir * 560,
          vy: surface === "ceiling" ? -420 : 420,
          w: 24,
          h: 7,
          damage: 1.6,
          pierce: false,
          color: COLORS.goldBright,
        });
      }
      return;
    }

    // Fuego táctico estándar de Nono-Pod
    const angles = weaponLevel >= 3 ? [-110, 0, 110] : [-75, 75];
    for (const vy of angles) {
      bullets.push({
        type: "pod",
        x: this.x + dir * 15,
        y: this.y + (vy === 0 ? 0 : vy > 0 ? 6 : -6),
        vx: dir * 660,
        vy,
        w: 13,
        h: 4,
        damage: 1,
        pierce: false,
        color: COLORS.goldBright,
      });
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Escudo energético hexagonal cuando bloquea o respira
    const glowR = POD.radius + 7 + Math.sin(this.pulse) * 1.8;
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, glowR);
    grad.addColorStop(0, this.shieldFlash > 0 ? "rgba(0, 229, 255, 0.75)" : "rgba(0, 229, 255, 0.35)");
    grad.addColorStop(1, "rgba(0, 229, 255, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    if (this.shieldFlash > 0) {
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + this.pulse * 0.2;
        const hx = Math.cos(a) * (POD.radius + 4);
        const hy = Math.sin(a) * (POD.radius + 4);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Sprite ilustrado HD de Nono-Pod
    ctx.save();
    if (this.state === "attached_back") {
      ctx.scale(-1, 1);
    }
    if (!sprites.drawCentered(ctx, "nono", 38)) {
      ctx.fillStyle = "#e63946";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }
}
