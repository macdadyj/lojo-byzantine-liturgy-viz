import type { LiturgyStep } from "./types";

export const steps: LiturgyStep[] = [
  {
    id: "gathering",
    phase: "gathering",
    title: "Gathering in the church",
    spaces: ["narthex", "nave", "iconostas"],
    roles: ["people"],
    see: "You come through the narthex into the nave. Lamps burn before the iconostas. Many Ruthenian churches in the United States have pews. People arrive quietly, venerate icons, and take their places. The sanctuary is already still.",
    hear: [
      {
        kind: "note",
        text: "Before the opening blessing the church is often quiet. You may hear the Hours read, or only the room itself.",
      },
    ],
    why: "The Divine Liturgy joins the Church’s prayer to the worship of heaven. Arriving a little early lets attention settle before the first blessing.",
  },
  {
    id: "proskomedia",
    phase: "gathering",
    title: "Proskomedia",
    spaces: ["prothesis", "sanctuary"],
    roles: ["priest", "deacon"],
    see: "This rite is usually finished before the public start, at the table of preparation on the north side of the sanctuary. The faithful in the nave do not see it. The priest prepares leavened bread, called prosphora, and a chalice of wine with a little water. He sets aside the Lamb, and smaller particles for the Theotokos, the saints, the living, and the dead. A deacon assists when one is serving.",
    hear: [
      {
        kind: "note",
        text: "Any words are brief blessings between the deacon and the priest at the prothesis. The nave hears little or nothing.",
      },
    ],
    why: "Proskomedia means offering. The gifts, and the names of the living and the dead, are prepared before the Church begins the public Liturgy.",
  },
  {
    id: "opening",
    phase: "word",
    title: "Blessed is the kingdom",
    spaces: ["sanctuary", "altar", "nave", "royal-doors"],
    roles: ["deacon", "priest", "people"],
    see: "All stand. The priest is at the altar. The Royal Doors are opened for the beginning. A server may hold a candle beside him.",
    hear: [
      {
        kind: "speech",
        who: "deacon",
        text: "A request that the priest give the blessing.",
      },
      {
        kind: "speech",
        who: "priest",
        text: "Blessed is the kingdom of the Father, and of the Son, and of the Holy Spirit…",
      },
      { kind: "speech", who: "people", text: "Amen." },
    ],
    why: "The first words name whose the gathering is. The Liturgy begins by blessing the kingdom of the Holy Trinity.",
  },
  {
    id: "litany-of-peace",
    phase: "word",
    title: "Litany of Peace",
    spaces: ["solea", "nave", "kliros"],
    roles: ["deacon", "people", "choir", "priest"],
    see: "The deacon stands on the solea before the Royal Doors and leads the prayer. Where no deacon serves, the priest says these petitions. The faithful stand.",
    hear: [
      {
        kind: "note",
        text: "The petitions ask peace from above, peace for the world, and peace for the Church. They pray for the bishops, the nation, this parish, travelers, and those in any need.",
      },
      { kind: "speech", who: "people", text: "Lord, have mercy." },
      {
        kind: "speech",
        who: "people",
        text: "To you, O Lord.",
      },
    ],
    why: "The Liturgy opens by praying for the whole world. “Lord, have mercy” is the people’s own work in these petitions, answered again and again.",
  },
  {
    id: "antiphons",
    phase: "word",
    title: "The antiphons",
    spaces: ["kliros", "nave"],
    roles: ["choir", "people"],
    see: "The singers at the kliros carry the psalms. On many Sundays the faithful sit for this singing and stand again as the entrance draws near. The iconostas remains in front of them.",
    hear: [
      {
        kind: "note",
        text: "Psalm verses alternate with short refrains. One refrain asks salvation through the prayers of the Theotokos. Another addresses Christ as Son of God. Between the antiphons, a small litany returns to “Lord, have mercy.”",
      },
      {
        kind: "speech",
        who: "choir",
        text: "The hymn “Only-begotten Son,” praising Christ as one of the Holy Trinity, who became man for our salvation.",
      },
      {
        kind: "note",
        text: "The third antiphon, often the Beatitudes on a Sunday, is already the moment of the Little Entrance.",
      },
    ],
    why: "The antiphons sing Scripture before the day’s appointed readings are proclaimed. They already confess who Christ is.",
  },
  {
    id: "little-entrance",
    phase: "word",
    title: "Little Entrance",
    spaces: ["sanctuary", "deacon-door", "nave", "solea", "royal-doors"],
    roles: ["deacon", "priest", "people", "choir"],
    route: "little-entrance",
    see: "During the third antiphon the deacon, or the priest, carries the holy Gospel out through the north deacon door, across the nave, and up to the Royal Doors. Candles go before the book. The Gospel is held so the faithful can see it. The clergy then enter the sanctuary, and the choir sings the troparia and kontakia of the day and of the parish.",
    hear: [
      {
        kind: "speech",
        who: "deacon",
        text: "Wisdom! Stand aright!",
      },
      {
        kind: "note",
        text: "An entrance verse is sung as the book is carried. After the clergy enter, the troparia and kontakia name the feast, the day, and often the parish’s patron.",
      },
    ],
    why: "Christ comes to teach. The Church honors the Gospel book as his presence in the word, before a sentence of the reading is proclaimed.",
  },
  {
    id: "trisagion",
    phase: "word",
    title: "Trisagion",
    spaces: ["kliros", "nave", "solea"],
    roles: ["choir", "people", "priest"],
    see: "After the troparia, the singers and the people face the altar. Many make the sign of the cross and bow.",
    hear: [
      {
        kind: "speech",
        who: "choir",
        text: "Holy God, Holy and Mighty, Holy and Immortal, have mercy on us.",
      },
      {
        kind: "note",
        text: "The hymn is sung three times, with “Glory to the Father, and to the Son, and to the Holy Spirit” before the last repetition. On some feasts another hymn takes its place, such as “All you who have been baptized into Christ.”",
      },
    ],
    why: "Trisagion means thrice-holy. The Church borrows the angels’ worship before she dares to hear the Apostle and the Gospel.",
  },
  {
    id: "epistle",
    phase: "word",
    title: "The Epistle",
    spaces: ["solea", "nave", "kliros"],
    roles: ["reader", "deacon", "priest", "people", "choir"],
    see: "A reader stands in the nave or at the ambon with the book of the Apostle. In churches with pews, many sit for this reading. They will stand before the Gospel. The Royal Doors are often open.",
    hear: [
      {
        kind: "speech",
        who: "deacon",
        text: "Let us be attentive.",
      },
      {
        kind: "note",
        text: "The prokeimenon, a psalm refrain proper to the day, is sung first. The reader then announces the Epistle, also called the Apostle, and reads it.",
      },
      {
        kind: "speech",
        who: "priest",
        text: "Peace be to you.",
      },
      {
        kind: "note",
        text: "The choir moves toward the Alleluia, which prepares the Gospel.",
      },
    ],
    why: "The Apostle is the apostolic Church still speaking. The letter is heard as addressed to this parish, as well as to its first recipients.",
  },
  {
    id: "gospel",
    phase: "word",
    title: "The Holy Gospel",
    spaces: ["solea", "nave", "sanctuary"],
    roles: ["deacon", "priest", "people", "choir"],
    see: "All stand. The deacon receives a blessing in the sanctuary, comes to the ambon with the Gospel book, and faces the people. Candles attend the reading. When it ends, the book is returned to the altar, and the priest may bless the faithful with it.",
    hear: [
      {
        kind: "note",
        text: "Alleluia, with its verses, is sung as the book is brought out.",
      },
      { kind: "speech", who: "priest", text: "Peace be to all." },
      { kind: "speech", who: "people", text: "And with your spirit." },
      {
        kind: "speech",
        who: "deacon",
        text: "Wisdom! Stand aright, and listen to the Holy Gospel.",
      },
      {
        kind: "speech",
        who: "people",
        text: "Glory to you, O Lord, glory to you.",
      },
      {
        kind: "note",
        text: "The deacon or the priest proclaims the Gospel appointed for the day. The same glory is sung again at the end.",
      },
    ],
    why: "The Gospel is the high point of the Liturgy of the Word. The faithful stand because the Lord is speaking.",
  },
  {
    id: "homily",
    phase: "word",
    title: "The homily",
    spaces: ["solea", "nave"],
    roles: ["priest", "people"],
    see: "The priest, or sometimes the deacon, speaks from the ambon or the solea. The Gospel book may remain near. In many parishes the faithful sit.",
    hear: [
      {
        kind: "note",
        text: "The homily is the preacher’s own teaching on the Gospel, the Epistle, or the feast, usually in English in Ruthenian parishes in the United States. It has no fixed text.",
      },
    ],
    why: "The homily is catechesis inside the Liturgy, so the word just heard can be received with understanding.",
  },
  {
    id: "before-the-gifts",
    phase: "word",
    title: "Litanies before the gifts",
    spaces: ["solea", "nave", "narthex"],
    roles: ["deacon", "people", "priest"],
    see: "The deacon returns to the solea. The prayers grow shorter and more urgent. Where catechumens are present, they are prayed for and then sent toward the narthex before the gifts are offered. Many parishes keep a brief form of this litany when everyone in the church is already baptized.",
    hear: [
      {
        kind: "note",
        text: "A fervent litany prays for the parish, the sick, and those who have asked prayers.",
      },
      {
        kind: "speech",
        who: "people",
        text: "Lord, have mercy.",
      },
      {
        kind: "note",
        text: "Often the response is sung three times. A litany for catechumens may follow, and then their dismissal, before the Liturgy of the Faithful.",
      },
    ],
    why: "These litanies remember that the offering ahead is the prayer of the baptized, and that the Church still names the living who are in need.",
  },
  {
    id: "cherubic",
    phase: "faithful",
    title: "Cherubic Hymn",
    spaces: ["kliros", "sanctuary", "nave", "prothesis"],
    roles: ["choir", "priest", "people"],
    see: "The faithful stand. The choir sings slowly. In the sanctuary the priest prays, and incense is offered. The bread and wine are still at the table of preparation.",
    hear: [
      {
        kind: "speech",
        who: "choir",
        text: "A slow hymn, asking the faithful to set aside every earthly care and to welcome the King of all, as the cherubim worship.",
      },
      {
        kind: "note",
        text: "The hymn pauses while the gifts are carried in the Great Entrance. The choir finishes it afterward.",
      },
    ],
    why: "The Cherubic Hymn tells the meaning of the procession that follows. The gifts will be carried as Christ going to his voluntary passion, and the faithful are asked to be present to that.",
  },
  {
    id: "great-entrance",
    phase: "faithful",
    title: "Great Entrance",
    spaces: ["prothesis", "deacon-door", "nave", "solea", "royal-doors", "altar"],
    roles: ["priest", "deacon", "people", "choir"],
    route: "great-entrance",
    see: "The clergy carry the chalice and the diskos — the vessels prepared at the proskomedia — out the north deacon door, through the nave, and back through the Royal Doors to the altar. Candles and incense lead. The faithful often bow as the gifts pass. The vessels are set on the holy table.",
    hear: [
      {
        kind: "speech",
        who: "priest",
        text: "May the Lord God remember in his kingdom the bishop, the clergy, and all you faithful.",
      },
      { kind: "speech", who: "people", text: "Amen." },
      {
        kind: "note",
        text: "Many parishes take up the same commemoration and ask God to remember them. The choir then completes the Cherubic Hymn. A litany prays over the gifts now resting on the altar.",
      },
      { kind: "speech", who: "people", text: "Grant this, O Lord." },
    ],
    why: "This is the public offering of what was prepared in quiet. Bread, wine, and the Church named in the commemorations are placed on the altar for the thanksgiving.",
  },
  {
    id: "creed",
    phase: "faithful",
    title: "The Symbol of Faith",
    spaces: ["nave", "kliros", "solea"],
    roles: ["deacon", "people", "choir", "priest"],
    see: "All stand, facing the altar. The deacon calls the church to one mind. The Royal Doors are often open.",
    hear: [
      {
        kind: "speech",
        who: "deacon",
        text: "Let us love one another, so that with one mind we may confess the faith.",
      },
      {
        kind: "note",
        text: "The clergy exchange the kiss of peace in the sanctuary. The people stand in that same peace, often with a bow.",
      },
      { kind: "speech", who: "deacon", text: "The doors! The doors!" },
      {
        kind: "note",
        text: "The cry remembers a time when the doors were watched so that the baptized alone remained. Then: Wisdom! Let us be attentive!",
      },
      {
        kind: "speech",
        who: "people",
        text: "The Nicene-Constantinopolitan Creed: one God the Father; one Lord, Jesus Christ, true God of true God, who became man; the Holy Spirit, the Lord and giver of life; one holy, catholic, and apostolic Church; one baptism; and the life of the world to come.",
      },
    ],
    why: "The Church says the faith together before she gives thanks. The Symbol of Faith is the assembly recognizing herself in the mystery she is about to celebrate.",
  },
  {
    id: "anaphora",
    phase: "faithful",
    title: "The anaphora begins",
    spaces: ["altar", "sanctuary", "nave", "kliros"],
    roles: ["deacon", "priest", "people", "choir"],
    see: "The priest stands at the altar. The people stand with him, facing east. Servers may hold candles. This prayer is the anaphora, the lifting-up, the Church’s great thanksgiving.",
    hear: [
      {
        kind: "speech",
        who: "deacon",
        text: "Stand with awe and attention, to offer the holy oblation in peace.",
      },
      {
        kind: "speech",
        who: "people",
        text: "A mercy of peace, a sacrifice of praise.",
      },
      {
        kind: "speech",
        who: "priest",
        text: "The grace of the Lord, the love of the Father, and the communion of the Holy Spirit.",
      },
      { kind: "speech", who: "people", text: "And with your spirit." },
      { kind: "speech", who: "priest", text: "Let us lift up our hearts." },
      { kind: "speech", who: "people", text: "We lift them up to the Lord." },
      { kind: "speech", who: "priest", text: "Let us give thanks to the Lord." },
      { kind: "speech", who: "people", text: "It is proper and just." },
      {
        kind: "speech",
        who: "choir",
        text: "Holy, holy, holy — the hymn of the angels, sung by the people with them.",
      },
    ],
    why: "Thanksgiving is the center of the Divine Liturgy. The short answers are the faithful lifting the prayer with the priest.",
  },
  {
    id: "epiklesis",
    phase: "faithful",
    title: "The epiklesis",
    spaces: ["altar", "sanctuary", "nave"],
    roles: ["priest", "deacon", "people"],
    see: "The priest continues at the holy table. In many Ruthenian parishes the faithful kneel for this part of the prayer, including on Sunday, and rise again as the prayer moves on. The deacon may bow and indicate the gifts.",
    hear: [
      {
        kind: "note",
        text: "The priest remembers Christ’s saving work and the mystical supper. The words he prays are the Church’s anaphora, heard from him at the altar.",
      },
      {
        kind: "speech",
        who: "people",
        text: "A hymn that we praise, bless, and thank the Lord, and pray to him, our God.",
      },
      {
        kind: "note",
        text: "The priest then calls upon the Holy Spirit to come upon the people and upon the gifts. The people answer Amen.",
      },
    ],
    why: "Epiklesis means a calling-upon. The Church asks the Holy Spirit to come upon the assembly and the gifts. Byzantine Catholics believe that by the power of the Holy Spirit the bread and wine become the Body and Blood of Christ.",
  },
  {
    id: "theotokos",
    phase: "faithful",
    title: "Theotokos and the saints",
    spaces: ["altar", "kliros", "nave", "iconostas"],
    roles: ["priest", "choir", "people"],
    see: "The priest commemorates names at the altar. The choir sings. The icons of the Theotokos and the saints are the company of this moment, looking out from the iconostas.",
    hear: [
      {
        kind: "speech",
        who: "choir",
        text: "On most days, the hymn to the Theotokos that begins “It is truly proper.” A great feast appoints another hymn in its place.",
      },
      {
        kind: "note",
        text: "The litany that follows remembers the saints and asks a day of peace for the Church and the world.",
      },
      { kind: "speech", who: "people", text: "Lord, have mercy." },
      { kind: "speech", who: "people", text: "Grant this, O Lord." },
    ],
    why: "The Eucharist is the prayer of a whole communion. The Theotokos, the saints, the living, and the dead are named inside the same thanksgiving.",
  },
  {
    id: "our-father",
    phase: "faithful",
    title: "The Our Father",
    spaces: ["nave", "kliros", "sanctuary", "altar"],
    roles: ["priest", "people", "choir", "deacon"],
    see: "All stand. The priest invites the prayer from the altar. The people sing it together.",
    hear: [
      {
        kind: "speech",
        who: "priest",
        text: "An invitation to dare, with confidence, to call God Father and to pray.",
      },
      {
        kind: "speech",
        who: "people",
        text: "The Lord’s Prayer, beginning “Our Father.”",
      },
      {
        kind: "speech",
        who: "priest",
        text: "The doxology: the kingdom, the power, and the glory are God’s.",
      },
      { kind: "speech", who: "people", text: "Amen." },
      { kind: "speech", who: "priest", text: "Peace be to all." },
      { kind: "speech", who: "people", text: "And with your spirit." },
      { kind: "speech", who: "deacon", text: "Bow your heads to the Lord." },
      { kind: "speech", who: "people", text: "To you, O Lord." },
    ],
    why: "The Son has given his own prayer to the Church. The faithful pray it together immediately before they approach his table.",
  },
  {
    id: "holy-things",
    phase: "faithful",
    title: "Holy Things for the holy",
    spaces: ["altar", "sanctuary", "royal-doors", "kliros"],
    roles: ["deacon", "priest", "people", "choir"],
    see: "The priest lifts the holy gifts at the altar. The Royal Doors may then close while the clergy receive Communion in the sanctuary. The faithful remain in the nave in prayer. A candle often stands before the doors.",
    hear: [
      { kind: "speech", who: "deacon", text: "Let us be attentive." },
      { kind: "speech", who: "priest", text: "Holy Things for the holy." },
      {
        kind: "speech",
        who: "people",
        text: "One is holy, one is Lord, Jesus Christ, to the glory of God the Father. Amen.",
      },
      {
        kind: "note",
        text: "While the clergy commune at the altar, the choir sings the communion verse of the day. The faithful may pray quietly in preparation.",
      },
    ],
    why: "The invitation is both warning and welcome. Holiness belongs to Christ. The faithful approach as his holy people, guests of his gift.",
  },
  {
    id: "communion",
    phase: "faithful",
    title: "Holy Communion",
    spaces: ["royal-doors", "solea", "nave"],
    roles: ["priest", "deacon", "people", "choir"],
    see: "The Royal Doors open. Those who are prepared come forward along the solea, receive the Holy Mysteries, and return to their places in prayer. Parents bring baptized children, which is the ordinary Byzantine practice. Those who are not receiving remain in the nave.",
    hear: [
      {
        kind: "speech",
        who: "priest",
        text: "Approach with the fear of God and with faith.",
      },
      {
        kind: "speech",
        who: "people",
        text: "A welcome to the One who comes in the name of the Lord. Each communicant answers Amen.",
      },
      {
        kind: "note",
        text: "The choir continues a communion hymn. The church stays prayerful.",
      },
    ],
    why: "Holy Communion is the purpose of the gifts prepared at the proskomedia and offered at the Great Entrance. The faithful receive the Body and Blood of Christ for the forgiveness of sins and for life everlasting.",
  },
  {
    id: "thanksgiving",
    phase: "sending",
    title: "Thanksgiving",
    spaces: ["altar", "royal-doors", "nave", "kliros"],
    roles: ["priest", "choir", "people", "deacon"],
    see: "The priest blesses the people from the Royal Doors. The holy vessels are then taken to the table of preparation. The faithful stand. The church is quieter than it was at the entrance.",
    hear: [
      {
        kind: "speech",
        who: "priest",
        text: "Save your people, O God, and bless your inheritance.",
      },
      {
        kind: "speech",
        who: "choir",
        text: "A thanksgiving that we have seen the true Light, received the heavenly Spirit, and found the true faith.",
      },
      {
        kind: "speech",
        who: "choir",
        text: "Blessed be the name of the Lord, now and forever.",
      },
    ],
    why: "Communion does not end at the solea. The Church thanks God before anyone turns toward the door.",
  },
  {
    id: "dismissal",
    phase: "sending",
    title: "Dismissal and antidoron",
    spaces: ["solea", "nave", "narthex"],
    roles: ["priest", "people", "choir"],
    see: "The priest prays from the ambon, then often stands at the solea with the hand cross. The faithful come forward, venerate the cross, and receive antidoron — blessed bread from the prosphora of the proskomedia. Antidoron is a sign of the blessing shared with the whole assembly. The Holy Eucharist was received at Communion. The people leave through the narthex.",
    hear: [
      {
        kind: "speech",
        who: "priest",
        text: "A prayer from the ambon, then the dismissal: may Christ our true God have mercy on us, through the prayers of the Theotokos and of all the saints.",
      },
      {
        kind: "note",
        text: "On Sundays the dismissal remembers that Christ is risen.",
      },
      { kind: "speech", who: "people", text: "Amen." },
      {
        kind: "speech",
        who: "choir",
        text: "Many years may be sung for the bishop and the parish.",
      },
    ],
    why: "Antidoron means “instead of the gift.” It extends a blessing of the table to everyone present, including those who did not receive Communion. The Liturgy sends the Church out under the mercy of Christ.",
  },
];

export function stepsUsing(spaceId: LiturgyStep["spaces"][number]): LiturgyStep[] {
  return steps.filter((step) => step.spaces.includes(spaceId));
}
