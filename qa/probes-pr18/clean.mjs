import { createRequire } from "node:module";
const require = createRequire("/workspace/package.json");
const { chromium } = require("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://localhost:5199/");
await page.waitForFunction(() => window.__liturgy?.setStep && window.__boot?.firstFrame, null, { timeout: 180000 });
await page.waitForTimeout(2000);
const shot = async (name) => { await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(1800); await page.locator(".church-view").first().screenshot({ path: `/tmp/qa18/out/clean/${name}.png` }); };
for (const [i, id, fr] of [[5, "little", [0.2, 0.43, 0.52, 0.66, 0.78, 0.9]], [12, "great", [0.08, 0.22, 0.47, 0.55, 0.75, 0.86, 0.95]]]) {
  await page.evaluate((i) => window.__liturgy.setStep(i), i);
  await page.waitForFunction(() => window.__liturgy?.procession?.snapshot().route, null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  for (const f of fr) {
    const label = await page.evaluate((f) => { const c = window.__liturgy.procession; c.pause(); c.seek(c.snapshot().duration * f); return c.snapshot().beats[c.snapshot().beat].label; }, f);
    await shot(`${id}-${String(Math.round(f * 100)).padStart(2, "0")}`);
    console.log(id, f, label);
  }
  if (id === "little") {
    await page.evaluate(() => window.__liturgy.procession.seek(0));
    await page.evaluate(() => window.__liturgy.setCamera([-4.2, 4.6, 5.2], [-0.8, 0, -1.2]));
    await shot("layout-tetrapod-walkway-reader");
    await page.evaluate(() => window.__liturgy.setCamera([6.5, 2.2, 2.6], [-2.5, 0.9, -0.2]));
    await shot("layout-reader-from-south");
    await page.evaluate(() => window.__liturgy.clearCamera());
  }
}
await browser.close();
