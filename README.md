# Divine Liturgy walkthrough

A static teaching app for the Divine Liturgy of St. John Chrysostom as served in the Ruthenian Byzantine Catholic Church in the United States.

A stylized 3D church shows where each part of the Liturgy happens. Clergy and the faithful move with the service. Each step says what the faithful see, what they hear, and why it matters. Wording is a catechetical paraphrase, with a few short traditional responses. It is not the official liturgical text.

## Run

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

```bash
npm test
npm run build
npm run preview
```

For working on the 3D scene there is a test lab (`/lab`, `npm run shots`, `npm run shots:diff`, `npm run perf`, `npm run peek`, and `npm run phone` for iPhone loading); see [docs/TEST_LAB.md](docs/TEST_LAB.md). Visual passes and their before-and-after screenshots are in [docs/ITERATION_LOG.md](docs/ITERATION_LOG.md). Asset licenses are summarized in [CREDITS.md](CREDITS.md).

`npm run build` writes a relative-path bundle (`base: "./"`) into `dist/`. Those relative paths work at the Cloud Run root URL: the page loads `./assets/…`, which the browser requests as `/assets/…`.

## Cloud Run

The container is a static site: Node 20 builds `dist/`, then nginx serves it on port 8080. Cloud Run can scale the service to zero. The image has no API keys and no other secrets.

From a machine logged into project `montano-349204`:

```bash
gcloud run deploy lojo-byzantine-liturgy-viz --source . --project montano-349204 --region us-central1 --allow-unauthenticated --min-instances 0 --cpu 1 --memory 512Mi --port 8080
```

The same rollout is in `cloudbuild.yaml` (Artifact Registry repo `cloud-run`, then Cloud Run):

```bash
gcloud builds submit --config cloudbuild.yaml --project montano-349204
```

Service name `lojo-byzantine-liturgy-viz`, region `us-central1`, minimum instances 0, 1 vCPU, 512Mi. After merge, the Google Cloud Engineer runs the deploy. This repo does not hold credentials.

## Using the walkthrough

- Choose any step in the list, or use **Previous** and **Next**.
- During **Follow liturgy**, arrow keys move one step. Home and End jump to the beginning and the end in either mode.
- **Free look** is a first-person walk. Click the church, then use WASD or the arrow keys and the mouse (pointer lock). On a phone, use the joystick and drag to look. Head bob can be turned off. Press E, or click an icon, for its name and a short note. **Icon tour** walks that view to a few frescoes. **Follow liturgy** is unchanged: the camera moves with the step. Arrow keys change the step only while Follow liturgy is on. Home and End still jump to the first and last step.
- Picture quality is High, Medium, Low, or Auto. On a desktop Auto starts at Medium and steps down if the frame rate stays low. Phones, tablets, and software renderers start at Low and stay there unless you choose another level (under **View** on a phone). `?quality=high|medium|low` forces a level. High adds ambient occlusion and a light bloom. Low skips post-processing so the church can run on an integrated GPU. The nave is lit as a candlelit interior: lower exposure, veined marble, and small lampadas rather than a bright white room.
- **Labels** shows or hides the place names in the church. They stay small, fade back, and disappear when they are behind you or too close to cover an icon.
- Gold light on the floor marks the places for the current step. Click a floor, or its name under the view, to read what that place is.
- Both entrances leave the sanctuary by the north deacon door and come back in through the Royal Doors, candles first, then the deacon, then the priest. The Little Entrance carries the Gospel from the altar down off the solea, across the walkway in front of the people, around the tetrapod, and up to the Royal Doors. The Great Entrance carries the gifts from the prothesis down the north aisle among the people, across the back of the nave, up the center aisle, around the tetrapod, and in. Each stands still at the ambon ("Wisdom! Be attentive!", or the commemorations). A path with arrows on the floor shows the way; [docs/iterations/liturgy/route-plan.png](docs/iterations/liturgy/route-plan.png) draws both on a floor plan (`npm run route-plan`).
- A player under the church controls the procession for teaching: **Play/Pause**, speed **0.25×, 0.5×, 1×, 2×**, previous and next moment, and a bar to scrub. The current moment is named above it ("Out through the north deacon door"). On a phone it sits in the step sheet above Back and Next, with speed on one button. With reduced motion the procession starts paused at the ambon.
- The tetrapod with the festal icon stands east of the people, under the dome, so the processions walk between it and the first row. The reader stands on the north side between the people and that walkway.

- On a phone the church fills the screen and the step's words sit in a sheet over its bottom edge, with **Back** and **Next** under your thumb. Tap the step title to close the words to one row, or open them again. Drag the church to look around; **Next** turns the view back to the step. The top bar has **Steps** (every step, plus the page's sections) and **3D / Text**: Text is a plain scrolling page of the step, the places, and the outline.
- If the phone cannot run the 3D church (no WebGL2, or the GPU gives up), the page shows a picture of each step with its text and the icons instead, plus **Try again** and the error.
- Add `?debug=1` to the address to see the GPU, the quality level chosen and why, the frame rate, load times, and any errors, with a Copy button. That text is what to send when the page misbehaves on a device.

A suggested first path is in [DEMO.md](DEMO.md).

## What the steps cover

Gathering and the proskomedia, the opening blessing, the Litany of Peace, the antiphons, the Little Entrance, the Trisagion, the Epistle, the Gospel, the homily, the litanies before the gifts, the Cherubic Hymn, the Great Entrance, the Symbol of Faith, the anaphora, the epiklesis, the commemoration of the Theotokos and the saints, the Our Father, “Holy Things for the holy,” Holy Communion, the thanksgiving, and the dismissal with antidoron.

Roles are marked for priest, deacon, people, choir, and reader. Where no deacon is serving, the priest says the deacon’s parts. The priest wears a bell-shaped phelonion, an epitrachelion, a beard, and a kamilavka. The deacon wears a sticharion and an orarion, and swings a censer during the censing. A cantor stands at the kliros with the choir, beside a stand of books. The faithful are eleven CC0 modular characters (men, women, elders, and children) with their own hair and clothes; see [ATTRIBUTION.md](ATTRIBUTION.md). They sit in the pews, kneel at the epiklesis, and cross themselves at the Trisagion, the Creed, and the epiklesis. Processions play the walk clip. Royal doors, deacon doors, and the curtain each open and close with the step. The icon panel closes when the step or the view mode changes.

## Icons

The iconostas, walls, pendentives, drum, and apse use historical icons and frescoes from Wikimedia Commons. Every file is public domain or CC0, stored as a modest JPEG or WebP, with source and license in [ATTRIBUTION.md](ATTRIBUTION.md). They are not photographs of a modern parish and they are not contemporary copyrighted prints. Click an icon in Free look to read which feast or saint it is.

As you face the iconostas, St. Nicholas and the Theotokos of Vladimir stand north of the Royal Doors, and the Sinai Christ Pantocrator and St. John the Forerunner stand south of them. The Royal Doors divide the Ustyug Annunciation: Gabriel on the north leaf and the Theotokos on the south leaf. The Mystical Supper is above the doors. Deacon doors carry the archangels. A Deesis and feast tier (Nativity, Rublev’s Trinity, Transfiguration) sit higher. The dome medallion is the Daphni Pantocrator. The apse shows the Hagia Sophia Virgin and Child.
