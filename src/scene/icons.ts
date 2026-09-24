export type IconId =
  | "pantocrator"
  | "hodegetria"
  | "forerunner"
  | "nicholas"
  | "gabriel"
  | "annunciation-theotokos"
  | "supper";

const GOLD = "#e7c56a";
const GOLD_DEEP = "#b8893a";
const GOLD_LIGHT = "#f6e7b2";
const RED = "#7a2430";
const BLUE = "#243e68";
const GREEN = "#3d5340";
const SKIN = "#c48462";

export function paintIcon(id: IconId): HTMLCanvasElement {
  switch (id) {
    case "pantocrator":
      return paintStanding(paintPantocrator, "Christ Pantocrator");
    case "hodegetria":
      return paintStanding(paintHodegetria, "Theotokos");
    case "forerunner":
      return paintStanding(paintForerunner, "Forerunner");
    case "nicholas":
      return paintStanding(paintNicholas, "St. Nicholas");
    case "gabriel":
      return paintDoor(paintGabriel);
    case "annunciation-theotokos":
      return paintDoor(paintAnnunciationTheotokos);
    case "supper":
      return paintSupper();
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}

export function paintWood(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.fillStyle = "#4a2e1c";
  context.fillRect(0, 0, 128, 256);
  for (let x = 4; x < 128; x += 7) {
    context.strokeStyle = x % 2 === 0 ? "#5c3a24" : "#3a2214";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, 0);
    context.bezierCurveTo(x + 4, 80, x - 3, 160, x + 1, 256);
    context.stroke();
  }
  return canvas;
}

export function paintAltarFrontal(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  const cloth = context.createLinearGradient(0, 0, 0, 320);
  cloth.addColorStop(0, "#8d2430");
  cloth.addColorStop(1, "#5c1520");
  context.fillStyle = cloth;
  context.fillRect(0, 0, 512, 320);
  context.strokeStyle = GOLD_LIGHT;
  context.lineWidth = 14;
  context.strokeRect(18, 18, 476, 284);
  context.lineWidth = 4;
  context.strokeRect(32, 32, 448, 256);
  context.strokeStyle = GOLD;
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(256, 70);
  context.lineTo(256, 250);
  context.moveTo(200, 110);
  context.lineTo(312, 110);
  context.moveTo(220, 150);
  context.lineTo(292, 150);
  context.moveTo(210, 230);
  context.lineTo(300, 214);
  context.stroke();
  context.fillStyle = GOLD_LIGHT;
  for (const [x, y] of [
    [70, 70],
    [442, 70],
    [70, 250],
    [442, 250],
  ] as const) {
    context.beginPath();
    context.arc(x, y, 8, 0, Math.PI * 2);
    context.fill();
  }
  return canvas;
}

function paintStanding(
  draw: (context: CanvasRenderingContext2D) => void,
  caption: string,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  fillGold(context, 384, 512);
  draw(context);
  captionBand(context, 384, 512, caption);
  return canvas;
}

