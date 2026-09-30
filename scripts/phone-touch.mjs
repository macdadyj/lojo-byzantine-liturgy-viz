#!/usr/bin/env node
// Drives the phone layout with real touch input and checks that a finger on the 3D church never keeps you from
// the controls: drag the church, then reach Next, the step sheet, the Steps menu, the Text view and its scroll.
// Chromium sends touches through the DevTools protocol (they go through touch-action and scrolling like a
// finger); WebKit, which has no touch-move API, repeats the taps and takes the screenshots. On the Great
// Entrance it also works the procession player: pause, speed, next moment, and a finger drag on the scrub bar.
// Usage: npm run phone:touch [-- --no-build --only=chromium|webkit]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "vite";
import { chromium, webkit } from "playwright";
import { parseArgs, root, runStamp } from "./lib/harness.mjs";
import { startThrottledServer } from "./lib/throttle-server.mjs";

const args = parseArgs(process.argv.slice(2));
const only = typeof args.only === "string" ? args.only : null;
const outDir = join(root, "qa", "phone", `${runStamp()}-touch`);
mkdirSync(outDir, { recursive: true });

const iphoneUa =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const viewport = { width: 390, height: 844 };

if (!args["no-build"]) await build({ root, logLevel: "error" });
const server = await startThrottledServer({ dist: join(root, "dist"), network: "none" });

