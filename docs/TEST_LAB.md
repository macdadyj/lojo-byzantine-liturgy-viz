# Test lab

Tools for improving the 3D church quickly and proving each change with pictures and numbers.
Everything runs locally; nothing here deploys anything.

```bash
npm install
npx playwright install chromium webkit   # once; WebKit is only for the phone checks
```

| Command | What it does |
| --- | --- |
| `npm run lab` | Dev server, opens `/lab` |
| `npm run shots` | Screenshots of every step and camera bookmark, desktop and phone |
| `npm run shots:diff` | Compares the last two runs and writes an HTML contact sheet |
| `npm run shots:keep` | Copies chosen shots from a run into `docs/iterations/<pass>/` as JPEG |
| `npm run peek` | One-off captures from any camera position, for close inspection |
| `npm run perf` | Production build, then load time and FPS against budgets |
| `npm run phone` | The real page as an iPhone over Fast 3G: load milestones, bytes, fps, screenshots |
| `npm run phone:touch` | Real touches on the phone layout: drag the church, then reach Next, the sheet, the menu, Text, the procession player |
| `npm run route-plan` | Draws both entrances on a floor plan from the route data, into `docs/iterations/liturgy/route-plan.png` |
| `npm run phone:faults` | No WebGL, blocked chunks, errors, lost context: each must show words, not a blank page |
| `npm run stills` / `npm run small-art` | Regenerate the fallback pictures and the phones' half-size art |
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

- JS bundle size, in all and before first paint (the entry script and its preloads in `dist/index.html`;
  budget 400 KB, since the 3D scene must stay in lazy chunks).
- Load time: navigation until every model and texture is loaded and the scene has rendered.
- FPS over 8 s (`--seconds=N`) for desktop Medium (Gathering), phone Low (Gathering), and
  desktop High (Anaphora), plus draw calls and triangles.

Budgets are in `scripts/perf-budgets.json`, with two tiers:

- `software` (used automatically without a GPU): regression guards for SwiftShader, where
  absolute FPS is meaningless but relative changes are real.
- `gpu` (`LAB_GPU=1`): the real targets, 45 fps desktop Medium and phone Low, 30 fps desktop High,
  load under 8 s.

The script prints each number, writes `qa/perf/latest.json`, and exits 1 on any budget failure.

## Phones: `npm run phone`

Loads the real walkthrough (not `/lab`) the way an iPhone would and measures the load:

```bash
npm run phone                                   # build, then all three profiles
npm run phone -- --label=after --no-build       # reuse dist/
npm run phone -- --dist=.tmp/base-dist --gzip=0 --label=baseline   # an older build, served as nginx used to
```

- Profiles: `webkit-390` (390×844 at 3x), `webkit-414` (414×896 at 2x), and `chromium-414-cpu4x` (the
  same phone in Chromium with 4x CPU throttling). All three use an iPhone iOS 18 user agent, touch, and
  `isMobile`.
- Network: `scripts/lib/throttle-server.mjs` serves `dist/` over one shared link at the Fast 3G preset
  (1.44 Mbit/s, 562 ms latency), with gzip like `nginx.conf`. `--net=none|slow4g|4g` and `--gzip=0`
  change that. WebKit has no network throttling of its own, so the server does it for every browser.
- Recorded per profile, from navigation: first content, the step bar being usable, how long a tap on
  Next takes to answer, the WebGL context, first frame, scene ready (all icons in), frame rate over
  5 s, bytes sent by kind, the tier chosen and why, the GPU string, peak JS heap (Chromium only), and
  any errors.
- Screenshots of the loading screen, step 1 when ready, steps 6, 13, 16, 19 and 22, free look, and the
  text panel go to `qa/phone/<run>/<profile>/`, with `report.json` beside them.

`npm run phone:faults` breaks the page on purpose in WebKit at 390×844: no WebGL2, the 3D chunk blocked,
the main script blocked, a thrown runtime error, a lost WebGL context, and `?debug=1`. Each case must end
in readable words on screen and exits 1 if one does not.

`npm run phone:touch` drives the phone layout with touches and exits 1 if a check fails: in Chromium it
sends DevTools touch events (they go through `touch-action` and scrolling like a finger), drags the church
and then taps Next, drags onto the sheet, swipes the sheet, the Steps menu and the Text view, and checks
that the body never locks scrolling, that each control is on screen, on top, and at least 44 px, and that
landscape keeps Next and Steps reachable. On the Great Entrance it checks that the procession plays on
its own, then taps Pause, the speed button and Next moment, and drags a finger along the scrub bar (the
procession moves, the page does not). WebKit, which has no touch-move API, repeats the taps (including
Pause and speed) and takes the screenshots in `qa/phone/<stamp>-touch/`.

In the dev server, `window.__liturgy.procession` is the player's clock (`seek(seconds)`, `pause()`,
`play()`, `setSpeed()`, `stepBeat(±1)`, `snapshot()`), for putting a procession at an exact moment before
a capture. `window.__liturgy.marchT = 0..1` still pins it to a fraction of the route. Lab captures with
`freeze` start paused at the key moment (the ambon).

### What the emulation cannot prove

Playwright's WebKit is WebKitGTK on Linux. It is close to Safari's engine but not an iPhone:

- The GPU is the host's (reported as "Apple GPU"), not iOS Metal through ANGLE. Shader compile times,
  driver bugs, and real frame rates on an A-series GPU are not measured.
- There is no iOS memory ceiling. Safari kills a tab or loses the WebGL context under memory pressure;
  here that never happens, so the context-lost case is simulated with `WEBGL_lose_context`.
- WebKit has no CPU throttling and no memory API, so CPU cost and heap come only from the Chromium
  profile, which runs on SwiftShader, where frame rate depends mostly on pixel count.
- Safari's collapsing toolbars, the dynamic viewport, the home indicator, notch safe areas (all zero
  here), rotation, Low Power Mode, and real multitouch are not exercised.

The final check is `?debug=1` on the phone itself (see the README).

## Fallback pictures and phone art

- `npm run stills` renders one 480×600 picture per step at Medium into `public/stills/<step>.jpg`. The
  page shows them, with the step text, when WebGL cannot run. Re-run it after a visible scene change.
- `npm run small-art` writes half-size copies of the icons (`public/icons/small/`) and frescoes
  (`public/fresco/small/`), which phones load instead of the full images (816 KB against 2.4 MB).

## Gate: `npm run check`

Type check (app and Vite config), the unit tests (`vitest`), and a production build. Run it before
every commit; `npm run build` also type-checks.

## Suggested loop

1. `npm run shots -- --label=before --only=<area>` (or a full run).
2. Change the scene; look at it live in `/lab` with the HUD open.
3. `npm run shots -- --label=after --only=<area>` then `npm run shots:diff`, and open the contact sheet.
4. `npm run perf` and `npm run check`.
5. Record the pass in `docs/ITERATION_LOG.md` with before and after images.
