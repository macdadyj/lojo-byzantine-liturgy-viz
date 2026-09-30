#!/usr/bin/env node
// Renders one small picture of the church per step into public/stills/<step>.jpg. The app shows them only when
// WebGL cannot run (see SceneFallback), so a phone without a working 3D view still sees the church.
// Usage: npm run stills [-- --quality=medium --width=480 --height=600 --only=gospel]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { launchBrowser, parseArgs, root, startServer, waitForLab } from "./lib/harness.mjs";

const args = parseArgs(process.argv.slice(2));
const quality = typeof args.quality === "string" ? args.quality : "medium";
const width = typeof args.width === "string" ? Number(args.width) : 480;
const height = typeof args.height === "string" ? Number(args.height) : 600;
const only = typeof args.only === "string" ? args.only.split(",") : null;
const outDir = join(root, "public", "stills");
mkdirSync(outDir, { recursive: true });

const server = await startServer({ port: 5193 });
const { browser } = await launchBrowser();
try {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${server.url}lab?shot=1&freeze=4&seed=1&quality=${quality}&labels=0`, { waitUntil: "load" });
  await waitForLab(page);
  const { steps } = await page.evaluate(() => window.__lab.list());
  for (const step of steps) {
    if (only && !only.includes(step.id)) continue;
    const started = Date.now();
    await page.evaluate((request) => window.__lab.apply(request), { step: step.id, bookmark: null, quality, labels: false });
    await page.screenshot({ path: join(outDir, `${step.id}.jpg`), type: "jpeg", quality: 72, timeout: 180000 });
    console.log(`stills/${step.id}.jpg  ${Date.now() - started} ms`);
  }
  await context.close();
} finally {
  await browser.close();
  await server.close();
}
