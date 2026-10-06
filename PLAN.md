# Jungle Esports — Game Plan

A browser-based animal-race **betting game**, inspired by the Chinese arcade game "Jungle Sports Meet" in `reference_video/`.
**All in-game text is English** (title banner, UI, animal names, challenge names). None of the reference's Chinese text is reused.
Five jungle animals line up, race through a jungle track, hit **one terrain challenge midway** that favors one of them, and finish on a podium. Players bet virtual coins on the outcome before each race.

---

## 1. What the reference shows (and what we keep)

From the frames of `reference_video/videoplayback.mp4` (14 s, glare ignored):

| Time | Reference | Our version |
|---|---|---|
| 0–1 s | 5 animals sprint **right → left**, side-on, in stacked lanes, camera pans | Same layout: 5 lanes with slight perspective, side-scrolling camera |
| background | Dark jungle treeline, **monkey spectators** watching | Parallax jungle (4 layers), animated monkey/parrot spectators |
| 1.5–7.5 s | **Mud pit** mid-track: animals slow, sink, crawl through | The mud pit becomes 1 of **5 terrain challenges** |
| 7.5–11.5 s | Animals leave the pit, the order reshuffles, final sprint | Post-challenge sprint with scripted lead changes |
| ~11 s | Screen goes dark briefly | Becomes the **Dark Cave / Night Fog** challenge |
| 11.5 s | Wooden **finish pole** | Finish pole with a photo-finish slow-mo |
| 12–14 s | Winner on a **podium**, trophy, gold medal, wooden title banner (in Chinese) | Podium scene (1st/2nd/3rd), trophy, medal, "JUNGLE ESPORTS" wooden sign, payout |

Reference animals: red **boar**, spotted **hyena**, tan big cat, orange **lion**, purple **squirrel**. We draw our own versions of these.

---

## 2. Core game loop

