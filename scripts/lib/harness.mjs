import { execSync } from "node:child_process";
import { build, createServer, preview } from "vite";
import { chromium } from "playwright";

export const root = new URL("../../", import.meta.url).pathname;

/** Dev server for fast iteration, or a production build served by `vite preview`. */
export async function startServer({ prod = false, port = 5190, quiet = true } = {}) {
  const logLevel = quiet ? "error" : "info";
  if (prod) {
    await build({ root, logLevel });
    const server = await preview({ root, logLevel, preview: { port, host: "127.0.0.1", strictPort: false } });
    const url = server.resolvedUrls?.local[0] ?? `http://127.0.0.1:${port}/`;
    return { url, close: () => new Promise((resolve) => server.httpServer.close(resolve)) };
  }
  const server = await createServer({ root, logLevel, server: { port, host: "127.0.0.1", strictPort: false } });
  await server.listen();
  const url = server.resolvedUrls?.local[0] ?? `http://127.0.0.1:${port}/`;
  return { url, close: () => server.close() };
}

/**
 * Headless Chromium. Without a GPU the scene runs on SwiftShader (software WebGL),
 * which is slow but pixel-stable. Set LAB_GPU=1 on a machine with a real GPU.
 */
export async function launchBrowser() {
  const gpu = process.env.LAB_GPU === "1";
  const args = gpu
    ? ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--use-angle=default"]
    : ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
  const browser = await chromium.launch({ args, headless: process.env.LAB_HEADED !== "1" });
  return { browser, gpu };
}

export const viewports = {
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  phone: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
};

export function runStamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function gitCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: root }).toString().trim();
  } catch {
    return "unknown";
  }
}

export function parseArgs(argv) {
  const args = {};
  for (const item of argv) {
    const match = /^--([^=]+)(?:=(.*))?$/.exec(item);
    if (match) args[match[1]] = match[2] ?? true;
  }
  return args;
}

export async function waitForLab(page, timeout = 240000) {
  await page.waitForFunction(() => Boolean(window.__lab && window.__lab.ready()), null, { timeout, polling: 250 });
}
