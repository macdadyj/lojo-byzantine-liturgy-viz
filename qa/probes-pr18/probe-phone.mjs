// Independent phone probe: production build, iPhone viewport, CDP touch, Fast 3G + 4x CPU, software GL, safe area.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire("/workspace/package.json");
const { chromium } = require("playwright");

const url = process.env.URL ?? "http://localhost:4199/";
const out = "/tmp/qa18/out/phone";
mkdirSync(out, { recursive: true });
const iphoneUa = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const viewport = { width: 390, height: 844 };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({ viewport, screen: viewport, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: iphoneUa });
const page = await context.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
const cdp = await context.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8 * 0.9, uploadThroughput: (750 * 1024) / 8 * 0.9 });
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
let safeArea = "unsupported";
try { await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: 47, bottom: 34, left: 0, right: 0 } }); safeArea = "top 47 / bottom 34"; } catch (e) { safeArea = `unsupported: ${e.message.slice(0, 80)}`; }

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "ok  " : "FAIL"} ${name} ${detail}`); };
const touch = (type, points) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
const tap = async (x, y) => { await touch("touchStart", [{ x, y }]); await touch("touchEnd", []); await page.waitForTimeout(400); };
const drag = async (from, to, steps = 14) => {
  await touch("touchStart", [{ x: from[0], y: from[1] }]);
  for (let i = 1; i <= steps; i++) { const t = i / steps; await touch("touchMove", [{ x: from[0] + (to[0] - from[0]) * t, y: from[1] + (to[1] - from[1]) * t }]); await page.waitForTimeout(20); }
  await touch("touchEnd", []); await page.waitForTimeout(500);
};
const box = (sel) => page.evaluate((sel) => {
  const el = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length);
  if (!el) return null;
  const b = el.getBoundingClientRect(); const x = b.left + b.width / 2, y = b.top + b.height / 2;
  const hit = document.elementFromPoint(x, y);
  return { x, y, w: b.width, h: b.height, top: b.top, bottom: b.bottom, onTop: !!hit && (hit === el || el.contains(hit)) };
}, sel);
const tapSel = async (sel) => { const b = await box(sel); if (!b) throw new Error(`missing ${sel}`); await tap(b.x, b.y); return b; };
const count = () => page.evaluate(() => document.querySelector(".step-bar-count")?.textContent?.trim() ?? "");

// Load timeline.
const t0 = Date.now();
await page.goto(url, { waitUntil: "commit" });
const marks = {};
for (const at of [700, 2000, 4000]) {
  await page.waitForTimeout(at - (Date.now() - t0) > 0 ? at - (Date.now() - t0) : 0);
  await page.screenshot({ path: `${out}/load-${at}ms.png` });
  marks[`${at}ms`] = await page.evaluate(() => ({ boot: !!document.querySelector(".boot") && getComputedStyle(document.querySelector(".boot")).display !== "none", text: document.body.innerText.slice(0, 80).replace(/\n/g, " | ") }));
}
await page.waitForFunction(() => document.querySelector(".step-bar-next"), null, { timeout: 120000, polling: 100 });
marks.nextButtonMs = Date.now() - t0;
await page.waitForFunction(() => window.__boot?.firstFrame, null, { timeout: 240000, polling: 200 });
marks.firstFrameMs = Date.now() - t0;
await page.waitForTimeout(2000);
marks.boot = await page.evaluate(() => window.__boot);
await page.screenshot({ path: `${out}/loaded.png` });
check("loads to usable state under Fast 3G + 4x CPU", marks.nextButtonMs < 30000, JSON.stringify({ next: marks.nextButtonMs, firstFrame: marks.firstFrameMs, ...Object.fromEntries(Object.entries(marks).filter(([k]) => k.endsWith("0ms"))) }));
console.log("boot", JSON.stringify(marks.boot)?.slice(0, 400));

// Safe area: top bar below the notch, bottom controls above the home indicator.
const top = await page.evaluate(() => { const b = document.querySelector(".phone-menu-button")?.getBoundingClientRect(); return b ? b.top : -1; });
const nextB = await box(".step-bar-next");
check(`safe area respected (${safeArea})`, safeArea.startsWith("unsup") ? true : top >= 47 && nextB.bottom <= 844 - 34, `menu top ${top.toFixed(0)}, Next bottom ${nextB.bottom.toFixed(0)}`);

// Touch targets: every visible interactive element in the viewport.
const small = await page.evaluate(() => [...document.querySelectorAll("button, a[href], input, select, [role=button], summary")]
  .filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden")
  .map((e) => { const b = e.getBoundingClientRect(); return { t: (e.getAttribute("aria-label") || e.textContent || e.className).trim().slice(0, 30), w: Math.round(b.width), h: Math.round(b.height), inView: b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth, cls: String(e.className).slice(0, 30) }; })
  .filter((e) => e.inView && (e.w < 44 || e.h < 44)));
check("all on-screen touch targets >= 44 px (3D view, sheet open)", small.length === 0, JSON.stringify(small));

// Sheet + bottom controls reachable over the 3D view.
for (const sel of [".step-bar-prev", ".step-bar-next", ".step-bar-status.is-toggle", ".phone-menu-button", ".phone-view-switch button"]) {
  const b = await box(sel);
  check(`${sel} visible, on top, >=44px`, b && b.onTop && b.w >= 44 && b.h >= 44 && b.bottom <= 844 && b.top >= 0, b ? `${Math.round(b.w)}x${Math.round(b.h)} @${Math.round(b.top)}` : "missing");
}
const canvas = await box(".church-view canvas");
const sheetTop = await page.evaluate(() => document.querySelector(".step-sheet, .step-bar")?.getBoundingClientRect().top ?? -1);
check("3D view fills screen with sheet over its bottom", canvas && canvas.h > 500 && sheetTop > 0 && sheetTop < canvas.bottom, `canvas ${Math.round(canvas?.top)}-${Math.round(canvas?.bottom)}, sheet top ${Math.round(sheetTop)}`);

// Drag on canvas (several directions, incl. long vertical drags), then controls still answer.
let before = await count();
for (const [a, b] of [[[300, 250], [80, 300]], [[200, 200], [200, 520]], [[200, 480], [200, 120]], [[120, 300], [330, 250]]]) await drag(a, b);
const scrollY = await page.evaluate(() => scrollY);
await tapSel(".step-bar-next");
let after = await count();
check("after 4 canvas drags, Next still answers and page did not jump", after !== before && scrollY === 0, `${before} → ${after}, scrollY ${scrollY}`);
await tapSel(".step-bar-prev");
check("Back answers", (await count()) === before, await count());
// Mid-drag interruption: touch starts on canvas, ends on the Next button; then tap Next.
await drag([200, 300], [nextB.x, nextB.y]);
before = await count(); await tapSel(".step-bar-next"); after = await count();
check("drag ending over Next does not swallow the following tap", after !== before, `${before} → ${after}`);
// Sheet collapse / expand.
await tapSel(".step-bar-status.is-toggle");
const collapsed = await page.evaluate(() => document.querySelector(".step-bar-status.is-toggle")?.getAttribute("aria-expanded"));
await page.screenshot({ path: `${out}/sheet-collapsed.png` });
await tapSel(".step-bar-status.is-toggle");
const expanded = await page.evaluate(() => document.querySelector(".step-bar-status.is-toggle")?.getAttribute("aria-expanded"));
check("title toggles the sheet closed and open", collapsed === "false" && expanded === "true", `${collapsed}/${expanded}`);
await page.screenshot({ path: `${out}/sheet-open.png` });

// Menu.
await tapSel(".phone-menu-button");
const menu = await page.evaluate(() => { const m = document.querySelector(".step-menu"); return m ? { links: m.querySelectorAll(".step-link").length, text: m.innerText.slice(0, 200) } : null; });
await page.screenshot({ path: `${out}/menu.png` });
check("menu opens with all steps", menu && menu.links >= 22, JSON.stringify(menu?.links));
const smallMenu = await page.evaluate(() => [...document.querySelectorAll(".step-menu button, .step-menu a")].filter((e) => e.getClientRects().length).map((e) => e.getBoundingClientRect()).filter((b) => b.bottom > 0 && b.top < innerHeight && b.height < 44).length);
check("menu touch targets >= 44 px tall", smallMenu === 0, `${smallMenu} small`);
// Jump to Great Entrance from the menu with a tap.
const ge = await page.evaluate(() => { const l = [...document.querySelectorAll(".step-menu .step-link")].find((b) => /great entrance/i.test(b.textContent)); l?.scrollIntoView({ block: "center" }); const b = l?.getBoundingClientRect(); return b && { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
await tap(ge.x, ge.y);
await page.waitForSelector(".procession-bar", { timeout: 60000 });
check("menu jump to Great Entrance", (await count()).startsWith("13 /"), await count());
await page.waitForTimeout(3000);

// Player with touch.
const clock = () => page.evaluate(() => ({
  label: document.querySelector(".procession-label")?.textContent, play: document.querySelector(".procession-play")?.getAttribute("aria-label"),
  speed: document.querySelector(".procession-speed")?.textContent, v: Number(document.querySelector(".procession-scrub")?.value), max: Number(document.querySelector(".procession-scrub")?.max),
}));
for (const sel of [".procession-play", ".procession-step", ".procession-speed", ".procession-scrub"]) {
  const b = await box(sel); check(`player ${sel} >= 44 px and on top`, b && b.onTop && b.h >= 44 && b.w >= 44, b ? `${Math.round(b.w)}x${Math.round(b.h)}` : "missing");
}
let c = await clock();
check("Great Entrance autoplays on phone", c.play === "Pause", JSON.stringify(c));
// Speed cycles through all four.
const seen = [c.speed];
for (let i = 0; i < 4; i++) { await tapSel(".procession-speed"); seen.push((await clock()).speed); }
check("speed button cycles 0.25/0.5/1/2 and wraps", new Set(seen).size === 4 && seen[0] === seen[4], seen.join(" → "));
// Set 0.25 and measure; then 2x.
const rateAt = async (label) => {
  for (let i = 0; i < 4 && (await clock()).speed !== label; i++) await tapSel(".procession-speed");
  const a = await clock(); const wa = Date.now(); await page.waitForTimeout(5000); const b = await clock();
  return { speed: a.speed, rate: (b.v - a.v) / ((Date.now() - wa) / 1000) };
};
for (const l of ["0.25×", "0.5×", "1×", "2×"]) { const r = await rateAt(l); const want = Number(l.slice(0, -1)); check(`phone speed ${l} rate (4x CPU)`, Math.abs(r.rate - want) / want < 0.35, `measured ${r.rate.toFixed(2)}x`); }
// Pause.
await tapSel(".procession-play"); c = await clock(); await page.waitForTimeout(2000); let c2 = await clock();
check("tap Pause stops", c.play === "Play" && c.v === c2.v, `${c.v} → ${c2.v}`);
// Next / previous moment.
const l1 = (await clock()).label; await tapSel('.procession-step[aria-label="Next moment"]'); const l2 = (await clock()).label;
await tapSel('.procession-step[aria-label="Previous moment"]'); const l3 = (await clock()).label;
check("Next/Previous moment by tap", l1 !== l2 && l3 === l1, `${l1} → ${l2} → ${l3}`);
// Scrub forward then backward with finger drags.
const sb = await box(".procession-scrub");
const left = sb.x - sb.w / 2, right = sb.x + sb.w / 2;
await drag([left + 8, sb.y], [left + sb.w * 0.85, sb.y]); const s1 = await clock();
await drag([left + sb.w * 0.85, sb.y], [left + sb.w * 0.2, sb.y]); const s2 = await clock();
check("finger scrub forward then backward", s1.v / s1.max > 0.7 && s2.v / s2.max < 0.35 && (await page.evaluate(() => scrollY)) === 0, `${(s1.v / s1.max).toFixed(2)} → ${(s2.v / s2.max).toFixed(2)}`);
await page.screenshot({ path: `${out}/player-after-scrub-back.png` });
// Resume from there, still forward.
await tapSel(".procession-play"); const r1 = await clock(); await page.waitForTimeout(3000); const r2 = await clock();
check("Play after backward scrub continues forward from there", r2.v > r1.v && Math.abs(r1.v - s2.v) < 2, `${r1.v} → ${r2.v}`);
// To the end: drag to the right edge, let it finish, then Replay.
await drag([left + sb.w * 0.3, sb.y], [right + 10, sb.y]); await page.waitForTimeout(3000);
c = await clock();
check("at the end shows Replay and stops", c.play === "Replay" && c.v >= c.max - 0.1, JSON.stringify(c));
await tapSel(".procession-play"); await page.waitForTimeout(500); const rp1 = await clock(); await page.waitForTimeout(3000); const rp2 = await clock();
check("Replay by tap restarts forward", rp1.v < 3 && rp2.v > rp1.v, `${rp1.v} → ${rp2.v}`);
await page.screenshot({ path: `${out}/player-replay.png` });

// Moments of the Great Entrance on phone.
await tapSel(".procession-play");
for (const f of [0.1, 0.3, 0.5, 0.62, 0.86]) {
  await page.evaluate(() => {}); const b2 = await box(".procession-scrub");
  const lx = b2.x - b2.w / 2; await tap(lx + b2.w * f, b2.y); await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/great-${Math.round(f * 100)}.png` });
}

