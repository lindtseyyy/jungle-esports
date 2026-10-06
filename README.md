# Jungle Esports

An original browser arcade game with the V3 minimalist UI and a gated 3D development preview: five jungle animals race from right to left while you back their outcomes with **virtual coins**. Built with strict TypeScript and Svelte 5. PixiJS 8 remains the shipping renderer while the three.js replacement passes the review gates in `PLAN-V3.md`. No accounts, payments or cash-out.

## Run locally

Requires Node.js 22.12+ (tested on Node 24).

```sh
npm ci
npm run dev
```

Open the Vite URL, usually http://localhost:5173. Choose a chip, then tap Win or Top 2 on a racer. Exacta and Quinella have their own price grids. A round opens for 20 seconds, or you can start it early. You can also watch without a bet.

```sh
npm run assets       # regenerate atlases and the synthesized audio sprite
npm run sprites      # pack running, starting, crossing, and podium images
npm run model-sheet  # review anatomy, silhouettes and eight stride poses
npm run art:v2       # re-author the editable V2 SVG sources
npm run check        # Svelte and strict TypeScript checks
npm run lint
npm test            # engine math, 1M draws, choreography and wallet tests
npx playwright install chromium
npm run test:smoke   # actual browser game loop, terrain and responsive tests
npm run build       # production output, offline cache and size budget checks
npm run preview     # serve dist locally
```

