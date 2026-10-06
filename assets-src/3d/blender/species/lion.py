"""G1 connected lion blockout. Detail, authored gait and IK belong to the G2 gate."""
import bpy
import math
import json
from mathutils import Vector, Quaternion
from common.export import material, export_scene


def build(output, source):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    spec = json.loads((source / 'spec.json').read_text())
    coat = material('Lion coat', spec['coat'])
    mane_mat = material('Mane', spec['mane'])
    muzzle_mat = material('Muzzle', spec['belly'])
    nose_mat = material('Nose', '#6B3B33', 0.3)
    eye_mat = material('Eyes', '#E0A030', 0.14)
    pupil_mat = material('Pupil', '#171D1A', 0.14)

    def ellipsoid(name, p, scale, mat=None):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=p)
        obj = bpy.context.object
        obj.name = name
        obj.scale = scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        if mat:
            obj.data.materials.append(mat)
        for face in obj.data.polygons:
            face.use_smooth = True
        return obj

    parts = []
    def skin(p, scale):
        parts.append(ellipsoid('blockout', p, scale))
    skin((0.03, 0, 0.96), (0.82, 0.30, 0.34))
    skin((-0.48, 0, 1.03), (0.4, 0.36, 0.46))
    skin((0.58, 0, 0.94), (0.32, 0.29, 0.33))
    skin((-0.75, 0, 1.19), (0.28, 0.29, 0.38))
    skin((-1.01, 0, 1.36), (0.34, 0.29, 0.31))
    skin((-1.26, 0, 1.23), (0.20, 0.23, 0.15))
    for side in (-1, 1):
        skin((-0.92, side * 0.25, 1.57), (0.12, 0.09, 0.14))
        for x, hip in ((-0.48, 0.97), (0.57, 0.94)):
            y = side * 0.23
            skin((x, y, hip - 0.16), (0.20, 0.17, 0.32))
            skin((x + 0.04, y, 0.45), (0.115, 0.105, 0.24))
            skin((x - 0.02, y, 0.22), (0.09, 0.095, 0.18))
            skin((x - 0.10, y, 0.10), (0.19, 0.13, 0.11))
    tail = []
    for i in range(13):
        t = i / 12
        p = (0.75 + t * 0.82, 0, 1.02 - 0.36 * math.sin(t * 2))
        tail.append(p)
        skin(p, (0.12 if i == 0 else 0.073, 0.065, 0.065))
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    body = bpy.context.object
    body.name = 'LionBody'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    remesh = body.modifiers.new('Continuous body', 'REMESH')
    remesh.mode = 'VOXEL'
    remesh.voxel_size = 0.045
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth = body.modifiers.new('Soften blockout', 'SMOOTH')
    smooth.factor = 1.1
    smooth.iterations = 4
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    decimate = body.modifiers.new('Blockout budget', 'DECIMATE')
    decimate.ratio = min(1, 5500 / max(1, len(body.data.polygons)))
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    body.data.materials.append(coat)
    for face in body.data.polygons:
        face.use_smooth = True

    # Skin attachments to the same skeleton (never rigidly parent meshes to a bone).
    extras = []
    extras.append((ellipsoid('Mane mass', (-0.73, 0, 1.23), (0.40, 0.40, 0.49), mane_mat), 'neck'))
    for side in (-1, 1):
        extras.append((ellipsoid('Muzzle', (-1.27, side * 0.10, 1.20), (0.16, 0.14, 0.10), muzzle_mat), 'head'))
        extras.append((ellipsoid('Eye', (-1.20, side * 0.237, 1.43), (0.09, 0.041, 0.075), eye_mat), 'head'))
        extras.append((ellipsoid('Pupil', (-1.228, side * 0.269, 1.44), (0.043, 0.022, 0.05), pupil_mat), 'head'))
    extras.append((ellipsoid('Nose', (-1.42, 0, 1.265), (0.077, 0.11, 0.068), nose_mat), 'head'))
    extras.append((ellipsoid('Tail tuft', tail[-1], (0.135, 0.10, 0.12), mane_mat), 'tail_06'))

    bpy.ops.object.armature_add()
    rig = bpy.context.object
    rig.name = 'LionRig'
    bpy.ops.object.mode_set(mode='EDIT')
    rig.data.edit_bones.remove(rig.data.edit_bones[0])
    segments = {}
    def bone(name, start, end, parent=None):
        b = rig.data.edit_bones.new(name)
        b.head, b.tail = start, end
        if parent:
            b.parent = rig.data.edit_bones[parent]
        segments[name] = (Vector(start), Vector(end))
    bone('root', (0, 0, 0), (0, 0, 0.3))
    bone('pelvis', (0.56, 0, 0.94), (0.2, 0, 1), 'root')
    bone('spine_01', (0.2, 0, 1), (-0.1, 0, 1.03), 'pelvis')
    bone('chest', (-0.1, 0, 1.03), (-0.52, 0, 1.07), 'spine_01')
    bone('neck', (-0.52, 0, 1.07), (-0.91, 0, 1.35), 'chest')
    bone('head', (-0.91, 0, 1.35), (-1.43, 0, 1.3), 'neck')
    bone('nose', (-1.49, 0, 1.265), (-1.53, 0, 1.265), 'head')
    for side, y in (('L', 0.23), ('R', -0.23)):
        for prefix, x, parent in (('fore', -0.48, 'chest'), ('hind', 0.57, 'pelvis')):
            bone(f'{prefix}_{side}_upper', (x, y, 0.97), (x + 0.06, y, 0.52), parent)
            bone(f'{prefix}_{side}_lower', (x + 0.06, y, 0.52), (x - 0.02, y, 0.18), f'{prefix}_{side}_upper')
            bone(f'{prefix}_{side}_paw', (x - 0.02, y, 0.18), (x - 0.19, y, 0.09), f'{prefix}_{side}_lower')
    for i in range(6):
        bone(f'tail_{i + 1:02}', tail[i * 2], tail[i * 2 + 2], 'pelvis' if i == 0 else f'tail_{i:02}')
    bpy.ops.object.mode_set(mode='OBJECT')

    def bind(obj):
        mod = obj.modifiers.new('Skin', 'ARMATURE')
        mod.object = rig
        obj.parent = rig
    groups = {name: body.vertex_groups.new(name=name) for name in segments if name not in ('root', 'nose')}
    for v in body.data.vertices:
        influences = []
        for name, group in groups.items():
            a, b = segments[name]
            ab = b - a
            t = max(0, min(1, (v.co - a).dot(ab) / ab.length_squared))
            distance = (v.co - (a + t * ab)).length
            influences.append((math.exp(-distance * distance / 0.035), group))
        top = sorted(influences, key=lambda entry: -entry[0])[:4]
        total = sum(w for w, _ in top)
        for w, group in top:
            group.add([v.index], w / total, 'REPLACE')
    bind(body)
    for obj, name in extras:
        obj.vertex_groups.new(name=name).add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
        bind(obj)

    scene = bpy.context.scene
    scene.render.fps = 30
    scene.frame_start, scene.frame_end = 1, 31
    rig.animation_data_create()
    for clip in ('idle', 'gallop'):
        action = bpy.data.actions.new(clip)
        action.use_fake_user = True
        rig.animation_data.action = action
        for frame in range(1, 32):
            phase = (frame - 1) / 30 * math.tau
            for pb in rig.pose.bones:
                axis = pb.bone.matrix_local.to_3x3().inverted() @ Vector((0, 1, 0))
                angle = 0
                if clip == 'gallop':
                    if '_upper' in pb.name:
                        offset = (0 if 'hind' in pb.name else 2.6) + (0.6 if '_R' in pb.name else 0)
                        angle = 0.65 * math.sin(phase + offset)
                    elif '_lower' in pb.name:
                        offset = (0 if 'hind' in pb.name else 2.6) + (0.6 if '_R' in pb.name else 0)
                        angle = -0.40 * math.sin(phase + offset - 0.8)
                    elif pb.name == 'spine_01':
                        angle = 0.09 * math.sin(phase)
                    elif pb.name == 'neck':
                        angle = -0.07 * math.sin(phase)
                    elif pb.name.startswith('tail_'):
                        angle = 0.055 * math.sin(phase - int(pb.name[-2:]) * 0.45)
                elif pb.name == 'chest':
                    angle = 0.012 * math.sin(phase)
                pb.rotation_mode = 'QUATERNION'
                pb.rotation_quaternion = Quaternion(axis, angle)
                pb.keyframe_insert('rotation_quaternion', frame=frame, group=pb.name)
        rig.animation_data.action = None
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(source / 'lion-blockout.blend'))
    export_scene(output / 'lion-blockout.glb')
    (output / 'lion-blockout.json').write_text(json.dumps({
        'stage': 'G1 blockout', 'noseOffset': 1.49, 'strideLength': spec['strideLength'],
        'clips': ['idle', 'gallop'], 'finalRigChecks': False
    }, indent=2))
