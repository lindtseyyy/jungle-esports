# Crossing pose source art

The five `*-motion.png` sheets use a four-column by three-row layout: four walk frames, four mud stroke frames, and four log paddle frames. The matching `<animal>.png` sheet supplies the jump, clamber, and portrait cutouts. Both are transparent 2D illustrations drawn to match the existing animal designs.

`motion-prompts.json` and `prompts.json` keep the generation prompts and source references. `*-calibration.json` records the crop, size, scale, and anchor for each runtime frame. Rebuild the atlases and portraits with `npx tsx scripts/build-polish-assets.ts`; the script writes `public/assets/*-polish-sprite@{1,2}x` and `public/assets/portrait-*`.

The action widths live in `src/render/rig/actionClips.ts`. The generated environment concept sheets and their prompts are retained here as unused source material; the renderer keeps the original forest background and shared brown hill palette.

Race music lives in `assets-src/musics/` and `scripts/build-assets.ts` copies it to `public/assets/music/` for playback and offline caching.
