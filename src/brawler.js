import { COLORS, HEIGHT, WIDTH } from "./constants.js";
import { sound } from "./audio.js";
import { sprites } from "./sprites.js";

const FLOOR_TOP = 265;
const FLOOR_BOTTOM = HEIGHT - 54;
const STAGE_LENGTH = 2600;

export class BrawlerMode {
  constructor() {
    this.reset();
  }

  reset() {
    this.cameraX = 0;
    this.maxCameraX = 680;
    this.time = 0;
    this.goTimer = 0;
    this.bannerText = "FASE 2: ASALTO AL TEMPLO DEL CÍCLOPE";
    this.bannerSub = "MANEJO DE ULISES ESTILO FINAL FIGHT";
    this.bannerTimer = 3.6;

    this.player = {
      x: 160,
      y: 375,
      z: 0, // altura de salto (>= 0)
      vz: 0,
      facing: 1, // 1 derecha, -1 izquierda
      hp: 100,
      maxHp: 100,
      invuln: 0,
      attackTimer: 0,
      attackCooldown: 0,
      comboStep: 0,
      laserCooldown: 0,
      walkPhase: 0,
    };

    this.nono = { x: 105, y: 345 };
    this.projectiles = [];
    this.enemies = [];
    this.pickups = [];
    this.props = [
      { x: 480, y: 330, hp: 2, drop: "nectar" },
      { x: 1120, y: 410, hp: 2, drop: "nectar" },
      { x: 1850, y: 345, hp: 2, drop: "nectar" },
    ];

    this.waveIndex = 0;
    this.waves = [
      {
        lockX: 0,
        maxCam: 750,
        spawn: () => {
          this.spawnSoldier(780, 330);
          this.spawnSoldier(860, 420);
          this.spawnSoldier(920, 365);
        },
      },
      {
        lockX: 700,
        maxCam: 1550,
        spawn: () => {
          this.spawnSoldier(this.cameraX + WIDTH + 50, 320);
          this.spawnSoldier(this.cameraX + WIDTH + 120, 430);
          this.spawnSoldier(this.cameraX - 50, 380);
          this.spawnSoldier(this.cameraX + WIDTH + 180, 365);
        },
      },
      {
        lockX: 1500,
        maxCam: STAGE_LENGTH - WIDTH,
        spawn: () => {
          this.bannerText = "¡ALERTA! CENTURIÓN DEL CÍCLOPE";
          this.bannerSub = "ESQUIVA SU HACHA TRIDENTE Y CONTRAATACA";
          this.bannerTimer = 3.5;
          sound.setBossMode(true);
          sound.playWarning();
          this.spawnBoss(this.cameraX + WIDTH - 140, 380);
        },
      },
    ];

    // Lanzar oleada inicial
    this.waves[0].spawn();
    this.waveIndex = 1;
    sound.setStage(2);
    sound.setBossMode(false);
  }

  spawnSoldier(x, y) {
    this.enemies.push({
      kind: "soldier",
      x,
      y,
      hp: 36,
      maxHp: 36,
      speed: 105 + Math.random() * 25,
      facing: -1,
      attackTimer: 0.7 + Math.random() * 0.6,
      hitstun: 0,
      flash: 0,
      score: 220,
    });
  }

  spawnBoss(x, y) {
    this.enemies.push({
      kind: "centurion",
      isBoss: true,
      name: "CENTURIÓN DEL CÍCLOPE",
      x,
      y,
      hp: 220,
      maxHp: 220,
      speed: 86,
      facing: -1,
      attackTimer: 1.2,
      chargeTimer: 0,
      hitstun: 0,
      flash: 0,
      score: 5000,
    });
  }

  onJump(particles) {
    const p = this.player;
    if (p.z <= 1) {
      p.vz = 470;
      particles.burst(p.x, p.y, COLORS.cyan, 6, 90, 2.5, 0.2);
    }
  }