function paintDoor(draw: (context: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 280;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  fillGold(context, 280, 720);
  draw(context);
  return canvas;
}

function fillGold(context: CanvasRenderingContext2D, width: number, height: number): void {
  const ground = context.createLinearGradient(0, 0, width, height);
  ground.addColorStop(0, "#f8e7b0");
  ground.addColorStop(0.45, GOLD);
  ground.addColorStop(1, GOLD_DEEP);
  context.fillStyle = ground;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = RED;
  context.lineWidth = Math.max(6, width * 0.02);
  context.strokeRect(10, 10, width - 20, height - 20);
  context.strokeStyle = GOLD_LIGHT;
  context.lineWidth = 3;
  context.strokeRect(18, 18, width - 36, height - 36);
}

function captionBand(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  caption: string,
): void {
  context.fillStyle = "#6f2430";
  context.fillRect(22, height - 62, width - 44, 40);
  context.fillStyle = GOLD_LIGHT;
  context.font = "600 26px sans-serif";
  context.textAlign = "center";
  context.fillText(caption, width / 2, height - 35);
}

function halo(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  cross: boolean,
): void {
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fillStyle = "#f3dd96";
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = RED;
  context.stroke();
  if (!cross) return;
  context.beginPath();
  context.moveTo(cx, cy - radius + 4);
  context.lineTo(cx, cy + radius - 4);
  context.moveTo(cx - radius + 6, cy - 4);
  context.lineTo(cx + radius - 6, cy - 4);
  context.stroke();
}

function face(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  beard: "none" | "dark" | "white",
  covered: boolean,
): void {
  if (!covered) {
    context.fillStyle = beard === "white" ? "#efe6d4" : "#3a2a22";
    context.beginPath();
    context.ellipse(cx, cy - 6 * scale, 30 * scale, 34 * scale, 0, Math.PI, 0);
    context.fill();
  }
  const skin = context.createRadialGradient(cx - 8 * scale, cy - 10 * scale, 4, cx, cy, 36 * scale);
  skin.addColorStop(0, "#e8b898");
  skin.addColorStop(0.65, SKIN);
  skin.addColorStop(1, "#a86a4c");
  context.beginPath();
  context.ellipse(cx, cy, 24 * scale, 30 * scale, 0, 0, Math.PI * 2);
  context.fillStyle = skin;
  context.fill();
  const eyeY = cy - 2 * scale;
  for (const side of [-1, 1]) {
    const ex = cx + side * 9 * scale;
    context.beginPath();
    context.ellipse(ex, eyeY, 6.5 * scale, 3.8 * scale, 0, 0, Math.PI * 2);
    context.fillStyle = "#f7f1e6";
    context.fill();
    context.beginPath();
    context.arc(ex, eyeY, 2.6 * scale, 0, Math.PI * 2);
    context.fillStyle = "#241814";
    context.fill();
    context.beginPath();
    context.arc(ex + scale, eyeY - scale, scale, 0, Math.PI * 2);
    context.fillStyle = "#fff";
    context.fill();
    context.strokeStyle = "#3a2a22";
    context.lineWidth = 1.5 * scale;
    context.beginPath();
    context.moveTo(ex - 6 * scale, eyeY - 6 * scale);
    context.quadraticCurveTo(ex, eyeY - 9 * scale, ex + 6 * scale, eyeY - 5 * scale);
    context.stroke();
  }
  context.strokeStyle = "#6a4034";
  context.lineWidth = 1.4 * scale;
  context.beginPath();
  context.moveTo(cx, cy);
  context.lineTo(cx + scale, cy + 12 * scale);
  context.lineTo(cx - 4 * scale, cy + 13 * scale);
  context.stroke();
  context.strokeStyle = "#8a3030";
  context.beginPath();
  context.moveTo(cx - 5 * scale, cy + 18 * scale);
  context.quadraticCurveTo(cx, cy + 20 * scale, cx + 5 * scale, cy + 18 * scale);
  context.stroke();
  if (beard === "none") return;
  context.fillStyle = beard === "white" ? "#f4efe4" : "#2c211c";
  context.beginPath();
  context.moveTo(cx - 22 * scale, cy + 10 * scale);
  context.quadraticCurveTo(cx, cy + 58 * scale, cx + 22 * scale, cy + 10 * scale);
  context.quadraticCurveTo(cx, cy + 22 * scale, cx - 22 * scale, cy + 10 * scale);
  context.fill();
}

function robe(
  context: CanvasRenderingContext2D,
  cx: number,
  top: number,
  bottom: number,
  color: string,
): void {
  context.beginPath();
  context.moveTo(cx - 36, top);
  context.lineTo(cx + 36, top);
  context.lineTo(cx + 78, bottom);
  context.lineTo(cx - 78, bottom);
  context.closePath();
  context.fillStyle = color;
  context.fill();
  context.strokeStyle = GOLD_LIGHT;
  context.globalAlpha = 0.7;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(cx - 10, top + 10);
  context.lineTo(cx - 28, bottom - 8);
  context.moveTo(cx + 12, top + 16);
  context.lineTo(cx + 30, bottom - 8);
  context.stroke();
  context.globalAlpha = 1;
}

function blessingHand(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.fillStyle = SKIN;
  context.beginPath();
  context.roundRect(x, y, 28, 36, 8);
  context.fill();
  context.strokeStyle = "#6a4034";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x + 8, y);
  context.lineTo(x + 6, y - 16);
  context.moveTo(x + 16, y);
  context.lineTo(x + 16, y - 18);
  context.moveTo(x + 22, y + 4);
  context.lineTo(x + 30, y + 14);
  context.stroke();
}

