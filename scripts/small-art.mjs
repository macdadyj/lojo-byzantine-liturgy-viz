#!/usr/bin/env node
// Writes half-size copies of the icon and fresco images for phones (public/icons/small, public/fresco/small).
// A phone shows an iconostas panel a few hundred pixels tall, so the full images mostly cost download time over
// a cellular link and GPU memory, which iOS Safari runs out of first. Uses Chromium's image encoder so no
// image tools need installing. Usage: npm run small-art [-- --scale=0.5]
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { chromium } from "playwright";
import { parseArgs, root } from "./lib/harness.mjs";

const args = parseArgs(process.argv.slice(2));
const scale = typeof args.scale === "string" ? Number(args.scale) : 0.5;
const folders = [
  { dir: "icons", type: "image/jpeg", quality: 0.82 },
  { dir: "fresco", type: "image/webp", quality: 0.8 },
];
const mime = { ".jpg": "image/jpeg", ".webp": "image/webp" };

const browser = await chromium.launch();
const page = await browser.newPage();
let before = 0;
let after = 0;
try {
  for (const folder of folders) {
    const source = join(root, "public", folder.dir);
    const target = join(source, "small");
    mkdirSync(target, { recursive: true });
    for (const name of readdirSync(source)) {
      const type = mime[extname(name)];
      if (!type) continue;
      const input = readFileSync(join(source, name));
      const dataUrl = `data:${type};base64,${input.toString("base64")}`;
      const output = await page.evaluate(
        async ({ dataUrl, scale, type, quality }) => {
          const image = new Image();
          image.src = dataUrl;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL(type, quality).split(",")[1];
        },
        { dataUrl, scale, type: folder.type, quality: folder.quality },
      );
      const bytes = Buffer.from(output, "base64");
      writeFileSync(join(target, name), bytes);
      before += input.length;
      after += bytes.length;
      console.log(`${folder.dir}/small/${name}  ${Math.round(input.length / 1024)} KB → ${Math.round(bytes.length / 1024)} KB`);
    }
  }
} finally {
  await browser.close();
}
console.log(`total ${Math.round(before / 1024)} KB → ${Math.round(after / 1024)} KB`);
