# Iteration log

Each pass is one commit. Screenshots for a pass live in `docs/iterations/<pass>/` and come from
`npm run shots -- --label=<pass>` plus `npm run shots:keep`, so every pass can be compared with the
baseline in `docs/iterations/pass0-baseline/` (or run `npm run shots:diff` between any two runs).

Numbers are from the headless lab on this VM, which renders with software WebGL (SwiftShader). Frame
rates there are not meaningful in absolute terms; draw calls and triangles are.

| Shot | Baseline | Pass 1 | Pass 2 | Pass 3 |
| --- | --- | --- | --- | --- |
| desktop high, gathering | 783 calls / 170k tris | 562 / 486k | 808 / 986k | 818 / 991k |
| desktop high, west overview | 871 / 191k | 630 / 504k | 876 / 1005k | 887 / 1010k |
| desktop high, pews close | 325 / 93k | 165 / 423k | 435 / 924k | 435 / 925k |
| phone medium, gathering | 559 / 81k | 490 / 439k | 700 / 488k | 707 / 492k |

## Pass 0: baseline

The scene as it was on `main` (`e37e56a`): capsule-and-sphere faithful, flat untextured light,
cone "rays", clergy built from the base figures. Captured before anything changed.

## Pass 1: people

- The faithful, choir, cantor and communion lines are one baked, instanced crowd. Each CC0 figure is
  posed once (standing, praying, kneeling, sitting, arms crossed), frozen to static geometry, and drawn
  with a single instanced draw per figure and pose, with seeded skin, hair and clothing colours.
- Sunday dress: bare arms and legs of the base figures are repainted as sleeves, stockings and skirts,
  and some women wear headscarves fitted to the measured head.
- The priest wears a gold Greek-cut phelonion with a stiff collar, back cross and galloon trim over a
  white sticharion. The deacon and servers wear brocade sticharia; the deacon carries an orarion.
  Armour plates and belt pouches of the base figure are trimmed away.
- New merged, instanced pews with kneelers and carved ends.
- `npm run peek` for one-off camera captures while iterating.

## Pass 2: light and atmosphere

- Directional sun through the clerestory and dome drum only. An invisible shadow-casting mask with
  window openings throws pools of sunlight across the floor and pews without washing the whole room.
- Soft volumetric beams (three fanned additive ribbons per window) and slow incense haze in the
  sanctuary and nave.
- Soft instanced contact shadows under every member of the crowd.
- Big interior pieces cast shadows; small props (tapers, frames, bulbs) do not, which keeps the shadow
  pass from doubling draw calls.
- Bloom is thresholded so only flames and gilt highlights glow; ambient occlusion stays on high only.
- Fixes found while reviewing the screenshots:
  - The communion line's crossed arms reached too far, so the upright hands showed above the
    opposite shoulders and read as raised palms. Elbows now come forward and the hands rest on the
    collarbones (`peek-comm-side.jpg`, `peek-comm-front2.jpg`).
  - The sign of the cross passed the hand beside the head at the right shoulder; it now folds to the
    shoulder.
  - Removed a floating stand-in chalice left from before the priest held the chalice himself.

Cost: on high, the sun's shadow map draws the crowd a second time (triangles roughly double; draw calls
+150 to +250). Medium and low have no sun shadows, so phones are unaffected. `npm run perf` passes.

## Pass 3: architecture and the iconostas

- Opus sectile floor in the nave, narthex and sanctuary: cream marble squares with porphyry and
  serpentine roundels in dark bands, with a matching roughness map so the inlays shine and the grout
  does not. The solea is plain marble.
- Walls carry an ochre plaster gradient, a faux-marble dado and a red-and-gold meander frieze level
  with the iconostas cornice. These paintings existed in `paint.ts` but were never applied.
- The nave barrel vault is lapis with gold stars.
- The columns now carry segmental arches with a plaster wall up to the vault springing and a gilt
  string course, instead of flat beams with a gap above them.
- The iconostas is carved walnut with a gilt Eucharistic vine (grapes and vine leaves), rose-marble
  plinths, gilt colonnettes at every jamb of the lower tier, and a heavier carved cornice. The royal
  and deacon doors use the same carving.
