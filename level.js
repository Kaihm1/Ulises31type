import { COLORS, HEIGHT, WIDTH } from "./constants.js";
import { sound } from "./audio.js";
import { sprites } from "./sprites.js?v=2";
import {
  spawnCyclopsBoss,
  spawnSiren,
  spawnSphere,
  spawnTrident,
  spawnTurret,
  spawnZotraBoss,
  spawnZotraSentinel,
} from "./enemies.js?v=2";

const TILE_W = 80;
const HUD_BOTTOM = 44;

export class LevelDirector {
  constructor() {
    this.stars = Array.from({ length: 115 }, (_, i) => ({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      layer: i % 3,
      size: (i % 3) + 1,
    }));
    this.stage = 1;
    this.reset(1);
  }

  reset(stage = 1) {
    this.stage = stage;
    this.elapsed = 0;
    this.scrollX = 0;
    this.scrollSpeed = stage === 2 ? 96 : 88;
    this.nextEventIndex = 0;
    this.bossSpawned = false;
    this.planetX = WIDTH * 0.82;
    sound.setStage(stage);
    sound.setBossMode(false);

    if (stage === 1) {
      this.bannerText = "EPISODIO 01: EL CÍCLOPE";
      this.bannerSub = "LA MALDICIÓN DE LOS DIOSES";
    } else {
      this.bannerText = "EPISODIO 02: EL PLANETA PERDIDO";
      this.bannerSub = "ZOTRA — LAS CAVERNAS DE CRISTAL";
    }
    this.bannerTimer = 3.8;

    this.terrain = [];
    this.buildTerrainProfile(stage);
    this.timeline = stage === 1 ? this.buildStage1Timeline() : this.buildStage2Timeline();
  }

  buildStage1Timeline() {
    return [
      {
        at: 1.2,
        run: (enemies) => {
          for (let i = 0; i < 4; i++) {
            enemies.push(spawnTrident(WIDTH + 40 + i * 56, 175 + i * 36, i * 0.6));
          }
        },
      },
      {
        at: 5.0,
        run: (enemies) => {
          enemies.push(spawnSphere(WIDTH + 40, 170, "red"));
          enemies.push(spawnSphere(WIDTH + 100, 340));
        },
      },
      {
        at: 9.8,
        run: (enemies) => {
          const floorY = this.getFloorY(WIDTH - 10);
          const ceilY = this.getCeilingY(WIDTH - 10);
          enemies.push(spawnTurret(WIDTH + 50, Math.min(HEIGHT - HUD_BOTTOM - 22, floorY - 12), false, this.scrollSpeed));
          enemies.push(spawnTurret(WIDTH + 210, Math.max(22, ceilY + 12), true, this.scrollSpeed));
          enemies.push(spawnSiren(WIDTH + 150, 250, "blue"));
        },
      },
      {
        at: 15.5,
        run: (enemies) => {
          enemies.push(spawnSphere(WIDTH + 40, 250, "speed"));
          enemies.push(spawnSphere(WIDTH + 125, 145));
          enemies.push(spawnSphere(WIDTH + 125, 360, "missile"));
        },
      },
      {
        at: 21.5,
        run: (enemies) => {
          const floorY = this.getFloorY(WIDTH - 10);
          enemies.push(spawnTurret(WIDTH + 40, Math.min(HEIGHT - HUD_BOTTOM - 22, floorY - 12), false, this.scrollSpeed));
          enemies.push(spawnTurret(WIDTH + 190, Math.min(HEIGHT - HUD_BOTTOM - 22, floorY - 12), false, this.scrollSpeed));
          for (let i = 0; i < 5; i++) {
            enemies.push(spawnTrident(WIDTH + 50 + i * 52, 155, i * 0.5));
          }
          enemies.push(spawnSiren(WIDTH + 260, 275, "yellow"));
        },
      },
      {
        at: 28.5,
        run: (enemies) => {
          for (let i = 0; i < 4; i++) {
            enemies.push(spawnTrident(WIDTH + 40 + i * 55, 160, i * 0.7));
            enemies.push(spawnTrident(WIDTH + 40 + i * 55, 345, i * 0.7 + Math.PI));
          }
          enemies.push(spawnSphere(WIDTH + 185, 255, "shield"));
        },
      },
      {
        at: 35.5,
        run: (enemies) => {
          this.bannerText = "¡ALERTA! CÁMARA DEL CÍCLOPE";
          this.bannerSub = "APUNTA AL OJO ÚNICO — PUNTO DÉBIL";
          this.bannerTimer = 3.6;
          this.bossSpawned = true;
          sound.setBossMode(true);
          sound.playWarning();
          enemies.push(spawnCyclopsBoss());
        },
      },
    ];
  }

