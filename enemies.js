import { COLORS, HEIGHT, WIDTH } from "./constants.js";
import { sound } from "./audio.js";
import { sprites } from "./sprites.js?v=2";

export function spawnTrident(x, y, phase = 0) {
  return {
    kind: "trident",
    x,
    y,
    baseY: y,
    vx: -200,
    radius: 15,
    hp: 2,
    maxHp: 2,
    score: 120,
    phase,
    t: 0,
    fireTimer: 1.2 + Math.random() * 0.9,
    flash: 0,
  };
}

export function spawnSphere(x, y, drop = null) {
  return {
    kind: "sphere",
    x,
    y,
    vx: -145,
    vy: (Math.random() < 0.5 ? -1 : 1) * 38,
    radius: 19,
    hp: 4.5,
    maxHp: 4.5,
    score: 250,
    drop,
    t: 0,
    fireTimer: 0.95,
    flash: 0,
  };
}

export function spawnSiren(x, y, drop = null) {
  return {
    kind: "siren",
    x,
    y,
    baseY: y,
    vx: -115,
    radius: 20,
    hp: 6,
    maxHp: 6,
    score: 380,
    drop,
    t: 0,
    fireTimer: 1.35,
    flash: 0,
  };
}

export function spawnTurret(x, y, onCeiling = false, scrollSpeed = 88) {
  return {
    kind: "turret",
    x,
    y,
    vx: -scrollSpeed,
    onCeiling,
    radius: 18,
    hp: 5.5,
    maxHp: 5.5,
    score: 300,
    t: 0,
    aimAngle: Math.PI,
    fireTimer: 1.1 + Math.random() * 0.7,
    flash: 0,
  };
}

export function spawnCyclopsBoss() {
  return {
    kind: "cyclops",
    isBoss: true,
    bossName: "CÍCLOPE MECÁNICO",
    bossPhase2Name: "CÍCLOPE MECÁNICO — FURIA DEL OLIMPO",
    x: WIDTH + 120,
    y: HEIGHT * 0.48,
    targetX: WIDTH - 130,
    vx: -72,
    vy: 70,
    radius: 64,
    hp: 150,
    maxHp: 150,
    phase2: false,
    score: 4500,
    t: 0,
    state: "entering",
    stateTimer: 2.2,
    fireTimer: 1.3,
    beamActive: false,
    flash: 0,
  };
}

export function spawnZotraSentinel(x, y, drop = null) {
  return {
    kind: "zotra_sentinel",
    x,
    y,
    baseY: y,
    vx: -130,
    radius: 22,
    hp: 7,
    maxHp: 7,
    score: 420,
    drop,
    t: 0,
    fireTimer: 1.25,
    flash: 0,
  };
}

export function spawnZotraBoss() {
  return {
    kind: "zotra_boss",
    isBoss: true,
    bossName: "HECHICERA DE CRISTAL DE ZOTRA",
    bossPhase2Name: "HECHICERA DE ZOTRA — IRA CRISTALINA",
    x: WIDTH + 140,
    y: HEIGHT * 0.46,
    targetX: WIDTH - 145,
    vx: -68,
    vy: 64,
    radius: 70,
    hp: 185,
    maxHp: 185,
    phase2: false,
    score: 6500,
    t: 0,
    orbitAngle: 0,
    spiralAngle: 0,
    state: "entering", // entering | spiral | prism_burst
    stateTimer: 3.4,
    fireTimer: 0.45,
    flash: 0,
  };
}

function aimAtPlayer(fromX, fromY, player, speed) {
  const dx = player.x - fromX;
  const dy = player.y - fromY;
  const dist = Math.hypot(dx, dy) || 1;
  return {
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
  };
}

