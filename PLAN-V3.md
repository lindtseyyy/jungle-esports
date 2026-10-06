# Jungle Esports: Plan V3 (3D Animals, Motion, Terrain and Sound)

This plan follows `PLAN.md` (M0–M8) and `PLAN-V2.md` (V2.1–V2.7). The reference video is now the **primary visual target**: `reference_video/LETS PLAY JUNGLE SPORTS __ LHIZA STORE.mp4`.

**What V3 is:** finish and polish what exists. **Adding features is not the goal.** In priority order:

1. Animal asset quality
2. Smooth, natural animation
3. Body parts that are properly connected and move together
4. Animals and environments that look 3D
5. Real terrain, and animals that physically interact with it
6. Better background and environmental sound
7. A minimalist UI
8. Visual consistency with the reference video

**What does not change:**
- The engine math: odds, Plackett–Luce draws, RTP, stake limits and the wallet.
- The choreography seeds, and the instant-results timeline from V2 §6 (results when 1st crosses, payout when 2nd crosses, podium at 3rd + 1.2 s).
- Replays, theater mode and fullscreen, the in-stage betting HUD, offline/PWA support, and opt-in sound.

**What changes:**
- The whole stage renderer: 2D PixiJS sprites become **real-time 3D** with three.js.
- Every animal and environment asset.
- The animal roster.
- All audio.
- The amount of UI and text: it gets much smaller.

---

## Contents