function gospel(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  context.fillStyle = "#6f2430";
  context.fillRect(x, y, w, h);
  context.strokeStyle = GOLD_LIGHT;
  context.lineWidth = 4;
  context.strokeRect(x + 4, y + 4, w - 8, h - 8);
  context.beginPath();
  context.moveTo(x + w / 2, y + 16);
  context.lineTo(x + w / 2, y + h - 16);
  context.moveTo(x + 16, y + h * 0.38);
  context.lineTo(x + w - 16, y + h * 0.38);
  context.stroke();
}

function monogram(context: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  context.fillStyle = RED;
  context.font = "700 28px sans-serif";
  context.textAlign = "center";
  context.fillText(text, x, y);
}

function paintPantocrator(context: CanvasRenderingContext2D): void {
  robe(context, 192, 230, 450, BLUE);
  context.fillStyle = RED;
  context.beginPath();
  context.moveTo(150, 230);
  context.lineTo(230, 230);
  context.lineTo(250, 450);
  context.lineTo(140, 450);
  context.closePath();
  context.fill();
  halo(context, 192, 168, 62, true);
  face(context, 192, 176, 1.15, "dark", false);
  blessingHand(context, 78, 300);
  gospel(context, 248, 280, 78, 100);
  monogram(context, "IC", 78, 120);
  monogram(context, "XC", 310, 120);
}

function paintHodegetria(context: CanvasRenderingContext2D): void {
  robe(context, 176, 240, 450, BLUE);
  context.fillStyle = "#1c3054";
  context.beginPath();
  context.ellipse(176, 150, 78, 92, 0, 0, Math.PI * 2);
  context.fill();
  for (const [x, y] of [
    [176, 78],
    [112, 168],
    [240, 168],
  ] as const) {
    star(context, x, y, 8);
  }
  halo(context, 176, 168, 54, false);
  face(context, 176, 176, 1.05, "none", true);
  context.strokeStyle = SKIN;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(120, 280);
  context.lineTo(210, 250);
  context.stroke();
  halo(context, 268, 248, 28, true);
  face(context, 268, 250, 0.55, "none", false);
  context.fillStyle = GOLD_DEEP;
  context.fillRect(246, 275, 44, 70);
  blessingHand(context, 250, 292);
  monogram(context, "MP", 70, 110);
  monogram(context, "ΘY", 300, 110);
}

function paintForerunner(context: CanvasRenderingContext2D): void {
  robe(context, 192, 240, 450, "#6a5030");
  context.fillStyle = GREEN;
  context.beginPath();
  context.moveTo(120, 250);
  context.lineTo(250, 230);
  context.lineTo(270, 450);
  context.lineTo(100, 440);
  context.closePath();
  context.fill();
  halo(context, 192, 168, 56, false);
  face(context, 192, 176, 1.05, "dark", false);
  context.fillStyle = "#f6efe4";
  context.fillRect(250, 300, 70, 28);
  context.fillStyle = RED;
  context.font = "600 16px sans-serif";
  context.textAlign = "center";
  context.fillText("Repent", 285, 319);
}

function paintNicholas(context: CanvasRenderingContext2D): void {
  robe(context, 192, 240, 450, "#6f2430");
  context.fillStyle = GOLD_LIGHT;
  context.fillRect(150, 250, 84, 190);
  for (const y of [280, 340, 400]) {
    context.strokeStyle = "#3a2a22";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(168, y);
    context.lineTo(168, y + 18);
    context.moveTo(158, y + 8);
    context.lineTo(178, y + 8);
    context.stroke();
  }
  halo(context, 192, 168, 56, false);
  face(context, 192, 176, 1.08, "white", false);
  gospel(context, 250, 300, 70, 90);
}

