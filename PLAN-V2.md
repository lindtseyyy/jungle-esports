# Jungle Esports — Plan V2: Visual Overhaul

Follow-up to `PLAN.md`, which describes the M0–M8 build and stays valid. This plan covers six requested changes:

1. **Realistic animals.** Today all five animals look the same.
2. **A bigger stage, plus fullscreen.**
3. **Challenges that are part of the track,** not stickers on top of it.
4. **A real finish line** across the track, not just a flag.
5. **Results the moment the first animal crosses.**
6. **A podium ceremony:** animals standing upright, the winner holding a trophy, silver for 2nd, bronze for 3rd.

The engine math (odds, draws, RTP, choreography seeds) **does not change**. Section 6 changes the round timeline only.

---

## 0. Diagnosis: why it looks the way it does

I captured the live build with seeded races and a controlled clock, at 1440×900. Here is what the screenshots show and where it comes from in the code:

| Problem seen | Root cause in code |
|---|---|
| All 5 animals look like the same toy in different colors | `scripts/create-art.ts` draws **every species from the same shapes**: the same `ellipse` body (140×88), round head, round ears, stick legs and thick black outline. Only the fill color and a few spots change. `AnimalRig.ts` then puts identical parts at identical offsets for every animal. |
| Animals overlap into a pile | Lanes are only **43 px** apart (`220 + i * 43` in `app.ts`), but each animal is about 90 px tall. Far-side legs use `alpha = 0.68`, so they are see-through. |
| Small race view | The canvas is a **1280×460 strip** (`aspect-ratio: 1280/460`) inside a ~700 px column next to the bet slip. There is no fullscreen. |
| Stretched picture on some windows | `root.scale.set(w / 1280, h / 460)` scales X and Y **by different amounts**. |
| Challenges look pasted on | `Terrain.ts` puts **3 copies of one sprite in each of 5 lanes** (15 stickers). Mud becomes 15 brown ovals, rocks become stacked columns, grass becomes a grid of triangles, and logs are stacked vertically. Vines float in the sky, unattached. Every animal is drawn **over** all of it: nothing sinks, nothing is hidden, nothing reacts. |
| Finish is just a flag | `app.ts` draws one 9 px pole plus a small checkered flag. Nothing is painted on the ground. |
| Results arrive late | `round.ts` only goes to `podium` once the **last** animal finishes + 0.3 s, then waits 3.5 s more before `settle()`. |
| Podium looks odd | The podium reuses the **running rig on all fours** (`pose 'victory'`). The trophy floats beside the winner, and only the winner gets a medal. The 3rd-place stump, its number and name are **cut off** at the bottom of the 460 px stage. |
| Small bug | The bottom-left caption runs under the pause button ("~~RIG~~HT → LEFT"). |

---

## 1. Realistic animals

### 1.1 Target look
**Semi-realistic, nature-documentary illustration.** That means correct anatomy, natural coats, soft painted shading and fur texture, and no thick cartoon outlines. It is **not photorealistic**; Section 9 covers the 3D option if you want photorealism.

Every animal must be recognizable **from its silhouette alone**. This is checked automatically (§8).

### 1.2 Species sheet (each one different in shape, not just color)

| | Lion "Rex" | Warthog "Mudzilla" | Cheetah "Blitz" | Squirrel "Nutsy" | Hyena "Cackles" |
|---|---|---|---|---|---|
| Real build | Heavy, deep chest, thick legs | Barrel body, **short legs**, big flat head | **Long thin legs**, tiny head, deep narrow chest, very flexible spine | Small, long body, **huge bushy tail** | **Sloping back** (front legs longer than hind), thick neck, big round ears |
| Coat | Tawny, dark brown mane, black tail tuft | Grey-brown skin, sparse bristly mane along the spine | Golden with **solid black spots** and black "tear lines" on the face | **Malabar giant squirrel**: maroon/purple back, cream belly (a real forest species, and a nod to the purple squirrel in the reference) | Sandy with **irregular dark spots**, dark muzzle |
| Signature detail | Mane bounces when it runs | **Tusks**, facial warts, **tail held straight up** when running (real warthog behavior) | Long tail used for balance | Tail ripples like a wave | Head held low, loping run |
| Game scale (front lane height) | 1.00 | 0.70 | 0.90 | 0.50 (a real one is far smaller; scaled up so you can see it) | 0.85 |
| Real gait copied | Rotary gallop | Fast trot into gallop, quick short steps | **Rotary gallop with two airborne moments**: the spine bunches up, then stretches flat | **Bounding**: the back legs land ahead of the front legs | Transverse gallop / lope |

