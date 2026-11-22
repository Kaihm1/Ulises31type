import { COLORS, HEIGHT, PLAYER, WIDTH } from "./constants.js";
import { sound } from "./audio.js";
import { sprites } from "./sprites.js?v=2";

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 140;
    this.y = HEIGHT * 0.5;
    this.vx = 0;
    this.vy = 0;
    this.tilt = 0;
    this.lives = 3;
    this.invuln = 0;
    this.fireCooldown = 0;
    this.chargeTime = 0;
    this.wasFireDown = false;
    this.alive = true;

    // Power-ups estilo R-Type + Separación modular del Elios (Ulises 31)
    this.crystal = null; // null | "red" | "blue" | "yellow"
    this.weaponLevel = 1; // 1..3
    this.speedLevel = 0; // 0..3
    this.hasShield = false;
    this.hasMissiles = false;
    this.shotCounter = 0;
    this.splitMode = false; // false = caza acoplado, true = 3 módulos en formación
    this.splitBlend = 0; // 0..1 animación suave de separación/acoplamiento
  }

  toggleSplit(particles) {
    if (!this.alive) return;
    this.splitMode = !this.splitMode;
    sound.playSplitToggle(this.splitMode);
    particles.ring(this.x, this.y, this.splitMode ? COLORS.cyan : COLORS.goldBright, 42, 0.25);
    particles.floatingText(
      this.x,
      this.y - 28,
      this.splitMode ? "FORMACIÓN 3 MÓDULOS" : "ELIOS ACOPLADO (+BEAM)",
      this.splitMode ? COLORS.cyan : COLORS.goldBright,
      0.95
    );
  }

  getWingModules() {
    if (this.splitBlend < 0.15) return [];
    const dy = 44 * this.splitBlend;
    const dx = -16 * this.splitBlend;
    return [
      { x: this.x + dx, y: this.y - dy, role: "top" },
      { x: this.x + dx, y: this.y + dy, role: "bottom" },
    ];
  }

  get speed() {
    return PLAYER.baseSpeed + this.speedLevel * PLAYER.speedStep;
  }

  get chargeRatio() {
    if (this.chargeTime <= 0.08) return 0;
    return Math.min(1, this.chargeTime / PLAYER.chargeMax);
  }

  applyPowerUp(type, particles) {
    sound.playPowerUp();
    if (type === "red" || type === "blue" || type === "yellow") {
      const same = this.crystal === type;
      this.crystal = type;
      if (same) {
        this.weaponLevel = Math.min(3, this.weaponLevel + 1);
      } else {
        this.weaponLevel = Math.max(2, this.weaponLevel);
      }
      const names = {
        red: "CRISTAL ROJO: LÁSER HELICOIDAL",
        blue: "CRISTAL AZUL: LÁSER DE REBOTE",
        yellow: "CRISTAL AMARILLO: LÁSER RASTRERO",
      };
      const cols = { red: COLORS.crimson, blue: COLORS.cyan, yellow: COLORS.goldBright };
      particles.floatingText(this.x, this.y - 26, names[type], cols[type], 1.15);
      return 250;
    } else if (type === "weapon") {
      if (this.weaponLevel < 3) {
        this.weaponLevel++;
        particles.floatingText(this.x, this.y - 24, `ARMA NV.${this.weaponLevel}`, COLORS.cyan);
      } else {
        particles.floatingText(this.x, this.y - 24, "ARMA MAX +500", COLORS.gold);
        return 500;
      }
    } else if (type === "speed") {
      if (this.speedLevel < PLAYER.maxSpeedLevel) {
        this.speedLevel++;
        particles.floatingText(this.x, this.y - 24, `VELOCIDAD +${this.speedLevel}`, COLORS.emerald);
      } else {
        particles.floatingText(this.x, this.y - 24, "VELOCIDAD MAX +300", COLORS.emerald);
        return 300;
      }
    } else if (type === "shield") {
      this.hasShield = true;
      particles.floatingText(this.x, this.y - 24, "ESCUDO DE ATENEA", COLORS.goldBright);
      particles.ring(this.x, this.y, COLORS.cyan, 44, 0.35);
    } else if (type === "missile") {
      this.hasMissiles = true;
      particles.floatingText(this.x, this.y - 24, "MISILES BUSCADORES", COLORS.magenta);
    }
    return 150;
  }

  update(dt, input, bullets, pod, particles) {
    if (!this.alive) return;

    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
    if (this.fireCooldown > 0) this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;

    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }

    this.vx = dx * this.speed;
    this.vy = dy * this.speed;
    this.x = Math.max(30, Math.min(WIDTH - 36, this.x + this.vx * dt));
    this.y = Math.max(20, Math.min(HEIGHT - 56, this.y + this.vy * dt));

    const targetTilt = dy * 0.24;
    this.tilt += (targetTilt - this.tilt) * Math.min(1, dt * 14);

    // Animación fluida de separación / re-acoplamiento de módulos del Elios
    const targetSplit = this.splitMode ? 1 : 0;
    this.splitBlend += (targetSplit - this.splitBlend) * Math.min(1, dt * 10);

    // Estela doble de propulsores (caza principal + módulos si están separados)
    if (Math.random() < 0.88) {
      particles.emit(
        this.x - 28,
        this.y - 4 + (Math.random() - 0.5) * 3,
        -230 - Math.random() * 90,
        (Math.random() - 0.5) * 14,
        COLORS.cyan,
        3.5,
        0.18
      );
      particles.emit(
        this.x - 28,
        this.y + 4 + (Math.random() - 0.5) * 3,
        -230 - Math.random() * 90,
        (Math.random() - 0.5) * 14,
        COLORS.white,
        2.6,
        0.15
      );
      for (const m of this.getWingModules()) {
        particles.emit(m.x - 14, m.y, -190, (Math.random() - 0.5) * 10, COLORS.cyan, 2.4, 0.13);
      }
    }

    // Disparo automático cómodo (tecla C) si no está cargando
    if (input.autofire && !input.fire && this.fireCooldown <= 0) {
      this.shootRapid(bullets, pod, particles);
      this.fireCooldown = PLAYER.fireCooldown * 1.15;
    }

    // Disparo manual + Carga Wave Cannon (Z / Espacio / J)
    if (input.fire) {
      if (!this.wasFireDown && this.fireCooldown <= 0) {
        this.shootRapid(bullets, pod, particles);
        this.fireCooldown = PLAYER.fireCooldown;
      }
      this.chargeTime += dt;
      sound.updateCharge(this.chargeRatio);
    } else if (this.wasFireDown) {
      if (this.chargeTime >= PLAYER.chargeMin) {
        this.shootWaveCannon(bullets, particles);
      }
      this.chargeTime = 0;
      sound.stopCharge();
    }

    this.wasFireDown = input.fire;
  }

  shootRapid(bullets, pod, particles) {
    sound.playLaser(this.weaponLevel);
    this.shotCounter++;
    if (particles) {
      particles.flash(this.x + 30, this.y, COLORS.cyan, 14, 0.07);
    }

    if (this.weaponLevel === 1) {
      bullets.push({
        type: "laser",
        x: this.x + 24,
        y: this.y,
        vx: 790,
        vy: 0,
        w: 20,
        h: 4.5,
        damage: 1,
        pierce: false,
        color: COLORS.cyan,
      });
    } else if (this.weaponLevel === 2) {
      bullets.push({
        type: "laser",
        x: this.x + 24,
        y: this.y - 6,
        vx: 810,
        vy: 0,
        w: 22,
        h: 4.5,
        damage: 1.1,
        pierce: false,
        color: COLORS.cyan,
      });
      bullets.push({
        type: "laser",
        x: this.x + 24,
        y: this.y + 6,
        vx: 810,
        vy: 0,
        w: 22,
        h: 4.5,
        damage: 1.1,
        pierce: false,
        color: COLORS.goldBright,
      });
    } else {
      // Nivel 3: Triple haz del Olimpo
      bullets.push({
        type: "laser",
        x: this.x + 25,
        y: this.y,
        vx: 840,
        vy: 0,
        w: 26,
        h: 5.5,
        damage: 1.35,
        pierce: false,
        color: COLORS.goldBright,
      });
      bullets.push({
        type: "laser",
        x: this.x + 20,
        y: this.y - 9,
        vx: 780,
        vy: -125,
        w: 18,
        h: 4.5,
        damage: 1,
        pierce: false,
        color: COLORS.cyan,
      });
      bullets.push({
        type: "laser",
        x: this.x + 20,
        y: this.y + 9,
        vx: 780,
        vy: 125,
        w: 18,
        h: 4.5,
        damage: 1,
        pierce: false,
        color: COLORS.cyan,
      });
    }

    // Misiles buscadores cada 3 disparos
    if (this.hasMissiles && this.shotCounter % 3 === 0) {
      for (const dir of [-1, 1]) {
        bullets.push({
          type: "missile",
          x: this.x + 4,
          y: this.y + dir * 14,
          vx: 260,
          vy: dir * 130,
          w: 12,
          h: 6,
          damage: 2.2,
          pierce: false,
          color: COLORS.magenta,
        });
      }
    }

    // Fuego sincronizado de los 2 módulos laterales cuando el Elios está separado
    if (this.splitBlend > 0.45) {
      for (const m of this.getWingModules()) {
        bullets.push({
          type: "laser",
          x: m.x + 16,
          y: m.y,
          vx: 760,
          vy: 0,
          w: 16,
          h: 3.5,
          damage: 0.75,
          pierce: false,
          color: COLORS.crimson,
        });
      }
    }

    if (pod) {
      pod.shootSynced(bullets, this.weaponLevel, this.crystal);
    }
  }

  shootWaveCannon(bullets, particles) {
    const power = Math.max(0.35, this.chargeRatio);
    // En modo acoplado el Wave Cannon concentra +25% de energía
    const compactBoost = this.splitMode ? 1.0 : 1.25;
    sound.playWaveCannon(power);
    const width = (54 + power * 78) * (this.splitMode ? 0.95 : 1.1);
    const height = (12 + power * 22) * (this.splitMode ? 0.95 : 1.1);
    const damage = Math.round((5 + power * 17) * compactBoost);

    bullets.push({
      type: "wave",
      x: this.x + 32,
      y: this.y,
      vx: 920,
      vy: 0,
      w: width,
      h: height,
      damage,
      pierce: true,
      pierceBudget: damage,
      color: power > 0.85 ? COLORS.magenta : COLORS.gold,
      power,
    });

    particles.burst(this.x + 24, this.y, COLORS.goldBright, 16, 220, 4.5, 0.28);
    particles.ring(this.x + 24, this.y, COLORS.cyan, 34, 0.2);
  }

  hit(particles) {
    if (this.invuln > 0 || !this.alive) return false;

    // Si tiene Escudo de Atenea, absorbe el golpe
    if (this.hasShield) {
      this.hasShield = false;
      this.invuln = 1.2;
      sound.playShieldBlock();
      particles.ring(this.x, this.y, COLORS.cyan, 54, 0.32);
      particles.burst(this.x, this.y, COLORS.cyan, 16, 190, 3.5, 0.35);
      particles.floatingText(this.x, this.y - 24, "ESCUDO ROTO", COLORS.cyan);
      return true;
    }

    this.lives -= 1;
    this.chargeTime = 0;
    this.weaponLevel = Math.max(1, this.weaponLevel - 1);
    sound.stopCharge();
    sound.playExplosion(true);
    particles.burst(this.x, this.y, COLORS.orange, 30, 260, 5.5, 0.65);
    particles.ring(this.x, this.y, COLORS.gold, 64, 0.38);

    if (this.lives <= 0) {
      this.alive = false;
      return true;
    }

    this.invuln = PLAYER.invulnDuration;
    this.x = 130;
    this.y = HEIGHT * 0.5;
    return true;
  }

  draw(ctx, time) {
    if (!this.alive) return;
    if (this.invuln > 0 && Math.floor(time * 16) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.tilt);

    // Escudo de Atenea activo
    if (this.hasShield) {
      const sp = 1 + Math.sin(time * 8) * 0.06;
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.arc(0, 0, 26 * sp, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = COLORS.cyan;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Aura de carga del Wave Cannon
    const cr = this.chargeRatio;
    if (cr > 0.05) {
      const pulse = 1 + Math.sin(time * 30) * 0.16;
      const r = (12 + cr * 18) * pulse;
      const grad = ctx.createRadialGradient(24, 0, 2, 24, 0, r);
      grad.addColorStop(0, COLORS.white);
      grad.addColorStop(0.45, cr > 0.85 ? COLORS.magenta : COLORS.gold);
      grad.addColorStop(1, "rgba(0, 229, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(24, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Módulos laterales desplegados (Formación 3 módulos del Elios)
    if (this.splitBlend > 0.08) {
      for (const m of this.getWingModules()) {
        ctx.save();
        ctx.translate(m.x - this.x, m.y - this.y);
        // Rayo de enlace energético sutil al separarse
        if (this.splitBlend < 0.92) {
          ctx.strokeStyle = "rgba(0, 229, 255, 0.45)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(this.x - m.x, this.y - m.y);
          ctx.stroke();
        }
        // Dibuja el mini-módulo rojo/blanco/azul estilo Ulises 31
        ctx.shadowColor = COLORS.cyan;
        ctx.shadowBlur = 8;
        ctx.fillStyle = "#e02b38";
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, -7);
        ctx.lineTo(-14, 0);
        ctx.lineTo(-10, 7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = COLORS.white;
        ctx.fillRect(-6, -3, 10, 6);
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.arc(3, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Llama de propulsor azul-blanco animada en la cola del caza
    const flameLen = 14 + Math.sin(time * 42) * 5;
    const flameGrad = ctx.createLinearGradient(-32, 0, -32 - flameLen, 0);
    flameGrad.addColorStop(0, COLORS.white);
    flameGrad.addColorStop(0.45, COLORS.cyan);
    flameGrad.addColorStop(1, "rgba(0, 229, 255, 0)");
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(-26, -6);
    ctx.lineTo(-32 - flameLen, 0);
    ctx.lineTo(-26, 6);
    ctx.closePath();
    ctx.fill();

    // Sprite ilustrado HD del Caza de Ulises (respetando proporción real)
    const shipW = this.splitBlend > 0.5 ? 64 : 76;
    if (!sprites.drawCentered(ctx, "odiseus", shipW)) {
      ctx.fillStyle = COLORS.white;
      ctx.fillRect(-18, -8, 36, 16);
    }

    // Punto sutil de hitbox en el centro
    ctx.fillStyle = "rgba(0, 229, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
