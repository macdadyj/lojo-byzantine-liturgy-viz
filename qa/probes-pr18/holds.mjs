import { createRequire } from "node:module";
const require = createRequire("/workspace/package.json");
const { chromium, devices } = require("playwright");
const out = "/tmp/qa18/out/r2";
const args = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
const browser = await chromium.launch({ args });
for (const [kind, ctxOpts] of [["desktop", { viewport: { width: 1440, height: 1000 } }], ["phone", { ...devices["iPhone 13"] }]]) {
  const page = await (await browser.newContext(ctxOpts)).newPage();
  await page.goto("http://localhost:5199/");
  await page.waitForFunction(() => window.__liturgy?.setStep && window.__boot?.firstFrame, null, { timeout: 240000 });
  await page.waitForTimeout(2500);
  for (const [i, id, times] of [[5, "little", [36, 44, 47.5, 53]], [12, "great", [72, 78.5, 82, 88]]]) {
    await page.evaluate((i) => window.__liturgy.setStep(i), i);
    await page.waitForFunction(() => window.__liturgy?.procession?.snapshot().route, null, { timeout: 60000 });
    await page.waitForTimeout(2000);
    for (const t of times) {
      const label = await page.evaluate((t) => { const c = window.__liturgy.procession; c.pause(); c.seek(t); return c.snapshot().beats[c.snapshot().beat].label; }, t);
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(2500);
      const file = `${out}/${kind}-${id}-${String(t).replace(".", "_")}s.png`;
      if (kind === "desktop") await page.locator(".church-view").first().screenshot({ path: file }); else await page.screenshot({ path: file });
      console.log(kind, id, t, label);
    }
  }
}
await browser.close();