- The four evangelists sit flush on the diagonals of the sloping lower drum, where pendentives would
  carry them. Before, they hung in mid-air at odd angles, and from the west you saw the gold backs of
  their frames. Gilt rings now mark the drum's edges. (`peek-dome.jpg` was taken just before the rings
  and the drum-beam change below.)
- Sunbeams fade in just inside the window instead of starting at full strength, and the dome-drum
  shafts are gone: from below they read as solid gold slabs.

Every new surface is a procedural canvas painting drawn once and shared; per-surface repeats are clones
that share the image, so there are no new downloads and no new assets to license. Draw calls rose by
about 10.

## Pass 4: camera movement

Before this pass every step change was a hard cut: the follow camera jumped to the new pose on the
same frame.

- Steps whose poses are close (7 m or less) and in the same room now glide: position and aim ease
  along a straight line over 1.25 s with zero velocity at both ends. "Same room" means the line does
  not cross the iconostas and does not sweep sideways across the pews at seated eye height.
- Longer changes dip to dark: the view fades out (170 ms), cuts while dark, and fades back in
  (420 ms). The veil is advanced by the render loop, not by CSS, so the cut always lands on a dark
  frame; each frame advances it by at most 100 ms, so even a slow phone shows the fade.
- Going through the 22 steps in order gives 7 glides (opening to litany; epistle to gospel to
  homily to before-the-gifts; holy things to communion to thanksgiving to dismissal) and 14 dips.
- Reduced motion and the lab (`snap`) still cut instantly, so screenshots stay deterministic.
- First-person walking eases in and out over about 0.2 s instead of starting and stopping dead.
  The pitch limit and collision are unchanged.
- Unit tests cover the move planner: no glide ever crosses the iconostas, reduced motion snaps, and
  the easing starts and ends at rest. A dev-only `__liturgy.cameraAt()` probe reads the camera
  position; headless sampling showed the glide passing through intermediate positions and the veil
  darkening around the cut.

## Pass 5: performance and the dome

- The five candle sand trays drew every taper and every flame as its own mesh: about 240 draw calls
  for pencil-sized props. They are now two instanced meshes for all trays together.
- Each chandelier's ten bulbs are one instanced draw instead of ten.
- `npm run perf` (software WebGL; draw calls are the meaningful number here):

  | Scene | Before this pass | After |
  | --- | --- | --- |
  | desktop medium, gathering | 759 calls | 563 calls |
  | phone low, gathering | 436 calls | 239 calls |
  | desktop high, anaphora | 420 calls | 421 calls |

  Phone-low frame rate on this VM varies between runs (4.1 to 5.7 fps under SwiftShader), so it
  says little about a real phone; the budget still passes.
- The small drum icons hung about 0.3 m inside the drum wall and overlapped the windows, so from
  the nave you saw the gold backs of their frames. They now sit flush on the wall between the
  windows (`peek-dome.jpg`).

## Pass 6: columns, credits, and documentation

- The column shafts used the generic marble tiled 7 times around and 11 times up, which read as
  grey tree bark. They now use a warm Proconnesian marble with soft grey veins running up the
  shaft, seamless around the column (`peek-columns.jpg`).
- `CREDITS.md` summarizes every asset and license. It points to `ATTRIBUTION.md` for file-by-file
  sources, records that this branch downloaded nothing, and lists the dev-only tooling licenses.
- `docs/TEST_LAB.md` documents `shots:keep` and `peek`; the README links the lab, this log, and
  the credits.
- Looked at and left alone: on one women's figure, a cropped top meets the trousers in a jagged
  hem line at the waistband. It is inside the CC0 model; recolouring it by bone did not help,
  and at normal viewing distance it is a few pixels.

## Final run

A full `npm run shots` run (every step and bookmark, desktop and phone: 66 shots) after Pass 6.
The selection in `docs/iterations/final/`:

- `cam-west-overview.png`: the nave from the west doors, with pews, arcades, the frieze and the iconostas.
- `cam-iconostas.png`: the carved walnut screen with the Theotokos and Christ icons and the royal doors.
- `step-19-holy-things.png`: "Holy things for the holy" with the royal doors open.
- `step-23-holy-things-clergy.png`: the clergy's communion with the royal doors shut (for comparison).
- `cam-kneeling.png`: the faithful in the pews under clerestory sunlight.
- `step-13-great-entrance.png`: the Great Entrance, with vestments, the floor and the frieze.

