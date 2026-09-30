#!/usr/bin/env node
// Breaks the walkthrough on purpose in WebKit with iPhone emulation and photographs what a phone would show:
// no WebGL2, the 3D chunk failing to download, the main script failing, a runtime error, a lost WebGL context,
// and the ?debug=1 panel. Each case must end in readable words, never a blank page.
// Usage: npm run phone:faults [-- --no-build --only=no-webgl,debug]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "vite";
import { webkit } from "playwright";
import { parseArgs, root, runStamp } from "./lib/harness.mjs";
import { startThrottledServer } from "./lib/throttle-server.mjs";

const args = parseArgs(process.argv.slice(2));
const only = typeof args.only === "string" ? args.only.split(",") : null;
const outDir = join(root, "qa", "phone", `${runStamp()}-faults`);
mkdirSync(outDir, { recursive: true });

const phone = {
  viewport: { width: 390, height: 844 },
  screen: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
};

const cases = {
  "no-webgl": {
    what: "WebGL2 unavailable: the church view shows the step picture, the words, and the icon gallery.",
    init: () => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function context(type, ...rest) {
        if (type === "webgl2" || type === "webgl") return null;
        return getContext.call(this, type, ...rest);
      };
    },
    wait: (page) => page.waitForSelector(".scene-fallback img", { timeout: 60000 }),
  },
  "chunk-blocked": {
    what: "The 3D code fails to download: pictures instead, with the error under Details and a Try again button.",
    route: (url) => /LiturgyScene-.*\.js$/.test(url),
    wait: async (page) => {
      await page.waitForSelector(".scene-fallback", { timeout: 60000 });
      await page.click(".fallback-actions button:last-child");
    },
  },
  "main-blocked": {
    what: "The main script fails to download: the start-up screen prints the failure and a Reload button.",
    route: (url) => /assets\/index-.*\.js$/.test(url),
    wait: (page) => page.waitForSelector("#boot-error", { timeout: 60000 }),
  },
  "runtime-error": {
    what: "An uncaught error after the page is up: a readable note at the bottom, the page keeps working.",
    wait: async (page) => {
      await page.waitForFunction(() => window.__boot?.firstFrame, null, { timeout: 180000 });
      await page.evaluate(() => setTimeout(() => {
        throw new Error("Simulated failure for the fault test");
      }, 0));
      await page.waitForSelector("#boot-error", { timeout: 10000 });
    },
  },
  "context-lost": {
    what: "iOS reclaims the WebGL context and does not give it back: a notice, then pictures with Try again.",
    wait: async (page) => {
      await page.waitForFunction(() => window.__boot?.firstFrame, null, { timeout: 180000 });
      await page.evaluate(() => {
        const canvas = document.querySelector(".church-view canvas");
        const gl = canvas?.getContext("webgl2");
        window.__lose = gl?.getExtension("WEBGL_lose_context");
        window.__lose?.loseContext();
      });
      await page.waitForSelector(".scene-notice", { timeout: 10000 });
      await page.screenshot({ path: join(outDir, "context-lost-notice.png") });
      await page.waitForSelector(".scene-fallback", { timeout: 15000 });
    },
  },
  debug: {
    what: "?debug=1 after load: GPU, tier, canvas size, frame rate, load times and errors on screen.",
    query: "?debug=1",
    wait: async (page) => {
      await page.waitForFunction(() => window.__boot?.sceneReady, null, { timeout: 180000 });
      await page.waitForTimeout(2500);
    },
  },
};

if (!args["no-build"]) await build({ root, logLevel: "error" });
const server = await startThrottledServer({ dist: join(root, "dist"), network: "none", gzip: true, port: 5195 });
const browser = await webkit.launch();
const results = [];
try {
  for (const [name, test] of Object.entries(cases)) {
    if (only && !only.includes(name)) continue;
    const context = await browser.newContext(phone);
    if (test.init) await context.addInitScript(test.init);
    if (test.route) await context.route((url) => test.route(url.toString()), (route) => route.abort());
    const page = await context.newPage();
    let outcome = "ok";
    try {
      await page.goto(`${server.url}${test.query ?? ""}`, { waitUntil: "commit" });
      await test.wait(page);
      await page.waitForTimeout(800);
    } catch (error) {
      outcome = `FAILED: ${error.message.split("\n")[0]}`;
    }
    await page.screenshot({ path: join(outDir, `${name}.png`) }).catch(() => undefined);
    const text = await page.evaluate(() => document.body.innerText.slice(0, 400)).catch(() => "");
    results.push({ name, what: test.what, outcome, blank: text.trim().length === 0 });
    console.log(`${name.padEnd(14)} ${outcome}${text.trim().length === 0 ? "  (BLANK PAGE)" : ""}`);
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
  writeFileSync(join(outDir, "report.json"), JSON.stringify(results, null, 2));
}
console.log(`screenshots: ${outDir.replace(root, "")}`);
if (results.some((result) => result.outcome !== "ok" || result.blank)) process.exit(1);
