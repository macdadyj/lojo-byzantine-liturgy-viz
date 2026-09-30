#!/usr/bin/env node
// Loads the real walkthrough (not the lab) as an iPhone would: WebKit with iPhone emulation over a throttled
// link, plus Chromium with the same link and 4x CPU throttling. Records load milestones, bytes sent, memory,
// frame rate, and screenshots of the loading screen and several steps.
// Usage: npm run phone [-- --no-build --dist=dist --net=fast3g --gzip=1 --profiles=webkit-390,chromium-414-cpu4x
//                          --label=after --no-shots --seconds=5 --timeout=300]
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { build } from "vite";
import { chromium, webkit } from "playwright";
import { gitCommit, parseArgs, root, runStamp } from "./lib/harness.mjs";
import { startThrottledServer } from "./lib/throttle-server.mjs";

const args = parseArgs(process.argv.slice(2));
const net = typeof args.net === "string" ? args.net : "fast3g";
const gzip = args.gzip !== "0";
const dist = resolve(root, typeof args.dist === "string" ? args.dist : "dist");
const seconds = typeof args.seconds === "string" ? Number(args.seconds) : 5;
const timeoutMs = (typeof args.timeout === "string" ? Number(args.timeout) : 300) * 1000;
const shots = !args["no-shots"];
const label = typeof args.label === "string" ? `-${args.label.replace(/[^a-z0-9-]/gi, "")}` : "";
const run = `${runStamp()}${label}`;
const outDir = join(root, "qa", "phone", run);

const iphoneUa =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";

/** Viewports are the full screen in CSS pixels, as the brief asks: 390×844 at 3x, and the iPhone 11's 828×1792 at 2x. */
const profiles = {
  "webkit-390": { browser: "webkit", viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 },
  "webkit-414": { browser: "webkit", viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 },
  "chromium-414-cpu4x": { browser: "chromium", viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, cpu: 4 },
};
const wanted = typeof args.profiles === "string" ? args.profiles.split(",") : Object.keys(profiles);

/** Step indexes (0-based) photographed after load: gathering, Little Entrance, Great Entrance, epiklesis, Holy Things, dismissal. */
const stepShots = [0, 5, 12, 15, 18, 21];

/**
 * Runs before any page script. Marks the first visible content, the shell (Next button), the WebGL context,
 * the first draw call, and the first presented frame, without relying on anything the app itself reports,
 * so the same numbers can be taken from an older build.
 */