`npm run check` (typecheck, 24 tests, build) and `npm run perf` pass: desktop medium 563 calls,
phone low 239 calls, desktop high 421 calls, 1578 KB of JS against a 2000 KB budget.

## Direction change: build it the way sael.net is built

Jon lifted the tie to the Quaternius characters and asked for the look and technique of Ryan
Sael's scenes. What his scenes are made of is written up in `docs/REFERENCE_NOTES.md`. In short:
plain three.js, no downloaded models or textures, people built from primitives and drawn as one
instanced mesh per crowd with the limbs swung in the vertex shader, fake candle and lamp lights
in the material shader, and GTAO, bloom, depth of field and ACES on top.

## Pass 7: procedural people

- Every person (congregation, choir, reader, servers, deacon, priest) is now built in code from
  spheres, capsules, cylinders and boxes (`src/scene/figures/`). A small rig (`rig.ts`) turns a
  pose (stand, sit, kneel, bow, pray, arms crossed for communion, the sign of the cross, carry,
  elevate, candle, censer) into joints; `shapes.ts` hangs the shapes on them and merges one
  geometry per look and pose. Each vertex carries the palette slot and the joint it turns about.
- One instanced draw per look and pose. Per-instance colors (skin, hair, top, bottom, accent) are
  packed into one attribute; the vertex shader swings legs and arms for walking and runs the
  Byzantine sign of the cross (forehead, breast, right shoulder, left shoulder).
- Vestments are shaped in the same code: the Greek-cut phelonion (a bell cut up at the front),
  the sticharion, the epitrachelion with its fringe, the epimanikia, the orarion over the deacon's
  left shoulder lying on the robe front and back, and the servers' pale sticharia with a cross on
  the back.
- `public/models/` (11 MB of CC0 GLBs) and the old baking code are gone; ATTRIBUTION.md and
  CREDITS.md say the people are made in this project.
- Fixed along the way: the man's shirt and tie read as a "Π" (now a white V with a narrow tie);
  trouser legs looked like stilts with gaps at the knee (thicker, overlapping); the orarion stood
  off the body like a board; the candle and censer poses raised the left hand while the props hang
  from the right, so servers' candles floated at the hip (a test now guards this); elders with
  white hair and beards read as skulls (greyer hair).

## Pass 8: the look

- Practical lights (`src/scene/lighting/practicals.ts`): 17 candles, sand trays, lampadas and
  chandeliers are a constant list added to the diffuse light of every lit material, the way
  Sael's scenes light people with lamps they never pay for. They replace 10 real point lights.
  Short-reach candles are grouped, and a pixel only visits a group whose box contains it.
- Depth of field (`src/scene/focusBlur.ts`): the library effect softened the whole frame in our
  composer, so this is our own one-pass gather blur. The guided camera's look-at point stays
  sharp, the far room softens gradually, and the lens blur is off in free walking. An exaggerated
  test render confirmed it works before it was toned down.
- Exponential fog, ACES exposure 1.1 (was 1.0), bloom threshold 0.95 so only flames, windows and
  bright gilt glow.
- Performance: the first version of the practicals dropped the software-rendered phone-low tier
  from about 6.7 to 2.2 fps. Moving the loop to world space, grouping the candles, and compiling it
  only with the shadow-mapped rig (the low tier has none and lights the room evenly) brought it
  back to 6.2 to 6.7 fps.

| Scene | Pass 6 | Now |
| --- | --- | --- |
| desktop medium, gathering | 563 calls | 446 calls |
| phone low, gathering | 239 calls | 195 calls |
| desktop high, anaphora | 421 calls | 314 calls |
| JS bundle | 1578 KB | 1509 KB |

Not done: Sael's narrower lens (30° against our 42°) would mean recomposing every step's view,
and the step panel was left as it is so its working behavior is untouched.

Also fixed in this round: when the curtain was drawn at "Holy things" it shrank to a bar in the
middle of the open royal doors, right in front of the priest elevating the gifts. It is now drawn
aside to the north jamb (`desktop-step-19-holy-things.jpg`); for the clergy's communion the doors
and curtain are shut as before (`desktop-step-23-holy-things-clergy.jpg`).

