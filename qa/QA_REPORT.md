# QA punch list — Divine Liturgy walkthrough

## Verified pass 6

Independent retest of `cursor/liturgy-pass-5-339c` at `d2cdaab` (“Plant the congregation on the floor and typecheck the Vite config”). No app code was changed. The “Fixed in pass 6” section below is the developer’s claim. This section is the walk.

**Verdict: NOT READY.**

The build, the Medium anaphora, the Communion chalice, and the dismissal hand cross are in good shape. The congregation is not. Shoes still hang above the floor in the gathering, on the kliros, in the entrances, at Communion, and at the dismissal, and bodies still cut through the north door and the iconostas. I would not put this in front of a parish yet.

### Still P0

1. **People still float and still clip.** Pass 6 plants soles in code, and the pictures do not show soles on the floor. In the gathering there is a gap under the shoes and a shadow on the marble beneath it (`pass6-high-step-01.png`). The same gap is on the kliros (`pass6-high-step-05.png`), in both entrances, in the Communion line, and in the dismissal queue. The priest’s feet miss the sanctuary floor too (`pass6-high-step-03.png`, `pass6-high-step-15.png`). The deacon’s body still intersects the north door (`pass6-high-step-06-later.png`, `pass6-high-step-13-later.png`). On the epiklesis at least one kneeling figure intersects the iconostas (`pass6-high-step-16.png`).

### Build, tests, and Docker

- `npm test`: 18 passed (2 files).
- A first `npm run build` on the stale `node_modules` failed with `TS2688: Cannot find type definition file for 'node'`, because `@types/node` was not installed yet. `npm ci` installed it. The next `npm run build` (`tsc` for the app, `tsc` for `vite.config.ts`, then Vite) succeeded. Output JS: `dist/assets/index-ByWrA-2T.js`.
- Docker was not on the machine. After installing it, `docker build .` completed and tagged `liturgy-pass6`. The image runs the Dockerfile’s `npm run build`, so the clean container build typechecks.

### How this retest was run

- Preview of that production build at `http://127.0.0.1:4173/`.
- Playwright, headed Chromium, WebGL 2 via ANGLE SwiftShader. Canvas about 1160×815.
- A full Next walk of all 22 steps at High, then again at Medium, then again at Low. Titles matched on all three. Previous from step 22 back to step 1, with Previous disabled on 1 and Next disabled on 22. Home lands on Gathering. End lands on Dismissal.
- Free look, E on an icon (St. Nicholas), the four-stop icon tour, Head bob off at the start. Phone at 390×844.
- Holy Things was timed again on Low at about 0.8s, 2.5s, 5s, and 8s (`pass6-holy-t800.png`, `pass6-holy-t5000.png`).
- SwiftShader frame rate: High about 0.45–1.4 fps (mean about 0.8), Medium about 0.7–1.3 (mean about 1.0), Low about 0.9–4.3 (mean about 2.2).
- Console warnings: none. Page errors: none. Failed requests: none.

New shots are `qa/screenshots/pass6-*.png`.

### Verified pass 6 — pass 6 claims

| Item | Verified pass 6 | What this walk showed |
| --- | --- | --- |
| Build (`npm run build` / Docker tsc) | fixed | Clean `npm ci` then `npm run build` passes both `tsc` projects and Vite. `docker build .` succeeds. |
| People float and clip | not fixed | Still P0. Clothes and faces still vary. Feet do not meet the floor, and bodies still intersect the door and the screen. `pass6-high-step-01.png`, `pass6-people-nave-close.png`, `pass6-high-step-16.png`. |
| Entrances and the north door | partly fixed | The north door is open. Two candles lead the Little Entrance, and the Gospel is in the deacon’s hands. His body still occupies the door frame, and his feet are above the solea. `pass6-high-step-06-later.png`. |
| Great Entrance camera | partly fixed | The camera is at the open north door. Candles, the chalice, and the diskos are in the doorway. The line does not read as carried across the nave and set on the altar. The deacon clips the frame. `pass6-high-step-13-later.png`. Medium shows the same doorway (`pass6-medium-step-13-later.png`). |
| Communion chalice and dismissal cross | fixed | Communion has a large gold chalice and a spoon between the priest and the line (`pass6-high-step-20.png`). Dismissal has a gold hand cross in front of the priest (`pass6-high-step-22.png`). The queues still float. |
| Medium anaphora | fixed | Medium, from a fresh walk and from switching High → Medium → Low while already on the anaphora, stays inside at the holy table with the gifts and the royal doors open. `pass6-medium-step-15.png`, `pass6-switch-anaphora-medium.png`, `pass6-low-step-15.png`, `pass6-high-step-15.png`. |

### Verified pass 6 — earlier punch list

| Item | Verified pass 6 | What this walk showed |
| --- | --- | --- |
| 1 Sanctuary visibility (P0-1) | fixed | Proskomedia, Cherubic Hymn, Creed, anaphora, epiklesis, and the Holy Things elevation still show the table or the gifts, not a shut screen. `pass6-high-step-02.png`, `pass6-high-step-12.png`, `pass6-high-step-14.png`, `pass6-high-step-15.png`. |
| 2 Deacon doors (P0-2) | partly fixed | Real opening, north leaf open for both entrances, candles in front. Bodies still intersect the leaf. |
| 3 People (P0-3) | not fixed | Same as the pass 6 people row. Variety remains. The floor contact does not. |
| 4 Wrong subject (P1-1) | partly fixed | Gathering is the narthex. Antiphons are the kliros, and some singers face the nave with a cross gesture (`pass6-high-step-05.png`, `pass6-high-step-07.png`). They still float, and several singers face away. |
| 5 Holy Things two beats | regressed | The elevation with the doors open is on screen (`pass6-holy-t800.png`). Frames at 2.5s, 5s, and 8s are the same picture, still the open elevation (`pass6-holy-t5000.png`). The pass 5 retest had a later frame with the doors and curtain shut. This walk did not. |
| 6 Epiklesis kneel (P1-2) | fixed | The nave is kneeling and the gifts are visible through open doors (`pass6-high-step-16.png`). One figure clips the iconostas. |
| 7 Entrances (top 7) | partly fixed | Same as the entrance rows above. Candles are new. The path still ends in the doorway. |
| 8 Phone (P1-6) | fixed | At 390×844 the church is first (y=15, title at y=1723). Controls do not cover each other. The hint says joystick, not WASD. `pass6-mobile-freelook.png`. |
| 9 Low quality (P1-7) | fixed | Low anaphora is the same sanctuary subject as High and Medium (`pass6-low-step-15.png`). Low is the fastest of the three here and still a slideshow on SwiftShader. |
| 10 First-run UI (P2-1) | fixed | Step 1 opens with the see-line and the disclosure open. Follow liturgy says arrow keys. Free look says WASD on the desktop and the joystick on the phone. |
| P1-3 Communion and dismissal | partly fixed | Chalice, spoon, child, and hand cross are readable. The people in those lines are still above the floor. |
| P1-4 Readings and homily | fixed | All 22 titles, including Epistle, Gospel, and homily, advanced correctly at all three qualities. No shut-door regression on the sanctuary steps checked beside them. |
| P1-5 Free look and the dome tour | fixed | E opened St. Nicholas (`pass6-free-press-e.png`). The tour reached Exaltation of the Cross, the Deesis, the Dormition, and Christ Pantocrator (`pass6-tour-4.png`). Head bob starts off. |
| P2-2 Pointer lock and head bob | fixed | `aria-pressed` false. No page errors. |
| P2-3 Legend and step 3 | partly fixed | Step 3 is the open doors, the priest, and a candle (`pass6-high-step-03.png`). The priest’s feet still miss the floor. |
| P2-4 THREE.Clock | fixed | Quiet console on the desktop walks and the phone walk. |