function paintGabriel(context: CanvasRenderingContext2D): void {
  wing(context, 70, 250, -0.5);
  wing(context, 210, 250, 0.5);
  robe(context, 140, 280, 640, "#f4efe4");
  halo(context, 140, 210, 48, false);
  face(context, 140, 214, 0.95, "none", false);
  context.strokeStyle = GOLD_DEEP;
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(190, 360);
  context.lineTo(210, 180);
  context.stroke();
  context.fillStyle = RED;
  context.font = "700 28px sans-serif";
  context.textAlign = "center";
  context.fillText("Gabriel", 140, 680);
}

function paintAnnunciationTheotokos(context: CanvasRenderingContext2D): void {
  robe(context, 140, 300, 640, BLUE);
  context.fillStyle = "#1c3054";
  context.beginPath();
  context.ellipse(140, 200, 70, 84, 0, 0, Math.PI * 2);
  context.fill();
  star(context, 140, 130, 7);
  star(context, 90, 210, 6);
  star(context, 190, 210, 6);
  halo(context, 140, 210, 48, false);
  face(context, 140, 214, 0.95, "none", true);
  context.strokeStyle = SKIN;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(100, 340);
  context.lineTo(80, 280);
  context.stroke();
  context.fillStyle = RED;
  context.font = "700 26px sans-serif";
  context.textAlign = "center";
  context.fillText("Theotokos", 140, 680);
}

function paintSupper(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 280;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  fillGold(context, 720, 280);
  context.fillStyle = "#6f2430";
  context.beginPath();
  context.moveTo(80, 150);
  context.lineTo(640, 150);
  context.lineTo(690, 210);
  context.lineTo(30, 210);
  context.closePath();
  context.fill();
  context.strokeStyle = GOLD_LIGHT;
  context.lineWidth = 3;
  context.stroke();
  for (let index = 0; index < 12; index += 1) {
    if (index === 6) continue;
    const x = 70 + index * 52;
    const lean = index < 6 ? 8 : -8;
    disciple(context, x, 118, lean);
  }
  halo(context, 360, 108, 28, true);
  face(context, 360, 112, 0.55, "dark", false);
  context.fillStyle = BLUE;
  context.fillRect(340, 140, 40, 36);
  context.fillStyle = GOLD_LIGHT;
  context.beginPath();
  context.arc(360, 178, 8, 0, Math.PI * 2);
  context.fill();
  captionBand(context, 720, 280, "Mystical Supper");
  return canvas;
}

function disciple(context: CanvasRenderingContext2D, x: number, y: number, lean: number): void {
  context.save();
  context.translate(x, y);
  context.rotate(lean * 0.02);
  halo(context, 0, 0, 16, false);
  face(context, 0, 2, 0.32, "dark", false);
  context.fillStyle = indexColor(x);
  context.fillRect(-10, 18, 20, 28);
  context.restore();
}

function indexColor(x: number): string {
  const palette = [BLUE, GREEN, RED, "#5c4032", "#243e48"];
  return palette[Math.floor(x / 52) % palette.length] ?? BLUE;
}

function wing(context: CanvasRenderingContext2D, x: number, y: number, tilt: number): void {
  context.save();
  context.translate(x, y);
  context.rotate(tilt);
  context.fillStyle = "#f4efe4";
  context.strokeStyle = GOLD_DEEP;
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(0, 0, 28, 70, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function star(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  context.strokeStyle = GOLD_LIGHT;
  context.fillStyle = GOLD_LIGHT;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x, y - radius);
  context.lineTo(x, y + radius);
  context.moveTo(x - radius, y);
  context.lineTo(x + radius, y);
  context.stroke();
  context.beginPath();
  context.arc(x, y, 2, 0, Math.PI * 2);
  context.fill();
}
