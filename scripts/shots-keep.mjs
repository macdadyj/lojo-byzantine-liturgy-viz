#!/usr/bin/env node
// Copies chosen screenshots from a run into docs/iterations/<to>/ as JPEG, so the log can show them.
// Usage: npm run shots:keep -- --to=pass1 [--run=<run>] --only=desktop/step-01,phone/cam-dome
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { parseArgs, root } from "./lib/harness.mjs";

const args = parseArgs(process.argv.slice(2));
const shotsDir = join(root, "qa", "screenshots");
const runs = readdirSync(shotsDir).filter((name) => /^\d{8}-\d{6}/.test(name)).sort();
const run = typeof args.run === "string" ? args.run : runs.at(-1);
if (!run || typeof args.to !== "string" || typeof args.only !== "string") {
  console.error("Usage: npm run shots:keep -- --to=pass1 --only=desktop/step-01,phone/cam-dome [--run=<run>]");
  process.exit(1);
}
const outDir = join(root, "docs", "iterations", args.to);
mkdirSync(outDir, { recursive: true });
for (const token of args.only.split(",")) {
  const [viewport, prefix] = token.split("/");
  const dir = join(shotsDir, run, viewport ?? "");
  if (!prefix || !existsSync(dir)) {
    console.warn(`skip ${token}`);
    continue;
  }
  const file = readdirSync(dir).find((name) => name.startsWith(prefix) && name.endsWith(".png"));
  if (!file) {
    console.warn(`no shot matches ${token}`);
    continue;
  }
  const png = PNG.sync.read(readFileSync(join(dir, file)));
  const encoded = jpeg.encode({ data: png.data, width: png.width, height: png.height }, 84);
  const target = join(outDir, `${viewport}-${basename(file, ".png")}.jpg`);
  writeFileSync(target, encoded.data);
  console.log(`${token} → ${target.replace(root, "")}`);
}
