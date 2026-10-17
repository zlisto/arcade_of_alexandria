// Catalog of textbook games in the Arcade of Alexandria.
// Add a game here when its separate repo is live; leave href null until then.
// Machines and the librarian's search both read from this list.
// `theme` drives cabinet colors / side-panel accents (not the pink UI chrome).

export const GAMES = [
  {
    id: 'algebraic_topology',
    title: 'Algebraic Topology',
    subject: 'Mathematics',
    blurb: 'Homotopy, fundamental groups, and covering spaces — play the ideas from the classic textbook.',
    authors: 'Source textbook in books/',
    href: null,
    status: 'coming_soon',
    theme: { primary: '#5b6ee1', secondary: '#2a2f55', accent: '#c9d4ff', wood: '#6b4a2a', label: 'TORUS' },
  },
  {
    id: 'biology',
    title: 'Biology',
    subject: 'Biology',
    blurb: 'Cells, genetics, and ecosystems as levels you move through — not a flashcard deck with a skin.',
    authors: 'Intro bio textbook (TBD)',
    href: null,
    status: 'coming_soon',
    theme: { primary: '#3d9e5a', secondary: '#1e3d28', accent: '#a8e6b5', wood: '#5a4028', label: 'CELL' },
  },
  {
    id: 'organic_chemistry',
    title: 'Organic Chemistry',
    subject: 'Chemistry',
    blurb: 'Build molecules, steer reactions, and read mechanisms by doing them in play.',
    authors: 'Orgo textbook (TBD)',
    href: null,
    status: 'coming_soon',
    theme: { primary: '#e07a2f', secondary: '#3d2414', accent: '#ffd0a8', wood: '#6b4a2a', label: 'ORGO' },
  },
  {
    id: 'literature',
    title: 'Literature',
    subject: 'Humanities',
    blurb: 'Walk inside the plot, argue with characters, and earn the themes instead of memorizing quotes.',
    authors: 'Survey anthology (TBD)',
    href: null,
    status: 'coming_soon',
    theme: { primary: '#8b5a2b', secondary: '#2a1c12', accent: '#f0e0c0', wood: '#7a5230', label: 'LIT' },
  },
  {
    id: 'calculus',
    title: 'Calculus',
    subject: 'Mathematics',
    blurb: 'Limits, derivatives, and integrals as tools you use to clear levels — rates, areas, and motion.',
    authors: 'Calc textbook (TBD)',
    href: null,
    status: 'coming_soon',
    theme: { primary: '#2f8fc9', secondary: '#16324a', accent: '#b8e0ff', wood: '#5a4028', label: 'CALC' },
  },
  {
    id: 'microeconomics',
    title: 'Microeconomics',
    subject: 'Economics',
    blurb: 'Markets, incentives, and trade-offs you feel by playing them — supply, demand, and scarcity.',
    authors: 'Principles text (TBD)',
    href: null,
    status: 'coming_soon',
    theme: { primary: '#c9a227', secondary: '#3a3010', accent: '#ffe9a0', wood: '#6b4a2a', label: 'ECON' },
  },
  {
    id: 'physics',
    title: 'Physics',
    subject: 'Physics',
    blurb: 'Forces, energy, and waves as the rules of the world you move in — not formulas on a slide.',
    authors: 'Intro physics (TBD)',
    href: null,
    status: 'coming_soon',
    theme: { primary: '#6b7cff', secondary: '#1a1f40', accent: '#c8d0ff', wood: '#4a3828', label: 'PHYS' },
  },
  {
    id: 'computer_science',
    title: 'Computer Science',
    subject: 'Computer Science',
    blurb: 'Algorithms and data structures you assemble and debug under pressure — loops that matter.',
    authors: 'CS textbook (TBD)',
    href: null,
    status: 'coming_soon',
    theme: { primary: '#3ecf8e', secondary: '#143528', accent: '#b8ffe0', wood: '#3a3228', label: 'CS' },
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
