"""Profile is sampled from the exported terrain geometry, not a second height formula."""
import json
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def export_profile(obj, path):
    tree = BVHTree.FromPolygons([v.co for v in obj.data.vertices], [p.vertices[:] for p in obj.data.polygons])
    lanes = []
    for lane in range(5):
        samples = []
        z = -3.6 + lane * 1.8
        # Blender +Y maps to glTF -Z.
        for i in range(1281):
            d = -10 + i * 0.25
            hit, normal, _, _ = tree.ray_cast(Vector((-max(-9.999, min(309.999, d)), -z, 20)), Vector((0, 0, -1)))
            if hit is None:
                raise RuntimeError(f'Missing ground at {d}, lane {lane}')
            surface = 'leaves' if 180 < d < 264 else 'dirt' if 36 < d < 264 else 'grass'
            samples.append([round(hit.z, 5), round(normal.x, 5), round(normal.z, 5), round(-normal.y, 5), surface])
        lanes.append(samples)
    path.write_text(json.dumps({'version': 1, 'start': -10, 'step': 0.25, 'laneSpacing': 1.8, 'lanes': lanes}, separators=(',', ':')))
