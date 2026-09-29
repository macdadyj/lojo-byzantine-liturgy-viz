# Assets and credits

Every asset shown on the site is free to use on a public website. Nothing was bought.

## Third-party assets shown in the scene

All of these are listed file by file, with source and license, in [ATTRIBUTION.md](ATTRIBUTION.md):

| What | Where | License |
| --- | --- | --- |
| Iconostas icons, dome Pantocrator, apse Platytera | `public/icons/` | Public domain or CC0 (Wikimedia Commons) |
| Wall frescoes, evangelists, drum and west-wall images | `public/fresco/` | Public domain (Wikimedia Commons) |
| Fonts: Newsreader, Public Sans | `@fontsource/*` packages | SIL Open Font License 1.1 |

The `cursor/lab-and-sael-quality-2e14` branch adds no downloaded images, models, textures, or sounds, and it
removes the Quaternius character models (CC0) that earlier versions used for the people.

## Made in this project (no outside source)

These are drawn or modeled in code at runtime, so they need no attribution:

- Surfaces in `src/scene/materials/paint.ts` and `src/scene/surfaces.ts`: the opus sectile floor and
  its roughness map, wall plaster with dado and meander frieze, lapis star vault, column marble,
  carved iconostas panel with its gilt vine, oak grain for the pews, gilt, and the smoke, beam, and
  contact-shadow sprites.
- People in `src/scene/figures/`: every congregant, reader, server, deacon, and priest is built at
  runtime from spheres, capsules, cylinders, and boxes (three.js geometry, MIT), posed by our own
  small rig (`rig.ts`), and drawn as one instanced mesh per look with a shader that swings the limbs
  for walking and for the sign of the cross. The vestments (Greek-cut phelonion, sticharion,
  epitrachelion, epimanikia, orarion) and headscarves are shaped in the same code.
- Technique reference: the approach (merged primitive figures, per-vertex joint tags, instanced
  palettes, limb swing in the vertex shader) follows what Ryan Sael's scenes on https://sael.net/ do,
  as written up in `docs/REFERENCE_NOTES.md`. None of his code, art, or assets are copied.
- Architecture: the church shell, arcade and arches, dome and drum, pews, iconostas frame and
  colonnettes, altar, and furnishings.
- Lighting: clerestory sunlight mask, light shafts, and incense haze.

## Development tools (not shipped to visitors)

Used only by the test lab scripts in `scripts/`:

| Package | License |
| --- | --- |
| playwright | Apache-2.0 |
| pixelmatch | ISC |
| pngjs | MIT |
| jpeg-js | BSD-3-Clause |