const results = [];
let failures = 0;
function check(browser, name, ok, detail = "") {
  results.push({ browser, name, ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${browser.padEnd(8)} ${name}${detail ? `  (${detail})` : ""}`);
}

/** Center of an element, and whether a tap there would land on that element rather than something over it. */
async function reach(page, selector) {
  return page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return { found: false };
    const box = element.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const hit = document.elementFromPoint(x, y);
    const inside = box.top >= 0 && box.bottom <= window.innerHeight && box.left >= 0 && box.right <= window.innerWidth;
    return { found: true, x, y, w: box.width, h: box.height, inside, onTop: Boolean(hit && (hit === element || element.contains(hit))) };
  }, selector);
}

const state = (page) =>
  page.evaluate(() => ({
    count: document.querySelector(".step-bar-count")?.textContent?.trim() ?? "",
    scrollY: Math.round(window.scrollY),
    bodyOverflow: getComputedStyle(document.body).overflow,
    htmlOverflow: getComputedStyle(document.documentElement).overflow,
    canvasShown: Boolean(document.querySelector(".church-view canvas")?.getClientRects().length),
    sheetOpen: document.querySelector(".step-bar-status.is-toggle")?.getAttribute("aria-expanded") === "true",
    menuOpen: Boolean(document.querySelector(".step-menu")),
    touchAction: getComputedStyle(document.querySelector(".church-view") ?? document.body).touchAction,
  }));

async function openPage(browserType) {
  const browser = browserType === "chromium"
    ? await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] })
    : await webkit.launch();
  const context = await browser.newContext({ viewport, screen: viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: iphoneUa });
  const page = await context.newPage();
  await page.goto(server.url);
  await page.waitForFunction(() => window.__boot?.firstFrame, null, { timeout: 180000, polling: 200 });
  await page.waitForTimeout(1500);
  return { browser, page };
}

async function runChromium() {
  const { browser, page } = await openPage("chromium");
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, points) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  const tap = async (x, y) => {
    await touch("touchStart", [{ x, y }]);
    await touch("touchEnd", []);
    await page.waitForTimeout(250);
  };
  const drag = async (from, to, steps = 12) => {
    await touch("touchStart", [{ x: from[0], y: from[1] }]);
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      await touch("touchMove", [{ x: from[0] + (to[0] - from[0]) * t, y: from[1] + (to[1] - from[1]) * t }]);
      await page.waitForTimeout(16);
    }
    await touch("touchEnd", []);
    await page.waitForTimeout(300);
  };
  const tapSelector = async (selector) => {
    const where = await reach(page, selector);
    if (!where.found) throw new Error(`missing ${selector}`);
    await tap(where.x, where.y);
  };
  const canvasPixels = () => page.screenshot({ clip: { x: 20, y: 140, width: 350, height: 200 } });

  let s = await state(page);
  check("chromium", "opens in the 3D view with the step sheet open", s.canvasShown && s.sheetOpen, JSON.stringify(s));
  check("chromium", "body and html never lock scrolling", s.bodyOverflow !== "hidden" && s.htmlOverflow !== "hidden", `${s.bodyOverflow}/${s.htmlOverflow}`);
  check("chromium", "the church is a drag-to-look area", s.touchAction === "none", s.touchAction);

  for (const selector of [".step-bar-next", ".step-bar-prev", ".step-bar-status.is-toggle", ".phone-menu-button", ".phone-view-switch button"]) {
    const where = await reach(page, selector);
    check("chromium", `${selector} on screen, on top, at least 44 px`, where.inside && where.onTop && where.h >= 44 && where.w >= 44, `${Math.round(where.w)}×${Math.round(where.h)}`);
  }

  // Look around in Follow liturgy, then tap Next right away.
  const before = await canvasPixels();
  await drag([300, 260], [90, 300]);
  const after = await canvasPixels();
  s = await state(page);
  check("chromium", "dragging the church turns the view", !before.equals(after));
  check("chromium", "dragging the church does not scroll the page", s.scrollY === 0, `scrollY ${s.scrollY}`);
  await page.screenshot({ path: join(outDir, "chromium-after-drag.png") });
  await tapSelector(".step-bar-next");
  s = await state(page);
  check("chromium", "Next answers right after a drag", s.count.startsWith("2 /"), s.count);

  // A drag that ends on top of the sheet must not block it either.
  await drag([200, 300], [200, 700]);
  await tapSelector(".step-bar-next");
  s = await state(page);
  check("chromium", "Next answers after a drag that ends over the sheet", s.count.startsWith("3 /"), s.count);

  // The words scroll inside the sheet, not the page (with "What you see, hear, and why" open so they overflow).
  const bodyBefore = await page.evaluate(() => {
    document.querySelector(".step-sheet-body details")?.setAttribute("open", "");
    return document.querySelector(".step-sheet-body")?.scrollTop ?? -1;
  });
  await page.waitForTimeout(300);
  await drag([200, 700], [200, 500]);
  const sheetScroll = await page.evaluate(() => ({ body: document.querySelector(".step-sheet-body")?.scrollTop ?? -1, page: window.scrollY }));
  check("chromium", "a swipe on the words scrolls the sheet", sheetScroll.body > bodyBefore && sheetScroll.page === 0, JSON.stringify(sheetScroll));

  // Collapse the sheet: the church gets the screen, Back and Next stay.
  await tapSelector(".step-bar-status.is-toggle");
  s = await state(page);
  check("chromium", "the sheet collapses to the Back/Next bar", !s.sheetOpen);
  await page.screenshot({ path: join(outDir, "chromium-sheet-closed.png") });

  // Free look: the joystick sits above the bar; a drag walks the view and Next still answers.
  await page.evaluate(() => [...document.querySelectorAll(".view-bar button")].find((b) => /free look/i.test(b.textContent ?? ""))?.click());
  await page.waitForTimeout(1200);
  const stick = await reach(page, ".joystick");
  check("chromium", "the joystick is on screen and not under the bar", stick.found && stick.inside && stick.onTop);
  await drag([320, 250], [120, 260]);
  await tapSelector(".step-bar-next");
  s = await state(page);
  check("chromium", "Next answers in Free look after a drag", s.count.startsWith("4 /"), s.count);

  // Steps menu: opens over the church, scrolls inside itself, jumps to a step.
  await tapSelector(".phone-menu-button");
  s = await state(page);
  check("chromium", "the Steps menu opens", s.menuOpen);
  const navBefore = await page.evaluate(() => document.querySelector(".step-menu .step-nav")?.scrollTop ?? -1);
  await drag([200, 700], [200, 350]);
  const navAfter = await page.evaluate(() => ({ nav: document.querySelector(".step-menu .step-nav")?.scrollTop ?? -1, page: window.scrollY }));
  check("chromium", "the menu scrolls inside itself", navAfter.nav > navBefore && navAfter.page === 0, JSON.stringify({ navBefore, ...navAfter }));
  await page.screenshot({ path: join(outDir, "chromium-menu.png") });
  const target = await page.evaluate(() => {
    const link = [...document.querySelectorAll(".step-menu .step-link")].find((b) => /great entrance/i.test(b.textContent ?? ""));
    link?.scrollIntoView({ block: "center", behavior: "instant" });
    const box = link?.getBoundingClientRect();
    return box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null;
  });
  if (target) await tap(target.x, target.y);
  s = await state(page);
  check("chromium", "a step in the menu jumps there and closes the menu", !s.menuOpen && s.count.startsWith("13 /"), s.count);

  // The Great Entrance player sits in the sheet under the thumb: pause, speed, step, and scrub with a finger.
  await page.waitForSelector(".procession-bar", { timeout: 30000 });
  for (const selector of [".procession-play", ".procession-step", ".procession-speed", ".procession-scrub"]) {
    const where = await reach(page, selector);
    check("chromium", `player ${selector} on screen, on top, at least 44 px tall`, where.inside && where.onTop && where.h >= 44, `${Math.round(where.w)}×${Math.round(where.h)}`);
  }
  const player = () =>
    page.evaluate(() => ({
      time: document.querySelector(".procession-time")?.textContent?.split("/")[0]?.trim() ?? "",
      beat: document.querySelector(".procession-label")?.textContent ?? "",
      play: document.querySelector(".procession-play")?.getAttribute("aria-label") ?? "",
      speed: document.querySelector(".procession-speed")?.textContent ?? "",
      scrub: Number(document.querySelector(".procession-scrub")?.value ?? -1),
    }));
  const seconds = (text) => text.split(":").reduce((total, part) => total * 60 + Number(part), 0);
  let p = await player();
  await page.waitForTimeout(2500);
  let later = await player();
  check("chromium", "the Great Entrance plays on its own", p.play === "Pause" && later.scrub > p.scrub, `${p.scrub} → ${later.scrub}`);
  await tapSelector(".procession-play");
  p = await player();
  await page.waitForTimeout(1500);
  later = await player();
  check("chromium", "Pause stops it", p.play === "Play" && later.scrub === p.scrub, `${p.scrub} → ${later.scrub}`);
  await tapSelector(".procession-speed");
  p = await player();
  check("chromium", "the speed button steps to 2×", p.speed === "2×", p.speed);
  await tapSelector('.procession-step[aria-label="Next moment"]');
  later = await player();
  check("chromium", "Next moment jumps to the next beat", later.beat !== p.beat && seconds(later.time) > seconds(p.time), `${p.beat} → ${later.beat}`);
  const scrub = await reach(page, ".procession-scrub");
  const scrubBefore = (await player()).scrub;
  await drag([scrub.x - scrub.w * 0.2, scrub.y], [scrub.x + scrub.w * 0.4, scrub.y], 8);
  p = await player();
  s = await state(page);
  check("chromium", "a finger on the scrub bar moves the procession, not the page", p.scrub > scrubBefore + 10 && s.scrollY === 0, `${scrubBefore} → ${p.scrub}`);
  await page.screenshot({ path: join(outDir, "chromium-player.png") });
  await tapSelector(".procession-play");
  check("chromium", "Play resumes", (await player()).play === "Pause");

  // Text view: an ordinary page that scrolls with a finger.
  await tapSelector('.phone-view-switch button:nth-child(2)');
  await page.waitForTimeout(400);
  s = await state(page);
  check("chromium", "Text hides the church", !s.canvasShown);
  await page.screenshot({ path: join(outDir, "chromium-text.png") });
  await drag([200, 650], [200, 200]);
  await page.waitForTimeout(600);
  s = await state(page);
  check("chromium", "the Text view scrolls with a finger", s.scrollY > 100, `scrollY ${s.scrollY}`);
  await page.screenshot({ path: join(outDir, "chromium-text-scrolled.png") });
  const next = await reach(page, ".step-bar-next");
  check("chromium", "Next stays reachable while scrolled", next.inside && next.onTop);
  await tapSelector(".step-bar-next");
  s = await state(page);
  check("chromium", "Next answers in the Text view", s.count.startsWith("14 /"), s.count);
  const bar = await reach(page, ".phone-menu-button");
  check("chromium", "the top bar stays reachable while scrolled", bar.inside && bar.onTop);

  // Menu section links, then back to the church.
  await tapSelector(".phone-menu-button");
  await page.evaluate(() => [...document.querySelectorAll(".step-menu-sections button")].find((b) => /places/i.test(b.textContent ?? ""))?.click());
  await page.waitForTimeout(900);
  const places = await page.evaluate(() => Math.round(document.getElementById("page-places")?.getBoundingClientRect().top ?? -1));
  check("chromium", "Places in the church scrolls to that section", places >= 0 && places < 200, `top ${places}`);
  await tapSelector('.phone-view-switch button:nth-child(1)');
  await page.waitForTimeout(800);
  s = await state(page);
  check("chromium", "3D brings the church back at the top of the page", s.canvasShown && s.scrollY === 0, `scrollY ${s.scrollY}`);

  // Sideways.
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(1200);
  for (const selector of [".step-bar-next", ".phone-menu-button"]) {
    const where = await reach(page, selector);
    check("chromium", `landscape: ${selector} reachable`, where.inside && where.onTop);
  }
  await page.screenshot({ path: join(outDir, "chromium-landscape.png") });
  await browser.close();
}

async function runWebkit() {
  const { browser, page } = await openPage("webkit");
  const tapSelector = async (selector) => {
    const where = await reach(page, selector);
    if (!where.found) throw new Error(`missing ${selector}`);
    await page.touchscreen.tap(where.x, where.y);
    await page.waitForTimeout(400);
  };
  const shot = (name) => page.screenshot({ path: join(outDir, `webkit-${name}.png`) });
  let s = await state(page);
  check("webkit", "opens in the 3D view with the step sheet open", s.canvasShown && s.sheetOpen);
  await shot("3d-sheet-open");
  await tapSelector(".step-bar-next");
  s = await state(page);
  check("webkit", "a tap on Next answers", s.count.startsWith("2 /"), s.count);
  await tapSelector(".step-bar-status.is-toggle");
  await page.waitForTimeout(600);
  await shot("3d-sheet-closed");
  await page.evaluate(() => [...document.querySelectorAll(".view-bar button")].find((b) => /free look/i.test(b.textContent ?? ""))?.click());
  await page.waitForTimeout(1500);
  await shot("3d-free-look");
  await page.evaluate(() => [...document.querySelectorAll(".view-bar button")].find((b) => /follow/i.test(b.textContent ?? ""))?.click());
  await tapSelector(".phone-menu-button");
  s = await state(page);
  check("webkit", "the Steps menu opens with a tap", s.menuOpen);
  await shot("menu");
  await tapSelector(".step-menu-head button");
  await tapSelector('.phone-view-switch button:nth-child(2)');
  await page.waitForTimeout(500);
  s = await state(page);
  check("webkit", "Text hides the church", !s.canvasShown);
  await shot("text");
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: "instant" }));
  await page.waitForTimeout(400);
  await shot("text-scrolled");
  await tapSelector('.phone-view-switch button:nth-child(1)');
  await page.waitForTimeout(800);
  s = await state(page);
  check("webkit", "3D brings the church back", s.canvasShown && s.scrollY === 0);
  await tapSelector(".phone-menu-button");
  const entrance = await page.evaluate(() => {
    const link = [...document.querySelectorAll(".step-menu .step-link")].find((b) => /great entrance/i.test(b.textContent ?? ""));
    link?.scrollIntoView({ block: "center", behavior: "instant" });
    const box = link?.getBoundingClientRect();
    return box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null;
  });
  if (entrance) await page.touchscreen.tap(entrance.x, entrance.y);
  await page.waitForSelector(".procession-bar", { timeout: 30000 });
  await tapSelector(".procession-play");
  const paused = await page.evaluate(() => document.querySelector(".procession-play")?.getAttribute("aria-label"));
  await tapSelector(".procession-speed");
  const speed = await page.evaluate(() => document.querySelector(".procession-speed")?.textContent);
  check("webkit", "the procession player answers taps (pause, speed)", paused === "Play" && speed === "2×", `${paused} ${speed}`);
  await shot("player");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(1500);
  await shot("landscape");
  await browser.close();
}

try {
  if (!only || only === "chromium") await runChromium();
  if (!only || only === "webkit") await runWebkit();
} finally {
  await server.close();
}
writeFileSync(join(outDir, "report.json"), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failures}/${results.length} checks passed. Screenshots: ${outDir}`);
process.exit(failures ? 1 : 0);
