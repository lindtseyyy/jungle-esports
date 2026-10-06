export type AnimalId = 0 | 1 | 2 | 3 | 4;
export type Form = 'Tired' | 'Normal' | 'Hyped';
export const ANIMALS = [
  { id: 0, name: 'Rex', species: 'Lion', color: '#F28C28', trait: 'Raw power', short: 'RX' },
  {
    id: 1,
    name: 'Mudzilla',
    species: 'Warthog',
    color: '#D9473F',
    trait: 'Mud master',
    short: 'MZ',
  },
  {
    id: 2,
    name: 'Blitz',
    species: 'Cheetah',
    color: '#E8C468',
    trait: 'Born to sprint',
    short: 'BZ',
  },
  {
    id: 3,
    name: 'Nutsy',
    species: 'Squirrel',
    color: '#A58BE0',
    trait: 'King of the canopy',
    short: 'NT',
  },
  {
    id: 4,
    name: 'Cackles',
    species: 'Hyena',
    color: '#B9A78A',
    trait: 'Owns the night',
    short: 'CK',
  },
] as const;
export const CHALLENGES = [
  {
    id: 0,
    name: 'Steep Jungle Hill',
    short: 'Hill',
    icon: '◆',
    description: 'Climb the ridge, tuck at the peak, and tumble down.',
    home: 0,
  },
  {
    id: 1,
    name: 'Mud Swamp',
    short: 'Mud Swamp',
    icon: '≈',
    description: 'Deep mud. Big splashes. A warthog paradise.',
    home: 1,
  },
  {
    id: 2,
    name: 'Five Log Bridges',
    short: 'Log Bridge',
    icon: '〃',
    description: 'Five narrow logs bridge a deep jungle ravine.',
    home: 2,
  },
  {
    id: 3,
    name: 'Hanging Vine Ravine',
    short: 'Vines',
    icon: '⌁',
    description: 'Leap, grab, and swing between vines across the gap.',
    home: 3,
  },
  {
    id: 4,
    name: 'Jungle Lagoon',
    short: 'Water',
    icon: '◒',
    description: 'Dive into the pool and paddle across the jungle lagoon.',
    home: 4,
  },
] as const;
export const FORM_WEIGHTS: Record<Form, number> = { Tired: 0.8, Normal: 1, Hyped: 1.25 };
export const CONFIG = {
  advantage: 2.5,
  rtp: 0.95,
  minOdds: 1.1,
  maxOdds: 500,
  startingBalance: 1_000_000,
  bettingSeconds: 20,
  trackLength: 3000,
  direction: -1 as -1 | 1,
  maxStake: 5000,
  maxExoticStake: 1000,
  maxRoundPayout: 2_000_000,
} as const;
export function weightsFor(home: AnimalId, forms: readonly Form[]): number[] {
  if (forms.length !== 5) throw new Error('Five forms are required');
  return ANIMALS.map((a) => FORM_WEIGHTS[forms[a.id]] * (a.id === home ? CONFIG.advantage : 1));
}
export function isAnimal(value: unknown): value is AnimalId {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) < 5;
}
