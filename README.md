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
- Arrow keys move one step. Home and End jump to the beginning and the end. They keep doing that while you look around the church.
- **Follow liturgy** moves the camera with the step. **Free look** lets you orbit, pan, and zoom without changing the step. Drag to orbit, right-drag or two-finger drag to pan, scroll or pinch to zoom.
- Gold light on the floor marks the places for the current step. Click a floor, or its name under the view, to read what that place is.
- During the Little Entrance the deacon carries the Gospel book out the north deacon door, through the nave, and back through the Royal Doors. During the Great Entrance the deacon leads and the priest follows with the gifts from the table of preparation to the altar. A path on the floor shows the route.

A suggested first path is in [DEMO.md](DEMO.md).

## What the steps cover

Gathering and the proskomedia, the opening blessing, the Litany of Peace, the antiphons, the Little Entrance, the Trisagion, the Epistle, the Gospel, the homily, the litanies before the gifts, the Cherubic Hymn, the Great Entrance, the Symbol of Faith, the anaphora, the epiklesis, the commemoration of the Theotokos and the saints, the Our Father, “Holy Things for the holy,” Holy Communion, the thanksgiving, and the dismissal with antidoron.

Roles are marked for priest, deacon, people, choir, and reader. Where no deacon is serving, the priest says the deacon’s parts. The priest wears a phelonion and the deacon a sticharion with an orarion, drawn simply so the movement stays clear.

## Icons

The iconostas paintings are original drawings made for this app, in the traditional Byzantine manner: gold ground, halo, and a short English title. They are not copies of a parish’s icons and they are not scraped from printed or photographed icons. No third-party image files are used.

As you face the iconostas, St. Nicholas and the Theotokos stand north of the Royal Doors, and Christ Pantocrator and St. John the Forerunner stand south of them. The Royal Doors show the Annunciation: Gabriel on the north leaf and the Theotokos on the south leaf. The Mystical Supper is above the doors.
