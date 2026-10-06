"""Rebuild the G1 assets. Invoked by npm run assets:3d; never by npm ci/build."""
import sys
import bpy
bpy.context.preferences.filepaths.save_version = 0
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from species.lion import build as lion
from courses.base import build as course

root = Path(__file__).resolve().parents[3]
output = Path(sys.argv[sys.argv.index('--') + 1])
output.mkdir(parents=True, exist_ok=True)
lion(output, root / 'assets-src/3d/species/lion')
course(output)