0. [Summary](#0-summary)
1. [The reference video, broken down](#1-the-reference-video-broken-down)
2. [Why V2 looks robotic, flat and AI-generated](#2-why-v2-looks-robotic-flat-and-ai-generated)
3. [Technical direction: real-time 3D](#3-technical-direction-real-time-3d)
4. [Art direction: a deliberate look, not AI slop](#4-art-direction-a-deliberate-look-not-ai-slop)
5. [The new roster](#5-the-new-roster)
6. [Asset pipeline: modeling, rigging, texturing](#6-asset-pipeline-modeling-rigging-texturing)
7. [Animation system: smooth, weighted, connected](#7-animation-system-smooth-weighted-connected)
8. [Terrain and environment](#8-terrain-and-environment)
9. [The five challenges](#9-the-five-challenges)
10. [Camera and presentation](#10-camera-and-presentation)
11. [Start, finish and podium in 3D](#11-start-finish-and-podium-in-3d)
12. [Audio](#12-audio)
13. [Minimalist UI](#13-minimalist-ui)
14. [Engine, data and save changes](#14-engine-data-and-save-changes)
15. [Performance and download budgets](#15-performance-and-download-budgets)
16. [Tests, quality gates and human review](#16-tests-quality-gates-and-human-review)
17. [Milestones](#17-milestones)
18. [Risks and mitigations](#18-risks-and-mitigations)
19. [Decisions (defaults chosen; tell me to switch any)](#19-decisions-defaults-chosen-tell-me-to-switch-any)
20. [Out of scope](#20-out-of-scope)
- [Appendix A: Species spec sheets](#appendix-a-species-spec-sheets)
- [Appendix B: File and module map](#appendix-b-file-and-module-map)
- [Appendix C: Reference stills index](#appendix-c-reference-stills-index)

---

## 0. Summary

| Area | V2 today | V3 target |
|---|---|---|
| Rendering | PixiJS 2D, side-on, sprites cut into parts | **three.js 3D** (WebGL2), perspective camera at about 30° looking down, the same camera language as the reference |
| Animals | Lion, Warthog, Cheetah, Squirrel, Hyena, each built from 9–12 rigid sprite pieces with numbered bibs | **Lion, Wolf, Boar, Squirrel, Cheetah**. Each is **one continuous skinned 3D mesh** on a real skeleton. No numbers. About 1.6× bigger on screen |
| Motion | 8 key poses, each eased in and out, so every joint stops 8 times per stride | Gait clips authored per species, plus speed-matched playback, foot IK, spring-driven tails/ears/manes, and lean from acceleration |
| Terrain | A flat brown band with grey rectangles | A 3D course with hills and dips, mixed ground, small obstacles, and one large **challenge set piece** per race: boulder climb, mud pit, river swim, log bridges, vine gorge |
| Interaction | Animals slide over stickers | Animals climb, wade, swim, balance, swing, jump and shake off. Water and mud cut through their bodies, feet plant on uneven ground, and the ground reacts |
| Audio | Synthesized drums and effects | Licensed field-recorded jungle ambience, music, per-surface footsteps, animal vocals and a spectator crowd |
| UI | About 60 marketing strings, a win-chance bar, a Recent Champions strip at the bottom | Icons and numbers first. Win chance removed. Recent Champions becomes a **vertical column inside the stage on the right**, as in the reference |

---

## 1. The reference video, broken down

The source is 216 s of handheld phone footage, 1280×720 at 30 fps, of a "JUNGLE SPORTS" arcade cabinet. Only the game screen matters. Stills are saved in `reference_video/stills/` (index in Appendix C).

### 1.1 Round structure (what the cabinet does)

| Video time | Screen | Notes |
|---|---|---|
| 0–10 s | Race: **vine and waterfall gorge** section, then grass to the finish | Animals hang on vines in front of a waterfall |
| 12 s | Podium (lion wins) | |
| 14–44 s | Betting, 30 s countdown | Racers occasionally trot across the field in the background |
| 46–54 s | Race: grass, **giant boulder climb**, grass, finish | |
| 56–58 s | Podium (boar wins) | |
| 90–98 s | Race: grass, **log bridges over a river**, grass | One log per lane, white water below |
| 134–144 s | Race: **start posts**, boulder, finish | |
| 180–190 s | Race: grass, **mud pit**, grass, finish | Animals sink to the chest |
| 192–194 s | Podium (lion) | |
| 196–200 s | Attract/title screen | Not in scope |

A reference race lasts about **11 s**. Ours lasts 19–21 s; §19 has a decision on that.

### 1.2 Camera and staging

- A **perspective 3D camera** about 30–35° above horizontal, looking across the track. Animals run **right to left**, as in our game.
- Lanes are horizontal bands stacked up the screen. Far lanes sit higher and are slightly smaller. **Neighbors overlap:** the animal in front covers the legs of the one behind. Lanes are tight, about half an animal's height apart on screen.
- **Animals are big.** The front-lane lion takes up about 25% of the screen width.
- The camera **pans with the pack** and re-frames for set pieces. It rises for the boulder, looks down into the mud pit, and drops lower over the river.
- The backdrop is a 3D jungle: big trunks, ferns, palms, a distant tree line and a strip of sky. **Spectator animals** (monkeys, a gorilla, meerkats) stand along the far edge and react.
- **No HUD during the race** except a tiny coin value in the top-left.
- Each animal casts a soft shadow on the ground.

### 1.3 Animals and motion (`180s-gallop-sequence.jpg`, `183s-mud-sequence.jpg`)

- The same five species we are switching to: a lion, a grey canine, a pink boar, a blue-violet squirrel and a pale spotted cat. They are stylized 3D cartoon: saturated, softly shaded, chunky shapes, slightly large heads.
- The gallop has clear **gather** (all four feet under the body) and **extension** (fully stretched) phases. The back flexes, the head stays fairly level while the body bobs, and tails trail behind with lag.
- In mud they **sink to the chest and plough forward**. The squirrel holds its tail up out of the mud.
- On logs, **each lane gets its own log** spanning the river.
- The boulder is a single huge rock ramp across all lanes. Animals climb up and leap down.

### 1.4 Betting screen (`112s-betting-layout.jpg`)

- **Top center:** the countdown number.
- **Top left:** coin value and a small **course preview tile** (this round's terrain).
- **Bottom row:** five animal **portraits**, each with its odds and your stake. The selected animal pops up larger, with a small info card: form, home terrain, last rank.
- **Right edge:** a vertical **"last 10 rounds" column** of winner heads.
- **Behind all of it:** the live 3D field.

### 1.5 Podium (`057s-podium-boar.jpg`)

The winner stands **upright** on the center stump marked 1, holding a gold trophy and wearing a gold medal, and waves. A title banner hangs behind. In the reference, the 2nd and 3rd stumps stay empty. V2 put the top three on the podium; see §19.

### 1.6 What we copy and what we don't

- **Copy:** the camera language, staging, scale, pacing, challenge types, the positions of the betting layout, the history column and the podium composition. In short, the *experience*.
- **Don't copy:** their characters, models, textures, logo or title art (丛林运动会), UI art or audio. V3 assets are made in-house or properly licensed, so the game stays ours and safe to publish.

---

## 2. Why V2 looks robotic, flat and AI-generated

| What you see | Root cause in the code |
|---|---|
| **Robotic, stop-start limbs** | `render/rig/gaits.ts` `strideKey()` blends between 8 key poses with a **smoothstep per segment**. Smoothstep has zero velocity at both ends, so every joint **comes to a dead stop 8 times per stride**. This is the main reason the motion reads as mechanical. |
| **Legs look stuck on** | In `AnimalRig.ts`, each leg is **three separate sprites** (upper, lower, paw) sharing one generic texture, pinned to a point under the torso. There is no skin over the shoulder or thigh, so the joins show. Legs don't grow out of the body; they hang from it. |
| **Tail looks disconnected** | The tail `MeshPlane` sits at hard-coded offsets (`-112 / -100 / -92`) with per-species scale tweaks. It doesn't follow the spine bend or the body bob, so a gap opens and closes as the body moves. |
| **Far legs look dead** | They are tinted flat grey (`0x9c9489`) instead of being lit. |
| **Flat, 2D look** | A side-on orthographic view, lighting baked into each sprite, and an ellipse for a shadow. Nothing has volume, so nothing can turn, foreshorten or occlude. |
| **"AI-generated" feel** | Generic vector shapes with gradient fills and the same edge treatment on everything. Perfect symmetry, no wear, no secondary motion, numbered bibs, and every species built from the same template. |
| **Flat terrain** | `lanes.ts` uses flat floor lines. `Terrain.ts` draws colored polygons and stickers. There is no elevation, so there is nothing to climb, sink into or balance on. |
| **Small animals** | The lion is about 10% of the stage width at 1440 px. |
| **Text-heavy UI** | About 60 decorative strings (taglines, eyebrows, captions) plus a win-chance bar on every card. See §13.1. |

Fixing these inside the 2D renderer would mean reinventing a 3D pipeline badly. V3 switches to real 3D.

---

## 3. Technical direction: real-time 3D

### 3.1 The choice

**three.js on WebGL2 replaces PixiJS for the stage.** Svelte stays for all UI. The engine (`src/engine/`) stays untouched.

| Option | Verdict | Why |
|---|---|---|
| **three.js real-time 3D** | ✅ **Chosen** | Real skinned meshes, real lighting and shadows, and real elevation. Water and mud surfaces cut through bodies naturally, and the camera can move like the reference. About 150 KiB gzip, replacing Pixi's 170 KiB, so the JS budget holds. glTF is the native format. |
| Pre-rendered 3D sprites in Pixi | ❌ | Fixed angles only. Climbing, swimming and swinging each need their own renders from several angles, which means huge sprite sheets. No camera moves, and contact with uneven terrain would still be faked. |
| Babylon.js / PlayCanvas | ❌ | Both are capable, but heavier downloads, and we don't need their extras. |
| Unity/Godot web export | ❌ | Multi-MB runtime, slow start, and poor fit with the Svelte UI and the offline cache. |

### 3.2 Renderer contract (keeps App.svelte almost untouched)

The new renderer keeps today's signature:

```ts
createRenderer(host: HTMLElement, game: Game, options: RenderOptions): Promise<() => void>
```

- It reads `game.round`, `game.choreography` and the replay state every frame, as `render/app.ts` does now.
- `RenderOptions.showMarkers` is removed, because the numbers are gone. `reducedMotion`, `isPaused`, `onFrame`, `onMetrics` and `onError` stay.
- **Feature flag during the build-out:** `?renderer=3d` (dev) loads `src/render3d/`. The old renderer stays the default until V3.8, then it is deleted together with its art scripts.

### 3.3 World units and geometry

| Quantity | Value | Notes |
|---|---|---|
| Unit | 1 world unit = 1 m | |
| Track mapping | engine `x ∈ [0, 3000]` → world `X = −x × 0.1` | A 300 m course, running toward −X (screen left) |
| Lanes | 5 lanes along Z, **1.8 m apart**: lane 0 (back) `z = −3.6` … lane 4 (front) `z = +3.6` | Spacing tuned so neighbors overlap on screen as in the reference |
| Typical speed | about 15 m/s; about 10–11 m/s inside the challenge zone | Comes from the existing choreography: the 40–60% section already takes about 28% of race time |
| Up axis | +Y | |

The **finish check stays in the engine**: the nose crosses when `x ≥ 3000`. The renderer places each animal so its **nose bone** sits exactly at `X(x)`, using a per-species nose offset measured from the model. That way the painted finish line and the result always agree, as in V2 §4.

### 3.4 Render pipeline

- `WebGLRenderer` with WebGL2, `antialias: true` (MSAA), sRGB output and **AgX** (or Neutral) tone mapping.
- **No heavy post-processing chain.** MSAA plus tone mapping only. An optional SMAA pass only on the Low tier, which drops MSAA. No bloom, film grain, chromatic aberration or lens flares (see §4).
- Shadows: one directional sun with a **2048² shadow map** in a tight box that follows the camera. Animals and dynamic props cast shadows. Static environment shadows and AO are **baked** in Blender.
- **Shader warm-up:** `renderer.compileAsync(scene, camera)` for every material during betting, so entering a challenge never hitches.
- **WebGL context loss** is handled. On restore, GPU resources are rebuilt from the cached glTF data.

---

## 4. Art direction: a deliberate look, not AI slop

### 4.1 Target look: "Jungle Toon 3D"

A **stylized 3D game look**, like the reference: chunky, readable shapes, slightly exaggerated proportions (heads and paws 1.15–1.3× real), and saturated but natural color. It looks like solid, lit objects that stand on the ground. It is not photoreal and not flat cartoon.

### 4.2 One shared lighting model (the main source of consistency)

Every surface uses the **same custom toon-PBR shader**: animals, terrain, rocks, trees, props and spectators. Visual consistency comes from one light model, not from matching colors by eye.

| Shader term | What it does | Why it matters |
|---|---|---|
| Wrapped diffuse, then a **3-band soft ramp** | Soft cel shading, with no hard binary toon edge | The stylized 3D look of the reference |
| **Hue-shifted shadows** | Shadow tones lean cool blue-green (light bounced off the jungle). Lit tones lean warm | Grey "dead" shadows are the most common tell of a generic render |
| **Hemisphere ambient**: sky above, ground bounce below | Bellies and legs pick up green-brown from the ground they stand on | Animals **sit inside** the environment instead of being pasted on top |
| **Baked AO** (texture or vertex color) | Darkens creases, armpits, under the jaw, between toes | Volume and weight |
| **Rim light** (fresnel, tinted by the sky) | Separates silhouettes from the background | Readability at small sizes |
| **Fur sheen** | A soft, broad highlight along the fur direction | Fur reads as fur, not plastic |
| Eyes: a separate wet material | Glossy cornea, a catchlight from the sun direction, darker limbal ring | Eyes carry the life of a character |

**One light setup:**
- The sun is warm (late morning), high, and on camera-left, so shadows fall to the right and slightly toward the back.
- Sky and ground ambient colors.
- **Exponential height fog** in blue-green for depth. Distant layers lose contrast and turn bluer, as in the reference.

### 4.3 Rules that keep it from looking AI-generated

| Do | Don't |
|---|---|
| Give each species its own **shape language**: lion square and heavy, cheetah long lines, boar a wedge on a barrel, wolf triangles, squirrel circles plus an S-curve tail | Build every species from one template body |
| Use **three levels of detail**: big shapes, medium forms (muscle groups, mane locks) and small surface detail (fur clumps, whiskers, scars), with **quiet areas** between them | Spread the same noise everywhere |
| **Hand-place asymmetric details**: a scar, a notched ear, a chipped tusk, a lighter mane lock, mud on one side | Perfect mirror symmetry |
| Paint fur clumps that **follow the form**, with color variation inside each coat | Airbrushed gradients and flat fills |
| Use the **same texel density** for all hero assets (about 256 px/m on animals, 128 px/m on environment) | Mix sharp and blurry assets |
| Only use light you can **explain**: one sun, sky and bounce | Random glows, sparkles, god rays from nowhere, lens flares, bokeh dust |
| Give every animal a **personality in motion** (§7.8) | Five clones running in sync |
| Get everything from **one pipeline**, with the same shader, palette rules and detail level | Packs from different artists stuck together |
| Show **contact and consequence**: shadows, footprints, splashes, mud that stays on the coat | Animals that float over the ground |

### 4.4 Color palette (natural, warm and jungle-saturated)

The environment palette is fixed per biome in §8.4. Each animal's coat colors are fixed in Appendix A. **Team colors live only in the UI** (portrait card borders and chips), never on the animals.

---

## 5. The new roster

Lanes and IDs follow the order you listed them in.

| ID | Species | Lane (0 = back) | Home terrain (2.5× strength) | Real build to keep | Signature detail |
|---|---|---|---|---|---|
| 0 | **Lion** | 0 | Boulder Ridge | Heavy, deep chest, thick legs | A two-tone mane that bounces in layers. A healed scar through the left brow. A tail tuft that whips |
| 1 | **Wolf** | 1 | River Swim | Long legs, narrow chest, big paws | A slate-blue-grey coat with a darker saddle. One **notched ear**. Tongue out at full speed |
| 2 | **Boar** | 2 | Mud Pit | Barrel body on short legs, wedge head | A mohawk bristle ridge that rises when running. One **chipped tusk**. Mud "socks" on the legs |
| 3 | **Squirrel** | 3 | Vine Gorge | Small, long body, **huge tail** (scaled up to stay readable) | A deep maroon back with a cream belly (a nod to the reference's violet squirrel). **Ear tufts**. A tail that ripples like a wave |
| 4 | **Cheetah** | 4 | Log Bridges | Long thin legs, small head, flexible spine | Solid spots placed by hand-tuned Poisson scatter. **Tear lines**. A ringed tail with a white tip used to balance |

- **Size on screen:** the front-lane lion is about **16–18% of the frame width** at the default zoom, about 1.6× V2 ("slightly larger"). The reference is about 25%, so this is a tunable constant.
- **Relative sizes** come from Appendix A. Body length: lion 2.30 m, cheetah 2.05 m, wolf 1.75 m, boar 1.55 m, squirrel 0.95 m plus its tail.
- **Names:** species names only ("Lion", "Wolf"…). The nicknames (Rex, Mudzilla…) are dropped as unnecessary text (§19).
- **No markings on the bodies:** no numbers, bibs or floating markers. The species are distinct enough to identify on their own, as in the reference.

---

## 6. Asset pipeline: modeling, rigging, texturing

### 6.1 Toolchain

| Tool | Use | Install |
|---|---|---|
| **Blender** (current LTS, 4.5 or newer), run headless | Modeling, UVs, rigging, weights, animation authoring, AO and lighting bakes, glTF export | Portable tarball in `~/.local/opt/blender/`, no root. **Dev-only**: built GLBs are committed, so `npm ci && npm run dev` never needs Blender |
| Python scripts **checked into the repo** | Every asset is rebuilt from source by script, then hand-tuned in the `.blend` files | `assets-src/3d/blender/**.py` |
| `@gltf-transform/cli` (dev dependency) | Prune, dedupe, resample animation, **meshopt** geometry compression, **WebP** textures | npm |
| three.js loaders | `GLTFLoader` with `MeshoptDecoder` (about 20 KB) and `EXT_texture_webp` | npm |
| Playwright with headless Chromium | Turntables, clip captures, visual baselines and review pages, all rendered by **the game's own renderer**, so reviews show exactly what ships | already installed |

### 6.2 Where the models come from

**Default: built in-house, all five with one pipeline and one style.** The first animal through the pipeline (the lion) is a **go/no-go gate** (G2, §16.4). If the in-house lion doesn't clear the bar after review rounds, we switch to the fallback **before** building the other four.

**Fallback:**
- License **one** consistent stylized animated-animal pack from a single artist that covers all five species, or **commission** them.
- Then rebuild them through our shader, textures and rig retargeting, so the style stays unified.
- Never mix packs from different artists. Free CC0 packs (for example Quaternius) cover the wolf but not the lion, boar, cheetah or squirrel, so mixing would break consistency.

### 6.3 Modeling steps (per species)

1. **Anatomy spec** (`assets-src/3d/species/<name>/spec.json`): body length, shoulder and hip height, leg segment ratios, head size, tail length and bone count, and the stylization multipliers. Starting values are in Appendix A.
2. **Blockout:** a skin-modifier skeleton graph, then remesh to an even quad mesh. Silhouettes are checked against the spec and reference photos from side, front, top and the game camera angle.
3. **Shape pass:** scripted, landmark-based deformations for muscle masses (shoulder blade, triceps, haunch, neck crest), the brow and muzzle planes, the mane and ruff volumes, and paws that are big enough to read. Then manual tuning in the `.blend`.
4. **Topology for animation:** at least **3 edge loops at every joint** (shoulder, elbow, wrist, hip, knee, hock, neck, each tail joint), loops around the eyes and mouth, and **one watertight body mesh**. Legs, tail, head and torso are **one surface**. Eyes, teeth, tusks, claws and fur cards are separate pieces skinned to the same skeleton.
5. **Fur cards** only where the silhouette needs them: lion mane and tail tuft, wolf ruff and tail, squirrel tail and ear tufts, boar bristle ridge. They are alpha-to-coverage cards rooted *inside* the body surface so their roots never show.
6. **Triangle budget (LOD0):**

   | Species | Body | Fur cards |
   |---|---|---|
   | Lion | ≤ 14k | ≤ 4k |
   | Wolf | ≤ 12k | ≤ 3k |
   | Boar | ≤ 11k | ≤ 2k |
   | Cheetah | ≤ 12k | ≤ 1k |
   | Squirrel | ≤ 9k | ≤ 4k |

   **LOD1** is about 45% (used for the far lanes and the Low tier).
7. **UVs:** one 0–1 set, unwrapped by script along marked seams (belly line, inner legs, under the tail), with texel density equalized.

### 6.4 Textures (per species)

- **Albedo (1024²):** painted coat colors with fur-clump variation along the fur flow, countershaded (darker back, lighter belly), and hand-placed markings: spots, tear lines, the saddle, scars, mud socks.
- **Normal (1024²):** baked from a high-resolution sculpt of fur strokes and skin folds onto the game mesh.
- **Packed ORM (512²):** AO baked in Cycles (CPU is fine), roughness for wet nose, eyes and tusks, and a mask channel used by the **wet/mud coat** effect (§7.7).
- Exported as WebP inside the GLB. KTX2 Basis is **only** added if mobile GPU memory becomes a problem (§15).

### 6.5 Skeleton (one shared quadruped template, about 42 bones)

```
root ─ pelvis ─ spine_01 ─ spine_02 ─ spine_03 ─ chest ─ neck_01 ─ neck_02 ─ head ─ jaw
                                                                            ├─ ear_L_01 ─ ear_L_02
                                                                            └─ ear_R_01 ─ ear_R_02
       pelvis ─ tail_01 … tail_06            (squirrel: tail_01 … tail_10)
       chest  ─ scapula_{L,R} ─ humerus ─ radius ─ metacarpal ─ fore_toes
       pelvis ─ femur_{L,R} ─ tibia ─ metatarsal ─ hind_toes
       helpers: mane_01..03 / ruff / bristle_ridge / belly (spring-driven, species-specific)
```

- **Real digitigrade legs:** three segments plus toes, the scapula sliding on the ribcage, and a hock angle that matches each species.
- **The tail is a child of the pelvis, and its first two bones are weight-blended with the pelvis.** It cannot detach.
- **Weights:** automatic heat weights as a start, then scripted smoothing. At most **4 influences per vertex**, normalized to 1 (glTF limit, checked by test).
- **Corrective shape keys** for extreme shoulder and hip flexion and extension and for the upright podium pose. At runtime, JS sets `morphTargetInfluences` from the bone angles, because glTF has no drivers.
- Blink, ear-flatten and snarl/pant shape keys.
- In Blender, authoring uses IK and foot-roll controls. Export bakes them to plain FK.

### 6.6 Export

- `npm run assets:3d` runs Blender headless (`blender -b <file> -P export.py`) for each species, course and prop.
- Then `gltf-transform optimize` (meshopt, WebP, prune, dedupe, `resample` for animation).
- Output goes to `public/assets/3d/<name>.glb` plus a JSON sidecar: nose offset, stride table, clip markers and LOD switch distances.

### 6.7 Portraits

UI portraits (head and shoulders, three-quarter view, the same lighting as the game) are **rendered from the 3D models** by Playwright. They are saved as WebP at 1× and 2×, with a transparent background. The UI and the game always show the same animal.

---

## 7. Animation system: smooth, weighted, connected

Motion is built in **layers**. Each layer fixes a specific "robotic" symptom.

### 7.1 Gait design per species (authored clips)

| Species | Fast gait | Footfall order / suspension | Stride frequency at 15 m/s | Stride length | Duty factor | Character of the motion |
|---|---|---|---|---|---|---|
| Lion | Rotary gallop | LH → RH → RF → LF, one gathered suspension | about 2.3 Hz | about 6.5 m | 0.35 | Heavy: the shoulder roll is visible, the mane lags, landings are firm |
| Wolf | Transverse gallop, and a lope at low speed | LH → RH → LF → RF | about 2.6 Hz | about 5.8 m | 0.30 | Efficient and level: head low and steady, tail straight out |
| Boar | Short, stiff transverse gallop | LH → RH → LF → RF | about 3.4 Hz | about 4.4 m | 0.38 | Fast little steps, barrel body, head down, bristles up, tail swishing |
| Cheetah | Rotary gallop with **two suspensions** (gathered and extended) | LH → RH → RF → LF | about 2.4 Hz | about 6.3 m | 0.25 | Huge spine flex (±25°), almost flat flight, tail as a counterweight |
| Squirrel | **Bound** (hind feet land ahead of the forefeet) | Hind pair, then fore pair | about 4.2 Hz | about 3.6 m | 0.30 | Arched leaps, the tail rolls in a wave, quick head checks |

The values in the table are starting targets. They are tuned against reference footage of real animals (Muybridge plates, public-domain slow motion) and against the cabinet video.

**Clips authored per species** (at 30 fps, looping clips continuous in position and velocity at the seam):

| Group | Clips |
|---|---|
| Idle and start | `idle` (breathing, weight shift), `idle_look`, `idle_fidget` (species-specific: lion yawn, wolf sniff, boar root, squirrel tail flick, cheetah stretch), `ready` (crouch at the start), `burst` (first 0.6 s, digging in) |
| Locomotion | `canter` / `trot` and `gallop`, blended by speed, plus `turn_lean_L` / `turn_lean_R` additive clips for small lane wobble |
| Terrain | `jump_takeoff`, `jump_air`, `jump_land`, `climb_scramble`, `climb_bound` (lion), `descend_hop`, `wade`, `swim`, `swim_exit_climb`, `shake_off`, `balance_run`, `vine_grab`, `vine_hang`, `vine_release`, `slide_in` (boar belly slide), `branch_run` (squirrel) |
| Ending | `slowdown` (gallop to trot to walk, panting), `celebrate` (winner: lion roar, wolf howl, boar happy grunt and tail spin, squirrel chatter on hind legs, cheetah chirp and head toss), `pant_idle` |
| Podium | `podium_hop_on`, `podium_stand`, `trophy_hold`, `trophy_raise`, `wave`, `medal_bow` |

### 7.2 Layer 1: phase-synced locomotion (kills the "stop-start" look)

- Every locomotion clip carries **normalized phase markers** at the footfalls. The `canter`↔`gallop` blend and every crossfade (0.2–0.35 s) **keep the phase**, so the legs never scramble during a blend.
- **Playback rate = speed ÷ stride length**, and stride length grows with speed through a per-species curve. Feet move at ground speed.
- Interpolation between keys is continuous. There are no eased segments, so **no joint ever stops mid-stride** (enforced by test, §16.2).

### 7.3 Layer 2: ground contact (feet that plant)

- **Body height and pitch come from the terrain:** sample the ground height at the shoulder and hip positions, then pitch the spine to match. This is how climbing and descending become visible.
- **Two-bone analytic foot IK** on each leg, weighted by the clip's per-foot *contact curve*, plus toe alignment to the ground normal. Feet land **on** ledges, logs and banks.
- **Foot lock** during stance removes any leftover slide. Target: less than 2 cm drift per stance.

### 7.4 Layer 3: planned strides (obstacles are met, not clipped)

- The engine fixes each animal's future position `x(t)` before the race starts, so the renderer can **plan ahead**. For each upcoming jump (log hop, bank, ledge), it stretches or shortens the previous 2–3 strides by up to ±10% so the take-off lands about 1 body length before the obstacle.
- The jump arc is fitted to the actual time `x(t)` spends between take-off and landing. The animal is always exactly where the engine says.

### 7.5 Layer 4: weight and momentum

- **Lean into acceleration:** a critically damped spring on body pitch, driven by `x''(t)` from the motion curve. The body tips forward when surging and settles back when easing off.
- **Landing compression:** the spine compresses and the head dips on hard landings (jumps, the boulder descent), then recovers with a small overshoot.
- **Head stabilization:** neck and head counter-rotate to remove about 60% of the vertical bob and keep the eyes level, as real animals do. This one detail removes most of the "puppet" feel.
- **Arcs:** no joint path is linear. Clips are reviewed with motion trails in the lab (§16.4).

### 7.6 Layer 5: secondary motion (follow-through and overlap)

- **Spring chains**, stepped at a fixed 120 Hz with interpolation, so they are deterministic and independent of frame rate:
  - Tail (all)
  - Ears (all)
  - Mane locks (lion)
  - Ruff (wolf)
  - Bristle ridge and belly (boar)
  - Squirrel tail: an S-wave with a phase lag along 10 bones
  - Cheetah tail: a counterweight that swings opposite to the body yaw on logs
- Each spring has stiffness, damping and an angle limit per bone. Tuned so a tail **follows the body** rather than floating.

### 7.7 Layer 6: interaction with surfaces

- **Water and mud cut through the body:** the surface is drawn after the animal, depth-tested, so submerged parts are hidden or tinted behind it. There is a foam or mud ring where the body crosses the surface.
- **Wet and mud coat:** each animal records how deep it has been submerged. The shader darkens and adds gloss (water) or applies the mud texture (mud) below that line. **Water dries in about 4 s; mud stays and dries to a lighter crust over about 10 s.**
- **Shake-off** after leaving water or mud, with a spray of droplets in an arc lit by the sun.
- **Footfall events:**
  - Dust on dirt, blades on grass, scree on rock, squelch and splats in mud, splash crowns in water.
  - Footprint decals in mud and dirt that fade out.
  - Grass bends away near each animal: its 5 positions are passed as a shader uniform.

### 7.8 Layer 7: personality and variation

- **Per-animal variation from the round seed** (±3% stride amplitude, head-bob phase, ear timing), so the five never move in lockstep and replays still match exactly.
- **Acting beats:**
  - Glancing at a rival during an overtake.
  - The leader's ears go back near the finish.
  - Tired-form animals pant earlier. Hyped-form animals toss their head at the start.
  - The winner's `celebrate` and the losers' `slowdown` once they cross.
  - Each species has its own behavior in the challenge (§9).

### 7.9 Determinism

Everything visual is a **pure function of (round seed, race time)**:
- the camera path
- stride planning
- the spring simulation, replayed from t = 0 in fixed steps
- particles, seeded per emitter

Replays and screenshot tests are therefore exact.

---

## 8. Terrain and environment

### 8.1 Course layout (a 300 m track; fractions of the engine distance)

| Section | x fraction | Ground | Elevation | Small feature (all courses) |
|---|---|---|---|---|
| Start meadow | 0.00–0.12 | Short grass, chalk start line | Flat | Start posts and rope |
| Approach A | 0.12–0.40 | Grass turning to packed dirt with roots and pebbles | **Gentle hill**: up 1.2 m, then down | A **fallen log hop** (0.5 m) at about 0.28 |
| **Challenge** | **0.40–0.60** | Per challenge (§9) | Per challenge | The set piece |
| Approach B | 0.60–0.88 | Forest floor (leaf litter, moss), then grass | A **dip** with a shallow **creek splash** (10 cm deep) at about 0.74, then a slight rise | Creek splash |
| Finish clearing | 0.88–1.00 | Short grass, painted finish band | Flat | Finish posts, banner, tape |

The 0.40–0.60 challenge zone is the same as today, so the choreography (which slows the field and lets the home animal overtake there) lines up unchanged.

### 8.2 How courses are built

- **One shared `course-base.glb`** holds the start, both approaches and the finish. **One `challenge-<n>.glb` "insert"** replaces 0.38–0.62 and blends into the base at both seams. Only the current round's insert is downloaded, during betting, as in V2.
- **Terrain mesh:** about 1 vertex every 0.5 m along the lanes, sparser outside them. The track shoulders rise into banks, so the track sits *in* the land instead of on a plane.
- **Ground material:** splat-blended tiling textures (512² each: grass, dirt, rock, mud, wet sand, leaf litter). Blend weights are in vertex colors, with baked AO and contact darkening. The same toon shader as the animals.
- **Grass:** instanced clumps (alpha-cut cards) with wind sway, bending away from animals, denser at the lane edges and thinner where animals run.
- **Runtime track profile** (`challenge-<n>.profile.json` and `course-base.profile.json`), generated by a Blender script that raycasts down each lane every 0.25 m. Per lane it stores:
  - ground height and normal
  - surface type (`grass | dirt | rock | mud | water | log | wood | leaves`)
  - water or mud surface height
  - **action zones**: jump markers, climb ledges, log centerline and radius, vine anchor point and rope length, swim depth

  The animation system and the tests both use this file.

### 8.3 The world around the track (the 3D jungle)

| Layer | Distance from the track | Content |
|---|---|---|
| Foreground framing | between the camera and lane 4 | Occasional big ferns and leaves at the frame edges, swaying slightly. They **fade out when they would cover a racer** |
| Track edge, near side | 0–3 m | Grass tufts, small rocks, flowers, roots |
| Track edge, far side | 0–6 m behind lane 0 | **Spectators** (§8.5), rope posts, rocks, ferns, palms |
| Mid-ground | 6–40 m | **Real 3D trees** (big trunks with buttress roots), hanging lianas, a bamboo cluster, shrubs. Parallax comes from the moving camera itself |
| Far | 40–200 m | 2–3 layers of tree-line cards at different depths, softened and blued by height fog |
| Sky | dome | A soft gradient with painted clouds, visible as a strip at the top as in the reference |

- **Motivated light shafts** appear only where the canopy has a gap. They are soft additive cards, used sparingly.
- **Wind:** one global wind direction and strength drives grass, ferns, leaves and vines together. Everything sways in agreement.
- Drifting leaves and a few insects near the camera, very sparse, from seeded pools.

### 8.4 Biome palettes (fixed)

| Biome | Key colors |
|---|---|
| Meadow and grass | grass `#5E9A3A` → `#86B84E` (lit), shadow `#2F5A3A` |
| Dirt and track | `#9A7448`, lit `#B88E5A`, shadow `#5C4632` |
| Rock (boulder) | granite `#8C8A80` with moss `#5F7F3A`, shadow `#4A5560` |
| Water | shallow `#4FB3A9` → deep `#1F6B73`, foam `#EAF6F0` |
| Mud | `#5B4330`, wet highlight `#8A6A4C` |
| Sky and fog | sky `#9FD3E6` → `#DCEFF2` at the horizon, fog `#8FB8A8` |

### 8.5 Spectators (life in the background, like the reference)

- 6–10 characters: monkeys (3), a gorilla (1), meerkats (3), parrots and toucans (2–3) on branches.
- Low-poly, using the same shader, with **3 clips each**: idle, cheer, jump or clap. A parrot flock flies over once per race (seeded).
- They **turn their heads to follow the leader** as it passes and **cheer at the finish**.
- Instanced where possible. Budget: 1.5k triangles each, all sharing one 512² texture atlas.

---

## 9. The five challenges

Every challenge occupies 0.40–0.60 of the track (about 60 m), across all 5 lanes.
- **The home animal does a signature move.** The choreography already makes it overtake here.
- **Everyone else struggles in a way that fits their species.**
- **All motion is driven by the exact engine position**, so nothing can contradict the result.

### 9.1 Boulder Ridge (home: Lion)

| | |
|---|---|
| **Set piece** | A 32 m granite whaleback across all lanes. The climb face rises **4.5 m** over 3 uneven ledges (0.6–0.9 m high each). A cracked, mossy crest. A steep two-step descent onto scree. Loose pebbles at the base. Matches the reference at 47–50 s |
| **Everyone** | `climb_scramble`: front paws reach for each ledge (foot IK places them on it), hind legs drive, body pitched steeply up. On the crest, a short stretch along the ridge line, then `descend_hop` down the steps with landing compression |
| **Lion (signature)** | `climb_bound`: two powerful bounds, ledge to ledge. Lands on the crest with the mane flaring, a beat of silhouette against the sky, then **leaps the whole descent** in one jump. Heavy dust burst and a 0.15 s camera shake (off with reduced motion) |
| **Species color** | The wolf picks lines nimbly. The boar shoves up stubbornly with short hops. The cheetah springs lightly but slips once (a seeded back-paw slip, visual only). The squirrel scurries up the face almost vertically |
| **Effects** | Pebble trickles from footfalls, dust at the base, small rocks bouncing down the face |
| **Camera** | Rises 2 m and tilts 6° down during the climb to show the height, then drops back on the descent |
| **Audio** | Rock scrapes, pebble trickles, effort grunts, heavy landing thuds |

### 9.2 Mud Pit (home: Boar)

| | |
|---|---|
| **Set piece** | A 22 m pit, **1.2 m deep**, with sloped root-laced banks and a viscous, glossy mud surface that bubbles slowly. Matches the reference at 182–188 s |
| **Everyone** | Hop down the bank, then `wade`: high knees, body low. **The mud surface hides everything below the chest.** Ripple rings spread from each animal, splats fly, and mud clings. Then they claw up the far bank and `shake_off`. **A mud coat** stays on the legs and belly and dries lighter over about 10 s |
| **Boar (signature)** | `slide_in`: a **belly slide** off the bank, 4 m across the surface, then a "plough" with a bow wave off the snout, happy grunts, and a tail spin on the way out. Sinks less, so its shoulders stay visible |
| **Species color** | The squirrel swims with its **tail held high** (straight from the reference). The cheetah keeps its head high and flicks its ears, clearly not enjoying it. The lion wades with deep, heavy strides. The wolf moves steadily, head up |
| **Effects** | Ripple texture per animal, mud splats, bubbles, wet gloss on the coat |
| **Camera** | 8° steeper, looking *into* the pit |
| **Audio** | Bubbling bed, squelches, plops, a happy boar |

### 9.3 River Swim (home: Wolf)

| | |
|---|---|
| **Set piece** | A 26 m river crossing the lanes and flowing toward the camera. Shallow entry (0.3 m, 4 m long), a **deep channel (1.6 m)**, then a shallow exit and a pebble bank. Flowing water shader: flow map, depth color, intersection foam, sky reflection by fresnel |
| **Everyone** | `wade` with splashes into `swim`: **only the head, back line and tail stay above water.** Paddling legs are dimly visible through the water by depth fade. A V-shaped wake trails each swimmer, and the current pushes each animal a little downstream inside its lane before it corrects. Then `swim_exit_climb` and `shake_off` with a lit spray arc. The coat stays wet and darker for about 4 s |
| **Wolf (signature)** | A sleek, powerful swim with a small wake, head perfectly steady and ears forward. It leaves the water first and does a **full-body shake** in mid-stride |
| **Species color** | The cheetah paddles frantically with big splashes. The squirrel paddles with its tail as a rudder. The boar is a steady, strong swimmer. The lion swims with its mane soaked flat, which is funny on purpose |
| **Camera** | Drops lower toward the water (pitch −22°) to show the surface |
| **Audio** | A river flow bed, splashes, paddling, shake spray |

### 9.4 Log Bridges (home: Cheetah)

| | |
|---|---|
| **Set piece** | A gorge with fast white water about 2 m below. **One mossy log per lane** (as in the reference at 92–96 s), 18 m long and 0.5–0.7 m thick. Each log sits at a slightly different height and tilt. A waterfall drops just downstream on the right, with mist |
| **Everyone** | `balance_run`: feet placed narrowly on the log's centerline by IK, tail counterbalancing, and a body roll wobble driven by a spring. **Logs dip and roll slightly** under heavy footfalls. A scrabble at a knot (seeded) |
| **Cheetah (signature)** | Sprints flat out along the log with **double-suspension leaps** and the tail swinging as a counterweight, then a long leap from the log's end onto the bank |
| **Species color** | The boar trots carefully with short steps. The lion is heavy and the log dips noticeably. The wolf trots evenly. The squirrel scurries naturally and fast, but isn't the home animal |
| **Effects** | Spray where the water hits the logs, mist drifting from the falls, wet bark where the feet land |
| **Camera** | Slightly lower and closer, so the drop to the water reads |
| **Audio** | A white-water bed with the waterfall roar, hollow log thumps, creaks |

### 9.5 Vine Gorge (home: Squirrel)

| | |
|---|---|
| **Set piece** | A 14 m ravine with a **waterfall backdrop** and mist (as in the reference at 0–6 s). A giant overhanging branch holds **one vine per lane**. Rocky lips on both sides |
| **Everyone** | `vine_grab` at the lip: the big animals bite the vine (cartoon logic), then `vine_hang` through the swing, then `vine_release` and `jump_land` on the far lip. **The swing angle is mapped from the engine's position**, so a half-swing moves steadily forward and matches `x(t)` exactly. The vines are verlet ropes (16 segments) that **keep swinging after release** |
| **Squirrel (signature)** | No swing needed. It **runs up its vine, scampers along the branch and dives down** to the far lip, tail streaming. The most acrobatic moment in the game |
| **Species color** | The lion hangs on heavily and the vine stretches. The boar spins slowly on its vine, legs paddling. The cheetah swings cleanly. The wolf scrambles with its hind legs on landing |
| **Effects** | Leaves shaken loose from the branch, waterfall mist and spray, rope creak |
| **Camera** | Pulls back and up to show the whole arc, then follows the swing down |
| **Audio** | Waterfall bed, vine creaks and whooshes, landing thuds |

### 9.6 Preview during betting

The stage shows a slow camera drift across this round's challenge set piece during the countdown. The **course preview tile** (top-left, §13.3) shows the terrain icon. The set piece's sounds play softly in the background. No "AHEAD" signs.

---

## 10. Camera and presentation

### 10.1 The race camera

| Parameter | Default | Notes |
|---|---|---|
| Projection | Perspective, vertical FOV 30° | Long enough to keep shapes flat-ish and stylized, short enough for depth |
| Pitch | −30° (looking down) | Changed per challenge, ±8° (§9) |
| Yaw | 0–5° toward the running direction | Lanes recede slightly, as in the reference |
| Framing | Visible width about **13 m** at the lane center | Puts the lion at about 17% of the frame width |
| Target | The **leader sits at about 35% from the left edge**, leaving room ahead | The trailing pack may leave frame on the right during big spreads. In the final 15%, the framing favors the top 3 (what bets depend on) |

### 10.2 Smoothness of the camera

- The whole race path is known in advance, so the camera path is **precomputed**: pack target sampled at 20 Hz, smoothed with a **zero-phase** filter (forward plus backward, so it never lags), then evaluated as a spline.
- The result is perfectly smooth, deterministic for replays and screenshots, and never jerks at a lead change.
- Reduced motion: no shake, half the pitch changes, slower pans.

### 10.3 The betting-phase stage

- The camera holds a slow drift: over the start line with the racers in `idle`, `idle_look` and `idle_fidget` (seeded variety), then across this round's challenge.
- Warm-up touches: at random seeded moments, one racer trots a few meters and returns, as in the reference.
- **Lineup:** the racers step to the line and drop into `ready` crouches. The start rope drops. `burst`.

---

## 11. Start, finish and podium in 3D

### 11.1 Start

A chalk start line across all 5 lanes, two bamboo posts with a rope that **drops on go** (reference at 134 s), and a puff of dust from the `burst`.

### 11.2 Finish

- A **checkered band painted on the ground**: a decal following the terrain, with a white leading edge.
- Two carved wooden posts with a woven banner carrying only the checkered-flag motif (no text).
- **The finish tape** is a verlet rope that the winner snaps. The halves whip away.
- The photo finish (15% of races) keeps V2's flash-freeze, rendered in 3D: a 0.12 s freeze with a thin line on the finish edge.
- After crossing: the winner plays `celebrate`. The others cross and play `slowdown` and `pant_idle`. Spectators cheer.

### 11.3 Podium (about 5 s, timeline as in V2 §5)

- **The set:** a clearing with three **carved stumps** (2nd left, 1st center and tallest, 3rd right), vines and leaf garlands, and a painted wooden sign with the game's leaf logo mark (no slogan). The camera is static and frontal, as in the reference.
- **Sequence:**
  1. `podium_hop_on` in the order 3rd, 2nd, 1st.
  2. Bronze, then silver medals drop with `medal_bow`.
  3. The trophy lowers into the winner's paws (`trophy_hold`), then `trophy_raise` twice. Leaf confetti and camera flashes.
  4. `wave` for 2nd, a nod for 3rd.
- **Upright poses** use the same skeleton, with corrective shape keys for the lumbar bend and hips. The front paws act as hands, and the trophy is parented to a paw socket bone. Medal ribbons are short spring chains, so they swing.
- **Metals:** gold `#D4AF37`, silver `#C0C0C0`, bronze `#CD7F32`, with a real metallic response in the same shader (an environment probe of the clearing).
- The result card (§13) sits over the bottom edge of the podium. Everything stays inside the 16:9 safe area at every viewport (V2 test kept).

---

## 12. Audio

### 12.1 Goal

An immersive, **field-recorded** jungle that changes with the course, a music bed that fits an arcade race without dominating it, and physical foley so every contact is heard. Sound stays **opt-in**: off until the player turns it on.

### 12.2 Sound list

| Category | Sounds | Notes |
|---|---|---|
| **Ambience beds** (seamless loops of 60–90 s) | Jungle day (birds, insects, distant monkeys). River and waterfall. White-water gorge. Mud bubbling. Rocky ridge wind | Crossfaded by **camera position along the course**: the river grows louder as the camera approaches it |
| **Music** | Betting loop (about 60 s: light marimba, hand percussion). Race track (about 40 s loop: driving drums and bass) plus a **final-stretch layer** that fades in for the last 15%. Win fanfare (about 4 s). Podium loop (about 20 s) | Ducked by 6 dB under stingers and animal vocals |
| **Footsteps** | 4–6 variations for each surface: grass, dirt, rock, leaves, wood (log), mud squelch, water splash | Driven by footfall events. Stereo pan by screen position. At most 6 voices, nearest and leader first |
| **Body and contact** | Jump take-offs and landings (light and heavy), scree slides, splash crowns, a wake, shake-off spray, vine creak and whoosh, log thumps, tape snap | |
| **Animal vocals** | Lion roar and grunts. Wolf howl and huff. Boar grunts and a happy squeal. Squirrel chatter. **Cheetah chirps** (cheetahs really chirp, a distinctive real detail). Panting loops | Winner celebration and occasional effort sounds, seeded |
| **Spectators** | Monkey hoots, parrot squawks, gorilla chest-beat, a group "crowd" cheer at the finish | |
| **UI** | Chip place, undo, clear, ticks for the last 5 s, lock/"go", coin count-up, a soft loss tone | Short, dry, quiet |

### 12.3 Sources (licensing that allows a published game)

| Source | License | Use |
|---|---|---|
| **Sonniss GameAudioGDC bundles** | Royalty-free, commercial use, no attribution | Ambience, foley, animal vocals. Rules: no claiming authorship, no reselling the raw sounds, no AI training |
| **Freesound, CC0 only** (filter `license:"Creative Commons 0"`) | Public domain | Gaps: specific animal calls, UI. CC-BY is avoided to keep credits simple; if one is needed, it is credited |
| **Kenney audio packs** | CC0 | UI clicks and coins |
| **Music** | CC0 or royalty-free purchased, or commissioned | See §19 |
| Excluded | BBC Sound Effects (RemArc, non-commercial), anything without an explicit license | |

Every file gets a row in **`public/licenses/audio.csv`** (file, source URL, author, license, date). The build **fails** if a shipped audio file has no license row.

### 12.4 Selection workflow (your ears decide)

1. I gather 3–5 candidates per slot. The Sonniss bundles are multi-GB downloads you start; Freesound needs a free account or API token from you.
2. **Audition lab** (`?lab=audio`, dev only): every candidate plays **in context over a running race**, with its license shown. You pick per slot.
3. Processing (`scripts/build-audio.ts` using `ffmpeg-static`): trim, **equal-power loop crossfades** for beds, loudness normalization, encoding.

| Bus | Loudness target |
|---|---|
| Music | −18 LUFS integrated |
| Ambience | −24 LUFS |
| Effects | peaks ≤ −3 dBTP |
| UI | about −20 LUFS short-term |

### 12.5 Format and loading

- **Opus in WebM** (96 kbps stereo for beds and music, 64 kbps mono for effects), with an **AAC `.m4a` fallback** for older Safari. Howler picks the first format the browser plays.
- Effects are packed in sprites per category. Beds and music stream (`html5: true`).
- **Nothing audio is downloaded until sound is turned on.** Then: the ambience and the betting loop first, the rest in the background.
- Mixing buses: music, ambience, effects, UI. Settings stay simple: **Sound on/off** and **Music on/off**.

---

## 13. Minimalist UI

**Principle: less is more.** Numbers, portraits and icons carry the interface. Words appear only where an icon can't say it. Every icon-only control keeps an `aria-label` and a tooltip for accessibility.

### 13.1 Text audit (current strings → action)

| Where | Current text | Action |
|---|---|---|
| Header | "THE JUNGLE ARCADE", "How to play", "Statistics" | Remove the badge. Make the links icons (ⓘ, chart) |
| Header | "JUNGLE / ESPORTS" wordmark | Keep the mark plus a compact wordmark |
| Wallet | "YOUR COINS" | Remove the label. Coin icon plus amount |
| Page intro | "FIVE RACERS. ONE CROWN.", "Back your beast. Chase the crown.", "A little instinct…", "LIVE ROUND #0001" | **Remove the whole block.** The round number moves into the stats modal |
| Stage top bar | "JUNGLE LIVE", "MOONLIT JUNGLE CIRCUIT", phase pill | **Remove the bar.** The phase shows only through the countdown and state of the controls |
| Stage overlay | "PLACE YOUR PICKS / THE JUNGLE IS CALLING / The contenders are ready…", "THE WILD IS RUNNING", "RIGHT → LEFT / ONE TRACK. FIVE WILD CONTENDERS." | **Remove all of them** |
| Stage | "BETTING CLOSES IN" | Remove. The countdown number speaks for itself |
| Stage controls | "Theater", "Fullscreen" text buttons | Icon buttons |
| Below the stage | Challenge banner: "THIS ROUND'S TERRAIN / <name> / <description> / 2.5× STRENGTH" | **Remove the banner.** Replaced by the in-stage course tile (§13.3). The 2.5× rule lives in the rules modal |
| Betting board | "Meet your contenders" | Remove (the tabs stay) |
| Odds cards | **"WIN CHANCE" + percentage + bar** | **Remove** (your request) |
| Odds cards | Trait line ("Raw power"…), nickname, number "01" | Remove. Show **portrait, species name, form icon, odds buttons** |
| Odds cards | "HOME TURF" text badge | A small terrain icon on the home animal's portrait |
| Chip tray | "MAKE YOUR MOVE", "Choose a chip, then a racer." | Remove |
| Bet slip (empty) | "Your bet slip", "Pick your wild card.", "Your jungle champion is out there.", "Tap a racer's odds to place a chip." | A slip icon plus **one line: "Tap odds to bet"** |
| Bet slip | "Total stake", "Max. possible return", "Your picks are locked. Enjoy the race." | Keep the two figures with short labels ("Stake", "Max return"). Remove the locked sentence; a lock icon is enough |
| Bet slip | "Watch this race" | Keep the function as a short **"Start"** button with a ▶ icon |
| Bet slip | "Free to play. Virtual coins only." | Moves to the single footer line |
| Recent champions | "Recent champions", "LAST 20 RACES", "A clean slate…", "Race stats" | **The section moves into the stage** (§13.2), with no title text. Stats are reached from the header icon |
| Result card | "YOUR RETURN", "coins credited" | Portrait, odds, **+/− coins** only |
| Footer | "A wild little escape.", "Virtual coins. Real jungle energy.", "95% target return", "Game rules & odds" | **One line:** "Virtual coins only · Rules". The 95% figure lives in the rules modal |
| Settings | "Racer number markers / Show team numbers above each animal." | **Remove the setting** (numbers are gone). Other settings get one-line labels |

**Measurable target:** visible text on the betting screen, excluding numbers and the rules modal, drops from about 200 words to **≤ 40 words** (checked by a Playwright test). The 40 words are roughly: five species names, the Win and Top 2 labels, the bet-type tabs, the slip labels, the course tile word and the footer line.

### 13.2 Recent Champions: a vertical column inside the stage (right edge)

- **Position:** inside the race stage, docked to the right edge and vertically centered, as in the reference's "last 10 rounds" column. A translucent rounded panel, about 56 px wide on desktop and 40 px on phones.
- **Content:**
  - The **last 10 winners' portrait heads**, newest at the top, with the newest highlighted by a ring.
  - A tiny clock icon at the top instead of a title.
  - Hover or focus shows a tooltip ("Round 123 · Lion").
  - Click or tap opens the **replay**, which already exists. On phones it shows 6.
- **Visibility:** shown during betting, result and podium; **hidden while the race runs**, so the race view stays clean. The same in normal, theater and fullscreen modes.
- The **bottom History section is deleted.** History is still saved up to 20 races, for stats and replays. Lifetime terrain stats stay in the stats modal.

### 13.3 In-stage layout (mirrors the reference positions, minimal styling)

```
┌───────────────────────────────────────────────────────────────┐
│ [terrain tile]              ( 17 )                       ┌──┐ │
│                          countdown                       │🕒│ │
│                                                          │🦁│ │
│                        3D field                          │🐺│ │
│                                                          │🐗│ │
│                                                          │…│ │
│ [⏸]                                         [⛶] [▭]     └──┘ │
└───────────────────────────────────────────────────────────────┘
```

- **Top-left:** the course tile (terrain icon, plus the terrain name in one short word, e.g. "Mud").
- **Top-center:** the countdown, number only, with a thin progress ring.
- **Right:** the history column.
- **Bottom corners:** icon controls.
- **During the race:** only ⏸ and the icon controls, at 60% opacity.

### 13.4 Betting board (below the stage in normal mode)

- **Cards are portrait-first** (rendered from the 3D models, §6.7): portrait, species name, form icon (Tired, Normal, Hyped), then **Win** and **Top 2** odds buttons. The terrain icon marks the home animal.
- Exacta and Quinella keep their grids. Headers become two-letter column and row labels with portraits.
- Chip tray: chips only. Undo, clear and repeat are icon buttons, as today.
- The theater/fullscreen `StageHUD` drawer gets the same trimming. It never showed win chance, so nothing to remove there.

### 13.5 Visual style of the UI

- Keep the existing dark jungle panel style, but **flatter and quieter**: fewer borders, no decorative eyebrows, a single accent color for interactive states, and team colors only as thin portrait rings.
- Fonts unchanged (Lilita One for numbers and headlines, Nunito for text).

---

## 14. Engine, data and save changes

The engine math is untouched. These are the data and persistence edits:

| File | Change |
|---|---|
| `engine/config.ts` | `ANIMALS` → Lion, Wolf, Boar, Squirrel, Cheetah (IDs 0–4 in that order). Nicknames and traits dropped. `CHALLENGES` → Boulder Ridge (home 0), River Swim (1), Mud Pit (2), Vine Gorge (3), Log Bridges (4), with one-word short names. `FORM_WEIGHTS`, `CONFIG` and odds limits are unchanged |
| `engine/round.ts` | `SaveData.version: 3`, with **v2 → v3 migration** (below). No phase or timeline changes |
| `engine/choreography.ts` | **Unchanged** (unless you pick the shorter race in §19) |
| Tests | Odds, RTP (1M draws), choreography and round tests run unchanged. New migration tests |

**Migrating a v2 save** (the species and terrains changed, so old records would be misleading):
1. If the v2 round is **unsettled with an order already drawn** (locked or later), **settle it first under v2 rules** and credit the payout.
2. If it is still in **betting**, **refund** the reserved stakes.
3. Keep the **balance** and the **daily refill date**.
4. Reset the **history and terrain statistics** (they describe animals and terrains that no longer exist), and start a fresh v3 round.
5. Show a one-time toast: "New racers! History reset." (≤ 4 words of text).

---

## 15. Performance and download budgets

**Reference hardware:** this development laptop (Intel Iris Plus G1, Ice Lake integrated GPU, 4 cores, 11 GB RAM) stands in for "mid-range laptop". On phones, the target is recent mid-tier Android and iPhone 12 or newer.

| Budget | Target | V2 today |
|---|---|---|
| Frame rate | **60 fps at 1080p on the dev laptop** (High or Medium tier, p95 frame time ≤ 17.5 ms). Phones: 60 fps on Medium/Low, never below 30 | 60 fps |
| Draw calls | ≤ 150 in the race | ≤ 60 |
| Visible triangles | ≤ 450k | – |
| Animals | 5 skinned meshes, about 42 bones each (bone textures), LOD1 for lanes 0–1 on Medium | – |
| JS (gzip) | **≤ 350 KiB** (three.js about 150 replaces Pixi at 170) | about 225 KiB |
| Each animal GLB | ≤ 450 KiB (meshopt + WebP) | – |
| `course-base.glb` + shared kit | ≤ 1.8 MiB | – |
| One challenge insert | ≤ 900 KiB | – |
| **First load** (JS, 5 animals, base course, current challenge, UI, fonts) | **≤ 5.5 MiB** | 2.5 MiB |
| Full offline cache (without audio) | ≤ 9.5 MiB | 4 MiB |
| Audio (lazy, only after sound is turned on) | ≤ 4 MiB total, ≤ 1 MiB before the first race with sound | about 0.4 MiB |
| GPU memory | ≤ 256 MiB | – |

These budgets are larger because real 3D assets weigh more. `scripts/check-budget.ts` is rewritten for the new asset kinds and fails the build when any of them is exceeded.

**Quality tiers** (chosen automatically from measured frame time, with an override in Settings):

| | High | Medium | Low |
|---|---|---|---|
| Shadows | 2048² soft | 1024² | Baked blob shadows |
| Antialiasing | MSAA 4× | MSAA 4× | SMAA, no MSAA |
| Grass density | 100% | 60% | 25% |
| Foreground leaves, spectator count | All | All | Half |
| LOD switch | Lanes 0–1 use LOD1 beyond 25 m | Lanes 0–1 always LOD1 | All LOD1 |
| Resolution scale | Up to device pixel ratio 2 | ≤ 1.5 | 0.6–1.0, adaptive (V2 logic kept) |

**No hitches:**
- Shaders are pre-compiled during betting, and textures are uploaded (`renderer.initTexture`) before the race.
- No per-frame allocations in hot paths: vectors and quaternions are pooled.
- Particles come from fixed pools.

---

## 16. Tests, quality gates and human review

### 16.1 Engine and data

- All existing tests run unchanged: odds, 1M-draw RTP, choreography and round.
- New: **v2 → v3 migration** (settle locked rounds, refund betting rounds, keep balance, reset history), and config shape tests (5 species, home mapping 0..4).

### 16.2 Rig and animation (automated in `scripts/check-3d.ts` and Vitest, with no browser)

These checks turn "connected, smooth, not robotic" into numbers:

| Check | Rule |
|---|---|
| **One body** | Each animal's body is **one skinned primitive**. Eyes, teeth, claws and fur cards are skinned to the *same* skeleton. No mesh is parented directly to a bone (which would leave it rigid) |
| Weights | Every vertex: weights sum to 1 ± 1e-3, at most 4 influences, and no unweighted vertices |
| **Tail attached** | Over every clip sampled at 60 Hz, the gap between the tail-root ring and the pelvis ring never grows more than 10% beyond its rest value |
| **Legs attached** | The same seam check for the shoulder/axilla and hip/groin rings, plus a volume-loss check: the cross-section at the elbow and knee stays ≥ 70% at maximum flexion |
| **No stops** | In every locomotion clip, no joint's angular speed drops to zero for more than 1 frame unless the clip marks a hold (V2's smoothstep bug cannot come back) |
| Seamless loops | First and last pose of each loop match in position and velocity within tolerance |
| **No foot slide** | At nominal speeds of 8–18 m/s with the runtime playback rate: stance-foot drift < 2 cm |
| No ground penetration | Feet on sampled course profiles: < 1.5 cm below the ground (except mud and water zones) |
| Joint limits | Elbow, knee and hock angles inside per-species limits (no hyperextension) |
| Silhouettes | Pairwise silhouette IoU < 75% from the game camera, as in V2 |

### 16.3 Rendering and UI (Playwright)

| Check | How |
|---|---|
| Visual baselines | Seeded race, frozen clock: **for each challenge** at entry, middle and exit, plus the start, the finish crossing and the podium. 3 viewports (4:3, 16:9, 21:9) |
| Determinism | The same seed and time give the same frame (pixel difference < 0.5%), live and in replay |
| Camera framing | The leader's bounding box stays inside the frame and ahead of 30% from the left edge for the whole race. The top 3 stay in frame for the final 15% |
| UI | No "WIN CHANCE" anywhere. The history column sits inside the stage's right edge and is hidden during the race. **≤ 40 words** of visible text on the betting screen. Every icon button has an `aria-label` |
| Fullscreen and theater | V2 tests kept |
| Podium fits | All 3 stumps and animals fully on screen at every tested viewport (V2 test kept) |
| Performance | The `?debug` overlay reports p50/p95/p99 frame times, draw calls and triangles. The p95 budget is checked by hand on the dev laptop at each milestone |

### 16.4 Human review gates (the subjective bar, judged by you)

At each gate I publish a **review page** with:
- turntables
- every clip in a loop with a speed slider
- wireframe and bone overlays
- motion trails (to check arcs)
- in-game captures
- a **side-by-side with the reference stills**

| Gate | When | You approve |
|---|---|---|
| **G1 Style frame** | End of V3.1 | One still: the lion blockout on the base course under the final lighting. **The look and the camera**, before detailed work starts |
| **G2 Lion slice** | End of V3.2 | The finished lion: model, textures, gallop, idle, jump, on a hilly course with shadows and foot IK. **The go/no-go for in-house modeling** (§6.2) |
| G3 Roster | End of V3.3 | All five animals plus portraits |
| G4 Courses | During V3.4/V3.5 | The base course, then each challenge as it lands |
| G5 Sound | V3.7 | Picks made in the audition lab |
| G6 Final | V3.8 | A full round in every mode on your devices |

---

## 17. Milestones

Ordered so the quick visible win lands first and the riskiest part (in-house animal quality) is proven early, before the bulk of the work.

| # | Milestone | Size | Deliverables | Exit criteria |
|---|---|---|---|---|
| **V3.0** | **Minimalist UI** | S | All of §13 on the *current* renderer: text audit applied, win chance removed, history column in the stage, footer down to one line, setting removed | UI tests pass. ≤ 40 words. You see the new UI right away |
| **V3.1** | **3D foundation** | M | Blender toolchain plus scripted pipeline skeleton. `src/render3d/` scaffold behind `?renderer=3d`. Shared toon-PBR shader. Lighting, fog, camera system, lane geometry. A greybox base course with profile export. The lion blockout running a placeholder cycle. Debug overlay. Performance baseline on the dev laptop | **G1** approved. Greybox runs at 60 fps on the dev laptop |
| **V3.2** | **Lion vertical slice** | L | Final lion: model, fur cards, textures, skeleton, weights, correctives. Clips: idle, ready, burst, canter/gallop, jumps, slowdown, celebrate. Runtime layers 1–7. Contact shadows. Lion portrait | **G2** approved (or switch to the fallback, §6.2). All §16.2 rig checks pass for the lion |
| **V3.3** | **Wolf, Boar, Squirrel, Cheetah** | XL | Same quality bar as the lion. All locomotion and podium clips, portraits. Config and roster switch plus the **v3 save migration** | **G3** approved. Rig checks pass for all five. Silhouette IoU < 75% |
| **V3.4** | **Base course and jungle** | L | Final `course-base.glb`: hills, dips, mixed ground, log hop, creek splash, grass, trees, far layers, sky, foreground framing, spectators, start posts, finish set and tape. Camera smoothing, framing rules and lineup flow | G4 (base) approved. Budget and frame-time targets met |
| **V3.5** | **Five challenges** | XL | Boulder Ridge, Mud Pit, River Swim, Log Bridges, Vine Gorge, with all clips, water and mud shaders, coat wetness, ropes, the logs' spring response, effects, camera moves, betting-phase preview | G4 per challenge. Visual baselines recorded. Determinism tests pass |
| **V3.6** | **Podium and results in 3D** | M | 3D podium set, upright poses, trophy and medals, sequence, result card restyle | Podium-fit tests pass. G6 preview |
| **V3.7** | **Audio overhaul** | M | Sourcing, audition lab, processing pipeline, all §12.2 sounds wired to events, buses and ducking, license manifest | **G5** approved. The license check passes |
| **V3.8** | **Polish, cleanup, ship** | M | Performance pass on all tiers. Remove the Pixi renderer, `create-art.ts`, `create-v2-art.ts`, the 2D atlases and the `pixi.js` dependency. Rewrite `check-budget.ts`. Update the README. Final baselines | **G6** approved. Every test and budget green. `npm run build` clean |

V3.0 doesn't depend on the 3D work. V3.7 (audio sourcing) can run in parallel from V3.2 onward, because it only needs your ears and the event hooks.

---

## 18. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **In-house scripted modeling doesn't reach the quality bar** | Medium–High | High | Proven on the lion first (G2) before investing in four more. Clear fallback to one licensed or commissioned set (§6.2). Same rig template and shader either way, so the animation and terrain work isn't lost |
| Frame rate on integrated GPUs and phones | Medium | High | Budgets from day 1, measured on the dev laptop at every milestone. LODs, quality tiers, baked lighting, instancing |
| Download size triples | Medium | Medium | meshopt + WebP. Challenge inserts loaded on demand. Audio only after it is enabled. Budgets enforced by the build |
| The upright podium pose deforms badly on a quadruped rig | Medium | Medium | Corrective shape keys. If still poor, a dedicated podium mesh variant sharing textures |
| Water and mud intersections look cheap | Medium | Medium | Depth-based foam, coat-wetness masks, and tuning in the lab with close-up captures |
| Tails, manes and vines misbehave at low frame rates | Low | Medium | Fixed 120 Hz substeps with interpolation, independent of rendering |
| Blender won't render headless on this machine | Low | Low | Blender is only needed for modeling, rigging and Cycles CPU bakes. All review renders use the game renderer in Playwright |
| Copying the reference too closely (IP) | Low if the rule is followed | High | Copy the experience and layout only. All characters, art, logo and audio are ours or licensed (§1.6) |
| Audio quality is subjective and needs ears | Certain | Low | The audition lab, and you choose |
| WebGL context loss on mobile | Low | Medium | A restore handler rebuilds resources from cached glTF data |

---

## 19. Decisions (defaults chosen; tell me to switch any)

| Question | Default | Alternative |
|---|---|---|
| Rendering technology | **three.js real-time 3D** | Pre-rendered 3D sprites kept in Pixi (fixed angles, much weaker terrain interaction) |
| Where the animal models come from | **Built in-house in Blender**, all five in one style, **gated on the lion** | License one consistent stylized pack covering all five species, or commission an artist (costs money, could reach higher fidelity sooner) |
| Visual style | **Stylized "Jungle Toon 3D"** like the reference | Semi-realistic PBR (closer to V2's documentary direction; heavier and harder to make consistent) |
| Lane order and IDs | **Lion, Wolf, Boar, Squirrel, Cheetah**, the order you listed | Keep V2's order with Boar and Wolf replacing Warthog and Hyena |
| Home terrains | **Lion → Boulder Ridge, Wolf → River Swim, Boar → Mud Pit, Squirrel → Vine Gorge, Cheetah → Log Bridges** | Swap Cheetah and Wolf (cheetah swims, wolf on logs). Less natural |
| Animal size | **About 1.6× V2** (lion about 17% of the frame width), a tunable constant | Reference scale, about 25% (bigger, tighter framing, less course visible) |
| Race length | **Keep 19–21 s** (more time for the set piece to read; no engine change) | Shorten to about 12 s like the reference (choreography constants change, new validation, faster pace) |
| Animal names | **Species names only** | Keep nicknames (Rex, Mudzilla…) |
| Team colors | **UI only** (portrait rings, chips) | A subtle colored collar on each animal |
| Podium | **Top 3** (gold, silver, bronze, as you asked in V2) | **Winner only**, like the reference |
| Music | **Ambience plus a light music bed** (separate toggle) | Ambience and effects only |
| History column length | **10** (as in the reference; 6 on phones) | 20 |
| v2 save history | **Reset** (it describes animals that no longer exist); balance kept | Map Warthog → Boar and Hyena → Wolf, and keep it |

---

## 20. Out of scope

- New bet types, accounts, multiplayer, real money or cash-out, leaderboards.
- More than five animals, or more than one set-piece challenge per race.
- The reference's attract/title loop.
- WebGPU-only rendering (WebGL2 stays the baseline; three's WebGPU renderer can be explored later).
- Localization changes.

---

## Appendix A: Species spec sheets

Sizes are the **stylized game sizes** in meters (not real animals; the squirrel is scaled up a lot). Use these as starting values in `spec.json`.

### A.1 Lion

| Item | Value |
|---|---|
| Body length (nose to rump) / shoulder height | 2.30 m / 1.10 m |
| Head : body length | 0.24 (stylized up from about 0.2) |
| Leg segments, fore (humerus : radius : metacarpal) | 0.34 : 0.32 : 0.14 of shoulder height |
| Tail | 0.95 m, 6 bones, tuft card at the tip |
| Coat | `#C8873E`, belly `#E9C891`, mane roots `#B5713A` → tips `#5A2E1A`, nose `#6B3B33`, eyes amber `#E0A030` |
| Fur cards | Mane in 3 layered rings (spring-driven), elbow tufts, tail tuft |
| Details | Healed scar through the left brow. A slightly lighter lock in the mane. Whisker spots |
| Personality | Confident and heavy. Looks at rivals. Winner: a roar with the mane flaring |

### A.2 Wolf

| Item | Value |
|---|---|
| Body length / shoulder height | 1.75 m / 0.88 m |
| Head : body | 0.22 |
| Legs | Long, with big paws (stylized 1.25×) |
| Tail | 0.55 m, 6 bones, bushy cards |
| Coat | Slate blue-grey `#7B8794`, saddle `#4A525C`, underside and mask `#E6E0D2`, eyes `#E8A93A` with dark rims, nose `#222326` |
| Details | Notched left ear. Dark tail tip. Tongue out at speed (shape key) |
| Personality | Focused and economical. Ears forward. Winner: a howl |

### A.3 Boar

| Item | Value |
|---|---|
| Body length / shoulder height | 1.55 m / 0.90 m |
| Head : body | 0.30 (wedge-shaped) |
| Legs | Short and stocky, hooves |
| Tail | 0.30 m, 4 bones, tasseled |
| Coat | Russet-brown `#7A4A3A`, bristle ridge `#3B2620`, pinkish snout and ears `#D9938A` (a nod to the reference's pink boar), tusks `#F1E6CF`, mud socks `#5B4330` |
| Details | Chipped right tusk. A bristle mohawk that rises as speed builds. A wet snout highlight |
| Personality | Stubborn and joyful in mud. Winner: a happy grunt and tail spin |

### A.4 Squirrel

| Item | Value |
|---|---|
| Body length / shoulder height | 0.95 m / 0.45 m, plus a 0.95 m tail |
| Head : body | 0.30 |
| Tail | 10 bones, layered fur cards, an S-wave spring |
| Coat | Deep maroon back `#6E2236`, saddle `#3A1622`, cream belly `#F0DDB8`, tail `#4A1A2A` with a cream underside `#E8D3A8` |
| Details | Ear tufts. Long hind feet. Quick blinks |
| Personality | Twitchy and acrobatic. Head checks. Winner: chatters standing on its hind legs |

### A.5 Cheetah

| Item | Value |
|---|---|
| Body length / shoulder height | 2.05 m / 0.92 m |
| Head : body | 0.18 (small head) |
| Legs | Very long and thin. Deep, narrow chest. Waisted belly |
| Tail | 0.85 m, 6 bones, black rings and a white tip |
| Coat | Golden `#D9A443`, belly `#F3E3BF`, solid spots `#1F1A17` (Poisson scatter, then hand-adjusted), tear lines from eye to mouth |
| Details | Semi-retracted claws visible. A slight ruff on the neck |
| Personality | Sleek and precise. Winner: chirps and a head toss |

---

## Appendix B: File and module map

```
assets-src/3d/
  blender/
    common/            quadruped_rig.py, skinning.py, materials.py, bake.py, export.py, lod.py
    species/           lion.py, wolf.py, boar.py, squirrel.py, cheetah.py   (build + clips)
    courses/           base.py, boulder.py, mud.py, river.py, logs.py, vines.py, profile_export.py
    props/             spectators.py, podium.py, trophy_medals.py, kit.py (trees, rocks, ferns)
  species/<name>/      spec.json, <name>.blend, textures/ (painted sources), refs.md
  courses/             *.blend, textures/
assets-src/audio/      sources/ (originals), selections.json
public/assets/3d/      *.glb + *.json sidecars (committed build output)
public/assets/audio/   *.webm, *.m4a, sprites.json
public/assets/portraits/ <name>@1x.webp, <name>@2x.webp
public/licenses/       audio.csv, models.csv (if any licensed models), fonts (existing)

scripts/
  build-3d.ts          Blender headless → gltf-transform optimize → public/assets/3d
  check-3d.ts          rig/animation checks (§16.2)
  build-audio.ts       trim, loop, loudness-normalize, encode, sprite, license check
  portraits.ts         render UI portraits through the game renderer (Playwright)
  check-budget.ts      rewritten for 3D and audio budgets

src/render3d/
  app.ts               createRenderer(host, game, options): same contract as today
  stage.ts             renderer, scene, sun, hemisphere, fog, shadow box, tiers, context loss
  camera.ts            precomputed zero-phase-smoothed path, framing rules, per-challenge offsets
  quality.ts           tier selection, adaptive resolution (from V2 lanes.ts logic)
  materials/toon.ts    shared toon-PBR shader (ramp, hue-shift, hemisphere, rim, sheen, coat masks)
  materials/water.ts   flow, depth color, foam
  materials/mud.ts     viscous surface, ripples
  course/Course.ts     loads base + challenge insert, instancing, wind
  course/profile.ts    height/normal/surface/action-zone queries per lane
  course/challenges/   boulder.ts, mud.ts, river.ts, logs.ts, vines.ts
  animals/Animal.ts    GLB instance, AnimationMixer, layer stack
  animals/locomotion.ts gait state machine, phase sync, stride planning
  animals/ik.ts        two-bone IK, foot lock, toe alignment
  animals/secondary.ts fixed-step spring chains
  animals/acting.ts    seeded glances, celebrations, idle fidgets
  fx/                  dust, splashes, ripples, droplets, footprints, leaves, confetti (pooled)
  props/               StartGate.ts, FinishGate.ts (tape rope), Vine.ts (verlet), Spectators.ts
  podium/Podium.ts
  lab/                 dev-only pages: animals, course, audio (?lab=…)

src/audio/audio.ts     buses, beds crossfaded by camera position, footstep voices, ducking
src/ui/                App.svelte trimmed; History.svelte → HistoryColumn.svelte (in-stage);
                       OddsBoard.svelte without win chance; portraits from public/assets/portraits
```

---

## Appendix C: Reference stills index

All of these are in `reference_video/stills/`:

| File | Shows |
|---|---|
| `004s-vine-gorge.jpg` | Vines and waterfall gorge section |
| `049s-boulder-climb.jpg`, `050s-boulder-crest.jpg` | Climbing the boulder ramp; the crest and descent |
| `054s-finish.jpg` | The finish approach |
| `057s-podium-boar.jpg` | Podium composition: winner upright with trophy and medal, stumps, banner |
| `094s-log-bridges.jpg` | One log per lane over white water |
| `112s-betting-layout.jpg` | Betting layout: countdown, portraits, info card, last-10 column, course tile |
| `134s-start-posts.jpg` | Start posts and the pack at the start |
| `180s-gallop-lanes.jpg`, `180s-gallop-sequence.jpg` | Lane overlap and scale; 12 consecutive frames of the gallop (gather, extension, level heads, trailing tails) |
| `183s-mud-sequence.jpg`, `185s-mud-pit.jpg`, `188s-mud-exit.jpg` | Animals sunk to the chest, ploughing, squirrel tail up, exiting the pit |