To include the production offline-cache smoke test:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:smoke
```

The test runner starts the preview server if needed. Test browsers use isolated storage and do not touch the live preview’s wallet.

## Playing

- **Win:** your racer finishes first. **Top 2:** first or second.
- **Exacta:** the first two racers in the selected order. **Quinella:** the same pair in either order.
- Odds include the stake back. Stakes are deducted when a chip is placed; undo and clear refund them until betting locks.
- Five equally weighted animals each own one terrain. Home turf multiplies strength by 2.5; visible form applies Tired ×0.8, Normal ×1 or Hyped ×1.25.
- Every price uses the exact same Plackett–Luce probabilities used to draw all five places. Prices are `floor(0.95 / probability × 100) / 100`; rounding and the 500× upper cap can reduce return below 95%.
- Per-selection stake limits: 5,000 coins on Win/Top 2, 1,000 on Exacta/Quinella. The maximum achievable return of the whole slip is capped at 20,000 coins before accepting a chip.
- Wallets start at 10,000 coins. Below 1,000, an empty slip unlocks a free refill once per local calendar day.
- The active race, reserved bets, wallet, last 20 results and lifetime terrain statistics are saved in this browser. A locked result survives a reload; settlement is idempotent. These local saves are for a single-player game and are not an authoritative financial ledger.
- Click a recent champion to replay its saved order and choreography seed. The live round pauses during a replay, and its wallet is unaffected. Repeat re-prices the previous slip for the new round.
- Sound is opt-in. Settings include reduced motion. Timers pause while the tab is hidden, a dialog is open, or the pause control is active.

## Architecture and assets

`src/engine/` is pure TypeScript without DOM or rendering dependencies. Result draws use `crypto.getRandomValues`. Choreography uses seeded xoshiro128** and monotone cubic curves with validated speed bounds. Only animation sub-seeds can be retried; a result is never re-drawn to fit the show.

`assets-src/` holds original editable SVGs: five anatomically distinct animals with natural coats, separate ceremony torsos, painted jungle layers, spectators, five challenges and metallic awards. `npm run assets` rasterizes the painted shading and fur filters with resvg and packs animal/environment atlases plus one small sheet per challenge, at 1×/2× with WebP and PNG fallback. Only the current challenge is requested by the renderer, during betting. Sources can be edited directly; `npm run art:v2` re-authors the V2 sources. Original synthesized audio and bundled fonts remain unchanged.

The racing animals use the frame-by-frame run cycles in `assets-src/2d/`: lion, boar (the warthog lane), cheetah, squirrel and dog (the hyena lane). `npm run sprites` packs all five run cycles, their starting poses, and their existing standing images into 1×/2× WebP sheets with PNG fallbacks. Each animal has a generated left-facing quadruped pose in `ready/ready_00.png`, matching its run artwork. These grounded poses appear during betting, lock and countdown, with a gentle breathing motion that keeps the feet anchored. Movement switches to the distance-driven run cycle and resets its first frame for every race. The starting image occupies a spare cell in the existing run atlas, so it adds no extra requests. Exact prompts, source references and alignment measurements are recorded in each animal’s `ready.json` and `READY-SOURCE.md`, with the complete prompt set in `assets-src/2d/start-poses/prompts.json`.

The shared clip measurements in `src/render/rig/spriteClips.ts` set canvas size, nose and ground anchors, species scale and distance-driven stride timing for both the builder and renderer. Source notes accompany each cycle. The winner card and podium use the existing front-facing standing artwork. The top three images preload once the result locks. `standingSprites.ts` centers each animal on its feet; medals appear on their chests and the champion’s trophy stands beside it on the platform.

`src/render/lanes.ts` defines a 1080-unit world and five lanes spaced 90 units apart. Uniform viewport scaling preserves proportions at 4:3 through 21:9, with letterboxing outside that range. Species anatomy lives in `src/render/species/`; the rigs use inverse-kinematic legs, a bending spine mesh and chained tail deformation. Far legs use opaque shading. `npm run model-sheet` produces side views, alpha silhouettes and eight stride poses in `public/model-sheets/`, and rejects any silhouette pair with at least 75% intersection-over-union. Animation reference notes are in `assets-src/REFERENCES.md`; these are original illustrative adaptations, not digitized motion capture.

Terrain replaces a continuous section of the track between 40% and 60%. Each lane has background and foreground obstacles that occlude the racer, with mud ripples and residue, seeded rolling rocks, bending grass, log climbing/vine swinging, and cave fog with a multiply light map. The finish has ground checker paint, depth-separated posts, a banner and a breaking tape. Nose offsets account for species and head rotation. A photo finish briefly holds the scene and flashes the finish edge.

The stage occupies the full content width, with betting below. **T** toggles Theater and **F** requests fullscreen; **Esc** exits. Both expanded views have a sharp DOM betting drawer with Win/Top 2 odds, chips, wallet and slip total. It hides when betting locks and returns for the next round. Mobile fullscreen requests landscape orientation; unsupported browsers use Theater. On iPhone, Add to Home Screen launches the fullscreen PWA. Settings include reduced motion. Number markers and racing bibs are hidden. Recent winners appear inside the stage at the right edge (ten on desktop, six on phones), with the full twenty-round history accessible from Statistics.

The winner card and Win statuses appear at the first nose crossing. All bets settle exactly once at second place; third place plus 1.2 seconds starts a five-second upright ceremony. The winner receives a trophy, all three receive gold/silver/bronze medals, and the ceremony includes your net round result. There is no separate payout phase. V2 storage migrates V1 race, finish, podium and payout saves without redrawing the result or double-crediting it. Replays share the crossing/ceremony timeline and leave the live ledger untouched.

The five shipping challenges are now a steep hill, deep mud pool, five log bridges, a hanging-vine ravine and a floating-log lagoon. Each of the five animals completes the same obstacle interaction. `src/render/challenges/crossing.ts` defines distance-based climb/peak/tumble/recovery, mud entry/paddling/exit, sequential vine handoffs and water boarding/floating/disembarking. `Terrain.ts` draws lane-aligned contact surfaces, opaque gaps, liquid foregrounds and vines descending from above the viewport. Bridge and hill run frames use measured paw anchors, keeping a foot on the support surface. Water adds a small floating trunk beneath every animal; mud hides submerged limbs and emits thick splashes. The six decorative side leaves have been removed.

Thirty new matching action poses are saved in `assets-src/2d/challenge-poses/`, with imagegen prompts in `prompts.json`. They preload after lock and use the same 1×/2× WebP/PNG and offline-loading path as the running images. The enlarged offline budget accommodates these new poses while retaining the initial-download and JavaScript limits. Crossing tests verify every stage and all five animals; browser tests exercise each complete course, pauses, format fallback and screenshots.

`?debug` adds an actual WebGL draw-call/frame-time/resolution overlay and a reference circle. Resolution is capped at 2× and at 3840×2160 drawing pixels; sustained slow frames lower density toward 0.6×. `?webgpu` opts into Pixi's WebGPU renderer. The build enforces 350 KiB gzipped JavaScript, a 2.5 MiB initial download (gzip text and full-size media) and a 6 MiB gzipped offline cache (including thirty crossing poses at both densities). Review-only model sheets are excluded from the service worker cache and download budgets. The generated content-versioned service worker pre-caches the game and every challenge for offline play, selecting WebP or PNG atlases according to browser support and retaining both densities.

## V3 development and G1 review

Run `npm run dev`, then open:

- `/?lab=animals`: side-by-side G1 style frame and reference, placeholder idle/gallop, speed and time sliders, turntable, close-up, wireframe, skeleton and foot motion trails.
- `/?renderer=3d&debug`: the 3D foundation using the existing game clock. Only the lion has a blockout; the other lanes use grey proxies. This is not a finished V3 race or roster.
- Add `&quality=high`, `&quality=medium` (default), or `&quality=low` to inspect the initial tiers. Low uses a simple contact shadow. Final LODs and SMAA are scheduled for the later performance pass.

The normal game and production build retain Pixi, the current roster and V2 saves. The engine, odds, wallet, choreography seeds and crossing timeline are unchanged. The V3 roster/save migration belongs to V3.3, after the lion's G2 review. Audio remains the existing opt-in audio until V3.7 sourcing and audition.

The G1 pipeline builds a continuous remeshed lion body on an FK skeleton, two looping placeholder clips, shared toon-PBR lighting, real mesh terrain, and 0.25 m per-lane raycast profiles. The camera path is precomputed with forward/backward smoothing, and an animated nose bone anchors the lion to the engine position. GPU resources are warmed before play and rebuilt on context restoration. The preview reports p50/p95/p99, triangles, draw calls and resolution. These are foundation diagnostics, **not** a claim that the final animation or hardware-performance gates pass.

The generated `public/assets/3d/` files are checked-in runtime inputs; ordinary `npm ci`, development and production builds do not need Blender. The production build omits both the development renderer code and its prototype assets, preserving the shipping download budget and offline cache.

To rebuild the prototypes:

```sh
# Blender 4.5 LTS or newer, installed separately (dev-only).
# Default binary: ~/.local/opt/blender/blender
BLENDER_BIN=/path/to/blender npm run assets:3d
npm run check:3d
```

Blender source scripts are in `assets-src/3d/blender/`, and the editable lion scene/spec are in `assets-src/3d/species/lion/`. Geometry optimization uses glTF Transform's API and meshopt (the CLI's unnecessary vulnerable glob dependency is avoided). All model geometry is authored in-house. Reference stills are review-only and are not included in production.

`check:3d` checks one body primitive, normalized four-influence weights, shared skeletons, clip loop endpoints, terrain samples and per-asset budgets. Full deformation/volume, foot-lock, joint-speed and final silhouette checks remain G2 work. The G1 frame must be reviewed for **look and camera** before detailed modeling, per PLAN-V3 §16.4 and §17. It has not been approved automatically.

## Static deployment

`dist/` is ready for a static host. This repository includes a Netlify build configuration and cache headers; on Cloudflare Pages use build command `npm run build` and output directory `dist`. The Vite base is relative, so subdirectory hosting works too. No deployment account or live deployment is configured by this repository.

## Scope and validation

The M0–M8 build, V2.1–V2.7, and V3.0 UI are included. V3.1 is available for G1 review; V3.2–V3.8 have not been implemented. See `PLAN-V3-STATUS.md`. Engine tests preserve the original odds, one-million-race RTP and 500-seed choreography checks, and cover the new crossing timeline, V1 migration, replay isolation and exactly-once settlement across reloads. Browser tests cover betting, fullscreen and fallback, immediate results, persistence, five frozen terrain screenshot baselines, responsive dialogs and three podium safe-area baselines. The production suite verifies an actual offline reload and race.

The 60 fps targets on a mid-range laptop/phone and biological/artistic accuracy still require review on physical devices and by a person using the model sheets. The dev overlay measures draw calls on WebGL; software-rendered browser timings do not certify target hardware performance. Screenshot baselines are Linux Chromium references and should be reviewed before updates.

M9’s server-authoritative multiplayer, accounts, PostgreSQL wallet ledger, Redis state and provably-fair commitments remain a future phase. Trifecta is optional and is not exposed in this release.