### Regressions

- **Holy Things close beat.** The open elevation is intact. The shut doors and curtain, which the pass 5 retest recorded, did not appear in an 8 second Low watch.
- No regression on the build once dependencies are installed, on the Medium anaphora, on the phone, or on the console.

---

## Verified pass 5

Independent retest of draft pass 5, branch `cursor/liturgy-pass-5-339c` at `390a88e` (“Open the sanctuary doors and replace the repeated bald cast”). No app code was changed. The “Fixed in pass 5” column later in this file is the developer’s claim. The tables in this section are what a second walk actually showed.

**Verdict: not ready to ship live.**

The altar steps, the phone layout, and the console are in much better shape than `main`. A parish still should not get this build. The official build command fails, so the container cannot be produced, and the congregation still floats and intersects the pews in the shots a learner watches.

### Still P0

1. **`npm run build` fails**, so this cannot be deployed the way the image is built. `tsc --noEmit` stops on `vite.config.ts(1,26): error TS2307: Cannot find module 'node:fs/promises' or its corresponding type declarations.` The Dockerfile runs `npm run build`. On `main` that command succeeded. This is a regression. The pictures below are from `npx vite build` and `vite preview`, which skip the typecheck.
2. **The congregation still does not sit in the church.** Clothes and faces vary, and the old single bald pair is gone, but feet hang above the floor in the gathering, the antiphons, the Trisagion, Communion, and the dismissal. Bodies pass through pews, railings, and each other. That is the picture on the steps a first-time user actually stares at.

### How this retest was run

- Checked out `cursor/liturgy-pass-5-339c`. `npm run build` failed as above. `npx vite build` produced `dist/assets/index-DAozHQCk.js`. Preview at `http://127.0.0.1:4173/`.
- Playwright, headed Chromium, WebGL 2 via ANGLE SwiftShader (`Vulkan 1.3.0 (SwiftShader Device)`). Canvas about 1160×815.
- Follow liturgy: Next through all 22 steps, then Previous back through all 22. Home landed on Gathering. End landed on Dismissal. Previous disabled on step 1, Next disabled on step 22. Every title on the way back matched.
- Free look: WASD hint on desktop, E on an icon, Icon tour, Head bob. Phone at 390×844 with the joystick.
- High, Medium, and Low on the anaphora.
- Holy Things was walked again on Medium after the High pair presented one frozen frame (about 0.6 fps). The second pass is `pass5-holy-open.png` and `pass5-holy-shut.png`.

SwiftShader frame rate, ~1160×815: High about 0.57 fps, Medium about 0.9–1.8, Low about 1.5. Low is readable and only a little faster. New shots are `qa/screenshots/pass5-*.png`. The original `qa/screenshots/*.png` files are the first walk and were left in place.

### Verified pass 5 — every punch-list item

