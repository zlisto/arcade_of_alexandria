// Fixed lines for Callimachus the librarian (no AI).
// A fact with `gameId` shows a Play button for that game under the answer.
// Keep this list short (about 3): the ask buttons share the panel with the chat.

export const GREETING = (v) =>
  `Welcome${v ? `, ${v}` : ''} to the **Arcade of Alexandria**. I am **Callimachus**, keeper of the catalogs. Here, textbooks become video games. Pick a game above, or walk to a glowing cabinet and press **E**.`

export const FACTS = [
  {
    q: 'What is this place?',
    a: `The **Arcade of Alexandria** turns textbooks into playable games. A book is read, its ideas mapped, and a game is built so you do the concepts — not just quiz yourself on vocabulary.

It lives on the Metaverse Web: walk in through a portal, talk to me, play a cabinet, then walk out to Metaverse Square.`,
  },
  {
    q: 'Tell me about Winding World',
    gameId: 'algebraic_topology',
    a: `**Winding World** is our Algebraic Topology game, built from Allen Hatcher's **Algebraic Topology**.

Its islands stretch and its causeways bend, but what the world truly keeps is its holes. Count Null is collapsing them one province at a time. You play with homotopy, fundamental groups and covering spaces: deform paths, and learn which loops shrink and which can't.

Walk to the blue **WINDING WORLD** cabinet and press **E**, or play it right here.`,
  },
  {
    q: 'Tell me about Legend of Valence',
    gameId: 'organic_chemistry',
    a: `**The Legend of Valence** is our Organic Chemistry game, built from John E. McMurry's **Organic Chemistry** (OpenStax, 10th edition).

The sorcerer Malradix has shattered the Crown of Tetravalence. You play a young carbon knight who must master the laws of bonding in twelve dungeons, one per chapter, to rebuild it. The chemistry is the gameplay: octets, formal charge, resonance and mechanisms are the rules you play by.

Walk to the orange **LEGEND OF VALENCE** cabinet and press **E**, or play it right here.`,
  },
]
