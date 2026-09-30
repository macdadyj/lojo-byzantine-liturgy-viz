// Independent procession probe: reads walker and obstacle positions from the live three.js scene graph.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire("/workspace/package.json");
const { chromium } = require("playwright");

const url = process.env.URL ?? "http://localhost:5199/";
const out = "/tmp/qa18/out";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
await page.addInitScript(() => {
  window.__scenes = [];
  const hook = new EventTarget();
  hook.addEventListener("observe", (e) => { if (e.detail?.isScene) window.__scenes.push(e.detail); });
  window.__THREE_DEVTOOLS__ = hook;
});
await page.goto(url);
await page.waitForFunction(() => window.__liturgy?.setStep && window.__boot?.firstFrame, null, { timeout: 180000 });
await page.waitForTimeout(2000);

const frames = (n = 3) => page.evaluate((n) => new Promise((r) => { let i = 0; const f = () => (++i >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

const report = {};
for (const [index, id] of [[5, "little-entrance"], [12, "great-entrance"]]) {
  await page.evaluate((i) => window.__liturgy.setStep(i), index);
  await page.waitForFunction((id) => window.__liturgy?.procession?.snapshot().route === id, id, { timeout: 60000 });
  await page.waitForTimeout(4000);
  const duration = await page.evaluate(() => { const c = window.__liturgy.procession; c.pause(); return c.snapshot().duration; });

  // Identify walkers: top-most objects that moved > 1 m between two times.
  await page.evaluate(() => {
    const scene = window.__scenes.at(-1);
    window.__snap = () => { const m = new Map(); scene.traverse((o) => { const v = o.getWorldPosition(o.position.clone()); m.set(o.uuid, [v.x, v.y, v.z]); }); return m; };
  });
  await page.evaluate((d) => window.__liturgy.procession.seek(d * 0.3), duration); await frames();
  await page.evaluate(() => { window.__a = window.__snap(); });
  await page.evaluate((d) => window.__liturgy.procession.seek(d * 0.5), duration); await frames();
  const walkerCount = await page.evaluate(() => {
    const scene = window.__scenes.at(-1);
    const b = window.__snap();
    const moved = new Set();
    scene.traverse((o) => { const p = window.__a.get(o.uuid), q = b.get(o.uuid); if (p && q && Math.hypot(p[0] - q[0], p[2] - q[2]) > 1) moved.add(o); });
    window.__walkers = [...moved].filter((o) => !moved.has(o.parent) && o.type === "Group");
    return window.__walkers.length;
  });

  // Obstacles: every mesh (per instance) outside the walkers and the camera.
  const obstacles = await page.evaluate(() => {
    const scene = window.__scenes.at(-1);
    const THREEBox = (g) => { if (!g.boundingBox) g.computeBoundingBox(); return g.boundingBox; };
    const inWalker = (o) => { for (let p = o; p; p = p.parent) if (window.__walkers.includes(p)) return true; return false; };
    const list = [];
    const corners = (bb, m) => {
      const pts = [];
      for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
        const e = m.elements;
        pts.push([e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]);
      }
      const min = [0, 1, 2].map((k) => Math.min(...pts.map((p) => p[k])));
      const max = [0, 1, 2].map((k) => Math.max(...pts.map((p) => p[k])));
      return { min, max };
    };
    const mul = (a, b) => { const r = new a.constructor(); r.multiplyMatrices(a, b); return r; };
    const name = (o) => { const n = []; for (let p = o; p && n.length < 4; p = p.parent) if (p.name) n.push(p.name); return n.join("<") || o.material?.name || o.geometry?.type || o.type; };
    scene.traverse((o) => {
      if (!o.isMesh || !o.visible || inWalker(o) || !o.geometry) return;
      let hidden = false; for (let p = o; p; p = p.parent) if (!p.visible) hidden = true; if (hidden) return;
      const bb = THREEBox(o.geometry); if (!bb || !isFinite(bb.min.x)) return;
      if (o.isInstancedMesh) {
        const m = o.matrixWorld.clone(); const im = m.clone();
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, im); list.push({ ...corners(bb, mul(m, im)), name: name(o) + `#${i}`, mat: o.material?.color?.getHexString?.() }); }
      } else list.push({ ...corners(bb, o.matrixWorld), name: name(o), mat: o.material?.color?.getHexString?.() });
    });
    return list;
  });

  const samples = [];
  for (let t = 0; t <= duration + 0.01; t += 0.25) {
    await page.evaluate((t) => window.__liturgy.procession.seek(t), t);
    await frames(2);
    const pos = await page.evaluate(() => window.__walkers.map((w) => { const v = w.getWorldPosition(w.position.clone()); return [v.x, v.y, v.z]; }));
    const cam = await page.evaluate(() => window.__liturgy.cameraAt());
    samples.push({ t, pos, cam });
  }
  // Collisions: walker body cylinder r=0.22 from feet+0.3 to feet+1.6 against obstacle AABBs, ignoring huge boxes.
  const hits = new Map();
  const r = 0.22;
  for (const { t, pos } of samples) pos.forEach(([x, y, z], w) => {
    for (const o of obstacles) {
      const sx = o.max[0] - o.min[0], sz = o.max[2] - o.min[2];
      if (sx > 4 || sz > 4) continue;
      if (o.max[1] < y + 0.3 || o.min[1] > y + 1.6) continue;
      const dx = Math.max(0, o.min[0] - x, x - o.max[0]);
      const dz = Math.max(0, o.min[2] - z, z - o.max[2]);
      if (Math.hypot(dx, dz) < r) {
        const key = `${w}|${o.name}|${o.min.map((v) => v.toFixed(1))}|${o.max.map((v) => v.toFixed(1))}`;
        if (!hits.has(key)) hits.set(key, { walker: w, name: o.name, box: [o.min.map((v) => +v.toFixed(2)), o.max.map((v) => +v.toFixed(2))], first: t, last: t, at: [x, z].map((v) => +v.toFixed(2)) });
        hits.get(key).last = t;
      }
    }
  });
  // Iconostas crossings for each walker.
  const crossings = [];
  for (let w = 0; w < walkerCount; w++) {
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1].pos[w], b = samples[i].pos[w];
      if ((a[2] + 9.2) * (b[2] + 9.2) < 0) crossings.push({ walker: w, t: samples[i].t, x: +((a[0] + b[0]) / 2).toFixed(2), westward: b[2] > a[2] });
    }
  }
  const near = [];
  for (const { t, pos } of samples) pos.forEach(([x, y, z], w) => {
    for (const o of obstacles) {
      const sx = o.max[0] - o.min[0], sz = o.max[2] - o.min[2];
      if (sx > 4 || sz > 4) continue;
      if (o.max[1] < y + 0.3 || o.min[1] > y + 1.6) continue;
      const dx = Math.max(0, o.min[0] - x, x - o.max[0]);
      const dz = Math.max(0, o.min[2] - z, z - o.max[2]);
      const d = Math.hypot(dx, dz);
      if (d < 0.6) near.push({ d: +d.toFixed(3), w, t, at: [+x.toFixed(2), +z.toFixed(2)], name: o.name, box: [o.min.map((v) => +v.toFixed(2)), o.max.map((v) => +v.toFixed(2))] });
    }
  });
  near.sort((a, b) => a.d - b.d);
  const seen = new Set(); const closest = near.filter((n) => { const k = n.name + n.box; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 25);
  writeFileSync(`${out}/obstacles-${id}.json`, JSON.stringify(obstacles));
  const beats = await page.evaluate(() => window.__liturgy.procession.snapshot().beats);
  const camHits = [];
  for (const { t, cam } of samples) for (const o of obstacles) {
    if (cam[0] > o.min[0] - 0.15 && cam[0] < o.max[0] + 0.15 && cam[1] > o.min[1] - 0.15 && cam[1] < o.max[1] + 0.15 && cam[2] > o.min[2] - 0.15 && cam[2] < o.max[2] + 0.15) {
      const sx = o.max[0] - o.min[0], sz = o.max[2] - o.min[2]; if (sx > 4 || sz > 4) continue;
      camHits.push({ t, cam, name: o.name, box: [o.min, o.max].map((b) => b.map((v) => +v.toFixed(2))) });
    }
  }
  const maxZ = Math.max(...samples.flatMap((s) => s.pos.map((p) => p[2])));
  report[id] = { duration, walkerCount, obstacleCount: obstacles.length, crossings, maxZ, beats, camHits: camHits.slice(0, 20), camTrack: samples.map((s) => [s.t, ...s.cam]), leadTrack: samples.map((s) => [s.t, +s.pos[0][0].toFixed(2), +s.pos[0][2].toFixed(2)]), closest, hits: [...hits.values()], track: samples.filter((_, i) => i % 8 === 0).map((s) => ({ t: s.t, priest: s.pos.map((p) => [+p[0].toFixed(2), +p[2].toFixed(2)]) })) };
  console.log(id, "duration", duration, "walkers", walkerCount, "obstacles", obstacles.length, "hits", hits.size, "crossings", JSON.stringify(crossings));
}
report.errors = errors;
writeFileSync(`${out}/procession.json`, JSON.stringify(report, null, 1));
console.log("console errors/warnings:", errors.length, errors.slice(0, 10));
await browser.close();
