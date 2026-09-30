import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire("/workspace/package.json");
const { chromium, webkit, devices } = require("playwright");
const out = "/tmp/qa18/out/phone2";
mkdirSync(out, { recursive: true });
const url = "http://localhost:4199/";
const log = {};

for (const [name, type] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await type.launch(name === "chromium" ? { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] } : {});
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(url);
  await page.waitForFunction(() => window.__boot?.firstFrame, null, { timeout: 240000, polling: 250 });
  await page.waitForTimeout(3000);
  const entry = { boot: await page.evaluate(() => ({ tier: window.__boot?.tier, renderer: window.__boot?.gpu?.renderer, sceneReady: window.__boot?.sceneReady })) };
  // Fresh step 2 (Proskomedia), sheet open and collapsed.
  await page.tap(".step-bar-next"); await page.waitForTimeout(3000);
  await page.screenshot({ path: `${out}/${name}-step2-open.png` });
  await page.tap(".step-bar-status.is-toggle"); await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${name}-step2-collapsed.png` });
  entry.collapsedPlayerVisible = null;
  // Great Entrance via menu, collapse sheet: is the player still there?
  await page.tap(".phone-menu-button"); await page.waitForTimeout(500);
  await page.locator(".step-menu .step-link", { hasText: /Great Entrance/i }).first().scrollIntoViewIfNeeded();
  await page.locator(".step-menu .step-link", { hasText: /Great Entrance/i }).first().tap();
  await page.waitForTimeout(1500);
  const expanded = await page.evaluate(() => document.querySelector(".step-bar-status.is-toggle")?.getAttribute("aria-expanded"));
  entry.greatSheetExpanded = expanded;
  entry.playerVisible = await page.evaluate(() => !!document.querySelector(".procession-bar")?.getClientRects().length);
  if (expanded === "true") { await page.tap(".step-bar-status.is-toggle"); await page.waitForTimeout(800); }
  entry.playerVisibleCollapsed = await page.evaluate(() => { const b = document.querySelector(".procession-bar"); return !!b && b.getClientRects().length > 0 && b.getBoundingClientRect().bottom <= innerHeight; });
  for (const t of [20, 45, 60, 77]) {
    await page.evaluate(() => {});
    // seek via range input (no dev bridge in production)
    await page.evaluate((t) => { const r = document.querySelector(".procession-scrub"); if (!r) return; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(r, String(t)); r.dispatchEvent(new Event("input", { bubbles: true })); }, t);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}/${name}-great-collapsed-${t}s.png` });
  }
  entry.errors = errors;
  log[name] = entry;
  console.log(name, JSON.stringify(entry));
  await browser.close();
}
writeFileSync(`${out}/log.json`, JSON.stringify(log, null, 1));