**Team colors stay without painting the animals purple.** Each animal wears an esports **racing bib**: a colored saddle cloth with its number 1–5 in its team color (the same colors the betting cards use). A small colored number marker floats above each racer, and it can be turned off.

### 1.3 How the art gets made (still 100% in-house, no stock art)
1. **Anatomy first.** For each species, a `species/<name>/anatomy.ts` file stores bone lengths and joint positions taken from real proportions: shoulder height, body length, leg segment ratios, and head size.
2. **Body-part shapes** are drawn as smooth curves around those bones in `assets-src/animals/<species>/*.svg`. So the shapes follow anatomy instead of a shared template.
3. **Painted shading inside each SVG.** A lighter belly than back (countershading, as on real animals), a shadow side, rim light, and soft shadow in the creases. The thick black outline is removed and replaced with a thin edge in a darker shade of the coat.
4. **Fur texture is baked in at build time.** SVG noise filters add grain, and a displacement filter adds a furry fringe to the edges. Both are rendered by resvg (already in the pipeline), so they cost **nothing at runtime**.
5. **Markings are generated by code.** Cheetah spots are scattered evenly without overlapping, plus the tear lines. Hyena spots are irregular. Mane strands, the warthog bristles and the squirrel's two-tone coat are layered strokes.
6. **Review loop.** `npm run model-sheet` renders each species as: a side view, a black silhouette, and 8 frames of its run. I check these against real reference photos and adjust until they pass the checks in §8.

### 1.4 Rig and animation (a real skeleton instead of 9 stiff pieces)
- **Bones:** pelvis, 3 spine bones, neck, head, jaw, two ears, a tail chain (4 bones; 8 for the squirrel), and **3 segments per leg** (upper leg, lower leg, paw).
- **The body bends with the spine.** The torso texture is drawn on a mesh that follows the spine curve, so the cheetah's bunch-and-stretch gallop is visible.
- **Run cycles are copied from real footage.** Joint angles at 8 key moments per stride come from **Eadweard Muybridge's *Animal Locomotion* (1887, public domain)** photo plates of big cats, dogs and pigs, plus public-domain slow-motion stills for the cheetah. Frames in between are blended smoothly.
- **No sliding feet.** Each species has a stride length. Animation speed = race speed ÷ stride length.
- **The far-side legs are shaded darker instead of being made see-through,** which removes the current `alpha 0.68` ghosting.
- **Small life touches.** Blinking, ears flattening at top speed, panting mouth, tail follow-through.
- **Poses:** idle, run, struggle (one per challenge, §3), signature move, stumble, and podium poses (§5).
- The skeleton code is our own (~300 lines on Pixi meshes). There is no Spine/DragonBones license or editor dependency.

---

## 2. Bigger stage and fullscreen

### 2.1 Layout
- The race stage becomes the **hero**: full content width, **16:9**, and as tall as the screen allows below the header. It is no longer a 1280×460 strip next to the slip.
- The betting board (odds cards, chips, bet slip) moves **below** the stage on desktop. During the race, the page scrolls the stage fully into view.

### 2.2 Three view modes
| Mode | What it does | How |
|---|---|---|
| Normal | Stage plus the board below | Default |
| **Theater** | The stage fills the browser window. Betting appears as a compact **overlay drawer** that opens during the betting phase and hides during the race | Stage button, or `T` |
| **Fullscreen** | Theater layout in true fullscreen | Stage button, or `F` / `Esc` (Fullscreen API on the stage wrapper) |

- **You can bet without leaving fullscreen.** The overlay HUD shows the countdown, wallet, five odds buttons (Win / Top 2), a chip picker, and the slip total. It is Svelte DOM, so text stays sharp at any size.
- **Mobile:** fullscreen tries to lock landscape (`screen.orientation.lock`). Portrait shows a "rotate your phone" hint. **iPhone Safari** can't fullscreen a page element, so it falls back to Theater mode and suggests *Add to Home Screen*. The app is already a PWA and launches fullscreen from the home screen.