| Item | Verified pass 5 | What this walk showed |
| --- | --- | --- |
| 1 Sanctuary visibility (P0-1) | partly fixed | Proskomedia, Cherubic Hymn, Creed, anaphora, epiklesis, and Holy Things no longer stare at a shut screen. High and Low anaphora are inside beside the gifts (`pass5-step-15.png`, `pass5-quality-anaphora-high.png`, `pass5-quality-anaphora-low.png`). The diskos and chalice often look suspended, and the Medium anaphora frame lost the altar entirely (`pass5-quality-anaphora-medium.png`). |
| 2 Deacon doors (P0-2) | partly fixed | The north leaf opens for both entrances. The Gospel and the vessels are in the doorway, and the procession no longer walks through a painted archangel. Bodies still intersect the door frame. Candles do not go before the book or the gifts. The Great Entrance stays in the doorway (`pass5-step-06-later.png`, `pass5-step-13-later.png`). |
| 3 People (P0-3) | partly fixed | Still P0 for a live parish. Suits, dresses, work clothes, and different faces are in the pews. The priest has a beard, a kamilavka, and a bell-shaped phelonion. Several heads still have no hair. Feet float. Bodies clip pews, the kliros rail, and each other. Children read as short adults. Walking up to the priest barely moved the camera (`pass5-people-priest-close.png` and `pass5-people-priest-side.png` are almost the same frame). `pass5-step-01.png`, `pass5-people-nave-close.png`, `pass5-step-20.png`. |
| 4 Wrong subject (P1-1) | partly fixed | Gathering is the narthex and nave. Antiphons are the kliros. Trisagion and the Our Father show the people facing the altar. At the kliros the singers face away and float above the loft (`pass5-step-05.png`). The sign of the cross at the Trisagion is not readable (`pass5-step-07.png`). |
| 5 Holy Things (top 5) | fixed | One step, two beats. Gifts lifted with the royal doors open (`pass5-holy-open.png`), then the doors and the curtain shut while the nave waits (`pass5-holy-shut.png`). The first High pair, `pass5-step-19.png` and `pass5-step-19-clergy.png`, was the same presented frame and is not the evidence. |
| 6 Epiklesis kneel (P1-2) | fixed | The nave is kneeling. The royal doors are open and the gifts are visible in the distance (`pass5-step-16.png`). A few figures on the side stay standing. |
| 7 Entrances (top 7) | partly fixed | The camera is on the open north door, behind the carrier, for both entrances. The Gospel is in the deacon’s hands. The chalice and diskos are in the doorway. Neither procession reads as candles, a crossing of the nave, and vessels set on the altar. The deacon’s body clips the frame (`pass5-step-06-later.png`, `pass5-step-13-later.png`). |
| 8 Phone (P1-6) | fixed | At 390×844 the church is the first screen (picture from y=15, title down at y=1723). Quality, mode buttons, joystick hint, joystick, and cast key do not cover each other. The hint says “Drag to look. Move with the joystick. Home and End change the step.” One joystick. `pass5-mobile-freelook.png`, `pass5-mobile-top.png`, `pass5-mobile-after-joystick.png`. |
| 9 Low quality (P1-7) | partly fixed | Low anaphora stays a warm interior with the priest and the gifts, and the icons are lit (`pass5-quality-anaphora-low.png`). It is the same kind of picture as High, not the old crushed brown field. Medium’s anaphora frame is a different, emptier nave with the doors closed (`pass5-quality-anaphora-medium.png`). All three settings were still a slideshow here. |
| 10 First-run UI (P2-1) | fixed | Step 1 opens with the “what you see” line visible and the disclosure open (`detailsOpen: true`). Follow liturgy says “Arrow keys, Home, End”. Free look on the desktop says WASD, and the pager then says “Home and End change the step”. `pass5-ui-first.png`. |
| P1-3 Communion and dismissal | partly fixed | Communion has open doors, a line, and a child (`pass5-step-20.png`). The chalice does not read, and the line floats. Dismissal brings people toward the ambon and the narthex (`pass5-step-22.png`). The hand cross and the antidoron do not read, and several people stand in the pews. |
| P1-4 Readings and homily | partly fixed | Doors are open. The Epistle reader, the deacon with the Gospel, and the homily priest are at the ambon with a seated or standing nave (`pass5-step-08.png`, `pass5-step-09.png`, `pass5-step-10.png`). Candles beside the Gospel are not a clear part of the picture, and the reader’s feet float. |
| P1-5 Free look and the dome tour | partly fixed | E opened the St. Nicholas note (`pass5-free-press-e.png`). The tour opened Exaltation of the Cross, the Deesis, the Dormition, and Christ Pantocrator. The last stop is in the nave looking up; the frame reads as a cross more than the Pantocrator face (`pass5-tour-4.png`). The eye sticks against the priest at arm’s length. |
| P2-2 Pointer lock and head bob | fixed | Head bob starts off (`aria-pressed` false). This walk recorded no page errors and no pointer-lock exceptions. |
| P2-3 Legend and step 3 | partly fixed | Step 3 is closer, with the royal doors and curtain open, the priest at the altar, and a server with a candle (`pass5-step-03.png`). The priest is still small and his feet do not meet the floor. The priest’s cloth reads burgundy and gold and the deacon’s reads cream and gold, which matches the cast key’s intent. |
| P2-4 THREE.Clock | fixed | Console warnings: none. Page errors: none. Failed network requests: none. |

### Verified pass 5 — doors, curtain, and camera

This column scores the door state and the camera subject. Floating and clipping are scored once, under People.

| Step | Verified pass 5 | What this walk showed |
| --- | --- | --- |
| 1 Gathering | fixed | Narthex and nave, people, lamps, shut screen in the distance. `pass5-step-01.png` |
| 2 Proskomedia | fixed | Inside at the north table. Diskos, chalice, and prosphora are on the table. Doors and curtain stay shut. `pass5-step-02.png` |
| 3 Blessed is the kingdom | fixed | Royal doors and curtain open. Priest at the altar, server with a candle. `pass5-step-03.png` |
| 4 Litany of Peace | fixed | Deacon on the solea in front of open doors. `pass5-step-04.png` |
| 5 Antiphons | partly fixed | The kliros is the subject and the iconostas is in front of the nave. Singers face away from the nave and hang above the loft. `pass5-step-05.png` |
| 6 Little Entrance | partly fixed | North door open. Deacon with the Gospel in the doorway. His body clips the frame. No candles before the book. `pass5-step-06-later.png` |
| 7 Trisagion | fixed | Nave facing the altar through open doors. The sign of the cross is not a readable gesture. `pass5-step-07.png` |
| 8 Epistle | fixed | Reader at the ambon with a book, doors open, people sitting. `pass5-step-08.png` |
| 9 Gospel | partly fixed | Deacon at the ambon facing the people, doors open. Candles attending the book are not obvious. `pass5-step-09.png` |
| 10 Homily | fixed | Priest at the ambon facing a seated nave. `pass5-step-10.png` |
| 11 Litanies before the gifts | partly fixed | Deacon on the solea, doors open, nave behind him. No one is shown leaving toward the narthex. `pass5-step-11.png` |
| 12 Cherubic Hymn | fixed | Inside at the prothesis: priest, deacon, censer, gifts. Open doors in the background. `pass5-step-12.png` |
| 13 Great Entrance | partly fixed | North door open. Deacon and priest with chalice and diskos still in the doorway. Bodies clip the frame. No candles. `pass5-step-13-later.png` |
| 14 Creed | fixed | Nave standing toward open royal doors. `pass5-step-14.png` |
| 15 Anaphora | fixed | Inside beside the holy table. Priest, diskos, and chalice. `pass5-step-15.png` |
| 16 Epiklesis | fixed | Nave kneeling. Gifts visible through open doors. `pass5-step-16.png` |
| 17 Theotokos | fixed | Altar in front, Theotokos and the apse icons behind. `pass5-step-17.png` |
| 18 Our Father | fixed | People in the nave facing the altar. `pass5-step-18.png` |
| 19 Holy Things | fixed | Elevation with the doors open, then doors and curtain shut. `pass5-holy-open.png`, `pass5-holy-shut.png` |
| 20 Communion | partly fixed | Open doors, a line, and a child. The chalice is not readable. `pass5-step-20.png` |
| 21 Thanksgiving | partly fixed | Priest in the open doorway, north door open. The blessing and the vessels returning to the prothesis are not a clear second picture. `pass5-step-21.png` |
| 22 Dismissal | partly fixed | People move toward the ambon and the narthex. The hand cross and the antidoron are not readable. `pass5-step-22.png` |

