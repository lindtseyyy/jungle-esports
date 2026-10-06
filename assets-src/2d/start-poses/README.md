# Starting-line poses

Five new transparent, left-facing animal images were generated with the OpenAI built-in image generator, using each animal's existing running artwork as the character reference. They depict grounded quadrupeds with planted forefeet and flexed hind legs, ready to launch. The game displays them during betting, lock and countdown, then switches to the original run cycles when movement starts.

Original generated source files are preserved in the project:

- `assets-src/2d/lion/ready/ready_00.png`
- `assets-src/2d/boar/ready/ready_00.png`
- `assets-src/2d/cheetah/ready/ready_00.png`
- `assets-src/2d/squirrel/ready/ready_00.png`
- `assets-src/2d/dog/ready/ready_00.png`

The exact five generation prompts are in `prompts.json`. Each animal's `ready.json` also records its prompt, reference image, alpha bounds, nose and ground anchors, and display height. `READY-SOURCE.md` describes how the original alpha is preserved and the image is packed into a spare cell of the 1×/2× run atlas.