### 2.3 Correct scaling (fixes the stretch bug)
- Design height is **1080** world units. Scale = `viewportHeight / 1080`, **the same on X and Y**.
- Visible width = `viewportWidth / scale`, so wider screens show more track instead of stretching. The aspect ratio is clamped between **4:3 and 21:9**, with a dark letterbox outside that range.
- Parallax, foreground leaves and the camera use the *visible width*, not the hard-coded `1280`.
- **Pixel cost:** renderer resolution = `min(devicePixelRatio, 2)`, also capped so the drawing area never exceeds 3840×2160. The existing automatic resolution drop now ranges 0.6–2.0, because fullscreen on 4K draws far more pixels.

### 2.4 Lane geometry (the shared foundation for everything below)
A new `render/lanes.ts` file defines the track. It sits in the lower ~45% of the 1080-high world: 5 lanes with **~90 units between them** (was 43), perspective scale from 0.84 at the back lane to 1.0 at the front lane, and visible lane lines (chalk lines with small marker posts).

The animals, challenges and finish line all position themselves from this one file.

---

## 3. Challenges built into the track

### 3.1 The principle
A challenge is a **section of the track itself**, from 40% to 60% of the distance (unchanged, so the choreography still lines up). It has:
- **Ground that changes in place.** Track dirt fades into mud, gravel, savanna or cave floor, with soft edges where it begins and ends. No stickers.
- **Depth layers per lane.** Each lane has a *back* layer (behind the animal) and a *front* layer (in front of it). Obstacles **hide parts of the animals** the way real objects would:

```
world
 ├─ ground          track tiles, challenge ground, finish line paint, shadows
 ├─ lane 0 (back) ──┬─ challenge-back[0]   (e.g. far half of the log, grass behind)
 │                  ├─ animal[0] + shadow + its particles
 │                  └─ challenge-front[0]  (e.g. mud surface, grass in front, near half of the log)
 ├─ lane 1 … lane 4 (front)   same structure, drawn back to front
 └─ overlay         cave darkness/light map, front fog, finish-gate front post
```

- **A "coming up" view.** The section is visible on screen before the animals arrive, with a wooden sign: "MUD SWAMP AHEAD".
- **Animals react to the terrain.** Each non-home species has its own struggle animation, and the home animal has a signature move. The ground reacts too: splashes, debris, grass bending, footprints.

### 3.2 Per challenge

| Challenge | Ground | Hides the animals | What moves | Home animal | Everyone else |
|---|---|---|---|---|---|
| **Mud Swamp** | **One continuous bog** across all 5 lanes with an uneven shoreline, a wet glossy surface and slow bubbles | A mud band in front of each lane covers the legs, so the animals **sink to the belly**. No masks needed, so it's cheap | Ripple rings follow each animal, splashes, mud stays on the legs afterward and fades | Warthog belly-slides with little sinking | Wade in slow motion, lifting their legs high |
| **Boulder Rockslide** | Gravel and scattered stones blended into the track, with a **rocky slope behind the far lane** | Boulders in front lanes partly cover the animals behind them | **Boulders roll down the slope** into the lanes, timed by the choreography seed to land in front of the non-home animals. Slight camera shake | Lion **charges through** and boulders burst into debris | Hop over or squeeze around them |
| **Savanna Tall Grass** | Track changes to savanna soil | **Rows of grass grow between the lanes**. The row in front of a lane hides that animal's lower body | Grass **bends away** as each animal pushes past. Seed and pollen particles. Wind sway | Cheetah gets a clean path, speed streaks and a full stretched gallop | Push through with their heads up, partly hidden |
| **Fallen Giant Log & Vines** | **One giant log lying across all 5 lanes**, drawn in perspective and split into 5 lane slices for correct hiding | Each lane's front slice covers that animal's legs while it climbs | Animals' height **follows the log's curved top** (they climb up and over). Vines hang from **a real tree branch** at the side of the track, not from the sky | Squirrel grabs a vine and **swings over** in an arc | Claw-climb with front paws up, then hop down |
| **Dark Cave / Night Fog** | Rock **cave arch** over the track. Its front pillar sits in front of lane 4. Inside is a rocky cave floor | Stalactites in front, fog drifting both behind and in front of the animals | **Real darkness via a light map**: everything darkens except a soft light around each animal. Light spills out at the exit | Hyena's **eyes glow**, its light radius is bigger, it runs at full speed | Smaller light radius, hesitant run, heads swinging |