### New issues

- **Build break (P0, regressed).** `npm run build` → `TS2307` on `node:fs/promises` in `vite.config.ts`. `tsconfig.json` includes that file and the project has no Node types. The Dockerfile runs `npm run build`, so a Cloud Run image of this branch does not build. `main` typechecked.
- **Medium quality drops the anaphora camera (P1).** After switching to Medium, the frame is an empty stretch of nave with the doors closed. High and Low stay on the holy table. `pass5-quality-anaphora-medium.png`.
- **Hairless heads inside the new cast (folded into People).** Several women in the pews have a smooth scalp. The priest’s beard and kamilavka do read. `pass5-people-nave-close.png`.

## Fixed in pass 6

This section is the pass 6 response. The **Verified pass 5** tables above are unchanged.

`npm run build` is `tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json && vite build`. The app project no longer typechecks `vite.config.ts`. That file is checked by `tsconfig.node.json` with `"types": ["node"]` and a `/// <reference types="node" />` directive, so `node:fs/promises` resolves. `@types/node` was already a devDependency. A clean `npm run build` and `npm test` (18 tests) passed on this branch. `docker` is not installed in this environment, so the image was not built here. The Dockerfile still runs `npm run build`.

People stand on the shoe soles, not the foot bone. The walk cycle was leaving the shoes about 11 cm above a planted ankle. Sitting and kneeling soles meet the floor as well. Standing, bowing, and kneeling spots are in the aisle east of each pew. The communion and dismissal queues are two files in the center aisle, on the solea and then the nave floor, at least a meter apart and clear of the priest. A measured pass put standing soles within about 2 cm of the floor and the closest congregation pair at 1 m or more. Kneeling soles were within about 5 cm.

Both entrances use the widened north opening (about 1.9 m). Two candle-bearers lead, then the deacon, then the priest. The march begins with the line already coming out onto the solea, and the camera sits behind the priest in the nave. A slow frame cannot skip the rest of the path.

Communion draws a chalice and spoon in front of the priest, between him and the line. The dismissal draws a hand cross at the ambon, in front of the priest, where the queue can see it.

The anaphora camera and the door state do not read the quality setting. Medium, High, and Low use the same sanctuary pose. One post-processing pass stays mounted at Medium and High so swapping quality does not rebuild the camera. Door leaves and the curtain take their open pose before the first paint.

| Item | Fixed in pass 6 |
| --- | --- |
| Build (`npm run build` / Docker tsc) | Fixed. Node types apply to `vite.config.ts` only. The app `tsc` and the config `tsc` both pass, then Vite builds. |
| People float and clip | Fixed. Soles are planted on the floor of the nave, solea, sanctuary, and kliros. Standing spots are between the pews. Queues do not overlap the priest or each other. |
| Entrances clip the north door | Fixed. The opening is wider, the path goes through it, candles lead, and the Great Entrance camera follows the line out on the solea. |
| Communion chalice and dismissal cross | Fixed. A chalice with a spoon, and a hand cross, are placed where the step’s camera is already looking. |
| Medium anaphora | Fixed. Medium uses the same sanctuary camera and open royal doors as High and Low. |

Medium frames from this pass: gathering, Great Entrance, anaphora, Communion, and dismissal.

## Fixed in pass 7

This section is the pass 7 response. The **Verified pass 6** findings above are unchanged.

The faithful are the suit, casual, and hoodie bodies only, recolored to muted Sunday cloth. Work helmets, hi-vis vests, crowns, and costume pieces are not placed. Women wear a headscarf and a skirt. Children and teenagers stand in the pew row, because their legs do not reach the floor from the seat. Adults and elders sit: the thigh sits at seat height and the shoe sole is on the floor. The choir stands on the kliros except when the congregation bows or kneels.

Soles are the skinned shoe vertices, measured after the pose. Each foot raycasts the floor mesh under it, starting just above the shoe, so the kliros slab over the south pews is not treated as the nave floor. The sanctuary step reads as 0.42, the solea as 0.2, the nave marble as 0.02, the runner as 0.06, and the kliros as 3.23. A measured gathering put every sole within 3 cm of that surface.

The north deacon opening is 2.4 m. The leaf swings clear of the path. The Great Entrance camera stays on the solea, west of the iconostas, instead of sitting in the doorway. Kneelers stay in the pew row and shift off the center aisle so they do not cover the royal doors. Holy Things holds the elevation with the royal doors and curtain open, then shuts both after 1.8 s of wall-clock time. A closed door snaps shut on the next frame.

| Item | Fixed in pass 7 |
| --- | --- |
| Church clothes | Fixed. No hard hats, vests, helmets, or costume pieces. Men in suits, shirts, and sweaters; women in dresses or skirts with headscarves; elders and children included. Muted colors. |
| Floating feet | Fixed. Soles raycast the rendered floor after the pose. Seated adults rest on the pew with shoes on the marble. Shorter people stand in the row. The priest stands on the sanctuary step. The choir stands on the kliros. |
| Deacon door and Great Entrance camera | Fixed. Wider north opening, and the follow camera stays on the solea. |
| Epiklesis kneeler | Fixed. Kneelers stay in the pew row, shifted off the center aisle, clear of the iconostas. |
| Holy Things close | Fixed. Doors and curtain stay open for the elevation, then shut at 1.8 s and stay shut. |

---

Tested as a first-time user on current `main` (`61757d1`, “MakeHuman people, candlelit nave, and clergy framing”). No app code was changed. The sections below are that first walk. They are unchanged on purpose.

**Verdict:** the lesson text is careful, and Next / Previous / Home / End really do walk all 22 steps. The picture does not. For the proskomedia, the Cherubic Hymn, the Creed, the anaphora, the epiklesis, and “Holy Things,” the camera sits on the iconostas. The royal doors and the red curtain are shut, or only cracked, so the altar, the gifts, and the priest’s prayer are not what you see. The congregation is one bald man and one bald woman in tube clothes, repeated down the pews. On a phone the controls cover the church. I would not show this build to a parish as a finished walkthrough.