  buildStage2Timeline() {
    return [
      {
        at: 1.0,
        run: (enemies) => {
          enemies.push(spawnZotraSentinel(WIDTH + 40, 170, "blue")); // Rebote ideal para cavernas
          enemies.push(spawnZotraSentinel(WIDTH + 110, 320));
        },
      },
      {
        at: 5.8,
        run: (enemies) => {
          for (let i = 0; i < 4; i++) {
            enemies.push(spawnTrident(WIDTH + 40 + i * 52, 240, i * 0.7));
          }
          enemies.push(spawnSiren(WIDTH + 180, 165, "speed"));
        },
      },
      {
        at: 11.2,
        run: (enemies) => {
          const floorY = this.getFloorY(WIDTH - 10);
          const ceilY = this.getCeilingY(WIDTH - 10);
          enemies.push(spawnTurret(WIDTH + 50, Math.min(HEIGHT - HUD_BOTTOM - 22, floorY - 12), false, this.scrollSpeed));
          enemies.push(spawnTurret(WIDTH + 180, Math.max(22, ceilY + 12), true, this.scrollSpeed));
          enemies.push(spawnZotraSentinel(WIDTH + 140, 255, "yellow")); // Rastrero para limpiar torretas
        },
      },
      {
        at: 17.5,
        run: (enemies) => {
          enemies.push(spawnSiren(WIDTH + 40, 155));
          enemies.push(spawnSiren(WIDTH + 40, 345, "missile"));
          enemies.push(spawnZotraSentinel(WIDTH + 160, 250, "red"));
        },
      },
      {
        at: 24.0,
        run: (enemies) => {
          const floorY = this.getFloorY(WIDTH - 10);
          const ceilY = this.getCeilingY(WIDTH - 10);
          enemies.push(spawnTurret(WIDTH + 40, Math.min(HEIGHT - HUD_BOTTOM - 22, floorY - 12), false, this.scrollSpeed));
          enemies.push(spawnTurret(WIDTH + 170, Math.max(22, ceilY + 12), true, this.scrollSpeed));
          for (let i = 0; i < 4; i++) {
            enemies.push(spawnTrident(WIDTH + 60 + i * 54, 170 + (i % 2) * 140, i * 0.6));
          }
        },
      },
      {
        at: 30.2,
        run: (enemies) => {
          enemies.push(spawnZotraSentinel(WIDTH + 40, 165));
          enemies.push(spawnZotraSentinel(WIDTH + 40, 335));
          enemies.push(spawnSphere(WIDTH + 155, 250, "shield"));
        },
      },
      {
        at: 36.8,
        run: (enemies) => {
          this.bannerText = "¡ALERTA! HECHICERA DE ZOTRA";
          this.bannerSub = "DESTRUYE EL NÚCLEO ENTRE SUS PRISMAS";
          this.bannerTimer = 3.8;
          this.bossSpawned = true;
          sound.setBossMode(true);
          sound.playWarning();
          enemies.push(spawnZotraBoss());
        },
      },
    ];
  }