Kept shots for passes 7 and 8 are in `docs/iterations/sael/`. `npm run check` (typecheck, 44
tests, build) and `npm run perf` pass: desktop medium 446 calls, phone low 195 calls at 6.2 fps
(software budget 4.5), desktop high 314 calls, 1509 KB of JS.

## Pass 9: phones

Reported: the live site does not load usably in Safari on an iPhone. Measured with `npm run phone`
(Fast 3G, see [TEST_LAB.md](TEST_LAB.md#phones-npm-run-phone)) on the main build as nginx served it,
then on this branch.

What was wrong:

- nginx sent the 1.5 MB script uncompressed, and the page stayed blank until all of it had arrived
  and run (`#root` was empty). Over Fast 3G that was about 10 s of white screen.
- Starting the scene blocked the main thread: in WebKit a tap on Next took until 28 s to answer.
- Every device started at Medium (shadow maps, the practical-light loop, the post-processing
  composer) and Auto could climb to High. Each tier change recompiles every shader.
- On a phone the church filled the whole screen with `touch-action: none`, so the page could hardly
  be scrolled to the step text and the pager below it (`before-step-01.jpg`).
- Drag to look read `movementX`, which iOS does not report for touch, and the joystick's own finger
  also turned the view. The overlay buttons were small, crowded, and ignored the safe areas.
- 2.4 MB of icon and fresco images, about 75 MB of GPU memory once decoded.
- A WebGL failure, a failed chunk, or a thrown error left a blank or frozen page.

What changed:

- gzip in `nginx.conf`. The first screen is in `index.html` itself: title, "Opening the
  walkthrough…", a bar, and a catcher that shows any script or chunk failure as words with Reload.
- The app shell (steps, text, pager) is 279 KB before gzip with no three.js in it. The 3D scene, the
  post-processing, and the lab are lazy chunks; the loading gate reports "Downloading the 3D church",
  "Preparing the church", then "Loading icons x of y" while the church is already drawn.
- A GPU probe and `chooseTier`: phones and tablets start at Low with Auto capped at Low, software
  renderers too, devices reporting 4 GB or less start at Low and can climb to Medium, desktops start
  at Medium as before. `?quality=` or the View sheet still picks any tier by hand. Low means no shadow
  maps, no composer (its chunk is not even fetched), the cheaper light rig, and a pixel ratio of at
  most 1.5 on phones. Phones also load half-size art (816 KB).
- Phone layout: the church takes 62% of the height with the step text under it and a fixed Back and
  Next bar with the step title. The page scrolls over the church in Follow liturgy; only Free look
  captures touch. Buttons are 44 px or larger and clear the notch and home indicator. Expand fills the
  screen (the Fullscreen API where it exists; iPhone Safari has none, so it is CSS). Quality and the
  cast key moved into a View sheet.
- Touch look tracks one finger by `clientX`/`clientY`; the joystick keeps its own pointer.
- No WebGL2, a lost context that does not come back within 4 s, or a scene crash shows the step's
  still picture (`public/stills`, `npm run stills`), what the faithful see, and a row of icons with
  their notes, plus Try again (at Low) and the error text.
- `?debug=1` shows the GPU, WebGL2 limits, the tier and why, fps, draw calls, canvas size and pixel
  ratio, safe areas, load times, context losses, heap, the user agent, and every caught error, with Copy.

| iPhone profile, Fast 3G | main (no gzip) | this branch |
| --- | --- | --- |
| first content | 10.1 s | 1.8 s |
| tap on Next answered | 27.9 s | 3.0 s |
| first 3D frame | 13.0 s | 5.0 s |
| scene ready, all icons | 27.3 s | 10.1 s |
| JS sent | 1509 KB | 371 KB |
| everything sent | 4037 KB | 1271 KB |
| fps (WebKit, host GPU) | 16.4 | 20.3 |

That is `webkit-390`; `webkit-414` is within 0.1 s of it. `chromium-414-cpu4x` went from 10.2 s to
1.3 s for first content, 15.2 s to 3.4 s for the tap, 11.1 s to 6.0 s for the first frame, and 26.5 s
to 10.8 s for ready. Its software-rendered fps fell from 5.2 to 3.8 because the phone tier now draws
at 1.5x rather than the old Low's 1x; SwiftShader's speed is pixel count, a phone GPU's mostly is not.
Peak JS heap there is 28 MB (19 MB before).

Desktop is unchanged: `npm run shots` of steps 1, 13, 19 and 22 at High and steps 1 and 16 at Medium
are pixel-identical to main, and `npm run perf` gives main's draw calls and triangles (446, 195, 314).
Splitting the icons into their own Suspense boundary had first cost 115 desktop shadow casters; the
pass that flags shadows now runs again when the icons and frescoes arrive.

The phone layout described here was replaced in Pass 10; `before-load-10s.jpg` and `before-step-01.jpg`
in `docs/iterations/mobile/` are main, the rest show the Pass 10 layout.

## Pass 10: the church with the words over it

Reported from the phone: the page opened into the 3D church, a finger on it would not scroll, and the
Next button and the navigation could not be reached. The Pass 9 layout (church at 62% of the height,
words under it) still made the page scroll past the picture to read and navigate.

- The 3D view is the screen under a top bar: the church fills it, and the step's words sit in a sheet
  over its bottom edge (`after-step-01.jpg`). Back, Next, and the step title are the sheet's bottom row,
  under the thumb; tapping the title closes the words to that one row (`after-sheet-closed.jpg`). The
  words scroll inside the sheet.
- The top bar is outside the picture, so it never turns the view: **Steps** opens every step by part of
  the Liturgy plus links to the 3D church, the step's words, the places, and About
  (`after-steps-menu.jpg`); **3D / Text** switches to an ordinary scrolling page of words, places and
  outline with Back and Next fixed at the bottom (`after-text-view.jpg`, `after-text-scrolled.jpg`). In
  Text the church stays loaded but stops drawing.
- The picture is the one drag area (`touch-action: none` only there). In Follow liturgy a finger now
  looks around from the camera, and Next turns the view back to the step (`after-drag-to-look.jpg`); a
  hint says so until the first touch. Mouse drags are unchanged. Free look walks as before, with the
  joystick above the bar (`after-free-look.jpg`).
- Nothing locks the body: the 3D view is exactly one screen tall; the sheet and the menu scroll
  themselves with `overscroll-behavior: contain`. Expand is gone on phones, since the 3D view is already
  full screen; desktops keep it.
- Every control is at least 44 px (Back and Next 52 px), and the bar, the sheet and the menu pad for the
  notch, the home indicator and the sides in landscape (`after-landscape.jpg`).
- Found on the way: on narrow screens `.stage-body` is a flex column that aligned its children to the
  start, so once the church panel held only positioned children it shrank to 0 px wide. The canvas hid
  it; the no-WebGL fallback showed a blank area until the column was stretched.

`npm run phone:touch` checks this with touches (33 checks, all pass): in Chromium through DevTools touch
events, which go through `touch-action` and scrolling as a finger does, it drags the church and then
taps Next, drags from the church onto the sheet and taps Next, swipes the sheet, the menu and the Text
view, and checks that the body never locks, that every control is on screen and on top, and that
landscape keeps Next and Steps reachable; WebKit repeats the taps and takes the screenshots.

| iPhone profile, Fast 3G | main | Pass 9 | Pass 10 |
| --- | --- | --- | --- |
| first content | 10.1 s | 1.8 s | 1.8 s |
| tap on Next answered | 27.9 s | 3.0 s | 2.1 to 5.2 s |
| first 3D frame | 13.0 s | 5.0 s | 5.1 s |
| scene ready | 27.3 s | 10.1 s | 10.0 s |
| JS sent | 1509 KB | 371 KB | 373 KB |
| fps (WebKit, host GPU) | 16.4 | 20.3 | 15.0 |

The tap is answered in 14 ms once dispatched; when it lands depends on when the 3D chunk is being parsed,
which varied between runs. The frame rate is lower because the church now covers the whole screen (585×1179
drawing pixels against 585×784). Desktop is unchanged: `npm run perf` gives the same 446 / 195 / 314 draw
calls, and the desktop page keeps its header pager, side list and Expand.

## Pass 11: the entrances, walked as a Ruthenian parish walks them

Screenshots: `docs/iterations/liturgy/`. The floor plan `route-plan.png` is drawn from the same route data
the scene walks (`npm run route-plan`).

What was wrong on main:

- The procession walked a path out of the north door and back, but its clock ran forward, then backward,
  forever (`t` bounced between 0 and 1). Every other pass the clergy walked the route in reverse, facing
  forward, so half the time the gifts left through the Royal Doors and went home through the north door.
- The path was parameterized per waypoint, not per meter, so walking speed changed from segment to segment.
- Neither route reached the people: the Great Entrance turned back at the second pew.
- The tetrapod stood at z 1.15, in the first standing row, with a candle stand in the center aisle at
  z 2.4, so there was no room to walk between the icon and the people. The reader stood among the south
  pews.

What changed:

- `src/scene/routes.ts` holds both routes as stops on the floor, some with a named moment ("Out through
  the north deacon door") and a hold. `buildTimeline` makes one forward pass at 0.8 m/s by arc length; the
  priest walks last, 3.15 m behind the first candle, and stops before the altar while the candles go on
  round its north end. Legs follow meters walked (`uStride`), so the gait stops when the procession
  stops and slows with it.
- Little Entrance (57 s at 1×): altar, north through the sanctuary, out the north deacon door, down off
  the solea into the north aisle, across the walkway in front of the people, round the tetrapod, a 4 s
  stand at the ambon for "Wisdom! Be attentive!", in through the Royal Doors, the Gospel on the altar.
- Great Entrance (1:31 at 1×): prothesis, out the north deacon door, down the north aisle between the
  pews and the columns, across the back of the nave, up the center aisle, round the tetrapod, a 4 s stand
  at the ambon for the commemorations, in through the Royal Doors, the gifts on the altar.
- The tetrapod moved east to z −1.3 (under the dome), its sand trays with it and the candle stand to its
  east side. The walkway runs at z −0.35, about 0.7 m from the stand and 1.9 m in front of the first
  standing row. Free walking treats the tetrapod as solid now. The dismissal line's last person moved out
  of the trays.
- The reader stands on the north side at (−2.5, 0.65): among the faithful, between the first row and the
  walkway, clear of the north aisle.
- The two servers who stand in the sanctuary are the candle bearers, so they are hidden while a
  procession walks instead of being in two places at once.
- The follow camera walks the route 3.4 m ahead of the first candle and looks back at the middle of the
  procession, so it goes through the same doors and never through a wall; in the north aisle it stands a
  little toward the pews to see past the columns, and beside the tetrapod it rises to look over the icon.
  As the train reaches the altar it moves to a fixed view of the holy table. A scrub further than 6 m cuts.
- The player (`ProcessionBar`) reads a small store (`processionClock`) that the scene advances each frame:
  Play/Pause (Replay at the end), speed 0.25× to 2×, previous/next moment, and a scrub bar, with the
  moment's name and the time. Wide screens show it over the bottom of the church; phones put it in the step
  sheet above Back and Next with 44 px targets and speed on one button (the words shrink to 30% of the
  screen on these two steps to make room). Reduced motion starts paused at the ambon.
- Tests: `routes.test.ts` checks for both routes that the only crossings of the iconostas are out
  through the north door and back through the Royal Doors, that time only moves forward at walking pace,
  that every walker stays clear of pews, columns, the tetrapod, the altar and the reader, that the camera
  crosses the iconostas only through a door, and that only the Great Entrance reaches the back of the
  nave; plus the player's speed, end, replay, step and scrub. `npm run phone:touch` now works the player
  with touches (44/44).

Checks: `npm run check` (61 tests), `npm run perf` (446 / 197 / 314 draw calls, 287 KB before first
paint), `npm run phone:faults` (6/6), `npm run phone:touch` (44/44).

Simplified on purpose: inside the sanctuary the clergy walk straight from the altar (or the prothesis) to
the north door rather than circling the holy table, and the servers step into the doorway at the ambon
stand instead of stepping aside. Parishes differ on how far into the nave each entrance goes; this church
takes the Little Entrance across the front and the Great Entrance round the whole nave.