## Developer's claim — “Fixed in pass 5”

The paragraph just above is the first-walk verdict from `main`. This column and the table below were added by the pass 5 developer. They are the claim. The independent result is the **Verified pass 5** section at the top. `public/` is about 14 MB.

| Item | Fixed in pass 5 |
| --- | --- |
| 1 Sanctuary visibility (P0-1) | Fixed. Proskomedia, Cherubic Hymn, Creed, anaphora, epiklesis, and Holy Things no longer look at a shut screen. Royal doors, deacon doors, and the curtain each have a state, and the leaves are animated. |
| 2 Deacon doors (P0-2) | Fixed. The screen has real openings. The north leaf opens for the entrances and at the thanksgiving. The procession does not walk through a solid icon panel. Collision follows the open leaf. The south door stays shut. |
| 3 People (P0-3) | Fixed. Eleven CC0 Quaternius characters replace the two bald meshes: hair, different faces, skin tones, heights, and fitted clothes (hoodie, suit, dress, work clothes, head covering). The priest has a bell phelonion, epitrachelion, a beard on the chin, and a kamilavka on the head. The deacon has a sticharion, orarion, and cuffs. Children are the shorter meshes from that pack (it has no separate child body), with a slightly larger head. Sit and kneel are posed, not a bind pose. |
| 4 Wrong subject (P1-1) | Fixed. Gathering is the narthex. Antiphons are the kliros. Trisagion and the Our Father are the people. |
| 5 Holy Things (top 5) | Fixed. One step, two beats: the gifts are lifted with the doors open, then the doors and curtain close while the clergy receive. |
| 6 Epiklesis kneel (P1-2) | Fixed. The nave and the reader kneel. The gifts stay visible. |
| 7 Entrances (top 7) | Fixed. The march starts at the door, and the camera sits behind the carrier. |
| 8 Phone (P1-6) | Fixed. At 390×844 the church is the first screen. Joystick, hint, and cast key do not overlap. The touch hint does not say WASD. |
| 9 Low quality (P1-7) | Fixed. Low anaphora stays a readable warm interior. Icons are lit. The repeated wall-saint field is gone. Medium and Low draw fewer skeletons. High adds contact-style ambient occlusion, a little bloom, and window shafts. |
| 10 First-run UI (P2-1) | Fixed. The “what you see” line is always visible, the disclosure starts open on step 1, and the key hint follows Follow versus Free look. |
| P1-3 Communion and dismissal | Fixed. A line of adults and a child at the open doors, then people coming to the hand cross and moving toward the narthex. |
| P1-4 Readings and homily | Fixed. Doors open. The camera is in on the ambon. |
| P1-5 Free look and the dome tour | Fixed. Shut deacon doors are solid. People keep the eye back. The Pantocrator tour stop is pulled down into the nave. |
| P2-2 Pointer lock and head bob | Fixed. The lock promise is caught (a canvas click no longer throws). Head bob starts off, and stays off for a coarse pointer, a narrow screen, or reduced motion. |
| P2-3 Legend and step 3 | Fixed. Cast colors match the vestments (priest burgundy, deacon cream). Step 3 is closer on the open doors. |
| P2-4 THREE.Clock | Fixed. The dev console and a production load no longer construct `THREE.Clock`. |


## How this was tested

- `npm ci && npm run build && npx vite preview` on `http://127.0.0.1:4173/`
- Playwright, headed Chromium, WebGL 2 via ANGLE SwiftShader (`Vulkan 1.3.0 (SwiftShader Device)`). Canvas about 1160×815.
- Follow liturgy: Next through all 22 steps, then Previous back through all 22. Home, End, and the arrow keys in Follow liturgy.
- Free look: WASD, E and a click on an icon, Icon tour, Head bob, a long walk forward and back.
- High, Medium, and Low pinned on the anaphora.
- Phone layout at 390×844.
- Live site: `https://lojo-byzantine-liturgy-viz-mxso6rumia-uc.a.run.app`

Frame rate below is SwiftShader on this machine, not a gaming GPU. It is still useful: High, Medium, and Low were all a slideshow here, and Low was only a little faster.

Screenshots live in `qa/screenshots/`.

## Fix these first

1. **Anaphora, epiklesis, Cherubic Hymn, Creed, proskomedia** — you are looking at a shut iconostas, not the holy table or the prothesis. `step-15.png`, `step-16.png`, `step-12.png`, `step-14.png`, `step-02.png`
2. **One door flag for the whole church.** Royal doors, both deacon doors, and the curtain should each open and close with the rite. Deacon doors never open; the procession walks through a painted archangel. `step-06-little-entrance-later.png`, `step-13-great-entrance-later.png`
3. **People at arm’s length.** Same two faces, bald heads, a ball for a beard, vestments that are a lathe tube, bodies in the screen and in each other. `people-priest-close.png`, `people-nave-close.png`
4. **Wrong subject on steps that are not at the altar.** Gathering never shows the narthex. The antiphons never show the kliros. The Our Father never shows the people singing. `step-01.png`, `step-05.png`, `step-18.png`
5. **“Holy Things for the holy.”** The elevation of the gifts is not readable, and there is no beat where the doors then close for the clergy’s Communion. `step-19.png`
6. **Epiklesis posture.** The text says many Ruthenian parishes kneel, including on Sunday. The nave stays on its feet in a bow, behind the shut doors. `step-16.png`
7. **Little Entrance and Great Entrance.** The camera loses the Gospel and the chalice in an empty stretch of nave. `step-06-little-entrance-later.png`, `step-13-great-entrance-later.png`
8. **Phone layout.** At 390×844 the title eats the first screen, and Free look stacks the quality bar, the mode buttons, the WASD hint, the joystick, and the cast key on top of the picture. `mobile-top.png`, `mobile-freelook.png`
9. **Low is a different, worse picture**, not a lighter version of the same one: the anaphora goes dark and flat. High was about 0.8 fps here, Medium about 1.5, Low about 1–4. `quality-anaphora-low.png`, `quality-anaphora-high.png`
10. **A new user cannot tell what the picture is for.** “What you see, hear, and why” is closed, the pager says arrow keys even while those keys walk, and the phone hint still says WASD. `ui-step-detail-open.png`, `mobile-freelook.png`

