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
- During **Follow liturgy**, arrow keys move one step. Home and End jump to the beginning and the end in either mode.
- **Free look** is a first-person walk. Click the church, then use WASD or the arrow keys and the mouse (pointer lock). On a phone, use the joystick and drag to look. Head bob can be turned off. Press E, or click an icon, for its name and a short note. **Icon tour** walks that view to a few frescoes. **Follow liturgy** is unchanged: the camera moves with the step. Arrow keys change the step only while Follow liturgy is on. Home and End still jump to the first and last step.
- Picture quality is High, Medium, Low, or Auto. Auto starts at Medium and steps down if the frame rate stays low. High adds ambient occlusion and a stronger bloom. Low skips post-processing so the church can run on an integrated GPU.
- **Labels** shows or hides the place names in the church. They stay small, fade back, and disappear when they are behind you or too close to cover an icon.
- Gold light on the floor marks the places for the current step. Click a floor, or its name under the view, to read what that place is.
- During the Little Entrance the deacon carries the Gospel book out the north deacon door, through the nave, and back through the Royal Doors. During the Great Entrance the deacon leads and the priest follows with the gifts from the table of preparation to the altar. A path on the floor shows the route.

A suggested first path is in [DEMO.md](DEMO.md).

## What the steps cover

Gathering and the proskomedia, the opening blessing, the Litany of Peace, the antiphons, the Little Entrance, the Trisagion, the Epistle, the Gospel, the homily, the litanies before the gifts, the Cherubic Hymn, the Great Entrance, the Symbol of Faith, the anaphora, the epiklesis, the commemoration of the Theotokos and the saints, the Our Father, “Holy Things for the holy,” Holy Communion, the thanksgiving, and the dismissal with antidoron.

Roles are marked for priest, deacon, people, choir, and reader. Where no deacon is serving, the priest says the deacon’s parts. The priest wears a brocaded phelonion, an epitrachelion, cuffs, a pectoral cross, and a kamilavka. The deacon wears a brocade sticharion and an orarion, and swings a censer during the censing. Altar servers wear sticharia. A cantor stands at the kliros with the choir. The faithful include children, teens, adults, and elders, and they cross themselves at the Trisagion, the Creed, and the epiklesis. Clergy and faithful are CC0 humanoid meshes (see [ATTRIBUTION.md](ATTRIBUTION.md)); the crowd reuses those two meshes at different ages and scales. Processions play the walk clip. Everyone else holds an idle or sitting pose. The notes for each step stay collapsed until you open them, and the top bar sits above the church so the step list remains visible.

## Icons

The iconostas, walls, pendentives, drum, and apse use historical icons and frescoes from Wikimedia Commons. Every file is public domain or CC0, stored as a modest JPEG or WebP, with source and license in [ATTRIBUTION.md](ATTRIBUTION.md). They are not photographs of a modern parish and they are not contemporary copyrighted prints. Click an icon in Free look to read which feast or saint it is.

As you face the iconostas, St. Nicholas and the Theotokos of Vladimir stand north of the Royal Doors, and the Sinai Christ Pantocrator and St. John the Forerunner stand south of them. The Royal Doors divide the Ustyug Annunciation: Gabriel on the north leaf and the Theotokos on the south leaf. The Mystical Supper is above the doors. Deacon doors carry the archangels. A Deesis and feast tier (Nativity, Rublev’s Trinity, Transfiguration) sit higher. The dome medallion is the Daphni Pantocrator. The apse shows the Hagia Sophia Virgin and Child.
