# QA punch list — Divine Liturgy walkthrough

Tested as a first-time user on current `main` (`61757d1`, “MakeHuman people, candlelit nave, and clergy framing”). No app code was changed.

**Verdict:** the lesson text is careful, and Next / Previous / Home / End really do walk all 22 steps. The picture does not. For the proskomedia, the Cherubic Hymn, the Creed, the anaphora, the epiklesis, and “Holy Things,” the camera sits on the iconostas. The royal doors and the red curtain are shut, or only cracked, so the altar, the gifts, and the priest’s prayer are not what you see. The congregation is one bald man and one bald woman in tube clothes, repeated down the pews. On a phone the controls cover the church. I would not show this build to a parish as a finished walkthrough.

## Fixed in pass 5

The findings above are unchanged. This column and the table below were added after pass 5. `public/` is about 14 MB.

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
