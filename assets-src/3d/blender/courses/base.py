import bpy
import math
from common.export import material, export_scene
from courses.profile_export import export_profile


def height(distance, z):
    h = 0
    if 36 < distance < 120:
        h = 1.2 * math.sin((distance - 36) / 84 * math.pi) ** 2
    if 180 < distance < 264:
        h = -0.7 * math.sin((distance - 180) / 84 * math.pi) ** 2
    bank = max(0, abs(z) - 4.5)
    return h + 0.5 * (1 - math.exp(-bank * 0.22)) + (0.08 * math.sin(distance * 0.22 + z) if bank > 1 else 0)


def build(output):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    vertices, faces = [], []
    # Fine 0.5 m rows on the raced section, 1 m aprons beyond both ends so the
    # betting and finish cameras never see the edge of the world.
    rows = [-40 + i for i in range(30)] + [-10 + i * 0.5 for i in range(641)] + [311 + i for i in range(30)]
    width = 53
    for d in rows:
        for j in range(width):
            z = j - 30
            vertices.append((-d, z, height(d, z)))
    for i in range(len(rows) - 1):
        for j in range(width - 1):
            a = i * width + j
            faces.append((a, a + 1, a + width + 1, a + width))
    mesh = bpy.data.meshes.new('Base terrain')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new('CourseBase', mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material('Grass', '#5E9A3A'))
    obj.data.materials.append(material('Trail', '#9A7448'))
    obj.data.materials.append(material('Leaf litter', '#5C6432'))
    for face in mesh.polygons:
        d, z = -face.center.x, face.center.y
        face.material_index = (2 if 180 < d < 264 else 1) if abs(z) < 4.3 and 36 < d < 264 else 0
        face.use_smooth = True
    export_profile(obj, output / 'course-base.profile.json')
    export_scene(output / 'course-base.glb')
