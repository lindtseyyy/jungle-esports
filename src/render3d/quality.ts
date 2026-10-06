export type QualityTier = 'high' | 'medium' | 'low';
export const TIERS = {
  high: { shadowSize: 2048, maxDPR: 2, antialias: true },
  medium: { shadowSize: 1024, maxDPR: 1.5, antialias: true },
  low: { shadowSize: 0, maxDPR: 1, antialias: false },
} as const;
export function pixelRatio(tier: QualityTier, dpr: number, scale = 1) {
  return Math.max(0.6, Math.min(Math.max(dpr, 1), TIERS[tier].maxDPR) * scale);
}
/** Bounded rolling window; percentiles computed only when metrics are published. */
export class FrameStats {
  private samples = new Float32Array(180);
  private cursor = 0;
  private size = 0;
  add(ms: number) {
    if (ms <= 0 || ms > 250) return;
    this.samples[this.cursor] = ms;
    this.cursor = (this.cursor + 1) % this.samples.length;
    this.size = Math.min(this.size + 1, this.samples.length);
  }
  reset() {
    this.size = 0;
    this.cursor = 0;
  }
  percentiles() {
    const sorted = Array.from(this.samples.subarray(0, this.size)).sort((a, b) => a - b);
    const at = (q: number) => sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)] ?? 0;
    return { p50: at(0.5), p95: at(0.95), p99: at(0.99) };
  }
}