## What the doors and the camera should do

This is the ordo the pictures should teach. It follows the app’s own sentences and the usual Ruthenian serving of Chrysostom in the United States. Where a parish leaves the royal doors open for the whole public Liturgy, show them open. “The doors! The doors!” in the Creed is the church door, not an order to shut the holy doors.

Deacon doors (north and south) stay shut except when someone passes. The curtain is shut for the proskomedia, opens with the royal doors at “Blessed is the kingdom,” and may close again only while the clergy receive.

| Step | What I saw | Doors I expected | Camera I expected | Fixed in pass 5 |
| --- | --- | --- | --- | --- |
| 1 Gathering | Iconostas fills the frame. This is not arriving through the narthex. | Shut, curtain shut | Nave / narthex, people, lamps, screen in the distance | Fixed. Narthex and nave, people and lamps, shut screen in the distance. |
| 2 Proskomedia | Same kind of icon wall. The Lamb and the chalice are not the subject. | Shut, because the nave does not see this rite | Inside, at the north prothesis, with the priest and deacon | Fixed. Camera inside at the north prothesis. Doors and curtain stay shut. |
| 3 Blessed is the kingdom | The one sanctuary glimpse that works: a slot through the screen toward the altar. The priest is small. | Royal doors and curtain open | From the nave, priest at the altar, a candle beside him | Fixed. Royal doors and curtain open. Closer on the priest and a candle. |
| 4 Litany of Peace | Deacon’s back on the solea, doors shut in front of him | Still open from the blessing | Deacon clearly leading, in front of open doors | Fixed. Deacon on the solea in front of open doors. |
| 5 Antiphons | Icon wall again. No choir. | Open is fine | Singers at the kliros, iconostas in front of the nave, not instead of the singers | Fixed. Singers at the kliros, lit, iconostas not the subject. |
| 6 Little Entrance | Starts in the nave; a few seconds later the Gospel carrier is gone in a dark empty volume | North deacon door open, then royal doors open | Follow the Gospel book and the candles | Fixed. North deacon door opens. The follow camera stays on the Gospel. |
| 7 Trisagion | Another solea shot. I do not see the people cross themselves. | Open | Nave and kliros facing the altar | Fixed. Nave facing the altar through open doors. |
| 8 Epistle | Reader / ambon is closer to the right subject | The step says the royal doors are often open. They do not read as open. | Reader with the Apostle, people sitting | Fixed. Reader at the ambon, doors open, people sitting. |
| 9 Gospel | Ambon from the nave. Better aim than the altar steps. | Open, deacon facing the people, candles | That, large enough to read | Fixed. Deacon facing the people, doors open. |
| 10 Homily | Preacher at the ambon. Usable aim. | Either, as long as the preacher is the subject | Priest facing a seated nave | Fixed. Priest at the ambon facing a seated nave. |
| 11 Litanies before the gifts | Deacon on the solea again | As the litany | Solea, and a hint of the narthex if catechumens are sent out | Fixed. Solea, with the nave behind. |
| 12 Cherubic Hymn | Bright screen, not incense at the table of preparation | Open for the censing | Inside: priest, censer, gifts still on the prothesis | Fixed. Inside at the prothesis: priest, deacon, censer, gifts. |
| 13 Great Entrance | A shape in the nave, not a chalice coming back through open royal doors | North door open, royal doors open | Follow the vessels onto the altar | Fixed. North door open. The camera follows the vessels. |
| 14 Creed | Icon wall. People crossing themselves are not the picture. | The step says often open | Nave standing, facing the altar | Fixed. Nave standing toward the altar. Royal doors stay open. |
| 15 Anaphora | Shut (or fully blocking) royal doors and curtain. No holy table. | Open, or a camera already inside | Priest at the altar, gifts visible, people facing east | Fixed. Inside, beside the holy table. Priest, diskos, and chalice. |
| 16 Epiklesis | Same shut screen. Nobody is kneeling. | Open enough to see the gifts | Altar, deacon indicating the gifts, nave kneeling | Fixed. Nave kneeling. Gifts visible through open doors. |
| 17 Theotokos | The iconostas is all you get. The priest naming the saints at the altar is missing. | Open, or inside plus a readable Theotokos icon | Both the altar and her icon | Fixed. Altar in the foreground and the Platytera in the apse. |
| 18 Our Father | Solea again, not the assembly singing | Open | People, and the priest inviting from the altar | Fixed. The people in front, the priest at the altar beyond them. |
| 19 Holy Things | A dark slot through the screen. The lifting of the gifts is not a picture, and the doors never then close for the clergy. | Open for the elevation, then shut (curtain too) while the clergy commune | Those two beats | Fixed. Gifts raised with the doors open, then doors and curtain shut. |
| 20 Communion | Nave is busy. A real communion line with the chalice at open doors does not read. | Open | Solea, chalice, adults and children coming up | Fixed. Open doors, chalice, adults and a child on the solea. |
| 21 Thanksgiving | Another dark slot. The blessing from the doors is not obvious. | Open, priest in the doorway | That, then the vessels leaving for the prothesis | Fixed. Royal doors and the north door open. Priest at the doorway. |
| 22 Dismissal | Ambon area. Nobody comes up for the cross or antidoron. | Either | Priest with the hand cross, people venerating, then the narthex | Fixed. Priest with the hand cross. People come up, then move toward the narthex. |

## P0 — broken or embarrassing

### P0-1. Shut screen instead of the altar

- **Where:** steps 2, 12, 14, 15, 16, and the sanctuary half of 17 and 19.
- **Saw:** the iconostas, royal doors, and red curtain own the frame. On the anaphora and the epiklesis the feast tier and the royal-door icons sit across the picture. The diskos, the chalice, and the priest’s hands are not what a learner sees. Step 19 is a narrow dark opening, not the elevation.
- **Should be:** if the sentence says the priest is at the holy table or the prothesis, the camera is in there with him, or the royal doors and curtain are open and the lens looks through them. Step 19 should show the gifts lifted, then a second beat with the doors shut while the clergy commune.
- **Shots:** `step-15.png`, `step-16.png`, `step-02.png`, `step-12.png`, `step-14.png`, `step-19.png`
- **Fix:** give royal doors, north door, south door, and curtain their own state per step. Aim the anaphora / epiklesis / cherubic / proskomedia cameras east of the iconostas, or from the solea through doors that are actually open. Check it with a screenshot of each of those steps, not only a camera coordinate.

