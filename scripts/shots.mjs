#!/usr/bin/env node
// Visits every liturgy step and camera bookmark on desktop and phone and saves labeled screenshots.
// Usage: npm run shots [-- --label=pass2 --only=gospel,cam-dome --viewports=desktop --prod]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gitCommit, launchBrowser, parseArgs, root, runStamp, startServer, viewports, waitForLab } from "./lib/harness.mjs";

const args = parseArgs(process.argv.slice(2));
const label = typeof args.label === "string" ? `-${args.label.replace(/[^a-z0-9-]/gi, "")}` : "";
const run = `${runStamp()}${label}`;
const outDir = join(root, "qa", "screenshots", run);
const wanted = typeof args.viewports === "string" ? args.viewports.split(",") : ["desktop", "phone"];
const only = typeof args.only === "string" ? args.only.split(",") : null;
const freeze = typeof args.freeze === "string" ? Number(args.freeze) : 4;
const qualityFor = {
  desktop: typeof args.quality === "string" ? args.quality : "high",
  phone: typeof args["phone-quality"] === "string" ? args["phone-quality"] : "medium",
};

const server = await startServer({ prod: Boolean(args.prod), port: 5190 });
const { browser, gpu } = await launchBrowser();
const manifest = { run, commit: gitCommit(), date: new Date().toISOString(), gpu, freeze, shots: [] };
console.log(`shots → qa/screenshots/${run} (${gpu ? "GPU" : "software WebGL"}, server ${server.url})`);

try {
  for (const name of wanted) {
    const viewport = viewports[name];
    if (!viewport) throw new Error(`Unknown viewport ${name}`);
    const quality = qualityFor[name];
    mkdirSync(join(outDir, name), { recursive: true });
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, ...viewport });
    const page = await context.newPage();
    page.on("pageerror", (error) => console.warn(`[${name}] page error: ${error.message}`));
    const started = Date.now();
    await page.goto(`${server.url}lab?shot=1&freeze=${freeze}&seed=1&quality=${quality}`, { waitUntil: "load" });
    await waitForLab(page);
    console.log(`[${name}] ready in ${Date.now() - started} ms at ${quality}`);
    const list = await page.evaluate(() => window.__lab.list());
    const plan = [
      ...list.steps.map((step, index) => ({ name: `step-${String(index + 1).padStart(2, "0")}-${step.id}`, request: { step: step.id, bookmark: null } })),
      { name: "step-23-holy-things-clergy", request: { step: "holy-things", bookmark: null, beat: "clergy" } },
      ...list.bookmarks.map((mark) => ({ name: `cam-${mark.id}`, request: { step: mark.step, bookmark: mark.id } })),
    ].filter((item) => !only || only.some((token) => item.name.includes(token)));
    for (const item of plan) {
      const shotStart = Date.now();
      await page.evaluate((request) => window.__lab.apply(request), { ...item.request, quality });
      const file = join(name, `${item.name}.png`);
      await page.screenshot({ path: join(outDir, file), timeout: 180000 });
      const stats = await page.evaluate(() => window.__lab.stats());
      manifest.shots.push({ file, viewport: name, quality, name: item.name, request: item.request, calls: stats.calls, triangles: stats.triangles });
      console.log(`[${name}] ${item.name}  ${stats.calls} calls  ${stats.triangles.toLocaleString()} tris  ${Date.now() - shotStart} ms`);
    }
    await context.close();
  }
} finally {
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  await browser.close();
  await server.close();
}
console.log(`done: ${manifest.shots.length} shots in qa/screenshots/${run}`);
