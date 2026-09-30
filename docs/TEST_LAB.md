# Test lab

Tools for improving the 3D church quickly and proving each change with pictures and numbers.
Everything runs locally; nothing here deploys anything.

```bash
npm install
npx playwright install chromium   # once, for shots and perf
```

| Command | What it does |
| --- | --- |
| `npm run lab` | Dev server, opens `/lab` |
| `npm run shots` | Screenshots of every step and camera bookmark, desktop and phone |
| `npm run shots:diff` | Compares the last two runs and writes an HTML contact sheet |
| `npm run shots:keep` | Copies chosen shots from a run into `docs/iterations/<pass>/` as JPEG |
| `npm run peek` | One-off captures from any camera position, for close inspection |
| `npm run perf` | Production build, then load time and FPS against budgets |
| `npm run check` | Type check, unit tests, production build (the gate before a commit) |

## The lab page (`/lab`)

Open `http://localhost:5173/lab` with `npm run dev` running, or run `npm run lab`.
The page also works as `/?lab` and in a production build (`npm run build && npm run preview`, then `/lab`).

- **Steps**: all 22 steps of the Liturgy. Clicking one stages the clergy, faithful, doors, and
  camera exactly as the walkthrough does.
- **Camera bookmarks**: *Step camera* uses the step's own pose; the others are fixed views
  (whole nave, iconostas, royal doors, altar, dome, pews, kneeling, clergy close, procession,
  kliros). A bookmark also selects the step it is meant for. The pose in use is printed at the
  bottom of the panel so you can copy it into `src/lab/bookmarks.ts` or `src/scene/staging.ts`.
- **Quality**: High, Medium, Low (the same tiers as the app; Auto is not used in the lab).
- **Lighting**: `liturgy` (the shipped look), `morning`, `evening`, and `flat` (even light for
  checking geometry and materials).
- **Systems**: toggle `people`, `icons` (icon and fresco images become neutral panels),
  `incense`, `post` (post-processing), and `shadows`, plus place `labels`.
- **Time**: freeze the clock at a chosen second (animation stops; poses, flames, and doors stay
  put) or let it run.
- **HUD** (top right): FPS, frame time, draw calls, triangles, live geometries and textures. Draw
  calls and triangles total every render pass of the frame, post-processing included.

### URL parameters

All lab settings can be set from the URL, which is how the scripts drive it:

`/lab?step=gospel&cam=iconostas&quality=high&light=morning&people=0&post=1&freeze=4&labels=1&shot=1`

- `shot=1` hides the panel and HUD and fills the window with the scene.
- `freeze=<seconds>` freezes the clock and snaps the camera (no easing).
- `beat=elevation|clergy` pins the Holy Things moment (doors open for the elevation, or shut for
  the clergy communion).
- `people`, `icons`, `incense`, `post`, `shadows`: `0` or `1`.

### Browser API (`window.__lab`)

Available on `/lab` in dev and production builds:

- `__lab.list()` returns the step ids and bookmarks.
- `await __lab.apply({ step, bookmark, quality, lighting, systems, beat, labels })` changes the
  view and resolves once all models and textures are loaded and the frame has settled.
- `__lab.ready()` is true once the scene has loaded and rendered.
- `__lab.stats()` returns FPS, frame time, draw calls, triangles, and frame count.

## Screenshots: `npm run shots`

Starts a Vite dev server, opens `/lab?shot=1&freeze=4` in headless Chromium, and for each viewport
visits every step (plus Holy Things with the doors shut for the clergy) and every bookmark.

- Viewports: desktop 1280×800 at High, phone 390×844 (touch, mobile) at Medium.
- Output: `qa/screenshots/<YYYYMMDD-HHMMSS>[-label]/<viewport>/<shot>.png` and `manifest.json`
  (commit, time, draw calls and triangles per shot).
- Deterministic: the clock is frozen at 4 s, the seed is fixed, the Holy Things beat is pinned,
  and each capture waits until every model and texture has loaded and the frame has settled.
  Two runs of the same commit produce the same images (differences under 0.5% are treated as
  noise by the diff).

Options (after `--`):

- `--label=pass3` appends a label to the run folder.
- `--only=gospel,cam-dome` runs only shots whose names contain one of these strings.
- `--viewports=desktop` or `--viewports=phone`.
- `--quality=medium`, `--phone-quality=low`.
- `--prod` builds and shoots the production bundle instead of the dev server.
- `--freeze=8` freezes at a different second.

Without a GPU (CI, cloud VMs) Chromium uses SwiftShader, software WebGL. It is pixel-stable but
slow: a full run is roughly 20–40 minutes on 4 CPU cores. Use `--only` while iterating.
On a machine with a GPU set `LAB_GPU=1` for much faster runs. `LAB_HEADED=1` shows the browser.

Run folders are ignored by git. Pictures worth keeping are copied into `docs/iterations/`.

## Comparing runs: `npm run shots:diff`

Compares the newest run with the one before it (or `--base=<run> --head=<run>`), pixel by pixel.
Writes `qa/screenshots/<head>/compare.html`: one row per shot with before, after, and a changed-pixel
map (changed pixels in red), sorted by how much changed. A checkbox hides unchanged shots.
The console lists the ten largest changes. `--fail-above=2` exits non-zero if any shot changed more
than 2% (useful for a refactor that should not change the picture).

## Keeping shots: `npm run shots:keep`

`npm run shots:keep -- --to=pass3-architecture --only=desktop/step-01,phone/cam-iconostas [--run=<run>]`
copies the matching shots of the newest run (or `--run`) into `docs/iterations/<to>/` as JPEG, so
the iteration log can show them without committing whole runs.

## Close looks: `npm run peek`

Captures arbitrary camera poses without adding a bookmark:

```bash
npm run peek -- --step=communion --pos=2.6,1.5,-3.8 --target=0,1.1,-3.8 --name=comm-side --quality=medium
npm run peek -- --views='[{"name":"dome","step":"gathering","pos":[0.4,1.7,7.4],"target":[0,12,-1.15]}]'
```

Images go to `qa/peek/<name>.png` (ignored by git) with draw calls and triangles printed. `--viewport=phone`
and `--params=people=0` work as in the lab URL. The clock is frozen at 4 s, as in `shots`.

## Performance: `npm run perf`

Builds the production bundle, serves it with `vite preview`, and in headless Chromium measures:

- JS bundle size.
- Load time: navigation until every model and texture is loaded and the scene has rendered.
- FPS over 8 s (`--seconds=N`) for desktop Medium (Gathering), phone Low (Gathering), and
  desktop High (Anaphora), plus draw calls and triangles.

Budgets are in `scripts/perf-budgets.json`, with two tiers:

- `software` (used automatically without a GPU): regression guards for SwiftShader, where
  absolute FPS is meaningless but relative changes are real.
- `gpu` (`LAB_GPU=1`): the real targets, 45 fps desktop Medium and phone Low, 30 fps desktop High,
  load under 8 s.

The script prints each number, writes `qa/perf/latest.json`, and exits 1 on any budget failure.

## Gate: `npm run check`

Type check (app and Vite config), the unit tests (`vitest`), and a production build. Run it before
every commit; `npm run build` also type-checks.

## Suggested loop

1. `npm run shots -- --label=before --only=<area>` (or a full run).
2. Change the scene; look at it live in `/lab` with the HUD open.
3. `npm run shots -- --label=after --only=<area>` then `npm run shots:diff`, and open the contact sheet.
4. `npm run perf` and `npm run check`.
5. Record the pass in `docs/ITERATION_LOG.md` with before and after images.