// Text view: page scroll works with finger, Next reachable.
await tapSel(".phone-view-switch button:not([aria-pressed=true])");
await page.waitForTimeout(800);
const tv = await page.evaluate(() => ({ canvas: !!document.querySelector(".church-view canvas")?.getClientRects().length, h: document.documentElement.scrollHeight }));
await drag([200, 650], [200, 200]); await drag([200, 650], [200, 200]);
const ty = await page.evaluate(() => scrollY);
await page.screenshot({ path: `${out}/text-view-scrolled.png` });
const tn = await box(".step-bar-next");
before = await count(); await tap(tn.x, tn.y); after = await count();
check("Text view: church hidden, page scrolls by finger, Next reachable", !tv.canvas && ty > 200 && tn.onTop && after !== before, `scrollY ${ty}, ${before} → ${after}`);
const smallText = await page.evaluate(() => [...document.querySelectorAll("button, a[href], input, summary")].filter((e) => e.getClientRects().length).map((e) => ({ t: (e.getAttribute("aria-label") || e.textContent).trim().slice(0, 25), b: e.getBoundingClientRect() })).filter(({ b }) => b.bottom > 0 && b.top < innerHeight && (b.height < 44 || b.width < 44)).map(({ t, b }) => `${t} ${Math.round(b.width)}x${Math.round(b.height)}`));
check("Text view touch targets >= 44 px", smallText.length === 0, JSON.stringify(smallText));
await tapSel(".phone-view-switch button:not([aria-pressed=true])");
await page.waitForTimeout(1500);
check("3D view comes back", await page.evaluate(() => !!document.querySelector(".church-view canvas")?.getClientRects().length));