### P0-2. Deacon doors are a painting

- **Where:** steps 6 and 13, and any walk through the north or south door.
- **Saw:** the archangel panels stay a solid icon. The entrance camera wanders into empty nave and drops the Gospel and the gifts. In Free look the collision gap at the deacon doors is open even when the picture is a closed panel, so you walk through the icon.
- **Should be:** the north door opens, candles and the deacon come out, the nave sees the Gospel or the chalice, and they go back in through open royal doors. The south door stays shut unless someone uses it.
- **Shots:** `step-06.png`, `step-06-little-entrance-later.png`, `step-13.png`, `step-13-great-entrance-later.png`, `free-toward-doors.png`
- **Fix:** real leaves on both deacon doors, driven by the route. Keep the follow-camera locked on the vessel or the book, including the moment they pass the door.

### P0-3. The people do not survive a close look

- **Where:** pews, kliros, sanctuary, and any Free look approach.
- **Saw:** one male mesh and one female mesh (`man.glb`, `woman.glb`) cloned down the benches. Faces repeat. Heads read as bald: the woman file has no hair node, and the man’s hair material sits on a retopologized sphere. Clergy beards are a sphere stuck on the head and they float off the chin. Vestments and coats are lathe tubes parented at the pelvis, so arms and legs pierce them and the hem is a cone. Children are the adult mesh at 0.58 scale. Walking into the clergy put the camera inside a flat colored plane instead of a person. Bodies intersect the iconostas, each other, and the pews. Idle is one stiff clip; only the procession walks.
- **Should be:** a small cast of distinct faces, hair, and beards that belong to the head; vestments that follow the body (phelonion, sticharion, orarion, epitrachelion); children who are children; sit poses whose hips meet the pew; nobody embedded in a wall.
- **Shots:** `people-priest-close.png`, `people-priest-side.png`, `people-nave-close.png`, `step-20.png`
- **Fix:** stop dressing a skeleton with primitive solids. Use a few CC0 bodies that already have hair, and cloth that is skinned or at least sized to the torso and arms. Vary skin, hair, and vestment color. Seat the sit clip to the pew height. Keep the camera from entering a mesh.

## P1 — important

### P1-1. Several steps look at the wrong place

- **Where:** 1 Gathering, 5 Antiphons, 7 Trisagion, 18 Our Father.
- **Saw:** gathering and the antiphons are the icon wall. Trisagion and the Our Father are the deacon’s back on the solea. The kliros, the sign of the cross, and the Lord’s Prayer are in the text only.
- **Should be:** see the table at the top of this report.
- **Shots:** `step-01.png`, `step-05.png`, `step-07.png`, `step-18.png`
- **Fix:** one reviewed camera per step, aimed at the noun in the first sentence of “What the faithful see.”

### P1-2. Epiklesis does not kneel

- **Where:** step 16.
- **Saw:** the screen, and a bow at most. The step says many Ruthenian parishes kneel for this prayer, including on Sunday, then stand again.
- **Should be:** nave and reader kneeling or deeply bowed, deacon indicating the gifts, gifts visible.
- **Shot:** `step-16.png`
- **Fix:** a kneel pose for this step only, and the altar camera from P0-1.

### P1-3. Communion and the dismissal skip the people’s movement

- **Where:** steps 20 and 22.
- **Saw:** a crowded nave. Communion does not read as open royal doors, a chalice, and parents bringing children. Dismissal does not show anyone venerating the cross or receiving antidoron. The queue count for communion is a handful of clones; dismissal moves nobody forward.
- **Should be:** doors open, a line on the solea, children included; later the priest with the hand cross and people coming up, then turning toward the narthex.
- **Shots:** `step-20.png`, `step-22.png`
- **Fix:** stage those two processions the way the entrances are staged, with the doors open.

### P1-4. Readings and the homily are the best aim, and still incomplete

- **Where:** steps 8, 9, 10.
- **Saw:** the ambon is actually in frame, which is more than the anaphora manages. The royal doors do not look open for the Epistle or the Gospel, the way the Epistle sentence asks. Candles beside the Gospel are not a clear part of the picture. The homily’s seated nave is the same repeated crowd.
- **Should be:** doors open for both readings; Gospel book and candles obvious; homily from the ambon toward people who are sitting.
- **Shots:** `step-08.png`, `step-09.png`, `step-10.png`
- **Fix:** open the doors on these three steps and push the camera in until the book or the preacher fills more of the frame.

### P1-5. Free look clips the building and the tour clips the dome

- **Where:** Free look, Icon tour stop 4 (Pantocrator).
- **Saw:** WASD does move. E and a click both opened the St. Nicholas note, with the right title and sentence, so the icon raycast works. The tour reached Exaltation of the Cross, the Deesis, the Dormition, and the Pantocrator, and each opened its note. The dome stop puts you inside the medallion. Walking into the clergy or the screen ends inside a flat surface. Deacon-door icons can be walked through.
- **Should be:** a tour stop stands in the nave and looks at the icon. Collision matches the picture: shut doors are solid, open doors can be walked. The eye never enters a mesh.
- **Shots:** `free-press-e.png`, `tour-1.png`, `tour-4.png`, `free-toward-doors.png`, `people-priest-close.png`
- **Fix:** pull tour poses back along the view direction until the icon’s near face is outside the camera. Close the deacon-door collision unless that leaf is open. Keep a skin radius so the eye stops short of people and walls.

### P1-6. Phone layout covers the church

- **Where:** 390×844, Follow liturgy and Free look.
- **Saw:** the first screen is the title, About, and the step header. The church is below the fold (`mobile-top.png`, `mobile-church.png`). In Free look, measured boxes overlap: quality bar at y≈361, mode buttons at y≈431 (330px wide), joystick at y≈668 (104px), WASD hint at y≈691 (86px tall), cast key at y≈778 across almost the full width. The hint still says “walk with WASD or the arrow keys” on a touch screen. The joystick does move you (`mobile-after-joystick.png`). The step list is a long second scroll (`mobile-step-list.png`).
- **Should be:** the church is the first thing on a phone. One thumb cluster for look and move. The hint matches the joystick. Cast colors sit in a corner that does not cover the solea.
- **Shots:** `mobile-top.png`, `mobile-freelook.png`, `mobile-after-joystick.png`
- **Fix:** stack the church above the essay on narrow screens, and move the hint and the cast key out of the joystick’s box.