  onLaser(particles) {
    const p = this.player;
    if (p.laserCooldown > 0) return;
    p.laserCooldown = 0.42;
    sound.playLaser(2);
    const py = p.y - p.z - 52;
    this.projectiles.push({
      fromPlayer: true,
      x: p.x + p.facing * 32,
      y: p.y,
      drawY: py,
      vx: p.facing * 640,
      damage: 14,
      color: COLORS.cyan,
    });
    particles.flash(p.x + p.facing * 30, py, COLORS.cyan, 14, 0.08);
  }

  update(dt, input, particles, game) {
    this.time += dt;
    if (this.bannerTimer > 0) this.bannerTimer = Math.max(0, this.bannerTimer - dt);

    const p = this.player;
    if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
    if (p.attackTimer > 0) p.attackTimer = Math.max(0, p.attackTimer - dt);
    if (p.attackCooldown > 0) p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    if (p.laserCooldown > 0) p.laserCooldown = Math.max(0, p.laserCooldown - dt);

    // Movimiento 2.5D
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;

    if (dx !== 0) {
      p.facing = dx > 0 ? 1 : -1;
    }
    if (dx !== 0 || dy !== 0) {
      p.walkPhase += dt * 12;
    }

    const speedX = 245;
    const speedY = 165;
    p.x += dx * speedX * dt;
    p.y += dy * speedY * dt;

    p.y = Math.max(FLOOR_TOP + 12, Math.min(FLOOR_BOTTOM - 8, p.y));
    p.x = Math.max(this.cameraX + 36, Math.min(this.cameraX + WIDTH - 36, p.x));

    // Física de salto
    if (p.z > 0 || p.vz > 0) {
      p.z += p.vz * dt;
      p.vz -= 1250 * dt;
      if (p.z <= 0) {
        p.z = 0;
        p.vz = 0;
      }
    }

    // Ataque cuerpo a cuerpo con Sable Láser (combo 3 golpes o patada aérea)
    if ((input.fire || input.autofire) && p.attackCooldown <= 0) {
      p.attackTimer = 0.18;
      p.attackCooldown = 0.24;
      p.comboStep = (p.comboStep + 1) % 3;
      sound.playSwordSwing();

      const reach = p.comboStep === 2 ? 95 : 82;
      const dmg = p.z > 10 ? 22 : p.comboStep === 2 ? 24 : 15;

      // Golpear enemigos en rango (horizontal + profundidad Z/Y)
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const inFront = (e.x - p.x) * p.facing >= -18 && Math.abs(e.x - p.x) <= reach;
        const sameLane = Math.abs(e.y - p.y) <= 44;
        if (inFront && sameLane) {
          e.hp -= dmg;
          e.flash = 0.1;
          e.hitstun = e.isBoss ? 0.12 : 0.28;
          e.x += p.facing * (e.isBoss ? 8 : 22);
          sound.playMeleeHit();
          particles.burst(e.x, e.y - 50, COLORS.cyan, 10, 170, 3.5, 0.26);
          particles.flash(e.x, e.y - 50, COLORS.white, 18, 0.09);

          if (e.hp <= 0) {
            this.killEnemy(i, particles, game);
          }
        }
      }

      // Romper ánforas / cajas de energía
      for (let i = this.props.length - 1; i >= 0; i--) {
        const pr = this.props[i];
        if (Math.abs(pr.x - p.x) <= reach && Math.abs(pr.y - p.y) <= 42) {
          pr.hp -= 1;
          particles.burst(pr.x, pr.y - 24, COLORS.goldBright, 8, 130, 3, 0.24);
          if (pr.hp <= 0) {
            this.pickups.push({ x: pr.x, y: pr.y, type: pr.drop });
            this.props.splice(i, 1);
            sound.playExplosion(false);
          }
        }
      }
    }

    // Nono sigue a Ulises flotando
    const targetNonoX = p.x - p.facing * 52;
    const targetNonoY = p.y - p.z - 55 + Math.sin(this.time * 4) * 6;
    this.nono.x += (targetNonoX - this.nono.x) * Math.min(1, dt * 6);
    this.nono.y += (targetNonoY - this.nono.y) * Math.min(1, dt * 6);