  buildTerrainProfile(stage) {
    this.terrain = [];
    for (let i = 0; i < 86; i++) {
      let topH = 0;
      let botH = 0;

      if (stage === 1) {
        if (i < 13) {
          topH = 0;
          botH = 0;
        } else if (i < 25) {
          topH = i % 3 === 0 ? 48 : 26;
          botH = i % 2 === 0 ? 52 : 30;
        } else if (i < 38) {
          topH = i % 4 === 0 ? 74 : 34;
          botH = i % 4 === 2 ? 78 : 36;
        } else if (i < 48) {
          topH = 38;
          botH = 42;
        } else {
          topH = 22;
          botH = 24;
        }
      } else {
        // Fase 2: Cavernas cristalinas de Zotra más sinuosas y técnicas
        if (i < 10) {
          topH = 18;
          botH = 18;
        } else if (i < 26) {
          topH = 34 + Math.round(Math.sin(i * 0.8) * 24 + 20);
          botH = 34 + Math.round(Math.cos(i * 0.8) * 24 + 20);
        } else if (i < 42) {
          // Pasillo ondulante de cristales
          topH = i % 3 === 0 ? 84 : 40;
          botH = i % 3 === 1 ? 84 : 40;
        } else if (i < 52) {
          topH = 44;
          botH = 44;
        } else {
          // Núcleo del Planeta Zotra (arena amplia para la Hechicera)
          topH = 24;
          botH = 24;
        }
      }

      this.terrain.push({
        topH,
        botH,
        hasColumn: i >= 10 && i % 2 === 0,
      });
    }
  }

  getPlayableBottom() {
    return HEIGHT - HUD_BOTTOM;
  }

  getSegmentAtScreenX(screenX) {
    const worldX = this.scrollX + screenX;
    const idx = Math.floor(worldX / TILE_W);
    if (idx < 0) return { topH: 0, botH: 0 };
    if (idx >= this.terrain.length) return this.terrain[this.terrain.length - 1];
    return this.terrain[idx];
  }

  getCeilingY(screenX) {
    return this.getSegmentAtScreenX(screenX).topH;
  }

  getFloorY(screenX) {
    return this.getPlayableBottom() - this.getSegmentAtScreenX(screenX).botH;
  }

  isPointInTerrain(x, y, margin = 0) {
    const ceil = this.getCeilingY(x);
    const floor = this.getFloorY(x);
    return y - margin < ceil || y + margin > floor;
  }

  get progress() {
    const dur = this.stage === 2 ? 36.8 : 35.5;
    return Math.min(1, this.elapsed / dur);
  }

  update(dt, enemies) {
    this.elapsed += dt;
    const currentSpeed = this.bossSpawned ? this.scrollSpeed * 0.22 : this.scrollSpeed;
    this.scrollX += currentSpeed * dt;
    this.planetX -= 4.2 * dt;
    if (this.planetX < -160) this.planetX = WIDTH + 180;
    if (this.bannerTimer > 0) this.bannerTimer = Math.max(0, this.bannerTimer - dt);

    const speeds = [24, 58, 120];
    for (const s of this.stars) {
      s.x -= speeds[s.layer] * dt;
      if (s.x < -4) {
        s.x = WIDTH + 4;
        s.y = Math.random() * this.getPlayableBottom();
      }
    }

    while (
      this.nextEventIndex < this.timeline.length &&
      this.elapsed >= this.timeline[this.nextEventIndex].at
    ) {
      this.timeline[this.nextEventIndex].run(enemies);
      this.nextEventIndex++;
    }
  }

