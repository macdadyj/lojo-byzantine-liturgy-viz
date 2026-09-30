import { createRequire } from "node:module";
const require = createRequire("/workspace/package.json");
const { chromium } = require("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:4199/");
await page.waitForFunction(() => window.__boot?.firstFrame, null, { timeout: 180000 });
await page.waitForTimeout(3000);
const seen = [];
const links = await page.locator(".step-link").count();
for (let i = 0; i < links; i++) {
  await page.locator(".step-link").nth(i).click();
  await page.waitForTimeout(1800);
  const s = await page.evaluate(() => ({ title: document.querySelector("h1, h2")?.textContent?.trim().slice(0, 40), canvas: !!document.querySelector("canvas"), player: !!document.querySelector(".procession-bar") }));
  seen.push(s);
  if ([0, 5, 12, 18].includes(i)) await page.screenshot({ path: `/tmp/qa18/out/sweep/desktop-step-${i + 1}.png` });
}
// keyboard next/prev
await page.keyboard.press("Home").catch(() => {});
console.log(JSON.stringify({ links, withCanvas: seen.filter((s) => s.canvas).length, players: seen.map((s, i) => s.player ? i + 1 : null).filter(Boolean), errors }));
await browser.close();
