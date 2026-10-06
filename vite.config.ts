import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
export default defineConfig({
  base: './',
  plugins: [
    svelte(),
    {
      name: 'exclude-gated-3d-assets',
      apply: 'build',
      // V3.1 is a dev-only review. Do not add its prototypes to the shipping offline cache.
      async closeBundle() {
        await rm(resolve('dist/assets/3d'), { recursive: true, force: true });
      },
    },
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: (id: string) =>
          id.includes('/node_modules/pixi.js/')
            ? 'pixi'
            : id.includes('/node_modules/howler/')
              ? 'audio'
              : undefined,
      },
    },
  },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 30000 },
});