### 3.3 Performance
- Only the **current round's challenge** is loaded. Each challenge has its own small image sheet, downloaded during the 20 s betting phase.
- The light map is one off-screen texture laid over the scene (multiply blend) plus five soft light sprites. That's about 2 extra draw calls.
- Grass bending and mud ripples are computed only near the animals. Particles keep using the existing reusable pools.

---

## 4. Finish line

- **Painted on the ground across all 5 lanes:** a checkered band (~24 units wide) with a white leading edge, drawn in perspective so it matches the lane angle.
- **A finish gate** with two posts and an overhead banner reading **FINISH**, plus checkered flags. The back post stands behind lane 0. The front post stands **in front of** lane 4 and hides it slightly, for depth.
- **A finish tape** stretched across the lanes. The winner **breaks it**, and the two halves fly apart.
- A crossing counts when the **nose** reaches the line. The existing `noseOffset()` is adjusted for each species's new head shape, so the painted line and the result always agree.
- **Photo finish** (15% of races, as now): at the crossing the screen flashes and briefly freezes like a camera snapshot, with a thin vertical line on the finish edge. Then it continues.
- The finish gate is visible on the right side of the screen during the final stretch, so players see the race closing in.

---

## 5. Podium ceremony

### 5.1 Poses (new art, not the running rig)
- Each species gets an **upright ceremony pose**: standing on its hind legs like the squirrel in the reference. It uses the same realistic art style but is posed for celebration, a deliberate exception to strict realism.
- It is a separate small skeleton (`PodiumRig`: hips, torso, head, two hind legs, two front legs used as arms, tail), so the same art supports two arm poses.

| Place | Pose | Award |
|---|---|---|
| **1st** | Upright, **holding the trophy in both front paws**, then raising it overhead | **Gold trophy** (+ gold medal, as in the reference) |
| **2nd** | Upright, one paw raised in a wave | **Silver medal** on a ribbon around the neck |
| **3rd** | Upright, paws down, small nod | **Bronze medal** on a ribbon around the neck |

- **Medal art:** metallic shading in gold `#D4AF37`, silver `#C0C0C0` and bronze `#CD7F32`. A different ribbon color for each, and an engraved 1/2/3. Each pose has a neck point where the ribbon hangs.

### 5.2 Sequence (~5 s)
1. The three tree-stump podiums rise. The animals hop on in the order 3rd, 2nd, 1st.
2. Medals drop onto 3rd, then 2nd.
3. The trophy lowers into the winner's paws, then it is raised overhead twice. Camera flashes, leaf confetti.
4. A results panel along the bottom shows names, places and **your round result (+coins / −coins)**.

### 5.3 Layout
Everything stays **inside the 16:9 safe area**, so no stump, number or name is cut off (the 3rd-place stump is cut off now). 2nd on the left, 1st in the center on the tallest stump, 3rd on the right. The banner shows **"JUNGLE ESPORTS"**.

---

## 6. Results the moment someone crosses

### 6.1 New timeline
The finishing order is decided before the race starts (`PLAN.md` §5), so the game can react instantly.

| Moment | What happens |
|---|---|
| **t1: the winner's nose crosses** | Finish tape breaks. **A WINNER card appears immediately** over the race: portrait, name, odds. Win bets light up WON or LOST. |
| Each next crossing | A live **placing strip (1–5)** fills in as each animal crosses. |
| **t2: 2nd place crosses** | Every bet type is now decided (Win, Top 2, Exacta and Quinella only need the top 2). **The payout is credited** and its count-up starts in the card. Normally < 1 s after t1. |
| **t3 + 1.2 s** | Straight to the **podium**. The game no longer waits for 4th and 5th. |
| Podium + ~5 s | Next round's betting opens. The separate `payout` screen is removed and merged into the podium. |

The whole round gets **~5–7 s shorter**.

### 6.2 Engine changes (small, contained to `round.ts`)
- Add a `result` phase between `race`/`finish` and `podium`.
- `settle()` runs when `raceTime ≥ finishTimes[order[1]]`, instead of after the 3.5 s podium. Settlement stays exactly-once (the existing `settled` flag).
- Go to `podium` at `finishTimes[order[2]] + 1.2`.
- **Saved-game compatibility:** bump the save key to `v2`. Old saves in `race`/`finish`/`podium`/`payout` still load and settle correctly. A saved round in the old `payout` phase is treated as `podium`.
- Replays follow the same timeline.

