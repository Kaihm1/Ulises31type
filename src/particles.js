export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.rings = [];
    this.flashes = [];
    this.texts = [];
  }

  emit(x, y, vx, vy, color, size, life) {
    this.particles.push({ x, y, vx, vy, color, size, life, maxLife: life });
  }

  flash(x, y, color = "#ffffff", radius = 20, life = 0.12) {
    this.flashes.push({ x, y, color, radius, life, maxLife: life });
  }

  // Explosión multicapa estilo anime espacial 80s / R-Type
  explosion(x, y, scale = 1) {
    this.flash(x, y, "#ffffff", 26 * scale, 0.14);
    this.flash(x, y, "#ff9d2e", 38 * scale, 0.24);
    this.ring(x, y, "#ffe484", 46 * scale, 0.3);
    this.burst(x, y, "#fff4b8", Math.round(10 * scale), 150 * scale, 4 * scale, 0.34);
    this.burst(x, y, "#ff6b2b", Math.round(14 * scale), 210 * scale, 4.5 * scale, 0.48);
    this.burst(x, y, "#ff2e63", Math.round(8 * scale), 120 * scale, 3 * scale, 0.52);
  }

  burst(x, y, color, count = 14, speed = 160, size = 3.5, life = 0.45) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const spd = speed * (0.4 + Math.random() * 0.85);
      this.emit(
        x,
        y,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        color,
        size * (0.7 + Math.random() * 0.6),
        life * (0.7 + Math.random() * 0.5)
      );
    }
  }

  ring(x, y, color, maxRadius = 42, life = 0.3) {
    this.rings.push({ x, y, color, radius: 4, maxRadius, life, maxLife: life });
  }

  floatingText(x, y, text, color = "#f5c542", life = 0.85) {
    this.texts.push({ x, y, text, color, life, maxLife: life });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const t = 1 - Math.max(0, r.life / r.maxLife);
      r.radius = 4 + (r.maxRadius - 4) * t;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      if (f.life <= 0) this.flashes.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.y -= 36 * dt;
      t.life -= dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const f of this.flashes) {
      const alpha = Math.max(0, f.life / f.maxLife);
      const r = f.radius * (0.65 + (1 - alpha) * 0.55);
      const grad = ctx.createRadialGradient(f.x, f.y, 1, f.x, f.y, r);
      grad.addColorStop(0, f.color);
      grad.addColorStop(1, "rgba(255, 120, 40, 0)");
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const r of this.rings) {
      const alpha = Math.max(0, r.life / r.maxLife);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.font = "800 13px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    for (const t of this.texts) {
      const alpha = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#040716";
      ctx.fillText(t.text, t.x + 1, t.y + 1);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
