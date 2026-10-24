// Chapter 2 rules (McMurry, Organic Chemistry 10e, OpenStax): polar bonds, dipoles, formal charge,
// resonance, Brønsted–Lowry and Lewis acids and bases, hydrogen bonds. Values are the book's.

// §2.1 Pauling electronegativities (Figure 2.2)
export const EN = { H: 2.1, C: 2.5, N: 3.0, O: 3.5, F: 4.0, Cl: 3.0, Br: 2.8, B: 2.0, Mg: 1.2, Li: 1.0 }

// §2.1: ΔEN < 0.5 nonpolar covalent, 0.5–2 polar covalent, > 2 largely ionic
export function bondPolarity(a, b) {
  const d = Math.abs(EN[a] - EN[b])
  const kind = d < 0.5 ? 'nonpolar' : d <= 2 ? 'polar' : 'ionic'
  const neg = EN[a] === EN[b] ? null : EN[a] > EN[b] ? a : b
  return { d: Math.round(d * 10) / 10, kind, negEnd: kind === 'nonpolar' ? null : neg }
}

// §2.3 formal charge = valence electrons − (nonbonding electrons + half the bonding electrons)
//                     = valence − lone-pair electrons − number of bonds
export const VALENCE_E = { H: 1, B: 3, C: 4, N: 5, O: 6, S: 6, F: 7, Cl: 7 }
export const formalCharge = (el, bonds, lonePairs) => VALENCE_E[el] - 2 * lonePairs - bonds

// §2.8 Table 2.3 and §2.9: pKa values (lower = stronger acid)
export const PKA = {
  'CH₃CH₂OH (ethanol)': 16.0,
  'H₂O (water)': 15.74,
  'HCN': 9.31,
  'CH₃COOH (acetic acid)': 4.76,
  'HNO₃': -1.3,
  'HCl': -7.0,
  'HC≡CH (acetylene)': 25,
}

// §2.9: H⁺ moves from the stronger acid to the stronger base — toward the weaker acid.
// acidA donates to baseB (whose conjugate acid is acidB). Returns true if the reaction goes as written.
export const protonMoves = (pKaAcidA, pKaConjAcidOfB) => pKaAcidA < pKaConjAcidOfB
