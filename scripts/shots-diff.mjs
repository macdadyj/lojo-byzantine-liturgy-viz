#!/usr/bin/env node
// Compares the latest screenshot run to the previous one and writes an HTML contact sheet.
// Usage: npm run shots:diff [-- --base=<run> --head=<run> --fail-above=2]
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { parseArgs, root } from "./lib/harness.mjs";

const args = parseArgs(process.argv.slice(2));
const shotsDir = join(root, "qa", "screenshots");
const runs = readdirSync(shotsDir)
  .filter((name) => /^\d{8}-\d{6}/.test(name) && existsSync(join(shotsDir, name, "manifest.json")))
  .sort();
const head = typeof args.head === "string" ? args.head : runs.at(-1);
const base = typeof args.base === "string" ? args.base : runs[runs.indexOf(head) - 1];
if (!head || !base) {
  console.error("Need two runs in qa/screenshots. Run `npm run shots` twice (before and after a change).");
  process.exit(1);
}
const failAbove = typeof args["fail-above"] === "string" ? Number(args["fail-above"]) : null;

function pngFiles(dir) {
  const found = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) {
        if (name !== "diff") walk(path);
      } else if (name.endsWith(".png")) found.push(relative(join(shotsDir, head), path));
    }
  };
  walk(dir);
  return found.sort();
}

const rows = [];
for (const file of pngFiles(join(shotsDir, head))) {
  const headPath = join(shotsDir, head, file);
  const basePath = join(shotsDir, base, file);
  if (!existsSync(basePath)) {
    rows.push({ file, status: "new", changed: 100 });
    continue;
  }
  const a = PNG.sync.read(readFileSync(basePath));
  const b = PNG.sync.read(readFileSync(headPath));
  if (a.width !== b.width || a.height !== b.height) {
    rows.push({ file, status: "resized", changed: 100 });
    continue;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const count = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.12, alpha: 0.25, diffColor: [255, 0, 80] });
  const diffPath = join(shotsDir, head, "diff", file);
  mkdirSync(dirname(diffPath), { recursive: true });
  writeFileSync(diffPath, PNG.sync.write(diff));
  const changed = (count / (a.width * a.height)) * 100;
  rows.push({ file, status: changed > 0.5 ? "changed" : "same", changed });
}
rows.sort((x, y) => y.changed - x.changed);

const esc = (value) => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
const changedCount = rows.filter((row) => row.status !== "same").length;
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Shots: ${esc(base)} → ${esc(head)}</title>
<style>
body{font:14px system-ui,sans-serif;background:#15110d;color:#eee4d4;margin:20px}
h1{font-size:20px} .meta{color:#b8a88f}
.row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0 28px}
.row h2{grid-column:1/-1;font-size:14px;margin:0;display:flex;gap:12px;align-items:baseline}
.tag{padding:1px 8px;border-radius:99px;background:#333;font-size:12px}
.changed .tag{background:#8a2b3a}.new .tag,.resized .tag{background:#2b5a8a}
figure{margin:0} figcaption{color:#b8a88f;font-size:12px;margin-bottom:3px}
img{width:100%;display:block;border:1px solid #3a2e24;background:#000}
.filter{margin:10px 0} label{margin-right:14px}
body.hide-same .same{display:none}
</style></head><body>
<h1>Screenshot comparison</h1>
<p class="meta">Before <b>${esc(base)}</b> → after <b>${esc(head)}</b>. ${rows.length} shots, ${changedCount} changed more than 0.5% of pixels. Sorted by change.</p>
<div class="filter"><label><input type="checkbox" onchange="document.body.classList.toggle('hide-same',this.checked)"> Hide unchanged</label></div>
${rows
  .map(
    (row) => `<section class="row ${row.status}"><h2>${esc(row.file)} <span class="tag">${row.status} ${row.changed.toFixed(2)}%</span></h2>
<figure><figcaption>Before</figcaption>${row.status === "new" ? "<p>—</p>" : `<img loading="lazy" src="../${esc(base)}/${esc(row.file)}">`}</figure>
<figure><figcaption>After</figcaption><img loading="lazy" src="${esc(row.file)}"></figure>
<figure><figcaption>Changed pixels</figcaption>${row.status === "changed" || row.status === "same" ? `<img loading="lazy" src="diff/${esc(row.file)}">` : "<p>—</p>"}</figure></section>`,
  )
  .join("\n")}
</body></html>`;
const out = join(shotsDir, head, "compare.html");
writeFileSync(out, html);
console.log(`${changedCount}/${rows.length} shots changed. Contact sheet: ${relative(root, out)}`);
for (const row of rows.slice(0, 10)) console.log(`  ${row.changed.toFixed(2).padStart(6)}%  ${row.status.padEnd(8)} ${row.file}`);
if (failAbove !== null) {
  const worst = rows[0]?.changed ?? 0;
  if (worst > failAbove) {
    console.error(`Largest change ${worst.toFixed(2)}% exceeds --fail-above=${failAbove}`);
    process.exit(1);
  }
}
