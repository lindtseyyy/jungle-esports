# V3 implementation status

## Current boundary

V3.0 is implemented. V3.1 foundation is implemented for **G1 review**, with target-device performance and the user's visual approval still outstanding. This does not mark the whole plan complete.

PLAN-V3 §16.4 requires G1 approval of “The look and the camera, before detailed work starts.” §17 lists “G1 approved” as V3.1's exit criterion. No approval has been assumed. The detailed lion and the other species have not been started past the prototype.

## Implemented

- Removed the betting-screen marketing copy, win probability labels/bars, numbers/bibs, challenge banner and bottom history section.
- Compact icon controls with accessible labels; species names in cards and accessible controls; short slip/result labels; one-line footer.
- Countdown ring and course tile in the stage; ten/six recent-winner portraits with focus tooltips and replay buttons. All twenty saved rounds remain reachable in Statistics.
- Shared renderer contract with no marker option; three.js development flag and separate G1 review page.
- WebGL2, AgX/sRGB, shared three-band wrapped toon-PBR lighting, cool shadows, sky rim, hemisphere light, height-modulated fog, camera-following sun and shadow box.
- Blender 4.5 LTS build scripts and editable lion blockout; one continuous remeshed skinned body, shared-skeleton attachments, idle and placeholder gallop clips; meshopt GLBs and sidecars.
- Greybox base course with hills/dip, 0.25 m raycast profile, instanced environment masses, five lanes 1.8 m apart, exact engine-to-world mapping and animated nose anchoring.
- Precomputed zero-phase camera path; frame percentiles/draws/triangles; resolution adaptation; shader warmup; WebGL context loss/restore and cleanup.
- Review tools: clip selection, time/speed controls, turntable, close-up, wireframe, skeleton and motion trails alongside the reference still.
- Foundation asset, profile, camera and quality tests; UI/browser regressions adapted to the intended V3.0 layout. Existing engine/odds/RTP tests and engine source remain unchanged.

## Handoff fixes (Claude Code, 2026-10-04, after the Codex session ran out of credits)

- Fixed a type error in `PodiumRig.ts` (`a.species` on the anatomy type; now `ANIMALS[animal].species`).
- Re-recorded the three V2 podium screenshot baselines. The only differences were the removed bibs and species names in place of nicknames.
- Extended the greybox terrain to −40 m before the start and +340 m past the finish, and widened it behind lane 0, so the betting-phase camera no longer sees the edge of the world. The profile range is unchanged.
- Verified: `npm run check`, `npm run lint`, `npm test` (43), `npm run check:3d`, the full Playwright suite and `npm run build` (budgets OK).

## Explicitly outstanding

- G1 visual approval and the 60 fps baseline on the physical target laptop/phones.
- V3.2: final lion topology, textures, fur, correctives, clips, foot IK/lock, planned strides, spring chains, surface interactions and the complete §16.2 rig checks. The G1 cycle is not the finished gait.
- V3.3: Wolf, Boar, Squirrel, Cheetah, portraits, roster switch and save migration.
- V3.4–V3.6: final environment assets, spectators, five complete challenges and the 3D podium.
- V3.7: licensed field audio, audition selections, buses, processing and manifests.
- V3.8: final performance/LOD/SMAA pass, production renderer switch, removal of Pixi and old assets, final budgets and G6 approval.

## Review

Use `npm run dev` and open `/?lab=animals`. Use `/?renderer=3d&debug` for the existing game clock with the prototype stage. These paths are dev-only; the production game remains playable with V3.0's UI and the existing renderer.