```
┌─────────────┐   ┌────────┐   ┌──────────┐   ┌──────────┐   ┌────────┐   ┌─────────┐   ┌────────┐
│ BETTING     │ → │ LOCKED │ → │ LINE-UP  │ → │ RACE     │ → │ FINISH │ → │ PODIUM  │ → │ PAYOUT │ ─┐
│ 20 s timer  │   │ RNG    │   │ animals  │   │ start →  │   │ photo- │   │ trophy, │   │ wallet │  │
│ odds shown  │   │ draws  │   │ at start │   │ CHALLENGE│   │ finish │   │ medals  │   │ history│  │
└─────────────┘   │ result │   │ line,    │   │ → sprint │   │ slow-mo│   └─────────┘   └────────┘  │
      ↑           └────────┘   │ 3-2-1    │   └──────────┘   └────────┘                             │
      └───────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Betting (20 s):** this round's **challenge** and each animal's **form** are revealed. Odds are computed and shown. The player places chips.
2. **Locked:** bets close. The RNG draws the **full finishing order** (§5). Everything after this is choreography; nothing on screen changes the result.
3. **Line-up:** the 5 animals stand on the start line. Each one does an idle animation, then a 3-2-1 countdown.
4. **Race (~20 s):** start sprint (0–40% of track), **terrain challenge** zone (40–60%), final sprint (60–100%).
5. **Finish:** slow-mo when the top two are within half a body length.
6. **Podium:** 1st/2nd/3rd on tree-stump podiums, trophy and medal on the winner, confetti made of leaves.
7. **Payout:** winnings counted into the wallet, and the result is added to the history strip ("last 20 winners").

The full cycle is about 45 s, which matches arcade pacing.

---

## 3. The 5 animals × 5 challenges

Every animal has exactly **one terrain it dominates**. Every challenge favors exactly **one animal**. The mapping is a perfect 1:1, so over many races no animal is better than another overall.

| # | Animal | Signature trait | Home challenge | What happens on screen |
|---|---|---|---|---|
| 1 | 🦁 **Lion** "Rex" | Raw power | **Boulder Rockslide**: rocks block the lanes | Lion smashes through the rocks. The others stop, climb over, or go around |
| 2 | 🐗 **Warthog** "Mudzilla" | Loves mud | **Mud Swamp** (from the reference) | Warthog belly-slides through. The others sink and crawl in slow-mo |
| 3 | 🐆 **Cheetah** "Blitz" | Top speed | **Savanna Tall-Grass Straight**: open, flat, fast | Cheetah gets speed lines and a motion-blur dash. The others push through the grass |
| 4 | 🐿️ **Squirrel** "Nutsy" | Climber, light | **Fallen Giant Log & Vines**: a wall-sized tree trunk | Squirrel scurries over and swings on a vine. The others slowly scramble up |
| 5 | 🐺 **Hyena** "Cackles" | Night vision, scent | **Dark Cave / Night Fog** (the reference's dark moment) | The screen goes dark and each animal gets its own light radius. Hyena's eyes glow and it runs at full speed, while the others hesitate |

Each animal also gets a personality (idle animation, victory pose, and a "stumble" animation used when the script needs it to lose ground).

---

## 4. Tech stack (gaming + performance focused)

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** (strict) | One codebase for the engine, client, and (later) server |
| Build | **Vite** | Fast dev server, tree-shaking, code splitting, asset hashing |
| Renderer | **PixiJS v8** (WebGL2, WebGPU opt-in) | The fastest mainstream 2D web renderer: batched sprites, filters, texture atlases, about 1/5 the size of Phaser. The game is mostly animation, not physics, so a full game framework isn't needed |
| UI / HUD | **Svelte 5** DOM overlay above the canvas | Betting board, chips, wallet, and modals as crisp, accessible DOM. Svelte compiles away, so it adds only a few KB |
| Tweens | **GSAP** (core only) or Pixi ticker + custom easings | Podium, UI, and camera tweens |
| Particles | Custom pooled particle system (~150 LOC) | Mud splashes, dust, leaves, rock debris, confetti, with no per-frame allocations |
| Audio | **Howler.js** + an audio sprite | One file, so there's a single decode. Handles the mobile unlock |
| RNG | `crypto.getRandomValues` / Node `crypto` + seeded **xoshiro128\*\*** for choreography | Secure for results, deterministic for replays |
| Testing | **Vitest** (math and engine), **Playwright** (smoke test) | The odds and RTP are covered by automated tests |
| Backend (phase 2) | **Node + Fastify + WebSocket**, **PostgreSQL** (wallet ledger), **Redis** (round state) | Server-authoritative rounds when real accounts or multiplayer are added |

### Performance budget
- 60 fps on mid-range Android; ≤ 100 draw calls per frame (target is about 15 with atlases).
- Initial download ≤ 2.5 MB, JS ≤ 350 KB gzipped.
- **All art is packed into 2–3 texture atlases** (WebP, with a PNG fallback), generated at 1× and 2×, and chosen by `devicePixelRatio` (capped at 2).
- Static parallax layers use `cacheAsTexture`. Off-screen set pieces are `cullable`.
- Pools are used for particles and floating text, so there's no GC churn during the race.
- The ticker pauses on `visibilitychange`. Dynamic resolution drops to 0.75× if the frame time stays above 20 ms.
- The race is driven by time (`x(t)` curves, §6), so it's frame-rate independent by design.

---

## 5. Probability & odds model (the important part)

### 5.1 Golden rules
1. **The result is decided by the RNG before the race animates.** The animation only tells the story of a result that's already fixed. This makes it fair, testable, and replayable.
2. **Displayed odds come from the exact same probabilities that the RNG samples from.** No hidden weighting.
3. **Every bet has the same expected return (RTP)**, so there is no "smart" bet that beats the house, and no "sucker" bet either.

### 5.2 Strength weights
Each round, each animal *i* gets a weight:

```
w_i = BASE_i × FORM_i × (ADV if animal i owns this round's challenge else 1)
```

| Parameter | Value | Meaning |
|---|---|---|
| `BASE_i` | 1.0 for all | Balanced roster. Keep equal so the 1:1 challenge mapping makes the game symmetric over time |
| `ADV` | **2.5** | Home-terrain multiplier |
| `FORM_i` | Tired **0.8** (20%) / Normal **1.0** (60%) / Hyped **1.25** (20%) | Rolled per animal per round and shown to the player as an icon. Makes odds vary between rounds |

`ADV = 2.5` makes the favorite win about **38%** of the time. It's clearly favored but upsets still happen in about 62% of races, so betting on long shots stays exciting. Tuning range: 2.0 (33%) to 3.0 (43%).

### 5.3 Finishing order: Plackett–Luce model
The full finishing order is drawn **sequentially without replacement**, each step in proportion to the weights:

```
1st place: pick animal i with probability  w_i / W                (W = Σ w)
2nd place: pick j from the rest with prob. w_j / (W − w_i)
3rd place: pick k from the rest with prob. w_k / (W − w_i − w_j)
... and so on
```

This gives one consistent model for every bet type, with exact closed-form probabilities:

| Bet | Wins if… | Probability |
|---|---|---|
| **Win** | animal *i* finishes 1st | `P_win(i) = w_i / W` |
| **Top 2 (Place)** | *i* finishes 1st or 2nd | `P_win(i) + Σ_{j≠i} (w_j/W)·(w_i/(W−w_j))` |
| **Exacta** | *i* 1st **and** *j* 2nd, in order | `(w_i/W)·(w_j/(W−w_i))` |
| **Quinella** | *i* and *j* are the top 2, any order | `Exacta(i,j) + Exacta(j,i)` |
| **Trifecta** (optional) | exact top 3 | `(w_i/W)·(w_j/(W−w_i))·(w_k/(W−w_i−w_j))` |

### 5.4 Odds / payout formula
```
odds = floor( RTP / P × 100 ) / 100          RTP = 0.95  (5% house edge)
payout = stake × odds                        (includes the stake back)
```
Rounding **down** guarantees that the real RTP is ≤ 95% for every bet. Then clamp the odds to `[1.10, 500.00]`.

Expected value of any bet: `P × odds ≈ 0.95`, so the player loses 5 coins per 100 wagered on average, whatever they bet on.

### 5.5 Worked example (verified)
Round: **Boulder Rockslide** (Lion's terrain), all animals in Normal form, so `w = [2.5, 1, 1, 1, 1]` and `W = 6.5`.

| Animal | P(win) | Win odds | P(top 2) | Top-2 odds |
|---|---|---|---|---|
| Lion (home) | 0.3846 | **×2.46** | 0.6643 | ×1.43 |
| Warthog | 0.1538 | ×6.17 | 0.3339 | ×2.84 |
| Cheetah | 0.1538 | ×6.17 | 0.3339 | ×2.84 |
| Squirrel | 0.1538 | ×6.17 | 0.3339 | ×2.84 |
| Hyena | 0.1538 | ×6.17 | 0.3339 | ×2.84 |

Exacta Lion→Warthog = 0.0962 (×9.87). Warthog→Lion = 0.0699 (×13.58). Warthog→Cheetah = 0.0280 (×33.96).

Second example, with form: `w = [2.5, 1.25 (Hyped), 0.8 (Tired), 1.0, 1.25 (Hyped)]`. Lion ×2.58, Warthog ×5.16, Cheetah ×8.07, Squirrel ×6.45, Hyena ×5.16.

✅ **Checked with a 1,000,000-race Monte Carlo simulation:** every simulated frequency matched the formula within ±0.001, and every bet's RTP came out between 0.946 and 0.950. The same check becomes a permanent Vitest test (§9).

### 5.6 Secure draw & provably fair (optional, phase 2)
- **Phase 1 (offline, virtual coins):** `crypto.getRandomValues` → uniform floats → Plackett–Luce draw.
- **Phase 2 (server):** before betting opens, publish `SHA-256(serverSeed)`. After the race, reveal `serverSeed`.
  `u_k = HMAC_SHA256(serverSeed, clientSeed + ":" + roundId + ":" + k)` → float in [0,1) → the Plackett–Luce step *k*.
  Players can then re-run the draw themselves and confirm the result wasn't changed after they bet.
- **House risk:** cap the **maximum total payout per round**, and cap the stake per bet type (exactas and trifectas especially).

> ⚠️ Real-money betting needs a gambling license in almost every jurisdiction. This plan assumes **virtual coins only** (free daily refill, no cash-out).

---

## 6. Race choreography: turning a result into an exciting race

Input: `finishOrder[5]`, `challenge`, `homeAnimal`, `seed`. Output: a position curve `x_i(t)` for each animal.

1. **Finish times:** winner `T₁ ≈ 20 s ± 1`. The gaps after that are drawn from `U(0.15, 0.9) s`. 15% of races get a **photo finish**, with a 1st–2nd gap of 0.04–0.08 s.
2. **Checkpoint ranks** at track fractions `u = 0, 0.2, 0.4 (challenge in), 0.6 (challenge out), 0.85, 1.0`:
   - `0.2`: a random order (the start shuffle).
   - `0.4`: the **home animal** is placed mid-pack or behind, so the comeback is visible.
   - `0.6`: the **home animal comes out of the challenge 1st or 2nd**. It always looks great on its own terrain.
   - `0.85`: close to the final order, with ≥ 1 swap 60% of the time (a late lead change).
   - `1.0`: the drawn `finishOrder`.
   - If the home animal **didn't** win, the final stretch shows a stumble, tiredness, or a rival's "burst" animation to explain it.
3. **Times from ranks:** `t_k(rank) = baseTime_k + rank × spread_k + jitter`, where the spread grows along the track.
4. **Curves:** a **monotone cubic (Fritsch–Carlson)** interpolation through the `(t_k, u_k·L)` points per animal. It never runs backwards, and its velocity is smooth.
5. **Validate:** check that the speed stays within `[0.4, 1.8] × average` and the gaps between checkpoints are sensible. If not, re-roll the *choreography* sub-seed only (never the result).
6. **Challenge zone:** non-home animals switch to a "struggle" animation (sinking, climbing, groping in the dark), and their speed is low in that window. The home animal plays its signature move.
7. **Gait sync:** the leg-cycle speed is proportional to `dx/dt`, so feet never slide.
8. **Camera:** follows the midpoint of the leading two, with smoothing. Near the finish it zooms 1.15× and time dilates to 0.35× for a photo finish.

Because everything derives from `seed`, any race can be **replayed exactly** (useful for a "watch replay" button and for bug reports).

---

## 7. Art & assets (all made in-house)

No stock assets. Everything is drawn as **SVG source**, versioned in the repo, then rasterized to atlases by a build script.

### 7.1 Animals: cut-out rigs (no frame-by-frame drawing)
- Each animal is drawn as **separate SVG parts**: body, head, jaw, 4 legs (upper/lower), tail, ears, eyes.
- They're assembled in Pixi as a container hierarchy with pivots at the joints.
- The **gait is procedural**: sine-based leg rotation with a phase offset per leg, plus body bob, head nod, and tail sway. Gallop and trot presets per animal.
- Extra poses (idle, struggle, signature move, stumble, victory, sad) are keyframe clips on the same rig.
- Style: bold outlines, flat colors with one shade tone, chunky cartoon proportions, close to the reference look. Palette per animal: Lion orange `#F28C28`, Warthog red `#D9473F`, Cheetah gold `#E8C468` with spots, Squirrel lilac `#A58BE0`, Hyena sand-gray `#B9A78A` with spots.

### 7.2 Environments
- 4 parallax layers: night-teal sky with moon → far canopy silhouettes → mid jungle with spectators → track ground (tileable).
- Foreground leaves pass over the camera for depth.
- 5 challenge set pieces: mud pool with bubbles, rock pile and falling boulders, tall-grass field (sways with a shader), giant fallen log with hanging vines, and a cave mouth with darkness (a `ColorMatrix` darken plus additive light-radius sprites per animal and glowing hyena eyes).
- Podium: tree-stump podiums 1/2/3, a wooden "JUNGLE ESPORTS" banner with vines, a trophy, and medals.

### 7.3 UI
- SVG icons: coin, chip stack (5 values), animal portraits (round badges), challenge icons, form icons (😴 / ➖ / 🔥 drawn as SVG), and settings/sound/history icons.
- Font: a chunky display face (e.g., **Lilita One**) plus **Nunito** for numbers, self-hosted via fontsource.

### 7.4 Audio
- SFX (paws, mud splat, rock crash, whoosh, cave echo, crowd cheer, coin clink, countdown beep) made with **jsfxr**/**ZzFX** and exported to one Howler audio sprite.
- Music: a short looping jungle-drum track made with ZzFXM or a simple tracker, plus a podium fanfare.

### 7.5 Asset pipeline
```
assets-src/**/*.svg  ──resvg-js──▶ PNG @1x/@2x ──free-tex-packer-core──▶ atlas.webp/png + atlas.json
                                                                           ──▶ public/assets/
```
`npm run assets` regenerates everything, so the art stays editable as plain SVG.

---

## 8. Betting UI (DOM overlay)

- **Odds board:** 5 animal cards (portrait, name, form icon, home-terrain badge if active, Win odds, Top-2 odds, and P(win) as a small bar).
- **Challenge banner:** "This round: 🪨 Boulder Rockslide — Lion's home turf!"
- **Chip tray:** 10 / 50 / 100 / 500 / 1000. Tap an animal to place a chip. Buttons for undo, clear, and repeat last bet.
- **Exotic bets tab:** an Exacta/Quinella grid (5×5).
- **Bet slip:** total stake, maximum possible return, and countdown.
- **Wallet:** starts at 10,000 coins. A free daily refill if the balance is below 1,000.
- **History strip:** the last 20 winners with challenge icons. A stats panel shows how often each animal won on each terrain, so players can see that the stated odds hold up.
- Layout works in landscape on mobile (the main target, like the arcade). Portrait shows the race on top and the betting board below.

---

## 9. Project structure

```
jungle-esports/
├─ PLAN.md
├─ reference_video/
├─ assets-src/                 # SVG sources (animals/parts, env, ui, podium)
├─ scripts/build-assets.ts     # SVG → atlas pipeline
├─ public/assets/              # generated atlases, audio sprite, fonts
├─ src/
│  ├─ engine/                  # PURE TS, no DOM, shared with the future server
│  │  ├─ rng.ts                # crypto source + xoshiro128** seeded PRNG
│  │  ├─ config.ts             # ADV, FORM table, RTP, limits
│  │  ├─ odds.ts               # Plackett–Luce probabilities + odds rounding
│  │  ├─ draw.ts               # finishing-order sampler
│  │  ├─ bets.ts               # bet types, settlement
│  │  ├─ choreography.ts       # result → x_i(t) curves (§6)
│  │  └─ round.ts              # round state machine
│  ├─ render/                  # PixiJS
│  │  ├─ app.ts, camera.ts, parallax.ts, particles.ts
│  │  ├─ rig/                  # AnimalRig, gaits, pose clips
│  │  ├─ challenges/           # Mud, Boulders, Grass, Log, Cave
│  │  └─ scenes/               # LineUp, Race, PhotoFinish, Podium
│  ├─ ui/                      # Svelte: OddsBoard, ChipTray, BetSlip, Wallet, History
│  ├─ audio/
│  └─ main.ts
└─ tests/
   ├─ odds.test.ts             # closed form == expected values
   ├─ rtp.test.ts              # 1M simulated rounds: frequencies ±0.002, RTP ≤ 0.95
   └─ choreography.test.ts     # finish order of curves == drawn order, monotone, speed bounds
```

The `engine/` folder has no rendering dependencies. That makes it fully unit-testable and lets it move to a server unchanged.

---

## 10. Milestones

| # | Milestone | Deliverable |
|---|---|---|
| M0 | Scaffold | Vite + TS + Pixi + Svelte, lint, Vitest, folder layout |
| M1 | **Engine math** | `odds`, `draw`, `bets` + RTP/frequency tests passing |
| M2 | Scene foundation | Parallax jungle, track, camera, 60 fps loop, asset pipeline with first atlas |
| M3 | Animals | 5 SVG rigs with run/idle/victory animations |
| M4 | Choreography | Result → curves. Full race plays to the drawn order, with replay-by-seed |
| M5 | Challenges | 5 terrain set pieces with struggle and signature animations, particles, cave lighting |
| M6 | Betting UI | Odds board, chips, bet slip, wallet, settlement, history |
| M7 | Show polish | Line-up countdown, photo finish, podium, audio, transitions |
| M8 | Optimize & ship | Perf pass on low-end mobile, atlas/bundle budgets, PWA install, static deploy (Cloudflare Pages / Netlify) |
| M9 *(optional)* | Online | Fastify + WS shared rounds, Postgres ledger, provably-fair seeds |

---

## 11. Open decisions (sensible defaults chosen)

| Question | Default in this plan |
|---|---|
| Show the challenge **before** betting? | **Yes**. It gives players something to reason about, and odds update per round. (Alternative: hidden challenge with flat 20% odds.) |
| Run direction | Right → left, like the reference (one config flag) |
| Single-player or shared live rounds? | Single-player offline first (M0–M8), shared rounds in M9 |
| House edge | 5% (RTP 95%), configurable |
| Virtual vs. real money | Virtual coins only |

---

## Implementation status

The offline game is implemented in this repository: Vite/Svelte/Pixi scaffold; exact odds and secure result draws; deterministic choreography and replays; five SVG animal rigs and terrain scenes; betting, wallet, settlement and history; audio, podium and photo finishes; generated atlases and an installable offline production build. See `README.md` for commands, architecture and hosting configuration.

Validation: strict type checks and lint; 19 engine tests including a one-million-race Monte Carlo sample and 500 seeded race curves; nine production browser tests covering controls, complete settlement, replay, all terrains, responsive layouts and offline reload. JavaScript and offline cache budgets are enforced during build.

Remaining M8 release work: profile FPS/draw calls on physical Android devices and publish `dist/` using a hosting account. Static deployment configuration is included; no public deployment was performed. Optional M9 multiplayer and the optional Trifecta bet remain out of scope for the offline release.
