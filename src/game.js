import { COLORS, HEIGHT, PLAYER, POD, WIDTH } from "./constants.js";
import { sound } from "./audio.js";
import { ParticleSystem } from "./particles.js";
import { Player } from "./player.js";
import { ForcePod } from "./forcePod.js";
import { LevelDirector } from "./level.js?v=3";
import { drawEnemy, updateEnemy } from "./enemies.js?v=3";
import { BrawlerMode } from "./brawler.js?v=1";

const POWERUP_META = {
  red: { label: "R", color: COLORS.crimson },
  blue: { label: "B", color: COLORS.cyan },
  yellow: { label: "Y", color: COLORS.goldBright },
  weapon: { label: "A", color: COLORS.cyan },
  speed: { label: "S", color: COLORS.emerald },
  shield: { label: "E", color: COLORS.goldBright },
  missile: { label: "M", color: COLORS.magenta },
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = new ParticleSystem();
    this.player = new Player();
    this.pod = new ForcePod(this.player);
    this.level = new LevelDirector();
    this.brawler = new BrawlerMode();
    this.currentStage = 1; // 1: Naves Ep.1 | 2: Ulises Final Fight | 3: Naves Zotra

    this.state = "title"; // title | playing | paused | gameover | victory
    this.score = 0;
    this.highScore = 0;
    this.time = 0;
    this.shake = 0;
    this.hitstop = 0;

    // Secuencia de explosión en cadena del Jefe estilo R-Type
    this.bossDying = null;

    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.powerUps = [];
  }

  startNewGame(stage = 1) {
    this.currentStage = stage;
    this.player.reset();
    this.pod.reset();
    if (stage === 2) {
      this.brawler.reset();
    } else {
      this.level.reset(stage);
    }
    this.particles = new ParticleSystem();
    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.powerUps = [];
    this.bossDying = null;
    this.score = 0;
    this.shake = 0;
    this.hitstop = 0;
    this.state = "playing";
    sound.startBgm();
  }

  startNextStage() {
    const nextStage = this.currentStage + 1;
    this.currentStage = nextStage;
    this.player.x = 140;
    this.player.y = HEIGHT * 0.45;
    this.player.invuln = 1.6;
    this.player.chargeTime = 0;
    this.pod.reset();
    if (nextStage === 2) {
      this.brawler.reset();
    } else {
      this.level.reset(nextStage);
    }
    this.particles = new ParticleSystem();
    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.powerUps = [];
    this.bossDying = null;
    this.shake = 0;
    this.hitstop = 0;
    this.state = "playing";
    sound.startBgm();
  }

  onBrawlerVictory() {
    this.state = "stageclear";
    sound.stopCharge();
    sound.stopBgm();
    sound.playVictoryFanfare();
  }

  togglePause() {
    if (this.state === "playing") {
      this.state = "paused";
      sound.stopCharge();
    } else if (this.state === "paused") {
      this.state = "playing";
    }
  }

  onPodAction() {
    if (this.state !== "playing") return;
    if (this.currentStage === 2) {
      this.brawler.onLaser(this.particles);
    } else {
      this.pod.toggle(this.particles);
    }
  }

  onSplitAction() {
    if (this.state !== "playing") return;
    if (this.currentStage === 2) {
      this.brawler.onJump(this.particles);
    } else {
      this.player.toggleSplit(this.particles);
    }
  }

  findNearestEnemy(x, y) {
    let best = null;
    let bestDist = Infinity;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  update(dt, input) {
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 28);

    if (this.state !== "playing") {
      if (this.state === "title") {
        this.level.update(dt * 0.35, []);
      }
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      return;
    }

    if (this.currentStage === 2) {
      this.brawler.update(dt, input, this.particles, this);
      return;
    }

    // Secuencia de explosiones en cadena al derrotar al Cíclope
    if (this.bossDying) {
      this.bossDying.timer -= dt;
      this.bossDying.blastTimer -= dt;
      this.particles.update(dt);
      if (this.bossDying.blastTimer <= 0) {
        this.bossDying.blastTimer = 0.14;
        const bx = this.bossDying.x + (Math.random() - 0.5) * 110;
        const by = this.bossDying.y + (Math.random() - 0.5) * 110;
        sound.playExplosion(Math.random() < 0.45);
        this.particles.burst(bx, by, Math.random() < 0.5 ? COLORS.gold : COLORS.orange, 22, 240, 5, 0.55);
        this.particles.ring(bx, by, COLORS.magenta, 68, 0.35);
        this.shake = 10;
      }
      if (this.bossDying.timer <= 0) {
        this.particles.explosion(this.bossDying.x, this.bossDying.y, 2.4);
        this.bossDying = null;
        this.state = this.currentStage < 3 ? "stageclear" : "victory";
        sound.stopCharge();
        sound.stopBgm();
        sound.playVictoryFanfare();
      }
      return;
    }

    this.level.update(dt, this.enemies);
    this.player.update(dt, input, this.playerBullets, this.pod, this.particles);
    this.pod.update(dt, this.particles);
    this.particles.update(dt);

    // Mantener el Nono-Pod fuera de muros sólidos (desliza sobre el terreno como Force Pod)
    const podCeil = this.level.getCeilingY(this.pod.x) + 12;
    const podFloor = this.level.getFloorY(this.pod.x) - 12;
    this.pod.y = Math.max(podCeil, Math.min(podFloor, this.pod.y));

    const playBottom = this.level.getPlayableBottom();

    // Balas y láseres del jugador
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i];

      if (b.type === "helix") {
        b.t += dt;
        b.x += b.vx * dt;
        b.y = b.baseY + Math.sin(b.t * 24 + b.phase) * 18;
      } else if (b.type === "rebound") {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        const ceil = this.level.getCeilingY(b.x) + 4;
        const floor = this.level.getFloorY(b.x) - 4;
        if (b.y <= ceil && b.vy < 0) {
          if (b.bounces > 0) {
            b.y = ceil;
            b.vy = Math.abs(b.vy);
            b.bounces--;
            this.particles.burst(b.x, b.y, COLORS.cyan, 4, 90, 2, 0.16);
          } else {
            this.playerBullets.splice(i, 1);
            continue;
          }
        } else if (b.y >= floor && b.vy > 0) {
          if (b.bounces > 0) {
            b.y = floor;
            b.vy = -Math.abs(b.vy);
            b.bounces--;
            this.particles.burst(b.x, b.y, COLORS.cyan, 4, 90, 2, 0.16);
          } else {
            this.playerBullets.splice(i, 1);
            continue;
          }
        }
      } else if (b.type === "ground") {
        b.x += b.vx * dt;
        const ceil = this.level.getCeilingY(b.x) + 5;
        const floor = this.level.getFloorY(b.x) - 5;
        if (b.surface === "ceiling") {
          b.y = Math.max(ceil, b.y + b.vy * dt);
          if (b.y <= ceil) b.y = ceil;
        } else {
          b.y = Math.min(floor, b.y + b.vy * dt);
          if (b.y >= floor) b.y = floor;
        }
      } else if (b.type === "missile") {
        const target = this.findNearestEnemy(b.x, b.y);
        if (target) {
          const dx = target.x - b.x;
          const dy = target.y - b.y;
          const dist = Math.hypot(dx, dy) || 1;
          const desiredVx = (dx / dist) * 520;
          const desiredVy = (dy / dist) * 520;
          b.vx += (desiredVx - b.vx) * Math.min(1, dt * 6.5);
          b.vy += (desiredVy - b.vy) * Math.min(1, dt * 6.5);
        } else {
          b.vx = Math.min(540, b.vx + 400 * dt);
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (Math.random() < 0.65) {
          this.particles.emit(b.x - 4, b.y, -70, (Math.random() - 0.5) * 20, COLORS.magenta, 2.5, 0.14);
        }
      } else {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }

      // Colisión de proyectiles normales con el terreno (salvo wave, rebound y ground)
      if (b.type !== "wave" && b.type !== "rebound" && b.type !== "ground") {
        if (this.level.isPointInTerrain(b.x, b.y, 2)) {
          this.particles.burst(b.x, b.y, b.color, 3, 75, 2, 0.14);
          this.playerBullets.splice(i, 1);
          continue;
        }
      }

      if (b.x > WIDTH + 120 || b.x < -120 || b.y < -40 || b.y > playBottom + 40) {
        this.playerBullets.splice(i, 1);
      }
    }

    // Power-ups flotantes
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      pu.t += dt;
      pu.x -= 82 * dt;
      pu.y += Math.sin(pu.t * 4) * 28 * dt;
      // Mantener cápsulas dentro del pasillo visible
      const cY = this.level.getCeilingY(pu.x) + 20;
      const fY = this.level.getFloorY(pu.x) - 20;
      pu.y = Math.max(cY, Math.min(fY, pu.y));
      if (pu.x < -30) {
        this.powerUps.splice(i, 1);
      }
    }

    // Enemigos
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const keep = updateEnemy(e, dt, this.player, this.enemyBullets, this.enemies, this.particles);
      if (!keep) {
        this.enemies.splice(i, 1);
      }
    }

    // Balas enemigas
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      if (
        eb.x < -30 ||
        eb.x > WIDTH + 30 ||
        eb.y < -30 ||
        eb.y > playBottom + 10 ||
        this.level.isPointInTerrain(eb.x, eb.y, 1)
      ) {
        this.enemyBullets.splice(i, 1);
      }
    }

    this.handleCollisions(dt);

    if (!this.player.alive) {
      this.state = "gameover";
      this.highScore = Math.max(this.highScore, this.score);
      sound.stopBgm();
    }
  }

  handleCollisions(dt) {
    // 0. Recogida de Power-Ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      const dist = Math.hypot(pu.x - this.player.x, pu.y - this.player.y);
      if (dist <= 32) {
        const bonus = this.player.applyPowerUp(pu.type, this.particles);
        this.score += bonus;
        this.highScore = Math.max(this.highScore, this.score);
        this.powerUps.splice(i, 1);
      }
    }

    // 1. Nono-Pod y Módulos laterales del Elios absorben balas enemigas
    const wingModules = this.player.getWingModules();
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      const dist = Math.hypot(eb.x - this.pod.x, eb.y - this.pod.y);
      if (dist <= POD.radius + eb.radius) {
        this.enemyBullets.splice(i, 1);
        this.pod.onBlock();
        sound.playShieldBlock();
        this.particles.burst(eb.x, eb.y, COLORS.cyan, 6, 120, 2.5, 0.2);
        continue;
      }
      let blockedByModule = false;
      for (const m of wingModules) {
        if (Math.hypot(eb.x - m.x, eb.y - m.y) <= 13 + eb.radius) {
          blockedByModule = true;
          break;
        }
      }
      if (blockedByModule) {
        this.enemyBullets.splice(i, 1);
        sound.playShieldBlock();
        this.particles.burst(eb.x, eb.y, COLORS.goldBright, 5, 110, 2.2, 0.16);
      }
    }

    // 2. Nono-Pod daña enemigos por contacto
    for (let j = this.enemies.length - 1; j >= 0; j--) {
      const e = this.enemies[j];
      const dist = Math.hypot(e.x - this.pod.x, e.y - this.pod.y);
      if (dist <= POD.radius + e.radius) {
        e.hp -= POD.contactDps * dt;
        e.flash = 0.05;
        if (Math.random() < 0.35) {
          this.particles.emit(this.pod.x, this.pod.y, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90, COLORS.gold, 2.5, 0.16);
        }
        if (e.hp <= 0) {
          this.destroyEnemy(j);
        }
      }
    }

    // 3. Balas del jugador contra enemigos (con punto débil en el ojo del Cíclope)
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i];
      let removed = false;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const hitX = Math.abs(b.x - e.x) <= e.radius + b.w * 0.5;
        const hitY = Math.abs(b.y - e.y) <= e.radius + b.h * 0.5;
        if (!hitX || !hitY) continue;

        // Punto débil estilo R-Type para los Jefes
        let mult = 1;
        if (e.kind === "cyclops") {
          const eyeDist = Math.hypot(b.x - (e.x - 26), b.y - (e.y - 12));
          if (eyeDist > 38 && b.type !== "wave") {
            mult = 0.2;
            sound.playShieldBlock();
          }
        } else if (e.kind === "zotra_boss" && b.type !== "wave") {
          // Comprobar si uno de los 3 prismas orbitales bloquea el disparo
          let blockedByPrism = false;
          for (let k = 0; k < 3; k++) {
            const ang = e.orbitAngle + (Math.PI * 2 * k) / 3;
            const px = e.x + Math.cos(ang) * 86;
            const py = e.y + Math.sin(ang) * 76;
            if (Math.hypot(b.x - px, b.y - py) < 18) {
              blockedByPrism = true;
              break;
            }
          }
          if (blockedByPrism) {
            sound.playShieldBlock();
            this.particles.burst(b.x, b.y, "#2ef2d5", 5, 110, 2.5, 0.16);
            this.playerBullets.splice(i, 1);
            removed = true;
            break;
          }
        }

        if (b.pierce) {
          const dealt = Math.min(e.hp, b.pierceBudget * mult);
          e.hp -= dealt;
          b.pierceBudget -= Math.max(1, dealt);
          e.flash = 0.08;
          this.particles.burst(e.x - 12, b.y, b.color, 7, 160, 3.2, 0.22);
          if (e.hp <= 0) this.destroyEnemy(j);
          if (b.pierceBudget <= 0) {
            this.playerBullets.splice(i, 1);
            removed = true;
            break;
          }
        } else {
          e.hp -= b.damage * mult;
          if (mult >= 1) e.flash = 0.06;
          this.particles.burst(b.x, b.y, mult < 1 ? "#a8b8e8" : b.color, 4, 120, 2.5, 0.18);
          this.playerBullets.splice(i, 1);
          removed = true;
          if (e.hp <= 0) this.destroyEnemy(j);
          break;
        }
      }

      if (removed) continue;
    }

    if (!this.player.alive || this.player.invuln > 0) return;

    // 4. Colisión del jugador con techo/suelo del templo
    if (this.level.isPointInTerrain(this.player.x, this.player.y, 7)) {
      if (this.player.hit(this.particles)) {
        this.shake = 9;
        // Asegurar respawn seguro en medio del pasillo
        const safeY = (this.level.getCeilingY(130) + this.level.getFloorY(130)) * 0.5;
        this.player.y = safeY;
      }
      return;
    }

    // 5. Balas enemigas contra Odiseus
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      const dist = Math.hypot(eb.x - this.player.x, eb.y - this.player.y);
      if (dist <= PLAYER.hitboxRadius + eb.radius) {
        this.enemyBullets.splice(i, 1);
        if (this.player.hit(this.particles)) {
          this.shake = 8;
        }
        return;
      }
    }

    // 6. Enemigos (y rayo del Cíclope) contra Odiseus
    for (const e of this.enemies) {
      if (e.kind === "cyclops" && e.beamActive) {
        const beamHalf = e.phase2 ? 28 : 22;
        const inBeamY = Math.abs(this.player.y - e.y) < beamHalf;
        const inBeamX = this.player.x < e.x - 20;
        const podBlocks =
          this.pod.x > this.player.x &&
          this.pod.x < e.x &&
          Math.abs(this.pod.y - e.y) < beamHalf;
        if (podBlocks) this.pod.onBlock();
        if (inBeamY && inBeamX && !podBlocks) {
          if (this.player.hit(this.particles)) this.shake = 10;
          return;
        }
      }

      const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (dist <= PLAYER.hitboxRadius + e.radius * 0.78) {
        if (this.player.hit(this.particles)) this.shake = 9;
        return;
      }
    }
  }

  destroyEnemy(index) {
    const e = this.enemies[index];
    this.enemies.splice(index, 1);
    this.score += e.score;
    this.highScore = Math.max(this.highScore, this.score);

    if (e.drop) {
      this.powerUps.push({
        type: e.drop,
        x: e.x,
        y: e.y,
        t: 0,
      });
    }

    const isBoss = Boolean(e.isBoss);
    sound.playExplosion(isBoss);
    this.particles.floatingText(e.x, e.y - 10, `+${e.score}`, isBoss ? COLORS.goldBright : COLORS.white, isBoss ? 1.4 : 0.65);

    if (isBoss) {
      this.enemyBullets = [];
      this.bossDying = { x: e.x, y: e.y, timer: 1.75, blastTimer: 0 };
      this.shake = 14;
      this.hitstop = 0.08;
      return;
    }

    this.particles.explosion(e.x, e.y, 1.05);
    this.shake = 4;
    this.hitstop = 0.016;
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();

    if (this.shake > 0.2) {
      const sx = (Math.random() - 0.5) * this.shake;
      const sy = (Math.random() - 0.5) * this.shake;
      ctx.translate(sx, sy);
    }

    if (this.currentStage === 2) {
      this.brawler.draw(ctx, this.particles);
      ctx.restore();
      this.drawHud(ctx);
      this.drawOverlays(ctx);
      return;
    }

    this.level.drawBackground(ctx);

    // Power-ups flotantes (Cristales estilo R-Type)
    for (const pu of this.powerUps) {
      const meta = POWERUP_META[pu.type] || POWERUP_META.weapon;
      ctx.save();
      ctx.translate(pu.x, pu.y);
      ctx.shadowColor = meta.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#0b1330";
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = meta.color;
      ctx.font = "800 13px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(meta.label, 0, 1);
      ctx.restore();
    }

    // Balas y láseres del jugador
    for (const b of this.playerBullets) {
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = b.type === "wave" ? 18 : 9;
      if (b.type === "wave") {
        const grad = ctx.createLinearGradient(b.x - b.w * 0.5, b.y, b.x + b.w * 0.5, b.y);
        grad.addColorStop(0, "rgba(0, 229, 255, 0.2)");
        grad.addColorStop(0.5, b.color);
        grad.addColorStop(1, COLORS.white);
        ctx.fillStyle = grad;
        ctx.fillRect(b.x - b.w * 0.5, b.y - b.h * 0.5, b.w, b.h);
      } else if (b.type === "rebound") {
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy, b.vx));
        ctx.fillStyle = COLORS.cyan;
        ctx.fillRect(-b.w * 0.5, -b.h * 0.5, b.w, b.h);
        ctx.fillStyle = COLORS.white;
        ctx.fillRect(-b.w * 0.35, -1, b.w * 0.7, 2);
      } else if (b.type === "missile") {
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy, b.vx));
        ctx.fillStyle = COLORS.white;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-6, -4);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x - b.w * 0.5, b.y - b.h * 0.5, b.w, b.h);
      }
      ctx.restore();
    }

    // Enemigos
    for (const e of this.enemies) {
      drawEnemy(ctx, e);
    }

    // Jugador y Nono-Pod
    this.player.draw(ctx, this.time);
    this.pod.draw(ctx);

    // Balas enemigas
    for (const eb of this.enemyBullets) {
      ctx.fillStyle = eb.color;
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.white;
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, eb.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    this.particles.draw(ctx);
    ctx.restore();

    this.drawHud(ctx);
    this.drawOverlays(ctx);
  }

  drawHud(ctx) {
    const playH = this.level.getPlayableBottom();
    ctx.save();

    // Barra superior de jefe (Nave o Centurión)
    const boss = this.currentStage === 2
      ? this.brawler.enemies.find((e) => e.isBoss)
      : this.enemies.find((e) => e.isBoss);
    ctx.textAlign = "center";
    ctx.font = "700 12px 'Segoe UI', system-ui, sans-serif";
    if (boss) {
      ctx.fillStyle = boss.phase2 ? COLORS.magenta : COLORS.crimson;
      ctx.fillText(boss.phase2 ? boss.bossPhase2Name : boss.bossName || boss.name, WIDTH * 0.5, 18);
      const bw = 280;
      const bx = WIDTH * 0.5 - bw * 0.5;
      ctx.fillStyle = "rgba(6, 10, 26, 0.85)";
      ctx.fillRect(bx, 23, bw, 9);
      ctx.fillStyle = boss.phase2 ? COLORS.magenta : COLORS.crimson;
      ctx.fillRect(bx + 1, 24, (bw - 2) * Math.max(0, boss.hp / boss.maxHp), 7);
      ctx.strokeStyle = COLORS.gold;
      ctx.strokeRect(bx, 23, bw, 9);
    }

    // Panel inferior clásico estilo cabina arcade R-Type
    ctx.fillStyle = "#05091a";
    ctx.fillRect(0, playH, WIDTH, HEIGHT - playH);
    ctx.fillStyle = "#243770";
    ctx.fillRect(0, playH, WIDTH, 2);

    // 1. Puntuación y Vidas (izquierda)
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.gold;
    ctx.font = "800 14px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(`1P  ${String(this.score).padStart(7, "0")}`, 16, playH + 19);

    ctx.fillStyle = "#8ea0cc";
    ctx.font = "700 11px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("NAVES", 16, playH + 35);
    for (let i = 0; i < this.player.lives; i++) {
      const lx = 68 + i * 20;
      const ly = playH + 31;
      ctx.fillStyle = COLORS.crimson;
      ctx.beginPath();
      ctx.moveTo(lx + 8, ly);
      ctx.lineTo(lx - 6, ly - 5);
      ctx.lineTo(lx - 4, ly);
      ctx.lineTo(lx - 6, ly + 5);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Barra central: ENERGÍA DE ULISES (Fase 2) o BEAM WAVE CANNON (Fases de Nave)
    const bw = 250;
    const bh = 14;
    const bx = WIDTH * 0.5 - bw * 0.5;
    const by = playH + 19;

    ctx.textAlign = "center";
    if (this.currentStage === 2) {
      ctx.fillStyle = COLORS.emerald;
      ctx.font = "800 11px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("ULISES  //  ENERGÍA DE TRAJE", WIDTH * 0.5, playH + 14);
      ctx.fillStyle = "#0d1636";
      ctx.fillRect(bx, by, bw, bh);
      const hpRatio = Math.max(0, this.brawler.player.hp / this.brawler.player.maxHp);
      ctx.fillStyle = hpRatio > 0.35 ? COLORS.emerald : COLORS.crimson;
      ctx.fillRect(bx + 1, by + 1, (bw - 2) * hpRatio, bh - 2);
      ctx.strokeStyle = "#4b69bd";
      ctx.strokeRect(bx, by, bw, bh);

      ctx.textAlign = "right";
      ctx.fillStyle = COLORS.cyan;
      ctx.font = "800 11px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("Z: SABLE LÁSER · X: PISTOLA · V: SALTO", WIDTH - 16, playH + 28);
      ctx.restore();
      return;
    }

    ctx.fillStyle = COLORS.cyan;
    ctx.font = "800 11px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("BEAM  //  WAVE CANNON", WIDTH * 0.5, playH + 14);

    ctx.fillStyle = "#0d1636";
    ctx.fillRect(bx, by, bw, bh);

    const ratio = this.player.chargeRatio;
    if (ratio > 0) {
      const fillW = (bw - 2) * ratio;
      ctx.fillStyle = ratio > 0.85 ? COLORS.magenta : ratio >= 0.28 ? COLORS.gold : COLORS.cyan;
      ctx.fillRect(bx + 1, by + 1, fillW, bh - 2);
    }
    // Segmentos arcade de la barra BEAM
    ctx.fillStyle = "#05091a";
    for (let s = 1; s < 10; s++) {
      ctx.fillRect(bx + (bw / 10) * s, by, 2, bh);
    }
    ctx.strokeStyle = "#4b69bd";
    ctx.strokeRect(bx, by, bw, bh);

    // 3. Cristal activo + Estado del Nono-Pod (derecha)
    ctx.textAlign = "right";
    const crystalNames = {
      red: "CRISTAL [R] HELICOIDAL",
      blue: "CRISTAL [B] REBOTE",
      yellow: "CRISTAL [Y] RASTRERO",
    };
    const crystalColors = {
      red: COLORS.crimson,
      blue: COLORS.cyan,
      yellow: COLORS.goldBright,
    };
    ctx.fillStyle = this.player.crystal ? crystalColors[this.player.crystal] : "#8ea0cc";
    ctx.font = "800 12px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(
      this.player.crystal ? crystalNames[this.player.crystal] : `ARMA NV.${this.player.weaponLevel}`,
      WIDTH - 16,
      playH + 18
    );

    const extras = [
      this.player.splitMode ? "3 MÓDULOS" : "ACOPLADO",
      this.pod.statusLabel,
      this.player.hasMissiles ? "MISILES" : null,
      this.player.hasShield ? "ESCUDO" : null,
    ].filter(Boolean);
    ctx.fillStyle = this.pod.isAttached ? COLORS.cyan : COLORS.magenta;
    ctx.font = "700 11px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(extras.join(" · "), WIDTH - 16, playH + 35);

    // Banner dramático del Episodio 01 / Alerta Jefe
    if (this.level.bannerTimer > 0 && this.state === "playing") {
      ctx.globalAlpha = Math.min(1, this.level.bannerTimer);
      ctx.textAlign = "center";
      ctx.font = "900 24px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = this.level.bossSpawned ? COLORS.crimson : COLORS.gold;
      ctx.fillText(this.level.bannerText, WIDTH * 0.5, playH * 0.25);
      if (this.level.bannerSub) {
        ctx.font = "700 13px 'Segoe UI', system-ui, sans-serif";
        ctx.fillStyle = COLORS.cyan;
        ctx.fillText(this.level.bannerSub, WIDTH * 0.5, playH * 0.31);
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  drawOverlays(ctx) {
    if (this.state === "playing") return;

    ctx.save();
    ctx.fillStyle = "rgba(4, 7, 22, 0.72)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = "center";

    if (this.state === "title") {
      ctx.fillStyle = "#d91624";
      ctx.beginPath();
      ctx.moveTo(WIDTH * 0.5 - 195, HEIGHT * 0.15);
      ctx.lineTo(WIDTH * 0.5 + 195, HEIGHT * 0.15);
      ctx.lineTo(WIDTH * 0.5 + 95, HEIGHT * 0.32);
      ctx.lineTo(WIDTH * 0.5 - 95, HEIGHT * 0.32);
      ctx.closePath();
      ctx.fill();

      ctx.font = "900 54px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = "#5c070e";
      ctx.fillText("ULISES 31", WIDTH * 0.5 + 3, HEIGHT * 0.27 + 3);
      ctx.fillStyle = COLORS.gold;
      ctx.fillText("ULISES 31", WIDTH * 0.5, HEIGHT * 0.27);

      ctx.fillStyle = COLORS.cyan;
      ctx.font = "700 16px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("EPISODIO 01: EL CÍCLOPE — LA MALDICIÓN DE LOS DIOSES", WIDTH * 0.5, HEIGHT * 0.39);

      ctx.fillStyle = COLORS.white;
      ctx.font = "500 14px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("Cristales R-Type para Nono-Pod: [R] Helicoidal · [B] Rebote · [Y] Rastrero", WIDTH * 0.5, HEIGHT * 0.5);
      ctx.fillText("Mantén C para autofire o Z / ESPACIO para cargar el BEAM", WIDTH * 0.5, HEIGHT * 0.56);

      ctx.fillStyle = COLORS.goldBright;
      ctx.font = "800 18px 'Segoe UI', system-ui, sans-serif";
      if (Math.floor(this.time * 2.5) % 2 === 0) {
        ctx.fillText("PULSA ENTER, ESPACIO O START PARA DESPEGAR", WIDTH * 0.5, HEIGHT * 0.69);
      }
    } else if (this.state === "paused") {
      ctx.fillStyle = COLORS.cyan;
      ctx.font = "800 36px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("PAUSA", WIDTH * 0.5, HEIGHT * 0.45);
      ctx.fillStyle = COLORS.white;
      ctx.font = "500 15px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("Pulsa P, ESC o START para continuar", WIDTH * 0.5, HEIGHT * 0.53);
    } else if (this.state === "gameover") {
      ctx.fillStyle = COLORS.crimson;
      ctx.font = "800 40px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("LA MALDICIÓN DE LOS DIOSES", WIDTH * 0.5, HEIGHT * 0.4);
      ctx.fillStyle = COLORS.white;
      ctx.font = "600 18px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(`PUNTUACIÓN FINAL: ${this.score}   ·   RÉCORD: ${this.highScore}`, WIDTH * 0.5, HEIGHT * 0.51);
      ctx.fillStyle = COLORS.gold;
      ctx.font = "700 16px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("Pulsa ENTER, R o START para reintentar", WIDTH * 0.5, HEIGHT * 0.62);
    } else if (this.state === "stageclear") {
      const nextLabel = this.currentStage === 1
        ? "SIGUIENTE: FASE 2 — ASALTO AL TEMPLO CON ULISES (FINAL FIGHT)"
        : "SIGUIENTE: FASE 3 — EPISODIO 02: EL PLANETA PERDIDO (ZOTRA)";
      ctx.fillStyle = COLORS.gold;
      ctx.font = "800 38px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(`¡FASE ${this.currentStage} COMPLETADA!`, WIDTH * 0.5, HEIGHT * 0.36);
      ctx.fillStyle = COLORS.cyan;
      ctx.font = "600 16px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(nextLabel, WIDTH * 0.5, HEIGHT * 0.46);
      ctx.fillStyle = COLORS.white;
      ctx.font = "600 16px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(`PUNTUACIÓN ACTUAL: ${this.score}   ·   TUS MEJORAS SE CONSERVAN`, WIDTH * 0.5, HEIGHT * 0.55);
      ctx.fillStyle = COLORS.goldBright;
      ctx.font = "800 17px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("PULSA ENTER, ESPACIO, START O TOCA PARA CONTINUAR", WIDTH * 0.5, HEIGHT * 0.67);
    } else if (this.state === "victory") {
      ctx.fillStyle = COLORS.gold;
      ctx.font = "800 38px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("¡PLANETA ZOTRA LIBERADO!", WIDTH * 0.5, HEIGHT * 0.36);
      ctx.fillStyle = "#2ef2d5";
      ctx.font = "600 17px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("EPISODIOS 01 Y 02 COMPLETADOS — LA ODISEA CONTINÚA", WIDTH * 0.5, HEIGHT * 0.46);
      ctx.fillStyle = COLORS.white;
      ctx.font = "600 17px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(`PUNTUACIÓN FINAL: ${this.score}   ·   RÉCORD: ${this.highScore}`, WIDTH * 0.5, HEIGHT * 0.56);
      ctx.fillStyle = COLORS.gold;
      ctx.font = "700 16px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("Pulsa ENTER, R o START para jugar de nuevo", WIDTH * 0.5, HEIGHT * 0.67);
    }

    ctx.restore();
  }
}
