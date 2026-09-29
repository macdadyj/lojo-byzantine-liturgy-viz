#!/usr/bin/env node
// Builds the app, serves the production bundle, and measures load time and frame rate headlessly.
// Fails (exit 1) when any number is outside the budgets in scripts/perf-budgets.json.
// Usage: npm run perf [-- --seconds=8 --no-build]
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gitCommit, launchBrowser, parseArgs, root, runStamp, startServer, viewports, waitForLab } from "./lib/harness.mjs";

const args = parseArgs(process.argv.slice(2));
const seconds = typeof args.seconds === "string" ? Number(args.seconds) : 8;
const budgets = JSON.parse(readFileSync(join(root, "scripts", "perf-budgets.json"), "utf8"));

const server = await startServer({ prod: true, port: 5191 });
const { browser, gpu } = await launchBrowser();
const tier = gpu ? budgets.gpu : budgets.software;
const report = { run: runStamp(), commit: gitCommit(), gpu, seconds, budgets: tier, results: {}, failures: [] };

function bundleKb() {
  const dir = join(root, "dist", "assets");
  let js = 0;
  for (const name of readdirSync(dir)) if (name.endsWith(".js")) js += statSync(join(dir, name)).size;
  return Math.round(js / 1024);
}

async function measure(label, viewportName, quality, step) {
  const viewport = viewports[viewportName];
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, ...viewport });
  const page = await context.newPage();
  const started = Date.now();
  await page.goto(`${server.url}lab?shot=1&quality=${quality}&step=${step}`, { waitUntil: "load" });
  await waitForLab(page);
  const loadMs = Date.now() - started;
  await page.waitForTimeout(1500);
  const sample = await page.evaluate(async (ms) => {
    const first = window.__lab.stats();
    const t0 = performance.now();
    await new Promise((resolve) => setTimeout(resolve, ms));
    const last = window.__lab.stats();
    return { fps: ((last.frames - first.frames) * 1000) / (performance.now() - t0), calls: last.calls, triangles: last.triangles };
  }, seconds * 1000);
  await context.close();
  const result = { viewport: viewportName, quality, step, loadMs, fps: Number(sample.fps.toFixed(1)), calls: sample.calls, triangles: sample.triangles };
  report.results[label] = result;
  console.log(`${label.padEnd(16)} load ${String(loadMs).padStart(6)} ms   ${result.fps.toFixed(1).padStart(5)} fps   ${sample.calls} calls   ${sample.triangles.toLocaleString()} tris`);
  return result;
}

try {
  const kb = bundleKb();
  report.results.bundle = { jsKb: kb };
  console.log(`bundle           ${kb} KB of JS (budget ${tier.bundleKb} KB)`);
  if (kb > tier.bundleKb) report.failures.push(`JS bundle ${kb} KB > ${tier.bundleKb} KB`);

  const desktop = await measure("desktop-medium", "desktop", "medium", "gathering");
  const phone = await measure("phone-low", "phone", "low", "gathering");
  const desktopHigh = await measure("desktop-high", "desktop", "high", "anaphora");

  const check = (name, value, limit, better) => {
    const ok = better === "higher" ? value >= limit : value <= limit;
    if (!ok) report.failures.push(`${name} ${value} ${better === "higher" ? "<" : ">"} ${limit}`);
  };
  check("desktop-medium load ms", desktop.loadMs, tier.loadMs, "lower");
  check("phone-low load ms", phone.loadMs, tier.loadMs, "lower");
  check("desktop-medium fps", desktop.fps, tier.desktopMediumFps, "higher");
  check("phone-low fps", phone.fps, tier.phoneLowFps, "higher");
  check("desktop-high fps", desktopHigh.fps, tier.desktopHighFps, "higher");
  check("desktop-medium draw calls", desktop.calls, tier.maxDrawCalls, "lower");
} finally {
  await browser.close();
  await server.close();
}

mkdirSync(join(root, "qa", "perf"), { recursive: true });
writeFileSync(join(root, "qa", "perf", "latest.json"), JSON.stringify(report, null, 2));
if (report.failures.length > 0) {
  console.error(`\nPERF FAIL (${gpu ? "gpu" : "software"} budgets):\n  ${report.failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`\nPERF OK (${gpu ? "gpu" : "software"} budgets). Report: qa/perf/latest.json`);
