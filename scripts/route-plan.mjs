#!/usr/bin/env node
// Draws the two entrances on a floor plan of the church, straight from the route data the 3D scene walks,
// and saves it as a PNG: docs/iterations/liturgy/route-plan.png (or --out=path).
// Usage: npm run route-plan [-- --out=path.png]
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright";
import { parseArgs, root } from "./lib/harness.mjs";

const args = parseArgs(process.argv.slice(2));
const out = typeof args.out === "string" ? args.out : join(root, "docs", "iterations", "liturgy", "route-plan.png");

const vite = await createServer({ root, logLevel: "error", server: { middlewareMode: true }, appType: "custom" });
const routes = await vite.ssrLoadModule("/src/scene/routes.ts");
const { pewBanks, pewRows } = await vite.ssrLoadModule("/src/scene/crowdLayout.ts");
const { readerAside } = await vite.ssrLoadModule("/src/scene/staging.ts");
const { tetrapod, world } = await vite.ssrLoadModule("/src/scene/world.ts");
const { candleStandSpots, sandTraySpots } = await vite.ssrLoadModule("/src/scene/lighting/practicals.ts");
await vite.close();

const scale = 19;
const pad = 26;
const minZ = world.sanctuaryEast - 0.4;
const maxZ = world.naveWest + 0.6;
const panelW = world.halfWidth * 2 * scale + pad * 2;
const panelH = (maxZ - minZ) * scale + pad * 2;
const px = (x) => pad + (x + world.halfWidth) * scale;
const pz = (z) => pad + (z - minZ) * scale;
const rect = (x, z, halfX, halfZ, attrs) =>
  `<rect x="${px(x - halfX)}" y="${pz(z - halfZ)}" width="${halfX * 2 * scale}" height="${halfZ * 2 * scale}" ${attrs}/>`;
const dot = (x, z, r, attrs) => `<circle cx="${px(x)}" cy="${pz(z)}" r="${r}" ${attrs}/>`;
const columnZ = [-4.6, -0.2, 4.2, 8.6, 13.0];

function plan() {
  const parts = [];
  parts.push(rect(0, (minZ + maxZ) / 2, world.halfWidth, (maxZ - minZ) / 2, 'fill="#f7f1e7" stroke="#6b5b47" stroke-width="3"'));
  parts.push(rect(0, (world.sanctuaryEast + world.iconZ) / 2, world.halfWidth, (world.iconZ - world.sanctuaryEast) / 2, 'fill="#efe2cc"'));
  parts.push(rect(0, -7.2, 8, 1.7, 'fill="#f3e7d4" stroke="#c9b89c"'));
  // Iconostas with its three openings.
  const half = world.deaconOpeningHalf;
  const d = world.deaconDoorX;
  for (const [a, b] of [[-9.2, -d - half], [-d + half, -1.0], [1.0, d - half], [d + half, 9.2]]) {
    parts.push(`<line x1="${px(a)}" y1="${pz(world.iconZ)}" x2="${px(b)}" y2="${pz(world.iconZ)}" stroke="#8a6a2a" stroke-width="6"/>`);
  }
  parts.push(rect(world.altar[0], world.altar[2], 0.95, 0.55, 'fill="#7b2a30"'));
  parts.push(rect(world.prothesis[0], world.prothesis[2], 1.1, 0.7, 'fill="#9a6a5a"'));
  parts.push(dot(world.ambon[0], world.ambon[2], 0.55 * scale, 'fill="none" stroke="#8a6a2a" stroke-width="2" stroke-dasharray="4 3"'));
  for (const side of [-1, 1]) for (const z of columnZ) parts.push(dot(side * world.columnX, z, 0.58 * scale, 'fill="#d8cfbf" stroke="#9c907e"'));
  for (const bank of pewBanks) {
    const wide = Math.abs(bank) < 4;
    const halfW = wide ? 1.2 : 1.05;
    const count = wide ? 4 : 3;
    for (const row of pewRows) {
      parts.push(rect(bank, row, halfW, 0.28, 'fill="#6d4630"'));
      for (let seat = 0; seat < count; seat += 1) {
        parts.push(dot(bank - halfW + (halfW * 2 * (seat + 0.5)) / count, row - 0.62, 4, 'fill="#3d4a62"'));
      }
    }
  }
  parts.push(rect(0, 4.2, 0.85, 12, 'fill="#8e2f35" opacity="0.18"'));
  parts.push(rect(tetrapod[0], tetrapod[2], 0.45, 0.28, 'fill="#4a3322"'));
  for (const [x, , z] of sandTraySpots.filter(([, , z]) => Math.abs(z - tetrapod[2]) < 0.01)) parts.push(dot(x, z, 3.5, 'fill="#e0a64a"'));
  for (const [x, , z] of candleStandSpots.filter(([, , z]) => Math.abs(z - tetrapod[2]) < 1.5)) parts.push(dot(x, z, 4, 'fill="#e0a64a" stroke="#6b4a1a"'));
  parts.push(dot(readerAside.position[0], readerAside.position[2], 6, 'fill="#2a2e36" stroke="#fff" stroke-width="1.5"'));
  const label = (x, z, text, anchor = "middle") =>
    `<text x="${px(x)}" y="${pz(z)}" font-size="11" text-anchor="${anchor}" fill="#4a3d2e" font-family="sans-serif" paint-order="stroke" stroke="#fbf8f3" stroke-width="3.5" stroke-linejoin="round">${text}</text>`;
  parts.push(label(0, -16.6, "Altar"), label(-6.8, -15.6, "Prothesis"), label(-6.1, -9.5, "North door", "start"), label(1.25, -9.5, "Royal Doors", "start"));
  parts.push(label(1.7, -5.4, "Ambon", "start"), label(0.6, -1.7, "Tetrapod", "start"), label(-2.5, 0.25, "Reader"));
  parts.push(label(9.4, -9.5, "Iconostas", "end"), label(8.4, -7.2, "Solea", "start"), label(-9.9, 16.4, "Narthex ↓", "start"));
  return parts.join("\n");
}

