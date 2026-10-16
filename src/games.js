// Catalog of textbook games in the Arcade of Alexandria.
// Add a game here when its separate repo is live; leave href null until then.
// Machines and the librarian's search both read from this list.

export const GAMES = [
  {
    id: 'algebraic_topology',
    title: 'Algebraic Topology',
    subject: 'Mathematics',
    blurb: 'Homotopy, fundamental groups, and covering spaces — a playable tour of the classic textbook. The game is being built in a sister repo; the cabinet is here waiting.',
    authors: 'Source: Algebraic Topology (textbook in books/)',
    href: null, // set to the game URL when ready, e.g. 'https://zlisto.github.io/algebraic-topology-game/'
    status: 'coming_soon',
  },
]

export function gameById(id) {
  return GAMES.find((g) => g.id === id) ?? null
}

export function searchGames(q) {
  const s = q.trim().toLowerCase()
  if (!s) return GAMES
  return GAMES.filter(
    (g) =>
      g.title.toLowerCase().includes(s) ||
      g.subject.toLowerCase().includes(s) ||
      g.blurb.toLowerCase().includes(s) ||
      (g.authors ?? '').toLowerCase().includes(s),
  )
}
