"""Blender 4.5 LTS authoring exports; glTF Transform handles compression afterwards."""
import bpy


def export_scene(path):
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format='GLB', export_yup=True,
        export_animations=True, export_animation_mode='ACTIONS',
        export_force_sampling=True, export_frame_range=False,
        export_skins=True, export_morph=True, export_materials='EXPORT',
    )


def material(name, hex_color, roughness=0.85):
    def linear(v):
        v = int(v, 16) / 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    color = [linear(hex_color[i:i + 2]) for i in (1, 3, 5)]
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat
