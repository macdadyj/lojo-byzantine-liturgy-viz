# Reference notes: the sael.net quality bar

Studied on 2026-09-29 in headless Chromium (software WebGL, SwiftShader) at 1440×900 and 390×844:
Token Town, Inside an AI Data Center, Model Museum, Set the Mood, The AI Office, and dat.city.
Screenshots were taken for study only and are not committed (they are someone else's work).

## What makes those scenes feel polished

1. **One art direction, held everywhere.** Every scene commits to a stylized, simplified look
   (voxel people in Token Town, rounded low-poly props in the Data Center, clean neoclassical
   blocks in Model Museum). Nothing is photoreal, and nothing breaks the style. Detail comes
   from *many* simple, well-proportioned props, not from a few expensive ones.
2. **Light does most of the work.** A clear warm key light, soft contact shadows under every
   object, a cooler fill, and practical lights (windows, lamps, screens) that visibly glow and
   spill onto nearby surfaces. Night scenes (Token Town) read because the windows and street
   lamps are the brightest things in frame.
3. **Tasteful post-processing.** ACES-like tone mapping with no clipped whites, gentle bloom only
   on true emitters, ambient occlusion in corners, a light vignette, and strong depth of field /
   tilt-shift that pushes the background out of focus so the subject reads as a diorama.
4. **Atmosphere.** Haze and height fog give depth (Token Town's street recedes into blur;
   Model Museum's dome glows through haze). Shafts of light are soft and low-opacity.
5. **Crowds that look alive.** Dozens to hundreds of figures, each with a different color,
   height, pose, and idle phase. People face the thing they are there for (queues face the shop
   door). Nobody floats, clips, or stands in a wall.
6. **Camera.** A composed default view (three-quarter, slightly above, subject centered).
   Orbit and zoom are damped and clamped, so the camera can never end up inside geometry or
   under the floor. Transitions between chapters ease rather than cut.
7. **On-screen explanation.** Dark translucent "glass" panels with one headline, one short
   paragraph, and big numbers. Chapters are a numbered pill bar (1 / 14, Research → Management).
   Labels in the scene are small pills anchored to objects.
8. **Performance.** Pages load fast (Token Town, AI Office, dat.city under 1 s to `load` on our
   link; Model Museum ~20 s on a software GPU). Two pages rendered at 0.75× device pixel ratio
   in our software-GPU run: they scale resolution adaptively instead of dropping frames.
   Phone layouts keep the scene full-bleed and move the panel to a bottom sheet.

## Checklist we hold this walkthrough to

Each item is checked in the lab (`/lab`) and the screenshot run (`npm run shots`).

### Art direction
- [ ] One coherent look: warm candlelit Byzantine interior, stylized but proportioned; no
      untextured primitives in the foreground; gold, deep red, lapis, ochre plaster palette.
- [ ] No large flat single-color surfaces in frame: walls, floors, vaults, pews all carry
      pattern, trim, or light variation.

### Lighting and post
- [ ] A readable key: daylight through the drum and south windows, warm candles and lampadas as
      practicals that are the brightest points in frame.
- [ ] Soft shadows under pews, people, furniture (shadow map on High/Medium, contact shadows or
      baked AO on Low).
- [ ] Tone mapping without clipped whites; bloom only on flames, windows, and gold highlights.
- [ ] Ambient occlusion in corners on High; vignette always subtle.
- [ ] Incense haze and light shafts at low opacity; never a white wall of fog.

### Richness
- [ ] Iconostas with carved/gilt frame, tiers, royal doors with icons, deacon doors.
- [ ] Altar with antimension/Gospel/cross/candles, table of preparation, tetrapod, candle stands.
- [ ] Vault and dome painted (Pantocrator, Platytera), frescoes on walls, not bare plaster.

### People
- [ ] Proportions: head about 1/7.5 of height; adult heights vary ±6%.
- [ ] Variety: at least 6 skin tones, 6 hair colors, 8 clothing colors; men, women, elders,
      children; women with head coverings.
- [ ] Clergy unmistakable (vestment silhouettes and colors), faithful in Sunday clothes.
- [ ] Feet on the floor (sole gap under 2 cm, checked by `measureSoles`), nobody clipping pews.
- [ ] Idle phases differ; people face east (or toward the procession) and pose for the step
      (stand, sit, bow, kneel, sign of the cross).

### Camera and interaction
- [ ] Every step has a composed bookmark that frames its subject; no camera inside geometry.
- [ ] Transitions ease; free-look pitch is clamped so the eye cannot drop under the pews.
- [ ] Step panel explains what happens in plain words; labels are small pills.

### Performance
- [ ] Medium quality holds ≥ 30 fps on a mid-range laptop; Low holds ≥ 30 fps on a phone.
- [ ] First view within the load budget (see `docs/TEST_LAB.md`), JS bundle within budget.
- [ ] Adaptive quality: Auto steps down before the frame rate collapses.