function probe() {
  const marks = { errors: [] };
  window.__phone = marks;
  const now = () => Math.round(performance.now());
  const note = (message) => {
    if (marks.errors.length < 20) marks.errors.push(String(message).slice(0, 400));
  };
  window.addEventListener(
    "error",
    (event) => {
      const target = event.target;
      if (target && target !== window && (target.src || target.href)) note(`load failed: ${target.src || target.href}`);
      else note(event.message || "error");
    },
    true,
  );
  window.addEventListener("unhandledrejection", (event) => note(`unhandled: ${event.reason?.message ?? event.reason}`));
  const wrapDraws = (proto) => {
    if (!proto) return;
    const names = ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"];
    const originals = names.map((name) => proto[name]);
    names.forEach((name, index) => {
      const original = originals[index];
      if (typeof original !== "function") return;
      proto[name] = function draw(...rest) {
        if (!marks.firstDraw) {
          marks.firstDraw = now();
          requestAnimationFrame(() => requestAnimationFrame(() => (marks.firstFrame = now())));
          names.forEach((n, i) => originals[i] && (proto[n] = originals[i]));
        }
        return original.apply(this, rest);
      };
    });
  };
  wrapDraws(window.WebGL2RenderingContext?.prototype);
  wrapDraws(window.WebGLRenderingContext?.prototype);
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function context(type, ...rest) {
    const result = getContext.call(this, type, ...rest);
    if ((type === "webgl2" || type === "webgl") && !marks.context) {
      marks.context = now();
      marks.contextType = result ? type : `${type} unavailable`;
      if (result) {
        const info = result.getExtension("WEBGL_debug_renderer_info");
        marks.renderer = info ? result.getParameter(info.UNMASKED_RENDERER_WEBGL) : result.getParameter(result.RENDERER);
      }
    }
    return result;
  };
  let frames = 0;
  const tick = () => {
    const t = now();
    frames += 1;
    marks.rafFrames = frames;
    if (!marks.firstContent && document.body && document.body.innerText.trim().length > 0) marks.firstContent = t;
    if (!marks.shell && document.querySelector(".pager-next, .step-bar-next")) marks.shell = t;
    if (!marks.canvas && document.querySelector(".church-view canvas")) marks.canvas = t;
    if (!marks.fallback && document.querySelector(".scene-fallback")) marks.fallback = t;
    if (!marks.sceneReady) {
      const boot = window.__boot;
      if (boot && boot.sceneReady) marks.sceneReady = boot.sceneReady;
      else if (!boot && marks.canvas && marks.firstFrame && !document.querySelector(".load-gate")) marks.sceneReady = t;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function launch(kind) {
  if (kind === "webkit") return webkit.launch();
  return chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
}

async function measure(name, profile, server) {
  const browser = await launch(profile.browser);
  const context = await browser.newContext({
    viewport: profile.viewport,
    screen: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
    userAgent: iphoneUa,
  });
  await context.addInitScript(probe);
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && consoleErrors.length < 20) consoleErrors.push(message.text().slice(0, 300));
  });
  page.on("pageerror", (error) => consoleErrors.length < 20 && consoleErrors.push(`pageerror: ${error.message}`));
  let cdp = null;
  if (profile.browser === "chromium") {
    cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    if (profile.cpu) await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });
  }
  let peakHeap = 0;
  const heapTimer = cdp
    ? setInterval(async () => {
        try {
          const { metrics } = await cdp.send("Performance.getMetrics");
          const used = metrics.find((metric) => metric.name === "JSHeapUsedSize")?.value ?? 0;
          peakHeap = Math.max(peakHeap, used);
        } catch {
          // The page may be navigating.
        }
      }, 250)
    : null;

  const dir = join(outDir, name);
  if (shots) mkdirSync(dir, { recursive: true });
  const shot = async (file) => {
    if (!shots) return;
    await page.screenshot({ path: join(dir, `${file}.png`), timeout: 120000 }).catch((error) => console.warn(`[${name}] screenshot ${file}: ${error.message}`));
  };

  server.reset();
  const started = Date.now();
  await page.goto(server.url, { waitUntil: "commit" });
  const marks = () => page.evaluate(() => ({ ...window.__phone, boot: window.__boot ?? null }));

  // What the phone shows while the code is still arriving.
  await page.waitForTimeout(1500);
  await shot("load-1.5s");
  await page.waitForFunction(() => window.__phone && window.__phone.firstContent, null, { timeout: timeoutMs, polling: 100 });
  await shot("load-first-content");

  // How soon a tap on Next is answered.
  await page.waitForFunction(() => window.__phone.shell, null, { timeout: timeoutMs, polling: 100 });
  const tapStart = await page.evaluate(() => performance.now());
  await page.evaluate(() => document.querySelector(".step-bar-next, .pager-next")?.click());
  await page.waitForFunction(() => /^\s*2\s*\//.test(document.querySelector(".step-bar-count, .pager-status span")?.textContent ?? ""), null, {
    timeout: timeoutMs,
    polling: 50,
  });
  const tapAnswered = await page.evaluate(() => performance.now());
  await page.evaluate(() => document.querySelector(".step-bar-prev, .pager-prev")?.click());
  await page.waitForTimeout(800);
  await shot("load-shell");

  let ready = true;
  try {
    await page.waitForFunction(() => window.__phone.sceneReady || window.__phone.fallback, null, { timeout: timeoutMs, polling: 200 });
  } catch {
    ready = false;
  }
  const loadMs = Date.now() - started;
  const sent = { ...server.sent };
  await page.waitForTimeout(1500);
  await shot("ready-step-01");

  const fps = await page.evaluate(async (ms) => {
    const first = window.__phone.rafFrames;
    const t0 = performance.now();
    await new Promise((done) => setTimeout(done, ms));
    return ((window.__phone.rafFrames - first) * 1000) / (performance.now() - t0);
  }, seconds * 1000);

  if (shots && ready) {
    let at = 0;
    for (const target of stepShots.slice(1)) {
      await page.evaluate(() => window.scrollTo(0, 0));
      for (; at < target; at += 1) await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(3500);
      await shot(`step-${String(target + 1).padStart(2, "0")}`);
    }
    await page.evaluate(() => {
      const button = [...document.querySelectorAll(".view-bar button")].find((b) => /free look/i.test(b.textContent ?? ""));
      button?.click();
    });
    await page.waitForTimeout(2500);
    await shot("free-look");
    await page.evaluate(() => {
      const panel = document.querySelector(".detail") ?? document.querySelector(".info-bar");
      panel?.scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(600);
    await shot("text-panel");
  }

  const final = await marks();
  if (heapTimer) clearInterval(heapTimer);
  await context.close();
  await browser.close();
  const result = {
    profile: name,
    browser: profile.browser,
    viewport: `${profile.viewport.width}x${profile.viewport.height}@${profile.deviceScaleFactor}x`,
    cpuThrottle: profile.cpu ?? 1,
    ready,
    firstContentMs: final.firstContent ?? null,
    shellMs: final.shell ?? null,
    firstTapAnsweredMs: Math.round(tapAnswered),
    firstTapLatencyMs: Math.round(tapAnswered - tapStart),
    contextMs: final.context ?? null,
    firstDrawMs: final.firstDraw ?? null,
    firstFrameMs: final.firstFrame ?? null,
    sceneReadyMs: final.sceneReady ?? null,
    fallbackMs: final.fallback ?? null,
    wallLoadMs: loadMs,
    fps: Number(fps.toFixed(1)),
    renderer: final.renderer ?? null,
    contextType: final.contextType ?? null,
    tier: final.boot?.tier ?? null,
    tierReason: final.boot?.tierReason ?? null,
    kbSent: Object.fromEntries(Object.entries(sent).map(([key, value]) => [key, key === "requests" ? value : Math.round(value / 1024)])),
    peakJsHeapMb: cdp ? Number((peakHeap / 1024 / 1024).toFixed(1)) : null,
    gpu: final.boot?.gpu ?? null,
    errors: [...(final.errors ?? []), ...consoleErrors].slice(0, 20),
  };
  console.log(
    `${name.padEnd(20)} content ${fmt(result.firstContentMs)}  shell ${fmt(result.shellMs)}  tap ${fmt(result.firstTapAnsweredMs)}  first frame ${fmt(result.firstFrameMs)}  ready ${fmt(result.sceneReadyMs)}  ${result.fps} fps  JS ${result.kbSent.js} KB  total ${Object.entries(result.kbSent).filter(([k]) => k !== "requests").reduce((s, [, v]) => s + v, 0)} KB  tier ${result.tier ?? "?"}  heap ${result.peakJsHeapMb ?? "n/a"} MB`,
  );
  if (result.errors.length > 0) console.log(`   errors: ${result.errors.join(" | ")}`);
  return result;
}

function fmt(ms) {
  return ms === null || ms === undefined ? "   n/a" : `${(ms / 1000).toFixed(1).padStart(5)} s`;
}

if (!args["no-build"] && typeof args.dist !== "string") await build({ root, logLevel: "error" });
const server = await startThrottledServer({ dist, network: net, gzip });
const report = { run, commit: gitCommit(), dist, network: net, gzip, date: new Date().toISOString(), results: [] };
console.log(`phone → qa/phone/${run} (${net}${gzip ? ", gzip" : ", no compression"}, ${dist})`);
try {
  for (const name of wanted) {
    const profile = profiles[name];
    if (!profile) throw new Error(`Unknown profile ${name}`);
    try {
      report.results.push(await measure(name, profile, server));
    } catch (error) {
      console.error(`[${name}] failed: ${error.message}`);
      report.results.push({ profile: name, failed: error.message });
    }
  }
} finally {
  await server.close();
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
}
console.log(`report: qa/phone/${run}/report.json`);
