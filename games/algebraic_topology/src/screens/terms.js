/**
 * Topology's vocabulary, highlighted in dialogue (bold gold) so a player can spot the
 * words the game is teaching. Plurals are matched too. Everyday words that the game also
 * uses loosely (point, edge, loop, disk, circle, tree) are left plain so the highlight
 * stays meaningful.
 */
export const TERMS = [
  'homotopy extension property',
  'homotopy equivalence',
  'homotopy equivalent',
  'deformation retraction',
  'deformation retract',
  'Euler characteristic',
  'fundamental group',
  'projective plane',
  'Klein bottle',
  'cell complex',
  'CW complex',
  'figure-eight',
  'spanning tree',
  'maximal tree',
  'wedge sum',
  'mapping cylinder',
  'Möbius band',
  '3-sphere',
  '0-cell',
  '1-cell',
  '2-cell',
  '1-skeleton',
  'skeleton',
  'homotopy',
  'homotopic',
  'deformation',
  'retraction',
  'retract',
  'contractible',
  'suspension',
  'suspend',
  'cone',
  'wedge',
  'product',
  'quotient',
  'torus',
  'sphere',
  'hemisphere',
  'cylinder',
  'bouquet',
  'subcomplex',
  'invariant',
  // World 1 · Bouquet Bastion
  'path homotopy',
  'homotopy rel',
  'delivery class',
  'concatenation',
  'basepoint',
  'associativity',
  'winding number',
  'homotopy lifting',
  'universal cover',
  'covering space',
  'deck transformation',
  'deck group',
  'normal cover',
  'antipodal',
  'antipodes',
  'still point',
  'induced homomorphism',
  'free group',
  'reduced word',
  'van Kampen',
]

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c)
// longest first, so "wedge sum" wins over "wedge"; allow plurals (s, es) and "-ed"/"-ing" for verbs like suspend
const EDGE = String.raw`[\p{L}\p{N}-]`
export const TERM_RE = new RegExp(
  `(?<!${EDGE})(${[...TERMS].sort((a, b) => b.length - a.length).map(esc).join('|')})(?:es|s|ed|d|ing)?(?!${EDGE})`,
  'giu',
)
