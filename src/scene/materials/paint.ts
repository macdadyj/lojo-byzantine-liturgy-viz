import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from "three";
import { mulberry32 } from "../random";

/** Procedural surface paintings. Each is drawn once, cached, and shared by every mesh that uses it. */
const cache = new Map<string, CanvasTexture>();

function canvasTexture(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void, color = true): Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  cache.set(key, texture);
  return texture;
}

function mottle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: string, vein: string, seed: number): void {
  const random = mulberry32(seed);
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 14; i += 1) {
    ctx.globalAlpha = 0.08 + random() * 0.1;
    ctx.fillStyle = random() > 0.5 ? "#ffffff" : "#000000";
    ctx.beginPath();
    ctx.ellipse(x + random() * w, y + random() * h, 4 + random() * w * 0.3, 3 + random() * h * 0.2, random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = vein;
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + random() * w, y);
    ctx.bezierCurveTo(x + random() * w, y + h * 0.3, x + random() * w, y + h * 0.7, x + random() * w, y + h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * Opus sectile floor: cream marble squares with a porphyry-and-serpentine roundel,
 * framed by dark bands. One tile per texture repeat.
 */
export function floorTileTexture(): Texture {
  return canvasTexture("floor", 512, (ctx, s) => {
    mottle(ctx, 0, 0, s, s, "#cbbba0", "#8e7a62", 11);
    const band = s * 0.06;
    ctx.fillStyle = "#4a3a30";
    ctx.fillRect(0, 0, s, band);
    ctx.fillRect(0, 0, band, s);
    const inner = band + s * 0.05;
    mottle(ctx, inner, inner, s - inner * 1.5, s - inner * 1.5, "#d9ccb2", "#9a8468", 23);
    const c = s * 0.53;
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#6b2a2a";
    const d = s * 0.22;
    ctx.fillRect(-d, -d, d * 2, d * 2);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(c, c, s * 0.19, 0, Math.PI * 2);
    ctx.fillStyle = "#2f4a3c";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c, c, s * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = "#d2c3a4";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c, c, s * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = "#7a2e2c";
    ctx.fill();
    ctx.strokeStyle = "rgba(40,30,24,0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(inner, inner, s - inner * 1.5, s - inner * 1.5);
  });
}

/** Roughness companion for the floor: polished inlays, duller grout lines. */
export function floorRoughTexture(): Texture {
  return canvasTexture(
    "floor-rough",
    256,
    (ctx, s) => {
      ctx.fillStyle = "#6a6a6a";
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "#b0b0b0";
      ctx.fillRect(0, 0, s, s * 0.06);
      ctx.fillRect(0, 0, s * 0.06, s);
      ctx.beginPath();
      ctx.arc(s * 0.53, s * 0.53, s * 0.19, 0, Math.PI * 2);
      ctx.fillStyle = "#4a4a4a";
      ctx.fill();
    },
    false,
  );
}

/** Oak grain for pews and wood trim. */
export function woodTexture(): Texture {
  return canvasTexture("wood", 256, (ctx, s) => {
    const random = mulberry32(5);
    ctx.fillStyle = "#6a4730";
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 1) {
      const wave = Math.sin(y * 0.09) * 6 + Math.sin(y * 0.021) * 14;
      ctx.globalAlpha = 0.06 + random() * 0.05;
      ctx.fillStyle = random() > 0.5 ? "#2e1c12" : "#9a7050";
      ctx.fillRect(0, y, s, 1);
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#3a2416";
      ctx.fillRect((wave + s) % s, y, 2, 1);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 40; i += 1) {
      ctx.strokeStyle = `rgba(40,24,14,${0.1 + random() * 0.15})`;
      ctx.lineWidth = 0.6 + random();
      ctx.beginPath();
      const y0 = random() * s;
      ctx.moveTo(0, y0);
      ctx.bezierCurveTo(s * 0.3, y0 + (random() - 0.5) * 12, s * 0.7, y0 + (random() - 0.5) * 12, s, y0);
      ctx.stroke();
    }
  });
}

/** Lapis vault with scattered gold stars, the usual Byzantine sky. */
export function starVaultTexture(): Texture {
  return canvasTexture("stars", 512, (ctx, s) => {
    const random = mulberry32(41);
    const gradient = ctx.createLinearGradient(0, 0, 0, s);
    gradient.addColorStop(0, "#1d2e5a");
    gradient.addColorStop(1, "#243a6c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i += 1) {
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = random() > 0.5 ? "#000" : "#6a88c4";
      ctx.beginPath();
      ctx.arc(random() * s, random() * s, 20 + random() * 60, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const step = s / 6;
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        const x = col * step + (row % 2) * step * 0.5 + step * 0.25;
        const y = row * step + step * 0.5;
        star(ctx, x % s, y, 7 + random() * 3);
      }
    }
  });
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = "#e8c66a";
  ctx.beginPath();
  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2;
    const radius = i % 2 === 0 ? r : r * 0.38;
    ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Nave wall: warm ochre plaster that darkens toward the floor, a faux-marble dado,
 * a red and gold meander frieze. Mapped once per wall height (v = 0 floor, 1 top).
 */
export function wallTexture(): Texture {
  return canvasTexture("wall", 512, (ctx, s) => {
    const random = mulberry32(77);
    const gradient = ctx.createLinearGradient(0, s, 0, 0);
    gradient.addColorStop(0, "#9a7a58");
    gradient.addColorStop(0.35, "#c9a879");
    gradient.addColorStop(1, "#d8bf94");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 400; i += 1) {
      ctx.globalAlpha = 0.03;
      ctx.fillStyle = random() > 0.5 ? "#fff" : "#5a3e28";
      ctx.fillRect(random() * s, random() * s, 3 + random() * 30, 2 + random() * 20);
    }
    ctx.globalAlpha = 1;
    const dadoTop = s * (1 - 0.13);
    for (let x = 0; x < s; x += s / 4) mottle(ctx, x + 2, dadoTop + 4, s / 4 - 4, s - dadoTop - 4, "#7a5a48", "#3a2a22", Math.floor(x) + 3);
    ctx.fillStyle = "#3a2a22";
    ctx.fillRect(0, dadoTop, s, 4);
    const friezeY = s * (1 - 0.34);
    ctx.fillStyle = "#6e2630";
    ctx.fillRect(0, friezeY, s, 18);
    ctx.strokeStyle = "#d9b862";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= s; x += 16) {
      ctx.moveTo(x, friezeY + 14);
      ctx.lineTo(x, friezeY + 4);
      ctx.lineTo(x + 10, friezeY + 4);
      ctx.lineTo(x + 10, friezeY + 11);
      ctx.lineTo(x + 5, friezeY + 11);
    }
    ctx.stroke();
    ctx.fillStyle = "#d9b862";
    ctx.fillRect(0, friezeY - 2, s, 2);
    ctx.fillRect(0, friezeY + 18, s, 2);
  });
}

