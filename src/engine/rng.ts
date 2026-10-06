export type RandomSource = () => number;
const buffer = new Uint32Array(1);
export const secureRandom: RandomSource = () => {
  globalThis.crypto.getRandomValues(buffer);
  return buffer[0] / 0x100000000;
};
export function secureSeed(): number {
  return Math.floor(secureRandom() * 0x100000000);
}
export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  const mix = () => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
    return (z ^ (z >>> 15)) >>> 0;
  };
  let a = mix(),
    b = mix(),
    c = mix(),
    d = mix();
  const rotl = (x: number, k: number) => (x << k) | (x >>> (32 - k));
  return () => {
    const result = Math.imul(rotl(Math.imul(b, 5), 7), 9) >>> 0;
    const t = b << 9;
    c ^= a;
    d ^= b;
    b ^= c;
    a ^= d;
    c ^= t;
    d = rotl(d, 11);
    return result / 0x100000000;
  };
}