    // Proyectiles láser
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const b = this.projectiles[i];
      b.x += b.vx * dt;
      if (b.x < this.cameraX - 40 || b.x > this.cameraX + WIDTH + 40) {
        this.projectiles.splice(i, 1);
        continue;
      }
      if (b.fromPlayer) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (Math.abs(b.x - e.x) < 38 && Math.abs(b.y - e.y) < 42) {
            e.hp -= b.damage;
            e.flash = 0.08;
            sound.playMeleeHit();
            particles.burst(b.x, b.drawY, COLORS.cyan, 6, 130, 3, 0.2);
            this.projectiles.splice(i, 1);
            if (e.hp <= 0) this.killEnemy(j, particles, game);
            break;
          }
        }
      } else if (p.invuln <= 0 && p.z < 30 && Math.abs(b.x - p.x) < 26 && Math.abs(b.y - p.y) < 28) {
        this.projectiles.splice(i, 1);
        this.damagePlayer(14, particles, game);
      }
    }

    // Pickups (Néctar Olímpico)
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      if (Math.abs(pk.x - p.x) < 34 && Math.abs(pk.y - p.y) < 34) {
        p.hp = Math.min(p.maxHp, p.hp + 40);
        sound.playPowerUp();
        particles.floatingText(p.x, p.y - 80, "+40 ENERGÍA", COLORS.emerald, 1.0);
        this.pickups.splice(i, 1);
      }
    }

    // Actualizar enemigos
    for (const e of this.enemies) {
      if (e.flash > 0) e.flash = Math.max(0, e.flash - dt);
      if (e.hitstun > 0) {
        e.hitstun = Math.max(0, e.hitstun - dt);
        continue;
      }

      const dxE = p.x - e.x;
      const dyE = p.y - e.y;
      e.facing = dxE >= 0 ? 1 : -1;

      const stopDist = e.isBoss ? 72 : 54;
      if (Math.abs(dxE) > stopDist || Math.abs(dyE) > 22) {
        const dist = Math.hypot(dxE, dyE) || 1;
        e.x += (dxE / dist) * e.speed * dt;
        e.y += (dyE / dist) * e.speed * 0.72 * dt;
      } else {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = e.isBoss ? 1.15 : 1.35;
          if (p.invuln <= 0 && p.z < 32) {
            this.damagePlayer(e.isBoss ? 18 : 11, particles, game);
          }
        }
      }

      // El Centurión también lanza ondas de energía a media distancia
      if (e.isBoss && Math.abs(dxE) > 150) {
        e.chargeTimer += dt;
        if (e.chargeTimer >= 2.6) {
          e.chargeTimer = 0;
          sound.playLaser(1);
          this.projectiles.push({
            fromPlayer: false,
            x: e.x + e.facing * 40,
            y: e.y,
            drawY: e.y - 54,
            vx: e.facing * 320,
            damage: 14,
            color: COLORS.crimson,
          });
        }
      }
    }

    // Avance de cámara y oleadas estilo Final Fight ("GO! →")
    if (this.enemies.length === 0) {
      if (this.waveIndex < this.waves.length) {
        const nextWave = this.waves[this.waveIndex];
        this.maxCameraX = nextWave.maxCam;
        this.goTimer += dt;
        if (this.cameraX >= nextWave.lockX) {
          nextWave.spawn();
          this.waveIndex++;
          this.goTimer = 0;
        }
      } else {
        // Jefe derrotado -> pasar a Fase 3 (Zotra)
        game.onBrawlerVictory();
        return;
      }
    }

    // Seguir a Ulises con la cámara hacia adelante
    const desiredCam = p.x - WIDTH * 0.36;
    if (desiredCam > this.cameraX) {
      this.cameraX = Math.min(this.maxCameraX, desiredCam);
    }

    particles.update(dt);
  }

  killEnemy(index, particles, game) {
    const e = this.enemies[index];
    this.enemies.splice(index, 1);
    game.score += e.score;
    game.highScore = Math.max(game.highScore, game.score);
    sound.playExplosion(Boolean(e.isBoss));
    particles.explosion(e.x, e.y - 50, e.isBoss ? 2.1 : 1.1);
    particles.floatingText(e.x, e.y - 80, `+${e.score}`, COLORS.goldBright, 0.9);
    game.shake = e.isBoss ? 14 : 5;
  }

  damagePlayer(amount, particles, game) {
    const p = this.player;
    p.hp -= amount;
    p.invuln = 1.05;
    sound.playExplosion(false);
    particles.burst(p.x, p.y - 45, COLORS.crimson, 12, 160, 3.5, 0.3);
    game.shake = 7;

    if (p.hp <= 0) {
      game.player.lives -= 1;
      if (game.player.lives <= 0) {
        game.state = "gameover";
        sound.stopBgm();
      } else {
        p.hp = p.maxHp;
        p.invuln = 2.0;
        particles.floatingText(p.x, p.y - 80, "REANIMADO", COLORS.cyan, 1.0);
      }
    }
  }

  draw(ctx, particles) {
    const playH = HEIGHT - 44;

    // 1. Fondo interior del Templo del Cíclope con ventanales al espacio
    const wallGrad = ctx.createLinearGradient(0, 0, 0, FLOOR_TOP);
    wallGrad.addColorStop(0, "#0b1129");
    wallGrad.addColorStop(1, "#1c2a59");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, WIDTH, FLOOR_TOP);

    // Ventanales con estrellas + columnas dóricas con relieve
    const colSpacing = 220;
    const startCol = Math.floor(this.cameraX / colSpacing) - 1;
    for (let c = startCol; c <= startCol + 6; c++) {
      const sx = Math.floor(c * colSpacing - this.cameraX);

      // Ventanal espacial entre columnas
      ctx.fillStyle = "#040716";
      ctx.fillRect(sx + 64, 34, 118, 175);
      ctx.strokeStyle = COLORS.goldDark;
      ctx.lineWidth = 3;
      ctx.strokeRect(sx + 64, 34, 118, 175);

      // Estrellas dentro del ventanal
      ctx.fillStyle = COLORS.white;
      ctx.fillRect(sx + 88, 70, 2, 2);
      ctx.fillRect(sx + 135, 110, 2, 2);
      ctx.fillRect(sx + 110, 155, 2, 2);

      // Columna dórica acanalada
      ctx.fillStyle = "#cfd8f2";
      ctx.fillRect(sx, 18, 46, FLOOR_TOP - 18);
      ctx.fillStyle = "#8a9bc9";
      ctx.fillRect(sx + 8, 28, 6, FLOOR_TOP - 38);
      ctx.fillRect(sx + 20, 28, 6, FLOOR_TOP - 38);
      ctx.fillRect(sx + 32, 28, 6, FLOOR_TOP - 38);

      // Capitel y base dorada
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(sx - 6, 12, 58, 10);
      ctx.fillRect(sx - 6, FLOOR_TOP - 12, 58, 12);

      // Antorcha energética cian
      ctx.fillStyle = COLORS.cyan;
      ctx.beginPath();
      ctx.arc(sx + 23, 88, 5 + Math.sin(this.time * 10 + c) * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Suelo en perspectiva 2.5D estilo Final Fight
    const floorGrad = ctx.createLinearGradient(0, FLOOR_TOP, 0, playH);
    floorGrad.addColorStop(0, "#23305e");
    floorGrad.addColorStop(1, "#101736");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, FLOOR_TOP, WIDTH, playH - FLOOR_TOP);

    // Baldosas de mármol con líneas de perspectiva
    ctx.strokeStyle = "rgba(245, 197, 66, 0.22)";
    ctx.lineWidth = 1.5;
    for (let y = FLOOR_TOP + 36; y < playH; y += 44) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }
    const tileW = 110;
    const startTile = Math.floor(this.cameraX / tileW) - 1;
    for (let t = startTile; t <= startTile + 11; t++) {
      const tx = t * tileW - this.cameraX;
      ctx.beginPath();
      ctx.moveTo(tx, FLOOR_TOP);
      ctx.lineTo(tx - 45, playH);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Objetos rompibles (ánforas doradas)
    for (const pr of this.props) {
      ctx.fillStyle = COLORS.goldDark;
      ctx.beginPath();
      ctx.ellipse(pr.x, pr.y - 18, 14, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.goldBright;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Pickups de Néctar
    for (const pk of this.pickups) {
      ctx.fillStyle = COLORS.emerald;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y - 14, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.white;
      ctx.font = "800 11px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("+", pk.x, pk.y - 10);
    }

    // Ordenar entidades por profundidad Y (efecto 2.5D)
    const renderList = [
      { y: this.player.y, type: "player" },
      ...this.enemies.map((e) => ({ y: e.y, type: "enemy", e })),
    ].sort((a, b) => a.y - b.y);

    for (const item of renderList) {
      if (item.type === "player") {
        this.drawPlayer(ctx);
      } else {
        this.drawEnemy(ctx, item.e);
      }
    }

    // Nono flotando junto a Ulises
    ctx.save();
    ctx.translate(this.nono.x, this.nono.y);
    sprites.drawGrounded(ctx, "nono", 42, this.player.facing < 0);
    ctx.restore();

    // Proyectiles
    for (const b of this.projectiles) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - 12, b.drawY - 3, 24, 6);
      ctx.fillStyle = COLORS.white;
      ctx.fillRect(b.x - 8, b.drawY - 1, 16, 2);
    }

    particles.draw(ctx);
    ctx.restore();

    // Indicador "¡GO! →" cuando la zona está despejada
    if (this.enemies.length === 0 && this.waveIndex < this.waves.length && Math.floor(this.time * 4) % 2 === 0) {
      ctx.fillStyle = COLORS.goldBright;
      ctx.font = "900 28px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("GO! →", WIDTH - 28, 120);
    }

    // Banner de fase
    if (this.bannerTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.bannerTimer);
      ctx.textAlign = "center";
      ctx.font = "900 24px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = COLORS.gold;
      ctx.fillText(this.bannerText, WIDTH * 0.5, 110);
      ctx.font = "700 13px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = COLORS.cyan;
      ctx.fillText(this.bannerSub, WIDTH * 0.5, 134);
      ctx.restore();
    }
  }

  drawPlayer(ctx) {
    const p = this.player;
    // Sombra en el suelo
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (p.invuln > 0 && Math.floor(this.time * 16) % 2 === 0) return;

    ctx.save();
    const bob = p.z === 0 ? Math.abs(Math.sin(p.walkPhase)) * 3 : 0;
    ctx.translate(p.x, p.y - p.z - bob);

    // Arco luminoso del Sable Láser al atacar
    if (p.attackTimer > 0) {
      ctx.save();
      ctx.scale(p.facing, 1);
      ctx.strokeStyle = p.comboStep === 2 ? COLORS.goldBright : COLORS.cyan;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(24, -52, 46, -0.9, 0.9);
      ctx.stroke();
      ctx.restore();
    }

    sprites.drawGrounded(ctx, "ulises_hero", 108, p.facing < 0);
    ctx.restore();
  }

  drawEnemy(ctx, e) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, e.isBoss ? 44 : 26, e.isBoss ? 12 : 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.flash > 0) ctx.filter = "brightness(2.2) contrast(1.3)";
    const flipToRight = e.facing > 0;
    if (e.isBoss) {
      sprites.drawGrounded(ctx, "cyclops_centurion", 152, flipToRight);
    } else {
      sprites.drawGrounded(ctx, "trident_soldier", 104, flipToRight);
    }
    ctx.filter = "none";
    ctx.restore();
  }
}