/** Soft round shadow for contact under pews and furniture on tiers without shadow maps. */
export function blobTexture(): Texture {
  return canvasTexture(
    "blob",
    128,
    (ctx, s) => {
      const gradient = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gradient.addColorStop(0, "rgba(0,0,0,0.55)");
      gradient.addColorStop(0.6, "rgba(0,0,0,0.25)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, s, s);
    },
    true,
  );
}

/** Woven gold damask for Sunday vestments: a small repeating flower-cross on a warm gold ground. */
export function brocadeTexture(ground = "#c49a45", figure = "#8e6424"): Texture {
  return canvasTexture(`brocade:${ground}:${figure}`, 256, (ctx, s) => {
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, s, s);
    const random = mulberry32(31);
    for (let y = 0; y < s; y += 2) {
      ctx.globalAlpha = 0.05 + random() * 0.05;
      ctx.fillStyle = y % 4 === 0 ? "#ffffff" : "#000000";
      ctx.fillRect(0, y, s, 1);
    }
    ctx.globalAlpha = 1;
    const cell = s / 4;
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const x = col * cell + (row % 2 ? cell / 2 : 0) + cell / 2;
        const y = row * cell + cell / 2;
        ctx.fillStyle = figure;
        for (let petal = 0; petal < 4; petal += 1) {
          const angle = (petal * Math.PI) / 2;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(angle) * cell * 0.17, y + Math.sin(angle) * cell * 0.17, cell * 0.15, cell * 0.07, angle, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#f1d58a";
        ctx.beginPath();
        ctx.arc(x, y, cell * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = figure;
        ctx.fillRect(x + cell / 2 - 1.5, y - cell * 0.1, 3, cell * 0.2);
        ctx.globalAlpha = 1;
      }
    }
  });
}

/** Galloon band for orarion, epitrachelion and phelonion hems: gold with crimson crosses along V. */
export function orphreyTexture(): Texture {
  return canvasTexture("orphrey", 128, (ctx, s) => {
    ctx.fillStyle = "#d2a94c";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#7a1e22";
    ctx.fillRect(0, 0, s * 0.1, s);
    ctx.fillRect(s * 0.9, 0, s * 0.1, s);
    const arm = s * 0.1;
    ctx.fillRect(s / 2 - arm / 2, s * 0.2, arm, s * 0.6);
    ctx.fillRect(s * 0.28, s * 0.4, s * 0.44, arm);
    ctx.fillStyle = "#f3dc97";
    ctx.fillRect(s * 0.12, 0, 2, s);
    ctx.fillRect(s * 0.88 - 2, 0, 2, s);
  });
}

/** Wispy smoke sprite for incense haze. */
export function smokeTexture(): Texture {
  return canvasTexture("smoke", 256, (ctx, s) => {
    const random = mulberry32(9);
    ctx.clearRect(0, 0, s, s);
    for (let i = 0; i < 60; i += 1) {
      const x = s / 2 + (random() - 0.5) * s * 0.5;
      const y = s / 2 + (random() - 0.5) * s * 0.5;
      const r = s * (0.08 + random() * 0.18);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, "rgba(255,255,255,0.10)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, s, s);
    }
  });
}
