/// <reference types="node" />
import { readFile } from "node:fs/promises";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const quietClock = `(() => { const c = { autoStart: true, startTime: 0, oldTime: 0, elapsedTime: 0, running: false, start() { c.startTime = performance.now(); c.oldTime = c.startTime; c.elapsedTime = 0; c.running = true; }, stop() { c.getElapsedTime(); c.running = false; c.autoStart = false; }, getElapsedTime() { c.getDelta(); return c.elapsedTime; }, getDelta() { let diff = 0; if (c.autoStart && !c.running) { c.start(); return 0; } if (c.running) { const now = performance.now(); diff = (now - c.oldTime) / 1000; c.oldTime = now; c.elapsedTime += diff; } return diff; } }; return c; })()`;

function quietThreeClock() {
  return {
    name: "quiet-three-clock",
    transform(code: string, id: string) {
      if (!id.includes("@react-three/fiber") || !code.includes("new THREE.Clock()")) return null;
      return code.replaceAll("new THREE.Clock()", quietClock);
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), quietThreeClock()],
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: "quiet-three-clock",
          setup(build) {
            build.onLoad({ filter: /@react-three\/fiber\/dist\/events-.*\.js$/ }, async (args) => {
              const text = await readFile(args.path, "utf8");
              return {
                contents: text.replaceAll("new THREE.Clock()", quietClock),
                loader: "js",
              };
            });
          },
        },
      ],
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