  drawBackground(ctx) {
    const playH = this.getPlayableBottom();
    const isZotra = this.stage === 2;

    // Gradiente espacial específico por Episodio
    const bg = ctx.createLinearGradient(0, 0, 0, playH);
    if (isZotra) {
      bg.addColorStop(0, this.bossSpawned ? "#1d062b" : "#0e0624");
      bg.addColorStop(0.5, this.bossSpawned ? "#2b0d42" : "#180d3d");
      bg.addColorStop(1, "#071426");
    } else {
      bg.addColorStop(0, this.bossSpawned ? "#17061e" : COLORS.spaceDeep);
      bg.addColorStop(0.5, this.bossSpawned ? "#210c30" : COLORS.spaceMid);
      bg.addColorStop(1, "#08051a");
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Nebulosa
    const neb = ctx.createRadialGradient(WIDTH * 0.72, playH * 0.38, 30, WIDTH * 0.72, playH * 0.38, 360);
    if (isZotra) {
      neb.addColorStop(0, "rgba(46, 242, 213, 0.16)");
      neb.addColorStop(0.5, "rgba(180, 60, 255, 0.12)");
      neb.addColorStop(1, "rgba(14, 6, 36, 0)");
    } else {
      neb.addColorStop(0, this.bossSpawned ? "rgba(255, 56, 92, 0.2)" : "rgba(255, 46, 147, 0.13)");
      neb.addColorStop(0.5, "rgba(0, 229, 255, 0.06)");
      neb.addColorStop(1, "rgba(4, 7, 22, 0)");
    }
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, WIDTH, playH);

    // Planeta en el horizonte (Azul en Ep.1 / Planeta Zotra violeta-cristal en Ep.2)
    ctx.save();
    ctx.translate(this.planetX, playH * 0.28);
    const pGrad = ctx.createRadialGradient(-24, -22, 8, 0, 0, 74);
    if (isZotra) {
      pGrad.addColorStop(0, "#a855f7");
      pGrad.addColorStop(0.55, "#4c1d95");
      pGrad.addColorStop(1, "#14082e");
    } else {
      pGrad.addColorStop(0, "#3b59b5");
      pGrad.addColorStop(0.6, "#162152");
      pGrad.addColorStop(1, "#070b21");
    }
    ctx.fillStyle = pGrad;
    ctx.globalAlpha = 0.56;
    ctx.beginPath();
    ctx.arc(0, 0, 72, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isZotra ? "#2ef2d5" : COLORS.gold;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.ellipse(0, 0, 122, 20, -0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Gran Nave Nodriza Odiseus flotando en el horizonte
    ctx.save();
    const shipX = this.planetX * 0.45 + 125;
    const shipY = playH * 0.38;
    ctx.translate(shipX, shipY);
    ctx.rotate(-0.14);
    ctx.globalAlpha = isZotra ? 0.34 : 0.48;
    sprites.drawCentered(ctx, "mothership", 225);
    ctx.restore();

    // Estrellas con estelas de velocidad (efecto hiperespacio anime 80s)
    for (const s of this.stars) {
      ctx.fillStyle = isZotra && s.layer === 1 ? "#7ffce6" : s.layer === 2 ? COLORS.white : s.layer === 1 ? "#8aa4e8" : "#44578f";
      const streak = s.layer === 2 ? 7 : s.layer === 1 ? 3 : 1;
      ctx.fillRect(s.x, s.y, streak, s.size === 3 ? 2 : 1.5);
    }

    // Capa de paralaje medio: columnas monumentales del templo / agujas de cristal lejanas
    ctx.save();
    ctx.globalAlpha = 0.16;
    const parallaxX = (this.scrollX * 0.42) % 240;
    for (let px = -parallaxX; px < WIDTH + 240; px += 240) {
      if (isZotra) {
        ctx.fillStyle = "#2ef2d5";
        ctx.beginPath();
        ctx.moveTo(px + 20, playH);
        ctx.lineTo(px + 45, playH - 190);
        ctx.lineTo(px + 70, playH);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = "#8aa4e8";
        ctx.fillRect(px + 30, 0, 22, playH);
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(px + 24, 34, 34, 8);
        ctx.fillRect(px + 24, playH - 42, 34, 8);
      }
    }
    ctx.restore();

    this.drawTerrain(ctx, playH);
  }

  drawTerrain(ctx, playH) {
    const startIdx = Math.max(0, Math.floor(this.scrollX / TILE_W) - 1);
    const endIdx = Math.min(this.terrain.length - 1, startIdx + Math.ceil(WIDTH / TILE_W) + 3);
    const isZotra = this.stage === 2;

    for (let i = startIdx; i <= endIdx; i++) {
      const seg = this.terrain[i];
      const sx = Math.floor(i * TILE_W - this.scrollX);

      // Techo
      if (seg.topH > 0) {
        const gTop = ctx.createLinearGradient(sx, 0, sx, seg.topH);
        gTop.addColorStop(0, isZotra ? "#1e0c3d" : "#121a3b");
        gTop.addColorStop(1, isZotra ? "#4b2387" : "#2a3b75");
        ctx.fillStyle = gTop;
        ctx.fillRect(sx, 0, TILE_W + 1, seg.topH);

        if (isZotra) {
          // Estalactitas cristalinas turquesa en el techo
          ctx.fillStyle = "rgba(46, 242, 213, 0.38)";
          ctx.beginPath();
          ctx.moveTo(sx + 10, seg.topH);
          ctx.lineTo(sx + 24, seg.topH - 18);
          ctx.lineTo(sx + 38, seg.topH);
          ctx.moveTo(sx + 48, seg.topH);
          ctx.lineTo(sx + 62, seg.topH - 14);
          ctx.lineTo(sx + 74, seg.topH);
          ctx.fill();
          ctx.fillStyle = "#2ef2d5";
          ctx.fillRect(sx, seg.topH - 3, TILE_W + 1, 3);
        } else {
          if (seg.hasColumn) {
            ctx.fillStyle = "rgba(207, 216, 242, 0.16)";
            ctx.fillRect(sx + 14, 0, 12, seg.topH - 6);
            ctx.fillRect(sx + 52, 0, 12, seg.topH - 6);
          }
          ctx.fillStyle = COLORS.goldDark;
          ctx.fillRect(sx, seg.topH - 6, TILE_W + 1, 4);
          ctx.fillStyle = COLORS.gold;
          ctx.fillRect(sx, seg.topH - 2, TILE_W + 1, 2);
        }
      }

      // Suelo
      if (seg.botH > 0) {
        const yTop = playH - seg.botH;
        const gBot = ctx.createLinearGradient(sx, yTop, sx, playH);
        gBot.addColorStop(0, isZotra ? "#4b2387" : "#2a3b75");
        gBot.addColorStop(1, isZotra ? "#1e0c3d" : "#121a3b");
        ctx.fillStyle = gBot;
        ctx.fillRect(sx, yTop, TILE_W + 1, seg.botH);

        if (isZotra) {
          ctx.fillStyle = "rgba(46, 242, 213, 0.38)";
          ctx.beginPath();
          ctx.moveTo(sx + 10, yTop);
          ctx.lineTo(sx + 24, yTop + 18);
          ctx.lineTo(sx + 38, yTop);
          ctx.moveTo(sx + 48, yTop);
          ctx.lineTo(sx + 62, yTop + 14);
          ctx.lineTo(sx + 74, yTop);
          ctx.fill();
          ctx.fillStyle = "#2ef2d5";
          ctx.fillRect(sx, yTop, TILE_W + 1, 3);
        } else {
          if (seg.hasColumn) {
            ctx.fillStyle = "rgba(207, 216, 242, 0.16)";
            ctx.fillRect(sx + 14, yTop + 6, 12, seg.botH - 6);
            ctx.fillRect(sx + 52, yTop + 6, 12, seg.botH - 6);
          }
          ctx.fillStyle = COLORS.gold;
          ctx.fillRect(sx, yTop, TILE_W + 1, 2);
          ctx.fillStyle = COLORS.goldDark;
          ctx.fillRect(sx, yTop + 2, TILE_W + 1, 4);
        }
      }
    }
  }
}
