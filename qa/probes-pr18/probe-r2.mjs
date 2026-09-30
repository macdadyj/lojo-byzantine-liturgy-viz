// Re-verify polish fixes: folded sheet on entrances, ambon framing, portrait Proskomedia (phone, production).
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire("/workspace/package.json");
const { chromium, webkit, devices } = require("playwright");
const out = "/tmp/qa18/out/r2";
mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "ok  " : "FAIL"} ${name} ${detail}`); };

for (const [name, type] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await type.launch(name === "chromium" ? { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] } : {});
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto("http://localhost:4199/");
  await page.waitForFunction(() => window.__boot?.firstFrame, null, { timeout: 240000, polling: 250 });
  await page.waitForTimeout(2500);
  const expanded = () => page.evaluate(() => document.querySelector(".step-bar-status.is-toggle")?.getAttribute("aria-expanded"));
  const count = () => page.evaluate(() => document.querySelector(".step-bar-count")?.textContent?.trim() ?? "");
  const seek = (t) => page.evaluate((t) => { const r = document.querySelector(".procession-scrub"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(r, String(t)); r.dispatchEvent(new Event("input", { bubbles: true })); }, t);
  const goStep = async (re) => {
    await page.tap(".phone-menu-button"); await page.waitForTimeout(400);
    const l = page.locator(".step-menu .step-link", { hasText: re }).first();
    await l.scrollIntoViewIfNeeded(); await l.tap(); await page.waitForTimeout(1500);
  };
  check(`${name}: step 1 opens with the sheet open`, (await expanded()) === "true");
  // Proskomedia portrait.
  await page.tap(".step-bar-next"); await page.waitForTimeout(3500);
  await page.screenshot({ path: `${out}/${name}-proskomedia-sheet-open.png` });
  check(`${name}: non-procession step keeps sheet open`, (await expanded()) === "true");
  await page.tap(".step-bar-status.is-toggle"); await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${name}-proskomedia-folded.png` });
  await page.tap(".step-bar-status.is-toggle"); await page.waitForTimeout(500);
  for (const [re, id, holdAt] of [[/Little Entrance/i, "little", 43.5], [/Great Entrance/i, "great", 78]]) {
    await goStep(re);
    const player = await page.evaluate(() => { const b = document.querySelector(".procession-bar")?.getBoundingClientRect(); return b ? { top: Math.round(b.top), bottom: Math.round(b.bottom) } : null; });
    check(`${name}: ${id} entrance starts with the sheet folded, player on screen`, (await expanded()) === "false" && player && player.bottom <= 844, JSON.stringify(player));
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}/${name}-${id}-start-folded.png` });
    await seek(holdAt); await page.waitForTimeout(2800);
    await page.screenshot({ path: `${out}/${name}-${id}-ambon-hold.png` });
    // Open the words, leave, come back: does it start folded again?
    await page.tap(".step-bar-status.is-toggle"); await page.waitForTimeout(400);
    const opened = await expanded();
    await page.tap(".step-bar-next"); await page.waitForTimeout(1200);
    const after = await expanded();
    await page.tap(".step-bar-prev"); await page.waitForTimeout(1200);
    const back = await expanded();
    check(`${name}: ${id}: words open on tap; next step restores user's sheet; returning to entrance`, opened === "true" && after === "true", `open=${opened}, next step=${after}, back on entrance=${back}`);
    results.at(-1).backOnEntrance = back;
  }
  check(`${name}: no console errors`, errors.length === 0, JSON.stringify(errors.slice(0, 3)));
  await browser.close();
}
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1));
console.log("FAILS", results.filter((r) => !r.ok).length);
