// Dungeon 1 — The Orbital Caverns (book Chapter 1, pp. 7–36). Layout and puzzle data.
// Rooms run along −z. Each room: z range, checkpoint, the puzzle ids that open its exit gate.
// Section ids match games/organic_chemistry/book_contents/contents.json and game_concept.json.

export const ROOMS = [
  { id: 'entrance', title: 'Cavern Mouth', z: [0, -14], checkpoint: [0, 0, -3], exitNeeds: ['met-aufbau'], sections: [] },
  { id: '1-1', title: 'The Nucleus Grotto', z: [-14, -32], checkpoint: [0, 0, -16], exitNeeds: ['1-1a', '1-1b'], sections: ['1.1'] },
  { id: '1-2', title: 'Hall of Shells', z: [-32, -50], checkpoint: [0, 0, -34], exitNeeds: ['1-2C', '1-2N', '1-2O'], sections: ['1.2', '1.3'] },
  { id: '1-3', title: 'The Socket Bridge', z: [-50, -76], checkpoint: [0, 0, -51.5], exitNeeds: ['1-3wolves'], sections: ['1.4', '1.5'] },
  { id: '1-4', title: 'Forge of Hybrids', z: [-76, -112], checkpoint: [0, 0, -78], exitNeeds: ['1-4tetra', '1-4pi'], sections: ['1.6', '1.7', '1.8', '1.9', '1.10'] },
  { id: '1-5', title: 'The Skeleton Gallery', z: [-112, -126], checkpoint: [0, 0, -114], exitNeeds: ['1-5a', '1-5b'], sections: ['1.11', '1.12'] },
  { id: 'boss', title: 'Chamber of the Colossus', z: [-126, -158], checkpoint: [0, 0, -129], exitNeeds: ['boss'], sections: ['1.4', '1.6', '1.8', '1.9'] },
]

export const STATIONS = {
  '1-1a': { room: '1-1', pos: [-4, 0, -23], label: 'Forge an atom for the Carbon Gate', panel: 'atomForge', props: { goal: { symbol: 'C', prompt: 'The Carbon Gate asks for one neutral carbon atom. Set the protons, neutrons and electrons.' } } },
  '1-1b': { room: '1-1', pos: [4, 0, -23], label: 'Forge an atom for the Heavy Gate', panel: 'atomForge', props: { goal: { symbol: 'C', massNumber: 13, prompt: 'The Heavy Gate asks for carbon again — but with mass number 13. Same element, different mass.' } } },
  '1-2C': { room: '1-2', pos: [-5, 0, -41], label: 'Light the Carbon lamps', panel: 'shells', props: { symbol: 'C' } },
  '1-2N': { room: '1-2', pos: [0, 0, -44], label: 'Light the Nitrogen lamps', panel: 'shells', props: { symbol: 'N' } },
  '1-2O': { room: '1-2', pos: [5, 0, -41], label: 'Light the Oxygen lamps', panel: 'shells', props: { symbol: 'O' } },
  '1-3well': { room: '1-3', pos: [-5.5, 0, -52.6], label: 'Find the bond length (energy well)', panel: 'well', props: {} },
  '1-3b0': { room: '1-3', pos: [-1.8, 0, -53.6], label: 'Raise bridge stone I', panel: 'octet', props: { index: 0 }, needs: ['1-3well'] },
  '1-3b1': { room: '1-3', pos: [1.8, 0, -53.6], label: 'Raise bridge stone II', panel: 'octet', props: { index: 1 }, needs: ['1-3b0'] },
  '1-3b2': { room: '1-3', pos: [5.5, 0, -52.6], label: 'Raise bridge stone III', panel: 'octet', props: { index: 2 }, needs: ['1-3b1'] },
  '1-5a': { room: '1-5', pos: [-5.2, 0, -119], label: 'Study the painting: Isoprene', panel: 'skeleton', props: { index: 0 } },
  '1-5b': { room: '1-5', pos: [5.2, 0, -119], label: 'Study the painting: Methylcyclohexane', panel: 'skeleton', props: { index: 1 } },
}

// Forge of Hybrids obstacles (§1.6–1.10)
export const FORGE = {
  crystalAt: [0, 0, -81],
  slot: { z: [-86, -89.5], x: [-1.6, 1.6], ceiling: 1.15 }, // only a flat sp² Kai fits under
  gap: { z: [-94, -101.5] }, // only the sp linear dash crosses
  tetraPlate: [-4.5, 0, -105],
  piPillars: [[2.5, 0, -105.5], [5.5, 0, -105.5]],
  door: -108.5,
}

export const BOSS = { center: [0, 0, -143], radius: 13.5 }

// Where the map points next: the first goal whose `id` isn't solved yet (ids are save.solved keys).
export const GOALS = [
  { id: 'met-aufbau', pos: [3, -9], label: 'Talk to Sage Aufbau' },
  { id: '1-1a', pos: STATIONS['1-1a'].pos, label: 'Forge a carbon atom' },
  { id: '1-1b', pos: STATIONS['1-1b'].pos, label: 'Forge carbon-13' },
  { id: '1-2C', pos: STATIONS['1-2C'].pos, label: 'Light the carbon lamps' },
  { id: '1-2N', pos: STATIONS['1-2N'].pos, label: 'Light the nitrogen lamps' },
  { id: '1-2O', pos: STATIONS['1-2O'].pos, label: 'Light the oxygen lamps' },
  { id: '1-3well', pos: STATIONS['1-3well'].pos, label: 'Find the bond length' },
  { id: '1-3b0', pos: STATIONS['1-3b0'].pos, label: 'Raise bridge stone I' },
  { id: '1-3b1', pos: STATIONS['1-3b1'].pos, label: 'Raise bridge stone II' },
  { id: '1-3b2', pos: STATIONS['1-3b2'].pos, label: 'Raise bridge stone III' },
  { id: '1-3wolves', pos: [0, -71.8], label: 'Pair off the radical wolves' },
  { id: '1-4crystal', pos: FORGE.crystalAt, label: 'Take the Hybrid Crystal' },
  { id: '1-4tetra', pos: FORGE.tetraPlate, label: 'Stand on the tetrahedral seal (sp³)' },
  { id: '1-4pi', pos: FORGE.piPillars[0], label: 'Turn both p orbitals upright' },
  { id: '1-5a', pos: STATIONS['1-5a'].pos, label: 'Study the isoprene painting' },
  { id: '1-5b', pos: STATIONS['1-5b'].pos, label: 'Study the methylcyclohexane painting' },
  { id: 'boss', pos: BOSS.center, label: 'Defeat the Unbonded Colossus' },
].map((g) => ({ ...g, pos: g.pos.length === 3 ? [g.pos[0], g.pos[2]] : g.pos }))
