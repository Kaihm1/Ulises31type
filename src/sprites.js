// Cargador de sprites ilustrados HD con recorte chroma-key, despill anti-halo y auto-crop automático

const MANIFEST = {
  odiseus: { src: "assets/sprites/odiseus.jpg", key: "green" },
  nono: { src: "assets/sprites/nono.jpg", key: "magenta" },
  trident: { src: "assets/sprites/trident.jpg", key: "magenta" },
  sphere: { src: "assets/sprites/sphere.jpg", key: "magenta" },
  siren: { src: "assets/sprites/siren.jpg", key: "green" },
  cyclops: { src: "assets/sprites/cyclops.jpg", key: "green" },
  mothership: { src: "assets/sprites/mothership.jpg", key: "magenta" },
  zotra_sentinel: { src: "assets/sprites/zotra_sentinel.jpg", key: "green" },
  zotra_boss: { src: "assets/sprites/zotra_boss.jpg", key: "green" },
};

function processChromaSprite(img, keyColor) {
  // Reducir ligeramente si es muy grande (ej. 1024 -> 512) para velocidad y nitidez
  const maxDim = 512;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const work = document.createElement("canvas");
  work.width = w;
  work.height = h;
  const ctx = work.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];

    let dominance = 0;
    if (keyColor === "green") {
      dominance = g - Math.max(r, b);
      if (g > 110 && dominance > 52) {
        d[i + 3] = 0;
        continue;
      } else if (g > 90 && dominance > 20) {
        // Suavizado + despill de borde verde
        const t = Math.min(1, (dominance - 20) / 32);
        d[i + 3] = Math.round(255 * (1 - t));
        d[i + 1] = Math.min(g, Math.max(r, b));
      }
    } else if (keyColor === "magenta") {
      dominance = Math.min(r, b) - g;
      if (r > 110 && b > 110 && dominance > 52) {
        d[i + 3] = 0;
        continue;
      } else if (r > 90 && b > 90 && dominance > 20) {
        // Suavizado + despill de borde magenta
        const t = Math.min(1, (dominance - 20) / 32);
        d[i + 3] = Math.round(255 * (1 - t));
        const cap = Math.max(g, Math.min(r, b) - dominance * 0.8);
        d[i] = Math.min(r, cap);
        d[i + 2] = Math.min(b, cap);
      }
    }

    if (d[i + 3] > 24) {
      const px = (i >> 2) % w;
      const py = Math.floor((i >> 2) / w);
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  if (maxX <= minX || maxY <= minY) return work;

  const pad = 2;
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(w - sx, maxX - minX + 1 + pad * 2);
  const sh = Math.min(h - sy, maxY - minY + 1 + pad * 2);

  const cropped = document.createElement("canvas");
  cropped.width = sw;
  cropped.height = sh;
  const cctx = cropped.getContext("2d");
  cctx.drawImage(work, sx, sy, sw, sh, 0, 0, sw, sh);
  return cropped;
}

class SpriteAtlas {
  constructor() {
    this.started = false;
    this.sprites = {};
  }

  init() {
    if (this.started) return;
    this.started = true;

    for (const [name, meta] of Object.entries(MANIFEST)) {
      const img = new Image();
      img.onload = () => {
        this.sprites[name] = processChromaSprite(img, meta.key);
      };
      img.src = meta.src;
    }
  }

  get(name) {
    if (!this.started) this.init();
    return this.sprites[name] || null;
  }

  drawCentered(ctx, name, targetWidth, targetHeight = null) {
    const spr = this.get(name);
    if (!spr) return false;
    const aspect = spr.width / spr.height;
    let w = targetWidth;
    let h = targetHeight;
    if (!h) h = w / aspect;
    if (!w) w = h * aspect;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(spr, -w * 0.5, -h * 0.5, w, h);
    return true;
  }
}

export const sprites = new SpriteAtlas();
