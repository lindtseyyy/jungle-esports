/** Shared by the shipping Pixi stage and the opt-in V3 development stage. */
export interface RenderMetrics {
  drawCalls: number;
  frameMS: number;
  resolution: number;
  triangles?: number;
  p50?: number;
  p95?: number;
  p99?: number;
}
export interface RenderOptions {
  reducedMotion: boolean;
  preview?: () => {
    challenge: import('../engine/config').AnimalId;
    time: number;
    key: number;
  } | null;
  onPreviewReady?: () => void;
  isPaused: () => boolean;
  onFrame: (delta: number) => void;
  onMetrics?: (metrics: RenderMetrics) => void;
  onError?: (message: string) => void;
}
