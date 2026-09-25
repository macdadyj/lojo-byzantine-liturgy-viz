import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

let marbleMap: CanvasTexture | null = null;
let weaveMap: CanvasTexture | null = null;
let weaveNormal: CanvasTexture | null = null;
let priestBrocade: CanvasTexture | null = null;
let deaconBrocade: CanvasTexture | null = null;
let giltMap: CanvasTexture | null = null;

export function marbleTexture(): Texture {
  if (marbleMap) return marbleMap;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return emptyTexture();
  ctx.fillStyle = "#b7aa98";
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) {
    for (let x = 0; x < 256; x += 4) {
      const n = ((x * 13 + y * 29) % 17) / 17;
      const shade = Math.floor(150 + n * 55);
      ctx.fillStyle = `rgb(${shade},${shade - 8},${shade - 18})`;
      ctx.fillRect(x, y, 4, 4);
    }
  }
  for (let i = 0; i < 22; i += 1) {
    ctx.strokeStyle = i % 3 === 0 ? "rgba(92,78,64,0.55)" : "rgba(232,214,188,0.28)";
    ctx.lineWidth = 1 + (i % 4);
    ctx.beginPath();
    ctx.moveTo((i * 37) % 256, 0);
    ctx.bezierCurveTo(30 + i * 7, 70, 200 - i * 5, 150, (i * 53) % 256, 256);
    ctx.stroke();
  }
  marbleMap = new CanvasTexture(canvas);
  marbleMap.colorSpace = SRGBColorSpace;
  marbleMap.wrapS = RepeatWrapping;
  marbleMap.wrapT = RepeatWrapping;
  marbleMap.repeat.set(7, 11);
  return marbleMap;
}

export function weaveTexture(): Texture {
  if (weaveMap) return weaveMap;
  weaveMap = paintWeave(false);
  return weaveMap;
}

export function weaveNormalTexture(): Texture {
  if (weaveNormal) return weaveNormal;
  weaveNormal = paintWeave(true);
  weaveNormal.colorSpace = NoColorSpace;
  return weaveNormal;
}

export function priestBrocadeTexture(): Texture {
  if (priestBrocade) return priestBrocade;
  priestBrocade = paintBrocade("#6d2433", "#e4c56a");
  return priestBrocade;
}

export function deaconBrocadeTexture(): Texture {
  if (deaconBrocade) return deaconBrocade;
  deaconBrocade = paintBrocade("#1c4638", "#d7b15a");
  return deaconBrocade;
}

let ornamentMap: CanvasTexture | null = null;

export function ornamentTexture(): Texture {
  if (ornamentMap) return ornamentMap;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return emptyTexture();
  ctx.fillStyle = "#6a2430";
  ctx.fillRect(0, 0, 128, 32);
  ctx.strokeStyle = "#e4c56a";
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 124, 28);
  for (let x = 8; x < 128; x += 16) {
    ctx.beginPath();
    ctx.arc(x, 16, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 6, 16);
    ctx.quadraticCurveTo(x + 12, 6, x + 16, 16);
    ctx.stroke();
  }
  ornamentMap = new CanvasTexture(canvas);
  ornamentMap.colorSpace = SRGBColorSpace;
  ornamentMap.wrapS = RepeatWrapping;
  ornamentMap.wrapT = RepeatWrapping;
  ornamentMap.repeat.set(18, 1);
  return ornamentMap;
}

export function giltTexture(): Texture {
  if (giltMap) return giltMap;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return emptyTexture();
  ctx.fillStyle = "#8a5a28";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#e6c56e";
  ctx.lineWidth = 3;
  for (let y = 8; y < 128; y += 16) {
    ctx.beginPath();
    for (let x = 0; x <= 128; x += 8) {
      const wave = Math.sin(x * 0.2 + y) * 3;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  giltMap = new CanvasTexture(canvas);
  giltMap.colorSpace = SRGBColorSpace;
  giltMap.wrapS = RepeatWrapping;
  giltMap.wrapT = RepeatWrapping;
  return giltMap;
}

function paintBrocade(cloth: string, gold: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return emptyTexture();
  ctx.fillStyle = cloth;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = gold;
  ctx.fillStyle = gold;
  ctx.lineWidth = 2;
  for (let y = 12; y < 256; y += 32) {
    for (let x = 12; x < 256; x += 32) {
      ctx.beginPath();
      ctx.ellipse(x, y, 8, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillRect(x - 1, y - 6, 2, 12);
      ctx.fillRect(x - 5, y - 1, 10, 2);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2, 3);
  return texture;
}

function paintWeave(normal: boolean): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return emptyTexture();
  if (normal) {
    ctx.fillStyle = "#8080ff";
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#c080ff";
    for (let i = 0; i < 64; i += 4) ctx.fillRect(i, 0, 1, 64);
    ctx.fillStyle = "#80c0ff";
    for (let i = 0; i < 64; i += 4) ctx.fillRect(0, i, 64, 1);
  } else {
    ctx.fillStyle = "#d9d3c8";
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#b7b0a4";
    for (let i = 0; i < 64; i += 4) {
      ctx.fillRect(i, 0, 1, 64);
      ctx.fillRect(0, i, 64, 1);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(6, 8);
  if (!normal) texture.colorSpace = SRGBColorSpace;
  return texture;
}

function emptyTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 2;
  return new CanvasTexture(canvas);
}
