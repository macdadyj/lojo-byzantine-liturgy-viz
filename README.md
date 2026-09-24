# Divine Liturgy walkthrough

A static teaching app for the Divine Liturgy of St. John Chrysostom as served in the Ruthenian Byzantine Catholic Church in the United States.

The church plan highlights where each part of the Liturgy happens. Each step says what the faithful see, what they hear, and why it matters. Wording is a catechetical paraphrase, with a few short traditional responses. It is not the official liturgical text.

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

`npm run build` writes a relative-path bundle (`base: "./"`) into `dist/`.

## Using the walkthrough

- Choose any step in the list, or use **Previous** and **Next**.
- Arrow keys move one step. Home and End jump to the beginning and the end.
- Gold rooms on the plan are the places for the current step. A dotted line marks the Little Entrance and the Great Entrance.
- Click a room, or its name under the plan, to read what that place is.

A suggested first path is in [DEMO.md](DEMO.md).

## What the steps cover

Gathering and the proskomedia, the opening blessing, the Litany of Peace, the antiphons, the Little Entrance, the Trisagion, the Epistle, the Gospel, the homily, the litanies before the gifts, the Cherubic Hymn, the Great Entrance, the Symbol of Faith, the anaphora, the epiklesis, the commemoration of the Theotokos and the saints, the Our Father, “Holy Things for the holy,” Holy Communion, the thanksgiving, and the dismissal with antidoron.

Roles are marked for priest, deacon, people, choir, and reader. Where no deacon is serving, the priest says the deacon’s parts.