export function updateEnemy(e, dt, player, enemyBullets, enemies, particles) {
  e.t += dt;
  if (e.flash > 0) e.flash = Math.max(0, e.flash - dt);

  if (e.kind === "trident") {
    e.x += e.vx * dt;
    e.y = e.baseY + Math.sin(e.t * 4.2 + e.phase) * 52;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0 && e.x < WIDTH - 40 && e.x > 160) {
      e.fireTimer = 2.05;
      const v = aimAtPlayer(e.x - 14, e.y, player, 235);
      enemyBullets.push({
        x: e.x - 14,
        y: e.y,
        vx: v.vx,
        vy: v.vy,
        radius: 4.5,
        color: COLORS.magenta,
      });
    }
    return e.x > -60;
  }

  if (e.kind === "sphere") {
    const slowFactor = e.x > 460 && e.x < 730 ? 0.45 : 1;
    e.x += e.vx * slowFactor * dt;
    e.y += e.vy * dt;
    if (e.y < 52 || e.y > HEIGHT - 52) e.vy *= -1;

    e.fireTimer -= dt;
    if (e.fireTimer <= 0 && e.x < WIDTH - 30 && e.x > 140) {
      e.fireTimer = 1.6;
      const baseAngle = Math.atan2(player.y - e.y, player.x - e.x);
      for (const offset of [-0.18, 0, 0.18]) {
        const a = baseAngle + offset;
        enemyBullets.push({
          x: e.x - 14,
          y: e.y,
          vx: Math.cos(a) * 245,
          vy: Math.sin(a) * 245,
          radius: 5,
          color: COLORS.orange,
        });
      }
    }
    return e.x > -60;
  }

  if (e.kind === "siren") {
    const hover = e.x < 680 && e.x > 420 ? 0.35 : 1;
    e.x += e.vx * hover * dt;
    e.y = e.baseY + Math.sin(e.t * 2.5) * 65;

    e.fireTimer -= dt;
    if (e.fireTimer <= 0 && e.x < WIDTH - 20 && e.x > 120) {
      e.fireTimer = 1.75;
      const count = 6;
      const base = Math.atan2(player.y - e.y, player.x - e.x);
      for (let i = 0; i < count; i++) {
        const a = base + (i - (count - 1) / 2) * 0.22;
        enemyBullets.push({
          x: e.x - 12,
          y: e.y,
          vx: Math.cos(a) * 215,
          vy: Math.sin(a) * 215,
          radius: 5.5,
          color: COLORS.cyan,
        });
      }
    }
    return e.x > -70;
  }

  if (e.kind === "turret") {
    e.x += e.vx * dt;
    e.aimAngle = Math.atan2(player.y - e.y, player.x - e.x);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0 && e.x < WIDTH - 20 && e.x > 80) {
      e.fireTimer = 1.8;
      enemyBullets.push({
        x: e.x + Math.cos(e.aimAngle) * 18,
        y: e.y + Math.sin(e.aimAngle) * 18,
        vx: Math.cos(e.aimAngle) * 260,
        vy: Math.sin(e.aimAngle) * 260,
        radius: 5,
        color: COLORS.gold,
      });
    }
    return e.x > -90;
  }

  if (e.kind === "cyclops") {
    // Transición a Fase 2 al 50% de vida
    if (!e.phase2 && e.hp <= e.maxHp * 0.5) {
      e.phase2 = true;
      e.vy = Math.sign(e.vy || 1) * 105;
      particles.ring(e.x, e.y, COLORS.magenta, 120, 0.55);
      particles.floatingText(e.x - 40, e.y - 68, "¡FURIA DEL OLIMPO!", COLORS.crimson, 1.4);
      sound.playWarning();
    }

    if (e.state === "entering") {
      e.x += e.vx * dt;
      if (e.x <= e.targetX) {
        e.x = e.targetX;
        e.state = "patrol";
        e.stateTimer = 3.0;
      }
      return true;
    }

    if (e.state === "patrol") {
      e.y += e.vy * dt;
      if (e.y < 105) {
        e.y = 105;
        e.vy = Math.abs(e.vy);
      } else if (e.y > HEIGHT - 105) {
        e.y = HEIGHT - 105;
        e.vy = -Math.abs(e.vy);
      }

      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = e.phase2 ? 0.95 : 1.25;
        const base = Math.atan2(player.y - e.y, player.x - (e.x - 24));
        const spread = e.phase2
          ? [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45]
          : [-0.34, -0.17, 0, 0.17, 0.34];
        for (const off of spread) {
          const a = base + off;
          enemyBullets.push({
            x: e.x - 24,
            y: e.y,
            vx: Math.cos(a) * (e.phase2 ? 275 : 245),
            vy: Math.sin(a) * (e.phase2 ? 275 : 245),
            radius: 6,
            color: e.phase2 ? COLORS.crimson : COLORS.magenta,
          });
        }
      }

      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = "charging";
        e.stateTimer = e.phase2 ? 0.95 : 1.15;
        if (enemies.length < 4) {
          enemies.push(spawnTrident(WIDTH + 30, Math.random() < 0.5 ? 110 : HEIGHT - 110, Math.random() * 3));
        }
      }
    } else if (e.state === "charging") {
      e.stateTimer -= dt;
      if (Math.random() < 0.7) {
        particles.emit(
          e.x - 28 + (Math.random() - 0.5) * 24,
          e.y + (Math.random() - 0.5) * 24,
          -55,
          0,
          e.phase2 ? COLORS.magenta : COLORS.crimson,
          3.8,
          0.22
        );
      }
      if (e.stateTimer <= 0) {
        e.state = "beam";
        e.stateTimer = e.phase2 ? 1.3 : 1.15;
        e.beamActive = true;
        sound.playWaveCannon(0.95);
      }
    } else if (e.state === "beam") {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.beamActive = false;
        e.state = "patrol";
        e.stateTimer = e.phase2 ? 2.6 : 3.3;
      }
    }
    return true;
  }

  if (e.kind === "zotra_sentinel") {
    const hover = e.x < 700 && e.x > 460 ? 0.3 : 1;
    e.x += e.vx * hover * dt;
    e.y = e.baseY + Math.sin(e.t * 2.1) * 44;

    e.fireTimer -= dt;
    if (e.fireTimer <= 0 && e.x < WIDTH - 20 && e.x > 130) {
      e.fireTimer = 1.65;
      // Disparo en cruz cristalina hacia el jugador + diagonales
      const base = Math.atan2(player.y - e.y, player.x - e.x);
      for (const off of [-0.45, -0.15, 0.15, 0.45]) {
        const a = base + off;
        enemyBullets.push({
          x: e.x - 20,
          y: e.y,
          vx: Math.cos(a) * 235,
          vy: Math.sin(a) * 235,
          radius: 5.5,
          color: "#2ef2d5",
        });
      }
    }
    return e.x > -75;
  }

  if (e.kind === "zotra_boss") {
    e.orbitAngle += dt * (e.phase2 ? 2.6 : 1.55);

    if (!e.phase2 && e.hp <= e.maxHp * 0.5) {
      e.phase2 = true;
      e.vy = Math.sign(e.vy || 1) * 96;
      particles.ring(e.x, e.y, "#2ef2d5", 130, 0.6);
      particles.floatingText(e.x - 45, e.y - 72, "¡IRA DE ZOTRA!", COLORS.magenta, 1.45);
      sound.playWarning();
    }

    if (e.state === "entering") {
      e.x += e.vx * dt;
      if (e.x <= e.targetX) {
        e.x = e.targetX;
        e.state = "spiral";
        e.stateTimer = 4.2;
      }
      return true;
    }

    // Desplazamiento vertical fluido dentro de la cámara cristalina
    e.y += e.vy * dt;
    if (e.y < 115) {
      e.y = 115;
      e.vy = Math.abs(e.vy);
    } else if (e.y > HEIGHT - 155) {
      e.y = HEIGHT - 155;
      e.vy = -Math.abs(e.vy);
    }

    if (e.state === "spiral") {
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = e.phase2 ? 0.24 : 0.34;
        e.spiralAngle += e.phase2 ? 0.48 : 0.38;
        const arms = e.phase2 ? 3 : 2;
        for (let i = 0; i < arms; i++) {
          const a = Math.PI + Math.sin(e.spiralAngle) * 0.85 + (i - (arms - 1) / 2) * 0.42;
          enemyBullets.push({
            x: e.x - 16,
            y: e.y + 8,
            vx: Math.cos(a) * (e.phase2 ? 255 : 220),
            vy: Math.sin(a) * (e.phase2 ? 255 : 220),
            radius: 5.5,
            color: i % 2 === 0 ? COLORS.magenta : "#2ef2d5",
          });
        }
      }
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = "prism_burst";
        e.stateTimer = 2.8;
        e.fireTimer = 0.5;
        if (enemies.length < 3) {
          enemies.push(spawnSiren(WIDTH + 40, Math.random() < 0.5 ? 120 : HEIGHT - 160));
        }
      }
    } else if (e.state === "prism_burst") {
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = e.phase2 ? 0.72 : 0.95;
        // Cada uno de los 3 prismas orbitales dispara un orbe dirigido hacia Ulises
        for (let k = 0; k < 3; k++) {
          const ang = e.orbitAngle + (Math.PI * 2 * k) / 3;
          const px = e.x + Math.cos(ang) * 86;
          const py = e.y + Math.sin(ang) * 76;
          const v = aimAtPlayer(px, py, player, e.phase2 ? 270 : 235);
          enemyBullets.push({
            x: px,
            y: py,
            vx: v.vx,
            vy: v.vy,
            radius: 6,
            color: "#2ef2d5",
          });
          particles.burst(px, py, "#2ef2d5", 4, 90, 2.5, 0.16);
        }
      }
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = "spiral";
        e.stateTimer = 4.0;
        e.fireTimer = 0.35;
      }
    }
    return true;
  }

  return true;
}

