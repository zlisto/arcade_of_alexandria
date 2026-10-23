// Fixed lines for Callimachus the librarian (no AI).
// A fact with `gameId` shows a Play button for that game under the answer.

export const GREETING = (v) =>
  `Welcome${v ? `, ${v}` : ''} to the **Arcade of Alexandria**. I am **Callimachus**, keeper of the catalogs. Here, college textbooks become video games — **Legend of Valence** (Organic Chemistry) is ready to play, with Biology, Literature, Calculus, and more. Search the catalog below, or walk to a cabinet and press **E**.`

export const FACTS = [
  {
    q: 'What is this place?',
    a: `The **Arcade of Alexandria** turns textbooks into playable games. A book is read, its ideas mapped, and a game is built so you do the concepts — not just quiz yourself on vocabulary.

It lives on the Metaverse Web: walk in through a portal, talk to me, play a cabinet, then walk out to Metaverse Square.`,
  },
  {
    q: 'What courses are here?',
    a: `Cabinets for common college courses: **Biology**, **Organic Chemistry**, **Literature**, **Calculus**, **Microeconomics**, **Physics**, **Computer Science**, and **Algebraic Topology**.

Two are playable now: **Winding World** (Algebraic Topology) and **Legend of Valence** (Organic Chemistry).

The rest stay "coming soon" until their game repos go live.`,
  },
  {
    q: 'Tell me about Legend of Valence',
    gameId: 'organic_chemistry',
    a: `**The Legend of Valence** is our Organic Chemistry game, built from John E. McMurry's **Organic Chemistry** (OpenStax, 10th edition).

The sorcerer Malradix has shattered the Crown of Tetravalence. You play a young carbon knight who must master the laws of bonding in twelve dungeons, one per chapter, to rebuild it. The chemistry is the gameplay: octets, formal charge, resonance and mechanisms are the rules you play by.

Walk to the orange **LEGEND OF VALENCE** cabinet and press **E**, or play it right here.`,
  },
  {
    q: 'How do the games work?',
    a: `Each game is its own site, linked from a cabinet here. Aim at a machine and **click** or press **E** to play.

Games are built in separate repos. When a new one is ready, add its \`href\` in \`src/games.js\` — the hall picks it up automatically.`,
  },
  {
    q: 'Who are you?',
    a: `**Callimachus** — named for the scholar who catalogued the ancient Library of Alexandria. I keep the list of games, answer questions, and point you to the right cabinet.

No oracle, no live model: my answers are prepared, like scrolls on the shelf.`,
  },
  {
    q: 'How do I add a game?',
    a: `Build the game in its own repository, host it, then add an entry to \`src/games.js\` here with a title, blurb, theme colors, and \`href\`. The cabinet and my search list pick it up automatically.

Authors of the source textbooks keep their attribution — every game must carry the book's metadata.`,
  },
]
