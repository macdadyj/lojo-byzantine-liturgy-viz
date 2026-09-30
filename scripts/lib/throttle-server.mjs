import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { gzipSync } from "node:zlib";

/** Chrome DevTools presets: bytes per second down, and added round-trip latency per request. */
export const networks = {
  none: { rate: Infinity, latencyMs: 0 },
  fast3g: { rate: (1.6 * 1000 * 1000 * 0.9) / 8, latencyMs: 562.5 },
  slow4g: { rate: (1.6 * 1000 * 1000) / 8, latencyMs: 150 },
  "4g": { rate: (9 * 1000 * 1000) / 8, latencyMs: 85 },
};

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".glb": "model/gltf-binary",
};

/** The same types nginx compresses in nginx.conf; images and fonts are already compressed. */
const compressible = new Set([".html", ".js", ".css", ".json", ".svg"]);

function kindOf(ext) {
  if (ext === ".js") return "js";
  if (ext === ".css") return "css";
  if (ext === ".html") return "html";
  if (ext === ".woff" || ext === ".woff2") return "font";
  if (ext === ".jpg" || ext === ".png" || ext === ".webp" || ext === ".svg") return "image";
  return "other";
}

/**
 * Serves a built `dist/` like the Cloud Run nginx image, through one shared link of limited bandwidth, so
 * every browser (including WebKit, which has no network emulation) sees the same slow phone connection.
 * Counts the bytes actually sent, by kind, so a run can report what a phone downloads.
 */
export async function startThrottledServer({ dist, network = "fast3g", gzip = true, port = 5192 }) {
  const link = networks[network];
  if (!link) throw new Error(`Unknown network ${network}`);
  let linkFreeAt = 0;
  const gzipCache = new Map();
  const sent = { js: 0, css: 0, html: 0, font: 0, image: 0, other: 0, requests: 0 };

  async function send(res, body) {
    const chunk = 16 * 1024;
    for (let offset = 0; offset < body.length; offset += chunk) {
      const piece = body.subarray(offset, offset + chunk);
      if (Number.isFinite(link.rate)) {
        const now = Date.now();
        const start = Math.max(now, linkFreeAt);
        linkFreeAt = start + (piece.length / link.rate) * 1000;
        const wait = linkFreeAt - now;
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      }
      if (!res.write(piece)) await new Promise((resolve) => res.once("drain", resolve));
    }
    res.end();
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    let file = join(dist, path);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, "index.html");
    const ext = extname(file);
    if (link.latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, link.latencyMs));
    let body = readFileSync(file);
    const headers = { "content-type": types[ext] ?? "application/octet-stream", "cache-control": "no-store" };
    if (gzip && compressible.has(ext) && /\bgzip\b/.test(String(req.headers["accept-encoding"] ?? ""))) {
      const cached = gzipCache.get(file) ?? gzipSync(body, { level: 6 });
      gzipCache.set(file, cached);
      body = cached;
      headers["content-encoding"] = "gzip";
      headers.vary = "Accept-Encoding";
    }
    headers["content-length"] = String(body.length);
    sent[kindOf(ext)] += body.length;
    sent.requests += 1;
    res.writeHead(200, headers);
    await send(res, body);
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  return {
    url: `http://127.0.0.1:${actualPort}/`,
    sent,
    reset() {
      for (const key of Object.keys(sent)) sent[key] = 0;
      linkFreeAt = 0;
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