function routeLayer(route, color) {
  const timeline = routes.buildTimeline(route);
  const points = timeline.path.points.map(([x, z]) => `${px(x)},${pz(z)}`).join(" ");
  const arrows = [];
  for (let at = 1.2; at < timeline.path.length; at += 2.4) {
    const [x, z] = routes.pointAt(timeline.path, at);
    const [hx, hz] = routes.headingAt(timeline.path, at, 0.05);
    const angle = (Math.atan2(hz, hx) * 180) / Math.PI;
    arrows.push(`<path d="M -5 -4.5 L 6 0 L -5 4.5 z" fill="${color}" transform="translate(${px(x)} ${pz(z)}) rotate(${angle})"/>`);
  }
  const beats = timeline.beats.map((beat, index) => {
    const [x, z] = routes.pointAt(timeline.path, beat.distance);
    return `<g><circle cx="${px(x)}" cy="${pz(z)}" r="8.5" fill="#fff" stroke="${color}" stroke-width="2"/><text x="${px(x)}" y="${pz(z) + 3.8}" font-size="10.5" font-weight="700" text-anchor="middle" fill="${color}" font-family="sans-serif">${index + 1}</text></g>`;
  });
  return { svg: `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linejoin="round" opacity="0.9"/>${arrows.join("")}${beats.join("")}`, timeline };
}

function clock(seconds) {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function panel(route, title, color) {
  const { svg, timeline } = routeLayer(route, color);
  const list = timeline.beats
    .map((beat, index) => `<li><b style="color:${color}">${index + 1}</b> <span class="t">${clock(beat.time)}</span> ${beat.label}${route.stops.find((stop) => stop.beat === beat.label)?.hold ? ` <i>(stands ${route.stops.find((stop) => stop.beat === beat.label).hold} s)</i>` : ""}</li>`)
    .join("");
  return `<section><h2 style="color:${color}">${title}</h2><p class="sub">${Math.round(timeline.path.length)} m walked by the first candle · ${clock(timeline.duration)} at 1× · east (altar) at the top, north on the left</p>
<svg width="${panelW}" height="${panelH}" viewBox="0 0 ${panelW} ${panelH}">${plan()}${svg}</svg><ol>${list}</ol></section>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:18px 20px;background:#fbf8f3;font-family:"Segoe UI",sans-serif;color:#1c1915}
main{display:flex;gap:26px;align-items:flex-start}
h1{font:600 22px Georgia,serif;margin:0 0 10px}
h2{font:600 18px Georgia,serif;margin:0}
.sub{margin:2px 0 8px;font-size:12px;color:#5e564c}
ol{list-style:none;padding:0;margin:8px 0 0;font-size:12.5px;line-height:1.55;max-width:${panelW}px}
.t{display:inline-block;width:34px;color:#5e564c;font-variant-numeric:tabular-nums}
i{color:#5e564c}
.key{margin:0 0 12px;font-size:12.5px;color:#5e564c}.key b{font-size:15px}
</style></head><body><h1>The two entrances, as the 3D church walks them</h1>
<p class="key"><b style="color:#3d4a62">●</b> faithful standing before their pews &nbsp; <b style="color:#2a2e36">●</b> reader &nbsp; <b style="color:#e0a64a">●</b> candle stand and sand trays &nbsp; <b style="color:#8e2f35;opacity:.4">▮</b> center aisle runner &nbsp; numbered circles: where the priest is when each moment begins</p><main>
${panel(routes.littleEntrance, "Little Entrance (the Gospel)", "#1f5f8b")}
${panel(routes.greatEntrance, "Great Entrance (the holy gifts)", "#8e2f35")}
</main></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: panelW * 2 + 90, height: 800 }, deviceScaleFactor: 2 });
await page.setContent(html);
mkdirSync(dirname(out), { recursive: true });
await page.screenshot({ path: out, fullPage: true, type: out.endsWith(".jpg") ? "jpeg" : "png", ...(out.endsWith(".jpg") ? { quality: 85 } : {}) });
await browser.close();
console.log(`saved ${out}`);
