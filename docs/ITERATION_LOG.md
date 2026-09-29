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