export function drawEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);

  const hitFlash = e.flash > 0;

  if (hitFlash) {
    ctx.filter = "brightness(2.2) contrast(1.3)";
  }

  if (e.kind === "trident") {
    // Llama trasera rosada/naranja estilo cromo 91
    ctx.fillStyle = Math.floor(e.t * 20) % 2 === 0 ? COLORS.magenta : COLORS.orange;
    ctx.beginPath();
    ctx.moveTo(26, -4);
    ctx.lineTo(42 + Math.sin(e.t * 30) * 5, 0);
    ctx.lineTo(26, 4);
    ctx.closePath();
    ctx.fill();

    sprites.drawCentered(ctx, "trident", 58);
  } else if (e.kind === "sphere") {
    if (e.drop) {
      ctx.strokeStyle = COLORS.goldBright;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 7, e.t * 2, e.t * 2 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    sprites.drawCentered(ctx, "sphere", 44);
  } else if (e.kind === "siren") {
    if (e.drop) {
      ctx.strokeStyle = COLORS.goldBright;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    sprites.drawCentered(ctx, "siren", 64);
  } else if (e.kind === "turret") {
    // Pedestal de templo griego
    ctx.fillStyle = hitFlash ? COLORS.white : COLORS.ruinMarble;
    const baseY = e.onCeiling ? -14 : 4;
    ctx.fillRect(-18, baseY, 36, 12);
    ctx.fillStyle = COLORS.goldDark;
    ctx.fillRect(-20, e.onCeiling ? -4 : 2, 40, 4);

    ctx.fillStyle = hitFlash ? COLORS.white : "#283973";
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.rotate(e.aimAngle);
    ctx.fillStyle = COLORS.goldBright;
    ctx.fillRect(0, -3.2, 21, 6.4);
  } else if (e.kind === "cyclops") {
    const beamHalf = e.phase2 ? 30 : 24;

    if (e.state === "charging") {
      ctx.save();
      ctx.strokeStyle = e.phase2 ? "rgba(255, 46, 147, 0.85)" : "rgba(255, 56, 92, 0.7)";
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = e.phase2 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.lineTo(-WIDTH, 0);
      ctx.stroke();
      ctx.restore();
    } else if (e.state === "beam") {
      ctx.save();
      const grad = ctx.createLinearGradient(0, -beamHalf, 0, beamHalf);
      grad.addColorStop(0, "rgba(255, 46, 147, 0)");
      grad.addColorStop(0.28, e.phase2 ? COLORS.magenta : COLORS.crimson);
      grad.addColorStop(0.5, COLORS.white);
      grad.addColorStop(0.72, e.phase2 ? COLORS.magenta : COLORS.crimson);
      grad.addColorStop(1, "rgba(255, 46, 147, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(-WIDTH, -beamHalf, WIDTH - 20, beamHalf * 2);
      ctx.restore();
    }

    // Aura de furia en Fase 2
    if (e.phase2) {
      ctx.strokeStyle = "rgba(255, 46, 147, 0.45)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 72 + Math.sin(e.t * 10) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Sprite ilustrado HD del Cíclope Mecánico
    sprites.drawCentered(ctx, "cyclops", 150);

    // Resplandor reactivo en el ojo cuando carga o dispara el rayo
    if (e.state === "charging" || e.state === "beam" || e.phase2) {
      ctx.filter = "none";
      const eyeGlow = e.phase2 ? "rgba(255, 46, 147, 0.55)" : "rgba(255, 80, 40, 0.45)";
      const r = e.state === "beam" ? 26 : 18 + Math.sin(e.t * 14) * 4;
      const g = ctx.createRadialGradient(-28, -14, 2, -28, -14, r);
      g.addColorStop(0, "rgba(255, 255, 220, 0.85)");
      g.addColorStop(0.5, eyeGlow);
      g.addColorStop(1, "rgba(255, 46, 147, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(-28, -14, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (e.kind === "zotra_sentinel") {
    if (e.drop) {
      ctx.strokeStyle = COLORS.goldBright;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    sprites.drawCentered(ctx, "zotra_sentinel", 68);
  } else if (e.kind === "zotra_boss") {
    if (e.phase2) {
      ctx.strokeStyle = "rgba(46, 242, 213, 0.45)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 82 + Math.sin(e.t * 10) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    sprites.drawCentered(ctx, "zotra_boss", 172);

    // 3 Prismas orbitales cristalinos girando alrededor del jefe
    ctx.filter = "none";
    for (let k = 0; k < 3; k++) {
      const ang = e.orbitAngle + (Math.PI * 2 * k) / 3;
      const px = Math.cos(ang) * 86;
      const py = Math.sin(ang) * 76;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(e.t * 3 + k);
      ctx.shadowColor = "#2ef2d5";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#2ef2d5";
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 11);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.white;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.filter = "none";
  ctx.restore();
}
