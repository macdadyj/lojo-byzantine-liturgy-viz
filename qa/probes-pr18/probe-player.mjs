// Desktop player probe: real mouse clicks/drags, real-time playback, direction, replay, and screenshots.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire("/workspace/package.json");
const { chromium } = require("playwright");

const url = process.env.URL ?? "http://localhost:5199/";
const out = "/tmp/qa18/out/desktop";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
await page.addInitScript(() => {
  window.__scenes = [];
  const hook = new EventTarget();
  hook.addEventListener("observe", (e) => { if (e.detail?.isScene) window.__scenes.push(e.detail); });
  window.__THREE_DEVTOOLS__ = hook;
});
await page.goto(url);
await page.waitForFunction(() => window.__liturgy?.setStep && window.__boot?.firstFrame, null, { timeout: 180000 });
await page.waitForTimeout(2000);
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "ok  " : "FAIL"} ${name} ${detail}`); };
const snap = () => page.evaluate(() => { const s = window.__liturgy.procession.snapshot(); return { t: s.time, playing: s.playing, speed: s.speed, beat: s.beat, route: s.route, duration: s.duration }; });
const ui = () => page.evaluate(() => ({
  label: document.querySelector(".procession-label")?.textContent ?? null,
  play: document.querySelector(".procession-play")?.getAttribute("aria-label") ?? null,
  pressed: [...document.querySelectorAll(".procession-speeds button")].find((b) => b.getAttribute("aria-pressed") === "true")?.textContent ?? null,
  scrub: Number(document.querySelector(".procession-scrub")?.value ?? -1),
}));
// Priest is the walker 3.15 m behind the lead; find walkers as moving top groups once per step.
const findWalkers = async () => {
  await page.evaluate(() => {
    const scene = window.__scenes.at(-1);
    window.__snapAll = () => { const m = new Map(); scene.traverse((o) => { const v = o.getWorldPosition(o.position.clone()); m.set(o.uuid, [v.x, v.z]); }); return m; };
  });
  const d = (await snap()).duration;
  await page.evaluate((d) => { window.__liturgy.procession.seek(d * 0.3); }, d);
  await page.waitForTimeout(600);
  await page.evaluate(() => { window.__a = window.__snapAll(); });
  await page.evaluate((d) => { window.__liturgy.procession.seek(d * 0.5); }, d);
  await page.waitForTimeout(600);
  return page.evaluate(() => {
    const scene = window.__scenes.at(-1); const b = window.__snapAll(); const moved = new Set();
    scene.traverse((o) => { const p = window.__a.get(o.uuid), q = b.get(o.uuid); if (p && q && Math.hypot(p[0] - q[0], p[1] - q[1]) > 1) moved.add(o); });
    window.__walkers = [...moved].filter((o) => !moved.has(o.parent) && o.type === "Group");
    return window.__walkers.length;
  });
};
const priest = () => page.evaluate(() => window.__walkers.map((w) => { const v = w.getWorldPosition(w.position.clone()); return [+v.x.toFixed(2), +v.z.toFixed(2)]; }));

async function scrubTo(fraction) {
  const box = await page.locator(".procession-scrub").boundingBox();
  await page.mouse.click(box.x + box.width * fraction, box.y + box.height / 2);
}

for (const [index, id] of [[5, "little-entrance"], [12, "great-entrance"]]) {
  await page.evaluate((i) => window.__liturgy.setStep(i), index);
  await page.waitForSelector(".procession-bar", { timeout: 60000 });
  await page.waitForTimeout(1500);
  let s = await snap();
  check(`${id}: player appears and autoplays`, s.route === id && s.playing, JSON.stringify(s));
  const n = await findWalkers();
  check(`${id}: 4 walkers found`, n === 4, String(n));

  // Speed rates with real mouse clicks.
  await page.evaluate(() => window.__liturgy.procession.seek(0));
  await page.click(".procession-play").catch(() => {});
  s = await snap(); if (!s.playing) await page.click(".procession-play");
  for (const label of ["0.25×", "0.5×", "1×", "2×"]) {
    await page.click(`.procession-speeds button:has-text("${label}")`);
    const a = await snap(); const wa = Date.now();
    await page.waitForTimeout(4000);
    const b = await snap(); const wb = Date.now();
    const rate = (b.t - a.t) / ((wb - wa) / 1000);
    const want = Number(label.replace("×", ""));
    const u = await ui();
    check(`${id}: speed ${label} rate`, Math.abs(rate - want) / want < 0.2 && u.pressed === label, `measured ${rate.toFixed(3)}x, pressed=${u.pressed}`);
  }
  // Pause holds time and figures.
  await page.click(".procession-play");
  const p1 = await snap(); const w1 = await priest(); let u = await ui();
  await page.waitForTimeout(2500);
  const p2 = await snap(); const w2 = await priest();
  check(`${id}: pause freezes clock and walkers`, !p1.playing && u.play === "Play" && Math.abs(p2.t - p1.t) < 1e-6 && JSON.stringify(w1) === JSON.stringify(w2), `${p1.t.toFixed(2)}→${p2.t.toFixed(2)}`);
  // Speed change while paused stays paused.
  await page.click(`.procession-speeds button:has-text("0.5×")`);
  await page.waitForTimeout(1000);
  const p3 = await snap();
  check(`${id}: changing speed while paused stays paused`, !p3.playing && Math.abs(p3.t - p2.t) < 1e-6, `${p3.speed}`);
  // Next / previous moment walk the beats in order.
  await page.evaluate(() => window.__liturgy.procession.seek(0));
  await page.waitForTimeout(300);
  const labels = [];
  for (let i = 0; i < 12; i++) {
    u = await ui(); s = await snap(); labels.push([u.label, +s.t.toFixed(1)]);
    if (await page.locator('.procession-step[aria-label="Next moment"]').isDisabled()) break;
    await page.click('.procession-step[aria-label="Next moment"]');
    await page.waitForTimeout(250);
  }
  const times = labels.map((l) => l[1]);
  check(`${id}: Next moment steps forward through beats to the end`, times.every((t, i) => i === 0 || t > times[i - 1]) && (await snap()).t >= (await snap()).duration - 0.01, JSON.stringify(labels));
  const back = [];
  for (let i = 0; i < 12; i++) {
    await page.click('.procession-step[aria-label="Previous moment"]'); await page.waitForTimeout(250);
    back.push(+(await snap()).t.toFixed(1));
    if (back.at(-1) === 0) break;
  }
  check(`${id}: Previous moment steps backward to 0`, back.every((t, i) => i === 0 || t < back[i - 1]) && back.at(-1) === 0, JSON.stringify(back));
  // Scrub with mouse: click at 70%, then drag back to 20% (backward), then play from there.
  await scrubTo(0.7); await page.waitForTimeout(400);
  const sc1 = await snap(); const wp1 = await priest();
  const box = await page.locator(".procession-scrub").boundingBox();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x + box.width * (0.7 - 0.05 * i), box.y + box.height / 2); await page.waitForTimeout(40); }
  await page.mouse.up(); await page.waitForTimeout(400);
  const sc2 = await snap(); const wp2 = await priest();
  check(`${id}: mouse scrub to 70% then drag back to 20%`, Math.abs(sc1.t / sc1.duration - 0.7) < 0.05 && Math.abs(sc2.t / sc2.duration - 0.2) < 0.05 && JSON.stringify(wp1) !== JSON.stringify(wp2), `${(sc1.t / sc1.duration).toFixed(2)} → ${(sc2.t / sc2.duration).toFixed(2)}`);
  // Keyboard on scrub.
  await page.focus(".procession-scrub"); await page.keyboard.press("ArrowLeft"); await page.keyboard.press("ArrowLeft");
  const sk = await snap();
  check(`${id}: keyboard ArrowLeft on scrub goes back`, sk.t < sc2.t, `${sc2.t.toFixed(2)} → ${sk.t.toFixed(2)}`);
  // Play at 2x to the end, sampling time and priest position: time must never decrease.
  await page.click(`.procession-speeds button:has-text("2×")`);
  await page.click(".procession-play");
  let last = -1, reversed = 0, ended = false; const trace = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    s = await snap();
    if (s.t < last - 1e-6) reversed++;
    last = s.t; trace.push([+s.t.toFixed(2), ...(await priest())[3]]);
    if (!s.playing && s.t >= s.duration - 0.01) { ended = true; break; }
    await page.waitForTimeout(250);
  }
  u = await ui();
  check(`${id}: plays forward to the end without reversing, then shows Replay`, ended && reversed === 0 && u.play === "Replay", `samples ${trace.length}, reversals ${reversed}, label ${u.play}`);
  await page.waitForTimeout(3000);
  s = await snap();
  check(`${id}: stays at the end (no loop / ping-pong)`, !s.playing && s.t >= s.duration - 0.01);
  const endPos = await priest();
  // Replay starts over forward.
  await page.click(".procession-play");
  await page.waitForTimeout(300);
  const r1 = await snap(); const rp1 = await priest();
  await page.waitForTimeout(3000);
  const r2 = await snap(); const rp2 = await priest();
  check(`${id}: Replay restarts at the beginning and moves forward`, r1.t < 1.5 && r2.t > r1.t && r2.playing, `${r1.t.toFixed(2)}→${r2.t.toFixed(2)} lead ${rp1[0]}→${rp2[0]} end ${endPos[0]}`);
  // Leave and re-enter the step: restarts at 0, forward.
  await page.evaluate((i) => window.__liturgy.setStep(i + 1), index);
  await page.waitForTimeout(1500);
  await page.evaluate((i) => window.__liturgy.setStep(i), index);
  await page.waitForTimeout(1500);
  const re1 = await snap(); await page.waitForTimeout(2000); const re2 = await snap();
  check(`${id}: re-entering the step restarts forward`, re1.route === id && re1.t < 3 && re2.t > re1.t, `${re1.t.toFixed(2)}→${re2.t.toFixed(2)} speed ${re2.speed}`);
  writeFileSync(`${out}/${id}-trace.json`, JSON.stringify(trace));

  // Screenshots at each beat (+1.2 s so the moment is under way), paused.
  await page.click(".procession-play"); // pause
  s = await snap();
  const beats = await page.evaluate(() => window.__liturgy.procession.snapshot().beats);
  let k = 0;
  for (const beat of [...beats, { label: "end", time: s.duration }]) {
    const t = Math.min(s.duration, beat.time + (beat.label === "end" ? 0 : 1.2));
    await page.evaluate((t) => window.__liturgy.procession.seek(t), t);
    await page.waitForTimeout(1800);
    k += 1;
    const slug = beat.label.toLowerCase().replace(/[^a-z]+/g, "-").slice(0, 40).replace(/-$/, "");
    await page.screenshot({ path: `${out}/${id}-${String(k).padStart(2, "0")}-${slug}.png` });
  }
}

// Overhead of tetrapod, walkway and reader (debug camera), on the Little Entrance step.
await page.evaluate(() => window.__liturgy.setStep(5));
await page.waitForTimeout(2000);
await page.evaluate(() => { const c = window.__liturgy.procession; c.pause(); c.seek(c.snapshot().duration * 0.52); });
await page.evaluate(() => window.__liturgy.setCamera([0.2, 9.5, 5.5], [-0.6, 0, -1.2]));
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/layout-overhead-tetrapod-walkway-reader.png` });
await page.evaluate(() => window.__liturgy.setCamera([-5.5, 2.4, 4.5], [-1.0, 0.9, -1.8]));
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/layout-reader-from-north-back.png` });
await page.evaluate(() => window.__liturgy.clearCamera());

writeFileSync(`${out}/results.json`, JSON.stringify({ results, errors }, null, 1));
console.log("FAILS", results.filter((r) => !r.ok).length, "console errors", errors.length, errors.slice(0, 5));
await browser.close();