### P1-7. Picture quality does not degrade gracefully

- **Where:** High / Medium / Low on the anaphora and the gathering.
- **Saw:** SwiftShader, ~1160×815. High samples were about 0.84 fps. Medium about 1.5–1.7. Low swung between about 1.3 and 3.7. Auto had already been pinned off. Low is not a simpler version of the same shot: the anaphora becomes a dark brown field and the icons lose their color. Icons are unlit JPEGs (many of the icon files are 70–170KB; some frescoes are under 30KB) on large planes, so they look like stickers in a candlelit room. Wall saints repeat. I did not catch a stable z-fight I would swear to.
- **Should be:** Low is the same framing, dimmer and cheaper, still readable. High is where materials, hair, and a little contact shadow show up.
- **Shots:** `quality-anaphora-high.png`, `quality-anaphora-medium.png`, `quality-anaphora-low.png`, `quality-gathering-high.png`, `quality-gathering-low.png`
- **What would move this toward a polished real-time look, in order:**
  1. Light the icons with the scene (they are currently unlit), and use sharper, larger sources on the royal doors and the dome.
  2. Replace tube people before adding more post-processing. They break the picture at every quality.
  3. One interior lighting story: warm lamps, a readable altar, shadow under the pews, fog that does not wash the iconostas into one brown.
  4. Cut skeleton count on Medium and Low (impostors or a smaller crowd) so quality is a frame-rate choice, not a different photograph.
  5. Stop tiling the same saint across empty wall. A plain plaster field is better than a repeated icon.

## P2 — polish

### P2-1. First-run UI hides the lesson and lies about the keys

- **Where:** top bar, pager, Free look hint.
- **Saw:** the useful paragraph is inside a closed “What you see, hear, and why” disclosure. About is also closed, which is fine, but then the picture has no caption. The pager always says “Arrow keys, Home, End.” In Free look those arrows walk, and Home / End still jump steps. I confirmed Home lands on step 22’s opposite (step 1), End on step 22, Right arrow on step 2, Left arrow back to step 1, while Follow liturgy was on. Previous is disabled on step 1 and Next on step 22. Going Previous from 22 back to 1, every title matched.
- **Should be:** the “see / hear / why” text is open on the first step, or a one-line caption is always visible. The key hint changes with the mode.
- **Shots:** `ui-step-detail-open.png`, `ui-about-open.png`
- **Fix:** open the details for step 1, and set the hint from the mode.

### P2-2. Head bob and pointer lock

- **Where:** Free look.
- **Saw:** Head bob starts on. The button toggles (`aria-pressed` went from true to false). At about 1 fps the bob is a hitch, not a sway, so I would not call it motion-sick so much as stuttery. Every canvas click in this session threw an uncaught `WrongDocumentError: The root document of this element is not valid for pointer lock` (six times). Dragging still looked around, because the handler sets the drag flag before requesting the lock. A normal browser may lock the pointer; the error should not be uncaught either way.
- **Should be:** bob off until the walk is smooth, and off when the user asks for reduced motion. `requestPointerLock` failures are ignored.
- **Shot:** `free-walk-forward.png`
- **Fix:** catch the lock promise. Default the bob to off on a phone and whenever reduced motion is set.

### P2-3. Labels, cast key, and the opening shot

- **Where:** overlay and step 3.
- **Saw:** Labels toggle off and the names disappear (`ui-labels-off.png`). The cast swatches (priest burgundy, deacon green, reader gray, choir brown, faithful blue) do not match the tube clothes, so the legend teaches colors the models don’t wear. Step 3 is the best altar view and the priest is still a small figure in a slot.
- **Should be:** legend colors match vestments. Step 3 is framed on the blessing.
- **Shots:** `ui-labels-off.png`, `step-03.png`
- **Fix:** after the doors open, dolly in. Paint the legend from the same colors as the vestments.

### P2-4. Three.js warning

- **Where:** console, every load including the live site and the phone run.
- **Saw:** `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` No failed network requests. No HTTP errors.
- **Should be:** a quiet console.
- **Shot:** none (console only).
- **Fix:** stop constructing the deprecated clock, or upgrade the call site in drei / postprocessing that still does.

## Text accuracy

The paraphrase is in good shape. It says it is not the official text, it explains a missing deacon, and it explains “The doors! The doors!” as the church door. I would not rewrite the sentences. I would make the pictures obey them, especially “Royal Doors are opened,” “often open,” “may then close,” and “The Royal Doors open” at Communion.

## Live site vs this main

The live site loaded and ran the same 22 titles in the same order. WebGL came up. Its CSS file is the same hash as this build (`index-f_WMJW6I.css`). Its JS is not byte-identical (`index-C_4wKtu0.js` on the server, `index-CyDT4FHl.js` from this `main` build, about 6KB smaller). Every English sentence I could extract matches. Step 3’s screenshot matches this build almost pixel for pixel (under 1% of pixels differ). Other steps differ because idle motion and the follow-camera do not stop on the same frame, not because the live rite is a different lesson. I did not find a behavior on the live site that this `main` lacks.

Shots: `live-step-03.png`, `live-step-15.png`.

## Console and network

| Source | Result |
| --- | --- | --- | --- | --- |
| Local, phone, live | One warning: deprecated `THREE.Clock` |
| Local canvas clicks | Six uncaught `WrongDocumentError` from pointer lock |
| Failed or HTTP 4xx/5xx requests | None |
| WebGL | WebGL 2, SwiftShader, on both local and live |

## What already works

- All 22 steps, Next and Previous, with the right titles, and the end buttons disabling correctly.
- Home, End, and arrows while Follow liturgy is on.
- The teaching copy, the role chips, and the place chips.
- Icon notes: E and click both opened St. Nicholas with a sensible sentence. The tour visited four frescoes and opened each note.
- Labels and Head bob toggle.
- The joystick appears on a narrow touch viewport and it moves.
- Step 3 is the pattern the other sanctuary steps should follow: you can see through the screen at all.
