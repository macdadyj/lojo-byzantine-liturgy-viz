export const spaceList = [
  {
    id: "narthex",
    label: "Narthex",
    blurb:
      "The entrance of the church. The faithful arrive through the narthex and leave this way after the dismissal.",
  },
  {
    id: "nave",
    label: "Nave",
    blurb:
      "The main body of the church, where the faithful stand or sit, facing the iconostas.",
  },
  {
    id: "kliros",
    label: "Kliros",
    blurb:
      "The choir’s place, usually a stand at the side of the nave or solea. Some churches have a kliros on each side.",
  },
  {
    id: "solea",
    label: "Solea and ambon",
    blurb:
      "The solea is the raised floor in front of the iconostas. The ambon is its center, where the Gospel is proclaimed and the homily is often given.",
  },
  {
    id: "iconostas",
    label: "Iconostas",
    blurb:
      "The icon screen between the nave and the sanctuary. As you face it, the Theotokos is at the left of the Royal Doors and Christ is at the right. The Forerunner and the parish patron stand beside them; parishes arrange those two differently.",
  },
  {
    id: "royal-doors",
    label: "Royal Doors",
    blurb:
      "The Royal Doors, also called the Holy Doors, stand at the center of the iconostas. The Gospel and the holy gifts return through them into the sanctuary.",
  },
  {
    id: "deacon-door",
    label: "Deacon doors",
    blurb:
      "The side doors of the iconostas. The north door, on the left as you face the altar, is the usual way the Gospel and the gifts come out into the nave.",
  },
  {
    id: "sanctuary",
    label: "Sanctuary",
    blurb:
      "The holy place behind the iconostas. The clergy enter it through the doors. It holds the altar and the table of preparation.",
  },
  {
    id: "altar",
    label: "Altar",
    blurb:
      "The holy table at the east of the sanctuary. The Gospel book rests here, and the gifts are offered here in the anaphora.",
  },
  {
    id: "prothesis",
    label: "Table of preparation",
    blurb:
      "The prothesis, usually on the north side of the sanctuary. The proskomedia — the preparation of the bread and wine — is served here.",
  },
] as const;

export type Space = (typeof spaceList)[number];
export type SpaceId = Space["id"];

export function spaceById(id: SpaceId): Space {
  const space = spaceList.find((item) => item.id === id);
  if (!space) {
    throw new Error(`Unknown space: ${id}`);
  }
  return space;
}
