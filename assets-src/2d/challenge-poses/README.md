# Crossing animation sources

The five transparent PNG sheets contain six new poses per animal: two paddling frames, a reaching frame, a hanging frame, a tucked tumble pose and a landing crouch. Built-in imagegen created them from the existing starting images. The exact prompts and reference paths are in `prompts.json`. Existing run, starting and standing sources are preserved.

Source sheets: [lion](lion.png), [boar](boar.png), [cheetah](cheetah.png), [squirrel](squirrel.png), [dog](dog.png).

`scripts/build-challenge-sprites.ts` identifies the six disconnected silhouettes, retains their source pixels and alpha edges, crops transparent margins, and packs 1×/2× WebP and PNG atlases. The per-animal JSON files record the measured extraction bounds, logical dimensions, and paw-grip anchors. No background or vine is baked into the sprites.

The renderer requests these sheets after the race locks. Bridge running reuses the existing run art with a measured per-frame paw contact anchor. Hill climbing follows the mound's slope, then switches to the tucked pose rotating around its torso. Mud uses paddling art behind an opaque liquid foreground. Water combines the paddling art with one buoyant log per animal. Hanging sprites rotate around their raised paws, and the active vine ends at that exact anchor. Every sequence returns to the normal run cycle after the obstacle.

Contact profiles are selected by traveled distance so pause, reload and replay preserve the crossing state. Reduced motion retains crossing poses and terrain contact while removing bobbing, continual spinning and splash motion.

## Verified behavior

The production build, type checks, lint and all 61 unit tests pass. The browser suite traverses every course with every animal and checks all stages, five sequential vine grips, both paddle frames, return to running, and paused-frame stability. Ten terrain/peak/tumble/podium screenshots were reviewed. Eight production browser checks cover 1×/2×, WebP/PNG fallback, starting poses, and offline race/podium reloads; the cache checks include all crossing sheets at both densities.

| Requirement | Runtime and visual evidence |
| --- | --- |
| Six side leaves removed | The perimeter foliage layer is removed from `src/render/app.ts`; full-stage and podium screenshots show clear sides. |
| Five horizontal log bridges over a gap | `Terrain.back` contains one trunk per lane over an opaque ravine. Source and encoded paw-contact tests verify all run frames against their support height. |
| Deep mud crossing | Paddling frames, submerged limbs, opaque mud foreground, bubbles and splashes; mud browser traversal verifies entry, paddling and exit for all five animals. |
| Sequential hanging vines | Five overhead anchors, a visible ravine, jump/reach/hold/transfer/landing poses, and vines ending at the actual raised-paw anchors. Each animal visits all five vines in the browser test. |
| Water with floating logs | One visible buoyant trunk per animal, two paddle strokes, synchronized bobbing, wakes, boarding and disembarking. The production offline tests reload this crossing using both formats. |
| Steep hill and recovery | A 210-world-unit triangular mound, slope contact, peak tuck, two forward rotations downhill, landing crouch and normal running. The final hill traversal verifies every stage and pause stability. |
| Consistent additional artwork | Five source sheets with thirty transparent reference-based poses, measured extraction bounds and grip anchors, plus the complete built-in imagegen prompt set. |

See [all course previews](previews/courses.png). Individual snapshots and four-step browser sequences are saved in `previews/`. The initial download remains 2,523 KiB and JavaScript 222 KiB gzip. The new pose sheets raise the offline cache to approximately 5.1 MiB, within its documented 6 MiB budget.
