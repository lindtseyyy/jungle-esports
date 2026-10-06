import { ANIMALS, type AnimalId, type Form } from './config';
import { validateWeights } from './odds';
import { secureRandom, type RandomSource } from './rng';
export function drawOrder(
  weights: readonly number[],
  random: RandomSource = secureRandom,
): AnimalId[] {
  validateWeights(weights);
  const remaining: AnimalId[] = ANIMALS.map((a) => a.id);
  const result: AnimalId[] = [];
  while (remaining.length) {
    const sum = remaining.reduce<number>((s, i) => s + weights[i], 0);
    const u = random();
    if (!Number.isFinite(u) || u < 0 || u >= 1) throw new Error('RNG must return [0, 1)');
    let target = u * sum,
      index = remaining.length - 1;
    for (let j = 0; j < remaining.length; j++) {
      target -= weights[remaining[j]];
      if (target < 0) {
        index = j;
        break;
      }
    }
    result.push(remaining.splice(index, 1)[0]);
  }
  return result;
}
export function drawForms(random: RandomSource = secureRandom): Form[] {
  return ANIMALS.map(() => {
    const u = random();
    return u < 0.2 ? 'Tired' : u < 0.8 ? 'Normal' : 'Hyped';
  });
}
