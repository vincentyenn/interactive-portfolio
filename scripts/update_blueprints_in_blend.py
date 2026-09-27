"""Refresh the blueprint sheets in an already-open loft-room.blend.

Run this from Blender's Python Console with this repository's loft-room.blend
open. The full scene build stays in build_loft.py; this focused updater is
useful when rebuilding that scene in background mode is unavailable.
"""

from pathlib import Path

import bpy


ROOT = Path(bpy.data.filepath).resolve().parents[1]
EXPECTED_BLEND = (ROOT / "assets" / "loft-room.blend").resolve()
if Path(bpy.data.filepath).resolve() != EXPECTED_BLEND:
    raise RuntimeError(f"Open {EXPECTED_BLEND} before running this updater")


def apply_paper_stock(material: bpy.types.Material) -> None:
    material.diffuse_color = (0.68, 0.70, 0.64, 1)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    shader = nodes.get("Principled BSDF")
    if shader is None:
        raise RuntimeError("Blueprint stock material has no Principled BSDF")
    shader.inputs["Base Color"].default_value = (0.68, 0.70, 0.64, 1)
    shader.inputs["Roughness"].default_value = 0.94
    if not any(node.type == "TEX_NOISE" for node in nodes):
        grain = nodes.new("ShaderNodeTexNoise")
        grain.name = "subtle paper fibers"
        grain.inputs["Scale"].default_value = 360
        grain.inputs["Detail"].default_value = 2
        bump = nodes.new("ShaderNodeBump")
        bump.name = "paper tooth"
        bump.inputs["Strength"].default_value = 0.12
        bump.inputs["Distance"].default_value = 0.0015
        links.new(grain.outputs["Fac"], bump.inputs["Height"])
        links.new(bump.outputs["Normal"], shader.inputs["Normal"])


stock = bpy.data.materials.get("blueprint paper edge")
if stock is None:
    raise RuntimeError("Missing 'blueprint paper edge' material")
apply_paper_stock(stock)

for index in range(1, 4):
    paper = bpy.data.objects.get(f"project {index} blueprint paper")
    artwork = bpy.data.objects.get(f"project {index} blueprint artwork")
    material = bpy.data.materials.get(f"project {index} blueprint")
    if paper is None or artwork is None or material is None:
        raise RuntimeError(f"Blueprint sheet {index} is incomplete")

    paper.dimensions = (1.53, 1.09, 0.004)
    paper.location.z = 1.003
    bpy.ops.object.select_all(action="DESELECT")
    paper.select_set(True)
    bpy.context.view_layer.objects.active = paper
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    paper.select_set(False)
    bevel = next((modifier for modifier in paper.modifiers if modifier.type == "BEVEL"), None)
    if bevel is None:
        bevel = paper.modifiers.new("soft paper edges", "BEVEL")
    bevel.width = 0.001
    bevel.segments = 3

    # Older Blender source files have the printed plane embedded inside the
    # paper mesh. Place its world-space center just above the stock so the
    # exported artwork remains visible without introducing z-fighting.
    bpy.context.view_layer.update()
    artwork_center_z = sum((artwork.matrix_world @ vertex.co).z for vertex in artwork.data.vertices) / len(artwork.data.vertices)
    paper_top_z = paper.location.z + paper.dimensions.z / 2
    artwork.location.z += paper_top_z + 0.002 - artwork_center_z

    image_path = ROOT / "assets" / "graphics" / f"blueprint_{index}.jpg"
    image = bpy.data.images.load(str(image_path), check_existing=False)
    image.pack()
    texture_nodes = [node for node in material.node_tree.nodes if node.type == "TEX_IMAGE"]
    if not texture_nodes:
        raise RuntimeError(f"Blueprint material {index} has no image texture node")
    for node in texture_nodes:
        node.image = image
    material.node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value = 0.88

bpy.ops.file.pack_all()

mesh_selection = [(obj, obj.select_get()) for obj in bpy.data.objects]
active_object = bpy.context.view_layer.objects.active
try:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.data.objects:
        if obj.type == "MESH":
            obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(ROOT / "public" / "models" / "loft-room.glb"),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
    )
finally:
    bpy.ops.object.select_all(action="DESELECT")
    for obj, selected in mesh_selection:
        if selected:
            obj.select_set(True)
    if active_object is not None:
        bpy.context.view_layer.objects.active = active_object

print("Updated and exported the three Blender blueprint sheets. Save the .blend to keep the editable source in sync.")