// Little Entrance on phone.
await tapSel(".phone-menu-button");
const le = await page.evaluate(() => { const l = [...document.querySelectorAll(".step-menu .step-link")].find((b) => /little entrance/i.test(b.textContent)); l?.scrollIntoView({ block: "center" }); const b = l?.getBoundingClientRect(); return b && { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
await tap(le.x, le.y); await page.waitForSelector(".procession-bar", { timeout: 60000 });
await tapSel(".procession-play");
for (const f of [0.2, 0.45, 0.62, 0.78]) { const b2 = await box(".procession-scrub"); await tap(b2.x - b2.w / 2 + b2.w * f, b2.y); await page.waitForTimeout(2500); await page.screenshot({ path: `${out}/little-${Math.round(f * 100)}.png` }); }

// Landscape.
await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(2000);
const ln = await box(".step-bar-next"); const lm = await box(".phone-menu-button");
check("landscape: Next and menu reachable", ln?.onTop && lm?.onTop, "");
await page.screenshot({ path: `${out}/landscape.png` });

check("no console errors", errors.length === 0, JSON.stringify(errors.slice(0, 5)));
writeFileSync(`${out}/results.json`, JSON.stringify({ marks, results, errors, safeArea }, null, 1));
console.log("FAILS", results.filter((r) => !r.ok).length);
await browser.close();
