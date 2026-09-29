#!/usr/bin/env node
// One-off captures at arbitrary camera poses, for close inspection while iterating.
// Usage: npm run peek -- --step=epiklesis --pos=-2,1.2,3 --target=-2,0.6,6 [--quality=medium] [--name=kneel] [--viewport=phone]
//        Several views: --views='[{"name":"a","step":"gathering","pos":[0,2,5],"target":[0,1,0]}]'
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { launchBrowser, parseArgs, root, startServer, viewports, waitForLab } from "./lib/harness.mjs";

const args = parseArgs(process.argv.slice(2));
const vec = (text) => (typeof text === "string" ? text.split(",").map(Number) : undefined);
const views =
  typeof args.views === "string"
    ? JSON.parse(args.views)
    : [{ name: typeof args.name === "string" ? args.name : "peek", step: args.step, pos: vec(args.pos), target: vec(args.target), bookmark: args.cam }];
const quality = typeof args.quality === "string" ? args.quality : "high";
const viewportName = typeof args.viewport === "string" ? args.viewport : "desktop";
const outDir = join(root, "qa", "peek");
mkdirSync(outDir, { recursive: true });

const server = await startServer({ port: 5192 });
const { browser } = await launchBrowser();
try {
  const viewport = viewports[viewportName];
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, ...viewport });
  const page = await context.newPage();
  page.on("pageerror", (error) => console.warn(`page error: ${error.message}`));
  const extra = typeof args.params === "string" ? `&${args.params}` : "";
  await page.goto(`${server.url}lab?shot=1&freeze=4&quality=${quality}${extra}`, { waitUntil: "load" });
  await waitForLab(page);
  for (const view of views) {
    const request = {
      step: view.step,
      bookmark: view.bookmark ?? null,
      pose: view.pos && view.target ? { position: view.pos, target: view.target } : null,
      beat: view.beat,
      systems: view.systems,
      lighting: view.lighting,
    };
    await page.evaluate((req) => window.__lab.apply(req), request);
    const file = join(outDir, `${view.name}.png`);
    await page.screenshot({ path: file, timeout: 180000 });
    const stats = await page.evaluate(() => window.__lab.stats());
    console.log(`${file.replace(root, "")}  ${stats.calls} calls  ${stats.triangles.toLocaleString()} tris`);
  }
} finally {
  await browser.close();
  await server.close();
}
