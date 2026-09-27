"""Build the editable loft set and its browser GLB with Blender 4.5.

Run from the repository root with Blender --background --python scripts/build_loft.py.
World helpers take Three.js coordinates (x, height, depth); the glTF exporter
converts Blender's Z-up coordinates to Three's Y-up coordinates.
"""

import math
import tempfile
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "source"
GRAPHICS = ROOT / "assets" / "graphics"
OUT = ROOT / "public" / "models"
OUT.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for material in list(bpy.data.materials):
    bpy.data.materials.remove(material)


def xyz(x, height, depth):
    return (x, -depth, height)


def simple(name, color, roughness=0.65, metallic=0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission[0], 1)
        bsdf.inputs["Emission Strength"].default_value = emission[1]
    return mat


def texture(name, slug, scale=1):
    mat = simple(name, (0.65, 0.6, 0.53))
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    texcoord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (scale, scale, scale)
    links.new(texcoord.outputs["UV"], mapping.inputs["Vector"])
    folder = SOURCE / "textures" / slug
    for suffix, target in (("diff", "Base Color"), ("rough", "Roughness")):
        node = nodes.new("ShaderNodeTexImage")
        node.image = bpy.data.images.load(str(folder / f"{slug}_{suffix}_1k.jpg"), check_existing=True)
        if suffix == "rough":
            node.image.colorspace_settings.name = "Non-Color"
        links.new(mapping.outputs["Vector"], node.inputs["Vector"])
        links.new(node.outputs["Color"], bsdf.inputs[target])
    node = nodes.new("ShaderNodeTexImage")
    node.image = bpy.data.images.load(str(folder / f"{slug}_nor_gl_1k.jpg"), check_existing=True)
    node.image.colorspace_settings.name = "Non-Color"
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = 0.42
    links.new(mapping.outputs["Vector"], node.inputs["Vector"])
    links.new(node.outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def graphic(name, filename, emission=0):
    mat = simple(name, (0.4, 0.4, 0.4), roughness=0.86)
    mat.use_backface_culling = False
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    img = nodes.new("ShaderNodeTexImage")
    # Always load the current authored graphic. The editable blend keeps
    # packed older copies, so reusing an image by path can silently export it.
    img.image = bpy.data.images.load(str(GRAPHICS / filename), check_existing=False)
    links.new(img.outputs["Color"], bsdf.inputs["Base Color"])
    if emission:
        links.new(img.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = emission
    return mat


plaster = texture("warm plaster", "painted_plaster_wall", 0.58)
brick = texture("warm brick", "brick_wall_10", 0.7)
concrete = texture("worn concrete", "concrete_floor_worn_001", 0.65)
oak = texture("oiled oak", "oak_wood_planks", 0.92)
veneer = texture("oak veneer", "oak_veneer_01", 0.9)
black = simple("powder coated steel", (0.065, 0.072, 0.071), 0.38, 0.66)
dark = simple("graphite rubber", (0.11, 0.13, 0.13), 0.78)
brass = simple("brushed brass", (0.55, 0.38, 0.19), 0.35, 0.7)
monitor_alloy = simple("monitor anodized graphite", (0.075, 0.09, 0.09), 0.27, 0.78)
cream = simple("warm ceramic", (0.77, 0.73, 0.65), 0.58)
glass = simple("window glass", (0.36, 0.48, 0.48), 0.11, 0.1)
glass.diffuse_color = (0.72, 0.84, 0.88, 0.12)
glass.surface_render_method = "BLENDED"
glass_bsdf = glass.node_tree.nodes.get("Principled BSDF")
glass_bsdf.inputs["Base Color"].default_value = (0.72, 0.84, 0.88, 0.12)
glass_bsdf.inputs["Alpha"].default_value = 0.16
blue = simple("blueprint paper edge", (0.68, 0.70, 0.64), 0.94)
paper_nodes = blue.node_tree.nodes
paper_links = blue.node_tree.links
paper_bsdf = paper_nodes.get("Principled BSDF")
paper_noise = paper_nodes.new("ShaderNodeTexNoise")
paper_noise.inputs["Scale"].default_value = 360
paper_noise.inputs["Detail"].default_value = 2
paper_bump = paper_nodes.new("ShaderNodeBump")
paper_bump.inputs["Strength"].default_value = 0.12
paper_bump.inputs["Distance"].default_value = 0.0015
paper_links.new(paper_noise.outputs["Fac"], paper_bump.inputs["Height"])
paper_links.new(paper_bump.outputs["Normal"], paper_bsdf.inputs["Normal"])
glow = simple("soft lamp glow", (0.93, 0.7, 0.43), 0.32, emission=((1.0, 0.64, 0.31), 1.6))
screenmat = graphic("portfolio monitor", "computer_screen.jpg", 0.55)
boardmat = graphic("experience wall", "experience_board.jpg")
contactmat = graphic("contact sign", "contact_sign.jpg", 0.2)
sheetmats = [graphic(f"project {i} blueprint", f"blueprint_{i}.jpg") for i in range(1, 4)]


def assign(obj, mat):
    obj.data.materials.append(mat)
    return obj


def cube(name, pos, size, mat, bevel=None, bevel_segments=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(*pos))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    # Project each face in meters rather than stretching one UV tile over it.
    uv = obj.data.uv_layers.active
    for face in obj.data.polygons:
        normal_axis = max(range(3), key=lambda axis: abs(face.normal[axis]))
        axes = [axis for axis in range(3) if axis != normal_axis]
        extents = [max(obj.data.vertices[obj.data.loops[index].vertex_index].co[axis]
                       for index in face.loop_indices) -
                   min(obj.data.vertices[obj.data.loops[index].vertex_index].co[axis]
                       for index in face.loop_indices) for axis in axes]
        u_axis, v_axis = axes if extents[0] >= extents[1] else axes[::-1]
        for index in face.loop_indices:
            point = obj.data.vertices[obj.data.loops[index].vertex_index].co
            uv.data[index].uv = (point[u_axis], point[v_axis])
    assign(obj, mat)
    # Give furniture and architectural edges a small highlight-catching radius.
    # Tiny labels, keys, and blueprint sheets stay crisp and inexpensive.
    if bevel is None and min(size) >= 0.08:
        bevel = min(0.012, min(size) * 0.035)
    if bevel:
        mod = obj.modifiers.new("soft edges", "BEVEL")
        mod.width = bevel
        mod.segments = bevel_segments
        obj.modifiers.new("weighted corners", "WEIGHTED_NORMAL")
    return obj


def cylinder(name, pos, radius, depth, mat, vertices=20, rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=xyz(*pos))
    obj = bpy.context.object
    obj.name = name
    if rotation:
        obj.rotation_euler = rotation
    assign(obj, mat)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def torus(name, pos, major_radius, minor_radius, mat, rotation=None):
    bpy.ops.mesh.primitive_torus_add(major_segments=36, minor_segments=12,
                                    major_radius=major_radius, minor_radius=minor_radius,
                                    location=xyz(*pos), rotation=rotation or (0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def sphere(name, pos, size, mat, segments=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=xyz(*pos))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (size[0], size[2], size[1])
    assign(obj, mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def tube(name, a, b, radius, mat, vertices=10):
    av, bv = Vector(xyz(*a)), Vector(xyz(*b))
    mid = (av + bv) * 0.5
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=(bv - av).length, location=mid)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = (bv - av).to_track_quat("Z", "Y").to_euler()
    assign(obj, mat)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def image_plane(name, center, width, height, mat, horizontal=False, rotation=0):
    x, y, z = center
    if horizontal:
        # Facing upward. Image top points to the back wall of the loft.
        coords = [(-width/2, height/2), (width/2, height/2),
                  (width/2, -height/2), (-width/2, -height/2)]
        rotated = [(a*math.cos(rotation)-b*math.sin(rotation),
                    a*math.sin(rotation)+b*math.cos(rotation)) for a, b in coords]
        verts = [xyz(x+a, y, z+b) for a, b in rotated]
    else:
        verts = [xyz(x-width/2, y-height/2, z), xyz(x+width/2, y-height/2, z),
                 xyz(x+width/2, y+height/2, z), xyz(x-width/2, y+height/2, z)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], [(0, 1, 2, 3)])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    uv = mesh.uv_layers.new(name="UVMap")
    for loop_index, coord in zip(mesh.polygons[0].loop_indices, ((0,0),(1,0),(1,1),(0,1))):
        uv.data[loop_index].uv = coord
    assign(obj, mat)
    return obj


def imported(slug, center, target_width, rotation_z=0):
    path = SOURCE / "models" / slug / f"{slug}_1k.gltf"
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    added = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    if not added:
        return
    # Normalize in native Blender axes, then place it within the loft.
    bpy.context.view_layer.update()
    coords = [o.matrix_world @ Vector(corner) for o in added for corner in o.bound_box]
    low = Vector(tuple(min(v[i] for v in coords) for i in range(3)))
    high = Vector(tuple(max(v[i] for v in coords) for i in range(3)))
    span = max(high.x-low.x, high.y-low.y)
    scale = target_width / span if span else 1
    pivot = Vector(xyz(*center))
    offset = pivot - Vector(((low.x+high.x)/2, (low.y+high.y)/2, low.z)) * scale
    rotation = Matrix.Translation(pivot) @ Matrix.Rotation(rotation_z, 4, "Z") @ Matrix.Translation(-pivot)
    transform = rotation @ Matrix.Translation(offset) @ Matrix.Scale(scale, 4)
    for obj in added:
        obj.name = f"{slug} / {obj.name}"
        obj.matrix_world = transform @ obj.matrix_world
    bpy.context.view_layer.update()


# Shell: a front-open loft with an oak mezzanine, not a painted backdrop.
cube("concrete floor", (0,-0.14,-0.05), (12.4,0.28,9.7), concrete)
# Three actual window bays let the exterior read as part of the room. Build the
# rear wall from plaster sections around the openings instead of putting glass
# in front of a continuous wall.
rear_x_min, rear_x_max = -6.2, 6.2
window_centers = (-4.5, -2.75, -1.0)
window_width = 1.42
window_bottom, window_top = 3.34, 5.90
wall_front, wall_back = -4.73, -4.51
wall_depth = wall_back - wall_front
wall_center_z = (wall_front + wall_back) / 2
cube("rear plaster lower wall", (0,window_bottom/2,wall_center_z),
     (rear_x_max-rear_x_min,window_bottom,wall_depth),plaster)
header_height = 6.3 - window_top
cube("rear plaster window header", (0,window_top+header_height/2,wall_center_z),
     (rear_x_max-rear_x_min,header_height,wall_depth),plaster)
window_intervals = [(x-window_width/2,x+window_width/2) for x in window_centers]
piers = []
cursor = rear_x_min
for left, right in window_intervals:
    if left > cursor:
        piers.append((cursor,left))
    cursor = right
if cursor < rear_x_max:
    piers.append((cursor,rear_x_max))
for index, (left, right) in enumerate(piers, start=1):
    pier_width = right-left
    cube(f"rear plaster window pier {index}", ((left+right)/2,
         (window_bottom+window_top)/2,wall_center_z),
         (pier_width,window_top-window_bottom,wall_depth),plaster)
cube("left brick wall", (-6.16,3.15,-0.05), (0.22,6.3,9.7), brick)
cube("right plaster wall", (6.16,3.15,-0.05), (0.22,6.3,9.7), plaster)
# Narrow oak skirting closes the wall/floor seam and grounds the room.
cube("rear wall oak skirting", (0,0.075,-4.43), (12.1,0.15,0.12), veneer)
for x in (-6.02, 6.02):
    cube("side wall oak skirting", (x,0.075,-0.05), (0.12,0.15,9.45), veneer)
cube("ceiling", (0,6.28,-0.1), (12.4,0.24,9.6), dark)
for x in (-5.65, -3.05, -0.45, 2.15, 4.75):
    cube("exposed ceiling beam", (x,5.91,-0.1), (0.2,0.36,9.45), veneer, 0.016)
for depth in (-3.8, -1.4, 1.0, 3.4):
    cube("cross beam", (0,5.99,depth), (12.15,0.22,0.17), oak, 0.014)
for x in (-5.82, 5.82):
    for depth in (-4.28, 4.15):
        cube("black steel post", (x,3.04,depth), (0.16,6.08,0.16), black, 0.015)

# Window bays: layered dark framing and translucent light-catching panes.
for x in window_centers:
    # One thin surface avoids layered faces that amplify transparency flicker.
    image_plane("high window glass", (x,4.62,-4.47), 1.28, 2.35, glass)
    for side in (-0.68, 0.68):
        cube("window mullion", (x+side,4.62,-4.39), (0.075,2.53,0.09), black)
    for height in (3.34, 4.62, 5.89):
        cube("window transom", (x,height,-4.38), (1.48,0.075,0.09), black)
    cube("window sill", (x,3.31,-4.17), (1.55,0.07,0.43), concrete, 0.015)

# Mezzanine over the left half of the room. The open notch follows the top of
# the browser staircase so the treads and handrail emerge at a finished
# landing rather than passing through the deck.
deck_y, deck_thickness = 3.13, 0.26
deck_x_min, deck_x_max = -6.08, -1.60
deck_z_min, deck_z_max = -4.475, 3.175
stairwell_x_min, stairwell_x_max = -4.9, deck_x_max
stairwell_z_min, stairwell_z_max = -2.65, 2.25
cube("loft oak deck west panel", ((deck_x_min+stairwell_x_min)/2,deck_y,-0.65),
     (stairwell_x_min-deck_x_min,deck_thickness,deck_z_max-deck_z_min),oak,0.02)
for name, low_z, high_z in (("north",deck_z_min,stairwell_z_min),
                            ("south",stairwell_z_max,deck_z_max)):
    cube(f"loft oak deck {name} return", ((stairwell_x_min+deck_x_max)/2,deck_y,
         (low_z+high_z)/2), (deck_x_max-stairwell_x_min,deck_thickness,high_z-low_z),oak,0.02)
# The landing is flush with the mezzanine top and butts to its edge. Its lower
# face stays just above the final tread, avoiding overlap while closing the
# vertical gap left by the upper floor.
cube("oak stair landing", (-1.01,3.13,-2.94), (1.18,0.26,0.92), oak,0.018)
for x in (-5.87, -1.82):
    for depth in (-4.05, -1.05, 2.55):
        leg_x = x
        leg_depth = -3.15 if x == -1.82 and depth == -1.05 else depth
        cube("mezzanine leg", (leg_x,1.5,leg_depth), (0.15,3.0,0.15), black)
for x in (-5.84, -4.85, -3.86, -2.87, -1.86):
    cube("mezzanine oak fascia", (x,2.89,3.08), (0.8,0.12,0.1), veneer)
# A recessed light line gives the underside of the mezzanine a readable edge.
cube("mezzanine light channel", (-3.83,2.84,3.015), (3.82,0.035,0.045), black)
cube("mezzanine warm light diffuser", (-3.83,2.84,3.049), (3.67,0.012,0.014), glow)
for depth in (-4.12, -3.25, 2.84):
    tube("loft railing upright", (-1.58,3.24,depth), (-1.58,4.18,depth), 0.027, black)
for low_z, high_z in ((-4.25,stairwell_z_min),(stairwell_z_max,3.02)):
    tube("loft railing top", (-1.58,4.18,low_z), (-1.58,4.18,high_z), 0.045, black)
    tube("loft railing lower", (-1.58,3.57,low_z), (-1.58,3.57,high_z), 0.025, black)

# Steel guardrails frame the exposed west edge of the stairwell notch.
guardrail_y = 3.26
guardrail_x = stairwell_x_min - 0.2
for depth in (-2.55, -1.75, -0.95, -0.15, 0.65, 1.45, 2.05):
    tube("stairwell guardrail upright", (guardrail_x,guardrail_y,depth),
         (guardrail_x,guardrail_y+0.9,depth),0.026,black)
tube("stairwell guardrail top", (guardrail_x,guardrail_y+0.9,stairwell_z_min),
     (guardrail_x,guardrail_y+0.9,stairwell_z_max),0.043,black)
tube("stairwell guardrail lower", (guardrail_x,guardrail_y+0.31,stairwell_z_min),
     (guardrail_x,guardrail_y+0.31,stairwell_z_max),0.023,black)

# Left-side staircase, aligned with the browser's diagonal flight.
stair_steps = []
for i in range(15):
    t = i/14
    step_x = -4.2 + 2.8*t
    height = 0.19 + 3.01*t
    depth = 1.95 - 4.2*t
    stair_steps.append((step_x,height,depth))
    cube("floating stair tread", (step_x,height,depth), (1.26,0.12,0.46), oak, 0.018)
    if i <= 12 and i % 2 == 0:
        tube("stair side rail", (step_x+0.66,height+0.12,depth),
             (step_x+0.66,height+0.72,depth), 0.022, black)
first_step, last_step = stair_steps[0], stair_steps[-1]
landing_rail_x = last_step[0] + 0.66
landing_rail_y = last_step[1] + 0.72
tube("ascending hand rail", (first_step[0]+0.66,first_step[1]+0.72,first_step[2]),
     (landing_rail_x,landing_rail_y,-2.48), 0.038, black)
tube("stair side rail", (landing_rail_x,3.26,-2.48),
     (landing_rail_x,4.18,-2.48), 0.027, black)
tube("stair stringer", (first_step[0]-0.67,first_step[1]-0.16,first_step[2]),
     (last_step[0]-0.67,last_step[1]-0.16,last_step[2]), 0.075, black)

# A compact, warm display shelf beneath the loft, clear of the computer desk.
for height in (0.62, 1.43, 2.27):
    cube("personal shelf", (-4.72,height,-2.67), (2.08,0.09,0.62), veneer, 0.02)
for x in (-5.72, -3.72):
    cube("shelf steel frame", (x,1.44,-2.67), (0.06,2.75,0.57), black)
bookcloth = simple("muted book cloth", (0.19,0.26,0.27), 0.88)
terracotta = simple("matte terracotta", (0.47,0.28,0.19), 0.84)
leafgreen = simple("olive leaf", (0.13,0.24,0.17), 0.86)
for row, height in enumerate((0.65,1.47,2.31)):
    for index in range(3):
        thickness = 0.07 + (index % 3) * 0.018
        cube("shelf book", (-5.47+index*0.11,height+0.16,-2.62),
             (thickness,0.27+((index+row)%3)*0.045,0.34),
             (bookcloth, cream, dark, terracotta)[(index+row)%4], 0.006)
    cylinder("shelf ceramic vessel", (-4.78+row*0.08,height+0.14,-2.61), 0.105, 0.26, cream)
    cube("shelf photo frame", (-4.27-row*0.08,height+0.19,-2.72),
         (0.39,0.34,0.055), black, 0.008)
    cube("shelf photo mat", (-4.27-row*0.08,height+0.19,-2.68),
         (0.31,0.26,0.005), cream)
# A small plant gives the personal shelf a natural silhouette in the wide view.
cylinder("plant ceramic pot", (-3.96,2.48,-2.57), 0.15, 0.28, terracotta, 20)
torus("plant pot lip", (-3.96,2.62,-2.57), 0.137, 0.014, terracotta)
cylinder("plant soil", (-3.96,2.63,-2.57), 0.135, 0.018, dark, 20)
for index in range(12):
    angle = index * math.radians(137.5)
    layer = index % 4
    stem_x = -3.96 + (0.09 + 0.02 * (layer % 2)) * math.cos(angle)
    stem_z = -2.57 + (0.09 + 0.02 * (layer % 2)) * math.sin(angle)
    leaf_height = 2.68 + 0.025 * layer
    tube("plant stem", (-3.96,2.62 + 0.018 * layer,-2.57),
         (stem_x,leaf_height,stem_z), 0.009, leafgreen, 8)
    leaf = sphere("plant leaf", (stem_x,leaf_height + 0.025,stem_z),
                  (0.072,0.13,0.032), leafgreen, 24, 16)
    leaf.rotation_euler.z = angle

# A run of slatted timber and a narrow dark reveal add depth behind the desk.
cube("desk oak wall inset", (-1.54,1.55,-4.485), (3.15,2.86,0.055), veneer, 0.008)
for x in (-2.94,-2.55,-2.16,-1.77,-1.38,-0.99,-0.60,-0.21):
    cube("desk wall timber slat", (x,1.55,-4.43), (0.055,2.82,0.07), oak, 0.009)
cube("desk wall shadow reveal", (-1.54,0.12,-4.425), (3.15,0.055,0.08), black)

# Central computer desk: a slim monitor with a readable authored screen texture.
cube("computer oak desk", (-1.72,0.81,-2.11), (3.35,0.12,1.46), oak, 0.035, 4)
for x in (-3.17,-0.28):
    for depth in (-2.71,-1.47):
        cube("computer desk leg", (x,0.39,depth), (0.09,0.79,0.09), black)
cube("monitor stand foot", (-1.71,0.9,-2.41), (0.58,0.045,0.34), monitor_alloy, 0.025, 5)
cube("monitor stand neck", (-1.71,1.12,-2.4), (0.075,0.42,0.07), monitor_alloy, 0.024, 5)
cylinder("monitor swivel hinge", (-1.71,1.31,-2.406), 0.051, 0.16, black, 36,
         rotation=(0,math.pi/2,0))
cube("large computer monitor", (-1.71,1.63,-2.43), (1.85,1.18,0.1), monitor_alloy, 0.04, 7)
cube("monitor screen bezel", (-1.71,1.63,-2.382), (1.77,1.1,0.018), black, 0.018, 5)
image_plane("portfolio summary on screen", (-1.71,1.63,-2.37), 1.69,1.02,screenmat)
# Small hardware details sit in the display's bezel, outside the active screen.
cylinder("monitor webcam lens", (-1.71,2.174,-2.367), 0.011, 0.008, dark, 32,
         rotation=(math.pi/2,0,0))
cylinder("monitor webcam glint", (-1.71,2.174,-2.362), 0.004, 0.004, brass, 24,
         rotation=(math.pi/2,0,0))
cylinder("monitor power indicator", (-0.925,1.113,-2.362), 0.007, 0.004, glow, 24,
         rotation=(math.pi/2,0,0))
cube("low profile keyboard", (-1.77,0.895,-1.9), (1.27,0.035,0.37), dark, 0.014, 3)
for row in range(4):
    key_count = 14 if row < 3 else 12
    for column in range(key_count):
        x = -2.35 + column * (1.16 / (key_count - 1))
        z = -2.03 + row * 0.082
        cube("individual keyboard key", (x,0.921,z), (0.061,0.016,0.061), black, 0.006, 3)
cube("keyboard space bar", (-1.77,0.922,-1.7), (0.38,0.016,0.055), black, 0.006, 3)
# A curved wireless mouse and wheel make the computer setup read as a working desk.
sphere("wireless mouse", (-0.94,0.906,-1.88), (0.13,0.07,0.19), dark, 24, 16)
tube("mouse center seam", (-0.94,0.937,-1.96), (-0.94,0.937,-1.79), 0.004, black, 8)
cylinder("mouse scroll wheel", (-0.94,0.944,-1.82), 0.018, 0.045, black, 16, rotation=(math.pi/2,0,0))
# A glazed mug with a visible coffee surface, ceramic rim, handle, and saucer.
cylinder("coffee saucer", (-0.52,0.881,-1.88), 0.16, 0.018, cream, 36)
cylinder("ceramic coffee mug", (-0.52,0.989,-1.88), 0.112, 0.2, cream, 36)
torus("mug ceramic rim", (-0.52,1.088,-1.88), 0.105, 0.008, cream)
cylinder("coffee surface", (-0.52,1.078,-1.88), 0.092, 0.004, dark, 32)
torus("mug handle", (-0.38,0.99,-1.88), 0.061, 0.012, cream, rotation=(math.pi/2,0,0))

# A detailed, textured video camera replaces the handmade boxy prop.
imported("vintage_video_camera", (-3.06,0.87,-2.25), 0.30)
# Over-ear headphones sit on a small desktop stand instead of intersecting the desk.
headphone_center_x, headphone_center_z = -0.43, -2.47
cylinder("headphone stand base", (headphone_center_x,0.89,headphone_center_z), 0.12, 0.04, black, 32)
tube("headphone stand stem", (headphone_center_x,0.91,headphone_center_z),
     (headphone_center_x,1.16,headphone_center_z), 0.016, brass)
tube("headphone stand cradle", (-0.49,1.16,headphone_center_z),
     (-0.37,1.16,headphone_center_z), 0.014, black)
headband = bpy.data.curves.new("headphone padded headband", "CURVE")
headband.dimensions = "3D"
headband.resolution_u = 24
headband.bevel_depth = 0.031
headband.bevel_resolution = 5
headband_path = headband.splines.new("POLY")
headband_path.points.add(32)
for i, point in enumerate(headband_path.points):
    angle = math.pi - math.pi * i / 32
    point.co = (*xyz(headphone_center_x + 0.19 * math.cos(angle),
                     1.16 + 0.27 * math.sin(angle), headphone_center_z), 1)
headband_obj = bpy.data.objects.new("headphone padded headband", headband)
bpy.context.collection.objects.link(headband_obj)
assign(headband_obj, black)
for index, x in enumerate((headphone_center_x - 0.185, headphone_center_x + 0.185), 1):
    sphere(f"headphone ear cup shell {index}", (x,1.16,headphone_center_z),
           (0.11,0.085,0.061), black, 32, 20)
    cylinder(f"headphone ear cup cushion {index}", (x,1.16,headphone_center_z + 0.032),
             0.061,0.026,dark,48,rotation=(math.pi/2,0,0))
    torus(f"headphone cushion piping {index}", (x,1.16,headphone_center_z + 0.049),
          0.054,0.012,black,rotation=(math.pi/2,0,0))
    cylinder(f"headphone speaker grille {index}", (x,1.16,headphone_center_z + 0.052),
             0.036,0.009,black,40,rotation=(math.pi/2,0,0))
    tube(f"headphone yoke {index}",
         (x,1.18,headphone_center_z),(headphone_center_x + (-0.14 if index == 1 else 0.14),1.23,headphone_center_z),
         0.012,brass,12)
cube("handwritten recipe notebook", (-3.05,0.879,-1.68), (0.34,0.018,0.24), cream, 0.012)
cube("recipe notebook page", (-3.05,0.889,-1.68), (0.31,0.003,0.21), dark, 0.004)
for line in range(3):
    tube("recipe pencil note", (-3.16,0.892,-1.62+line*0.045),
         (-2.98,0.892,-1.62+line*0.045),0.0025,brass,6)
tube("recipe pencil", (-3.21,0.897,-1.79), (-2.90,0.897,-1.81),0.009,brass)

# Workbench takes the foreground. Each sheet remains a separate clickable mesh.
cube("oak workbench top", (2.28,0.91,1.04), (5.45,0.17,2.77), oak, 0.04, 4)
for x in (-0.15,4.72):
    for depth in (-0.12,2.15):
        cube("workbench steel leg", (x,0.43,depth), (0.12,0.85,0.12), black)
cube("workbench back rail", (2.28,0.62,-0.15), (4.85,0.075,0.07), black)
# A timber apron and three shallow drawer fronts give the bench a finished
# furniture silhouette while keeping every blueprint area unobstructed.
cube("workbench front apron", (2.28,0.70,2.34), (4.86,0.27,0.10), veneer)
cube("workbench left apron", (-0.09,0.70,1.02), (0.10,0.27,2.35), veneer)
cube("workbench right apron", (4.65,0.70,1.02), (0.10,0.27,2.35), veneer)
for i, x in enumerate((0.63,2.28,3.93),1):
    cube(f"workbench drawer face {i}", (x,0.73,2.402), (1.45,0.16,0.035), oak, 0.018, 4)
    cube(f"workbench drawer pull plate {i}", (x,0.73,2.427), (0.16,0.055,0.012), black, 0.01, 3)
    tube(f"workbench drawer pull {i}", (x-0.055,0.73,2.447),(x+0.055,0.73,2.447),0.009,brass,12)
for i,(x,z,angle) in enumerate(((0.86,0.72,-0.08),(2.48,0.93,0.09),(3.78,1.41,-0.065)),1):
    # A stiff, slightly deckled stock catches light at the edge; the printed
    # drawing sits just above it to avoid z-fighting in the browser renderer.
    paper = cube(f"project {i} blueprint paper", (x,1.003,z), (1.53,0.004,1.09), blue, 0.001, 3)
    paper.rotation_euler.z = -angle
    image_plane(f"project {i} blueprint artwork", (x,1.007,z),1.46,1.02,sheetmats[i-1],horizontal=True,rotation=angle)
for x,z in ((0.23,1.62),(3.1,0.11),(4.34,2.02)):
    cylinder("brass drawing weight", (x,1.0335,z),0.043,0.075,brass)
tube("architect ruler", (0.55,1.014,2.12),(1.93,1.014,2.12),0.018,brass)
cube("closed sample book", (4.13,1.03,0.12),(0.57,0.06,0.48),cream,0.014)
# A shallow tool tray makes the table read as a used workspace without
# crossing the blueprint hit areas in the overhead project view.
cube("workbench tool tray", (0.27,1.0185,-0.02), (0.7,0.045,0.31), black, 0.012)
for x in (0.10,0.24,0.38):
    tube("drafting pen", (x,1.05,-0.13), (x,1.05,0.08), 0.009, brass, 8)

# Experience display on the right rear wall, bordered in dark metal.
cube("experience display frame", (2.74,2.63,-4.27), (3.14,2.2,0.12), black, 0.028)
image_plane("experience timeline artwork", (2.74,2.63,-4.192), 2.95,1.96,boardmat)
for x in (1.22,4.27):
    cube("experience picture light mount", (x,3.86,-4.18),(0.08,0.18,0.08),brass)
cube("experience picture light", (2.74,3.91,-4.12),(3.04,0.08,0.07),brass,0.018)
cube("experience picture light diffuser", (2.74,3.865,-4.08),
     (2.78,0.016,0.025), glow)

# Contact door occupies the right wall bay.
cube("contact door frame", (5.21,1.55,-3.21),(1.55,3.13,0.18),black,0.018)
cube("contact oak door", (5.21,1.51,-3.09),(1.35,2.98,0.09),veneer,0.018)
cube("contact sign frame", (5.21,2.21,-2.995),(0.56,0.62,0.03),black,0.013)
image_plane("contact hello sign", (5.21,2.21,-2.969),0.5,0.56,contactmat)
cylinder("door handle", (5.7,1.39,-2.98),0.05,0.11,brass,rotation=(math.pi/2,0,0))
cube("intercom", (4.26,1.45,-4.39),(0.16,0.3,0.09),black,0.016)
cylinder("intercom light", (4.26,1.51,-4.31),0.023,0.015,glow,rotation=(math.pi/2,0,0))

# Loose architecture, light fixtures, and props add depth and scale.
for x,depth,height in ((-4.4,-0.1,2.83),(-0.3,-0.7,3.65),(3.7,-1.2,5.45)):
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.28, radius2=0.11,
                                    depth=0.18, location=xyz(x,height,depth))
    bpy.context.object.name = "pendant metal shade"
    assign(bpy.context.object, black)
    cylinder("pendant brass collar", (x,height+0.1,depth),0.115,0.025,brass,24)
    cylinder("warm pendant bulb", (x,height-0.11,depth),0.085,0.13,glow,18)
    tube("pendant wire", (x,height+0.07,depth),(x,6.0,depth),0.014,black)
cube("floor rug", (-1.58,0.016,1.75),(2.1,0.025,1.85),dark,0.016)
cube("pinboard above shelf", (-4.05,2.33,-3.92),(2.08,0.68,0.055),black,0.02)
for i in range(3):
    cube("pinned card", (-4.7+i*0.62,2.35,-3.875),(0.39,0.41,0.012),cream,0.008)

# Imported detailed CC0 assets are integrated into the authored architecture.
imported("desk_lamp_arm_01", (0.0,1.02,-0.13), 0.68)
imported("modern_arm_chair_01", (-1.82,0.0,-0.58), 0.95, rotation_z=math.pi)
imported("american_football", (-3.75,1.53,-2.62), 0.33)

# The imported props and roughness masks are tiny in the room view. Keep the
# source files untouched; pack smaller temporary copies into the editable
# Blender file and exported GLB to lower the browser and GPU texture budget.
image_cache = tempfile.TemporaryDirectory(prefix="loft-image-cache-")
for image in bpy.data.images:
    if image.source != "FILE":
        continue
    name = image.name.lower()
    prop = any(part in name for part in ("american_football", "desk_lamp_arm_01", "modern_arm_chair_01", "vintage_video_camera"))
    roughness = "rough" in name or "_arm" in name
    if prop or roughness:
        if image.size[0] > 512 or image.size[1] > 512:
            image.scale(512,512)
            image.filepath_raw = str(Path(image_cache.name) / f"{image.name}.jpg")
            image.file_format = "JPEG"
            image.save()

# Set up a repeatable Blender preview (not part of the exported scene).
world = bpy.context.scene.world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.35,0.43,0.48,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35

def area(name, pos, target, power, color, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.color = color
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = xyz(*pos)
    obj.rotation_euler = (Vector(xyz(*target))-obj.location).to_track_quat("-Z", "Y").to_euler()

area("soft window daylight", (-1.8,4.9,-3.8), (-0.5,1,0), 1450, (0.68,0.81,1), 4.2)
area("warm workbench light", (2.2,4.7,0.8), (2.1,0.9,1), 850, (1,0.72,0.47), 3.1)
area("warm desk light", (-1.2,3.7,-1.1), (-1.7,0.9,-2.2), 500, (1,0.78,0.54), 2.5)
area("front fill", (0,4.0,5), (0,2,-1.5), 350, (0.75,0.83,1), 5)

cam_data = bpy.data.cameras.new("preview camera")
cam = bpy.data.objects.new("preview camera",cam_data)
bpy.context.collection.objects.link(cam)
cam.location = xyz(0.3,3.32,8.4)
cam.rotation_euler = (Vector(xyz(0,2.08,-0.9))-cam.location).to_track_quat("-Z","Y").to_euler()
cam_data.lens = 28
bpy.context.scene.camera = cam

blend_path = ROOT / "assets" / "loft-room.blend"
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
for obj in bpy.context.selected_objects:
    obj.select_set(False)
for obj in bpy.data.objects:
    if obj.type == "MESH":
        obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT / "loft-room.glb"), export_format="GLB", use_selection=True, export_apply=True)
print(f"Saved {blend_path} and {OUT / 'loft-room.glb'}")