---

## 7. Environment to match the new animals

Realistic animals in front of a flat cartoon jungle would clash, so the background gets the same painted treatment:
- **Depth through haze:** far layers bluer, lighter and softer. Light shafts through the canopy.
- **Track ground:** a textured surface with pebbles, grass tufts at the edges, and soft contact shadows under every animal.
- **Spectators:** monkeys and parrots **sitting on branches and logs at the side of the track**, instead of heads poking up over the track edge.
- The bottom-left caption moves so the pause button no longer covers it.

---

## 8. Tests and acceptance checks

| Check | How |
|---|---|
| **Animals look distinct** | Automated: render each species' run-pose silhouette at build time and compare every pair. They must overlap less than 75%. Manual: a person can name all 5 from black silhouettes. |
| No stickers | Visual-regression screenshots (Playwright `toHaveScreenshot`) at the midpoint of each challenge with fixed seeds and a frozen clock, the same method used for this diagnosis. |
| Instant results | `round.test.ts`: the WINNER card appears at t1, payout is credited at t2, podium starts at t3 + 1.2, and settlement happens exactly once even across reloads in any phase. |
| Math unchanged | All existing odds, RTP (1M-race) and choreography tests still pass untouched. |
| Fullscreen | Playwright: the fullscreen button sets `document.fullscreenElement`, the canvas fills the viewport, and the betting overlay works. Theater fallback when fullscreen isn't supported. |
| No stretch | At 4:3, 16:9 and 21:9 viewports, a reference circle in the scene stays a circle. |
| Podium fits | At every tested viewport, all 3 stumps, numbers and names are fully on screen. |
| Performance | A dev overlay shows draw calls and frame time. Targets: ≤ 60 draw calls, 60 fps at 1080p on a mid-range laptop and phone. A first load of ≤ 2.5 MB (animals + environment + current challenge); the full offline cache budget rises to **4 MB** for the extra art. |

---

## 9. Milestones

Ordered so the quick, visible wins land first:

| # | Milestone | Deliverable |
|---|---|---|
| V2.1 | **Stage & fullscreen** | 16:9 hero stage, same-on-both-axes scaling, Theater and Fullscreen with the in-game betting overlay, landscape lock, iOS fallback, caption fix |
| V2.2 | **Finish line & instant results** | Ground line, gate, tape break, photo-finish snapshot. `result` phase, WINNER card, live placings, settle at t2, podium at t3 + 1.2 |
| V2.3 | **Lane & depth system** | `lanes.ts`, 90-unit lanes, perspective, per-lane back/front layers, contact shadows |
| V2.4 | **Realistic animals** *(largest)* | Anatomy sheets, 5 species' art, skeleton with bending spine, gaits copied from Muybridge, racing bibs, model-sheet review, silhouette test |
| V2.5 | **Challenges as track sections** | All 5 rebuilt per §3, each challenge's art loaded only when needed, "ahead" signs, visual baselines |
| V2.6 | **Podium ceremony** | Upright poses, trophy holding, gold/silver/bronze medals, sequence, safe-area layout |
| V2.7 | **Environment & polish** | Painted background layers, branch spectators, performance pass, budgets, final screenshot baselines |

---

## 10. Decisions (defaults chosen; tell me to switch any)

| Question | Default | Alternative |
|---|---|---|
| How realistic? | **Semi-realistic 2D painted art**, made in-house, fits the current PixiJS engine and size budgets | **3D** (Three.js + rigged GLB models) for near-photorealism. It needs ready-made free-license (CC0) or commissioned animal models, since good realistic 3D animals can't be made by code alone. It is also a much larger download and a renderer rewrite |
| Podium pose | **Upright on hind legs, holding the trophy** (as requested, matches the reference) | Natural four-legged stance with the trophy set in front |
| Team colors | **Natural coats + colored numbered bibs** | Tinted coats (less realistic) |
| When to pay out | **When 2nd place crosses** (all bet types decided, < 1 s after the winner) | When the winner crosses, revealing exacta/quinella results before 2nd crosses |
| Winner also gets a medal? | **Yes, gold medal + trophy** (like the reference) | Trophy only |
