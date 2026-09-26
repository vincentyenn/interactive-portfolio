"""Build the editable loft set and its browser GLB with Blender 4.5.

Run from the repository root with Blender --background --python scripts/build_loft.py.
World helpers take Three.js coordinates (x, height, depth); the glTF exporter
converts Blender's Z-up coordinates to Three's Y-up coordinates.
"""

import math
import tempfile
from pathlib import Path

import bpy
from mathutils import Vector


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
    img.image = bpy.data.images.load(str(GRAPHICS / filename), check_existing=True)
    links.new(img.outputs["Color"], bsdf.inputs["Base Color"])
    if emission:
        links.new(img.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = emission
    return mat


plaster = texture("warm plaster", "painted_plaster_wall", 2.3)
brick = texture("warm brick", "brick_wall_10", 1.6)
concrete = texture("worn concrete", "concrete_floor_worn_001", 2.5)
oak = texture("oiled oak", "oak_wood_planks", 1.2)
veneer = texture("oak veneer", "oak_veneer_01", 1.4)
black = simple("powder coated steel", (0.065, 0.072, 0.071), 0.38, 0.66)
dark = simple("graphite rubber", (0.11, 0.13, 0.13), 0.78)
brass = simple("brushed brass", (0.55, 0.38, 0.19), 0.35, 0.7)
cream = simple("warm ceramic", (0.77, 0.73, 0.65), 0.58)
glass = simple("window glass", (0.36, 0.48, 0.48), 0.11, 0.1)
blue = simple("blueprint paper edge", (0.08, 0.19, 0.24), 0.85)
glow = simple("soft lamp glow", (0.93, 0.7, 0.43), 0.32, emission=((1.0, 0.64, 0.31), 1.6))
screenmat = graphic("portfolio monitor", "computer_screen.jpg", 0.55)
boardmat = graphic("experience wall", "experience_board.jpg")
contactmat = graphic("contact sign", "contact_sign.jpg", 0.2)
sheetmats = [graphic(f"project {i} blueprint", f"blueprint_{i}.jpg") for i in range(1, 4)]


def assign(obj, mat):
    obj.data.materials.append(mat)
    return obj


def cube(name, pos, size, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(*pos))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    if bevel:
        mod = obj.modifiers.new("soft edges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
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


def sphere(name, pos, size, mat, segments=16, rings=8):
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


def imported(slug, center, target_width):
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
    offset = Vector(xyz(*center)) - Vector(((low.x+high.x)/2, (low.y+high.y)/2, low.z)) * scale
    for obj in added:
        obj.name = f"{slug} / {obj.name}"
        obj.scale *= scale
        obj.location = obj.location * scale + offset
    bpy.context.view_layer.update()


# Shell: a front-open loft with an oak mezzanine, not a painted backdrop.
cube("concrete floor", (0,-0.14,-0.05), (12.4,0.28,9.7), concrete)
cube("rear plaster wall", (0,3.15,-4.62), (12.4,6.3,0.22), plaster)
cube("left brick wall", (-6.16,3.15,-0.05), (0.22,6.3,9.7), brick)
cube("right plaster wall", (6.16,3.15,-0.05), (0.22,6.3,9.7), plaster)
cube("ceiling", (0,6.28,-0.1), (12.4,0.24,9.6), dark)
for x in (-5.65, -3.05, -0.45, 2.15, 4.75):
    cube("exposed ceiling beam", (x,5.91,-0.1), (0.2,0.36,9.45), veneer, 0.016)
for depth in (-3.8, -1.4, 1.0, 3.4):
    cube("cross beam", (0,5.99,depth), (12.15,0.22,0.17), oak, 0.014)
for x in (-5.82, 5.82):
    for depth in (-4.28, 4.15):
        cube("black steel post", (x,3.04,depth), (0.16,6.08,0.16), black, 0.015)

# Window bays: layered dark framing and translucent light-catching panes.
for index, x in enumerate((-4.5, -2.75, -1.0, 0.75, 2.5)):
    if x > -1.0:
        continue
    cube("high window glass", (x,4.62,-4.47), (1.28,2.35,0.035), glass)
    for side in (-0.68, 0.68):
        cube("window mullion", (x+side,4.62,-4.39), (0.075,2.53,0.09), black)
    for height in (3.34, 4.62, 5.89):
        cube("window transom", (x,height,-4.38), (1.48,0.075,0.09), black)
    cube("window sill", (x,3.31,-4.17), (1.55,0.07,0.43), concrete, 0.015)

# Mezzanine over the left half of the room.
cube("loft oak deck", (-3.84,3.13,-0.65), (4.48,0.26,7.65), oak, 0.02)
for x in (-5.87, -1.82):
    for depth in (-4.05, -1.05, 2.55):
        leg_x = -2.78 if x == -1.82 and depth == -1.05 else x
        cube("mezzanine leg", (leg_x,1.5,depth), (0.15,3.0,0.15), black)
for x in (-5.84, -4.85, -3.86, -2.87, -1.86):
    cube("mezzanine oak fascia", (x,2.89,3.08), (0.8,0.12,0.1), veneer)
# A recessed light line gives the underside of the mezzanine a readable edge.
cube("mezzanine light channel", (-3.83,2.84,3.015), (3.82,0.035,0.045), black)
cube("mezzanine warm light diffuser", (-3.83,2.84,3.049), (3.67,0.012,0.014), glow)
for depth in (-4.12, -3.25, -2.38, -1.51, -0.64, 0.23, 1.10, 1.97, 2.84):
    tube("loft railing upright", (-1.58,3.24,depth), (-1.58,4.18,depth), 0.027, black)
tube("loft railing top", (-1.58,4.18,-4.25), (-1.58,4.18,3.02), 0.045, black)
tube("loft railing lower", (-1.58,3.57,-4.25), (-1.58,3.57,3.02), 0.025, black)

# Left-side staircase, the main silhouette of the scene.
for i in range(12):
    t = i/11
    depth = 3.65 - 5.9*t
    height = 0.19 + 2.72*t
    cube("floating stair tread", (-5.35,height,depth), (1.12,0.12,0.43), oak, 0.015)
    tube("stair side rail", (-4.72,height+0.15,depth), (-4.72,height+0.65,depth), 0.022, black)
tube("ascending hand rail", (-4.72,0.86,3.65), (-4.72,3.56,-2.25), 0.04, black)
tube("stair stringer", (-5.98,0.12,3.82), (-5.98,3.03,-2.38), 0.085, black)

# A continuous, warm display shelf beneath the loft.
for height in (0.62, 1.43, 2.27):
    cube("personal shelf", (-4.15,height,-2.67), (2.95,0.09,0.62), veneer, 0.02)
for x in (-5.54, -2.74):
    cube("shelf steel frame", (x,1.44,-2.67), (0.06,2.75,0.57), black)
bookcloth = simple("muted book cloth", (0.19,0.26,0.27), 0.88)
terracotta = simple("matte terracotta", (0.47,0.28,0.19), 0.84)
leafgreen = simple("olive leaf", (0.13,0.24,0.17), 0.86)
for row, height in enumerate((0.65,1.47,2.31)):
    for index in range(4):
        thickness = 0.07 + (index % 3) * 0.018
        cube("shelf book", (-5.30+index*0.11,height+0.16,-2.62),
             (thickness,0.27+((index+row)%3)*0.045,0.34),
             (bookcloth, cream, dark, terracotta)[(index+row)%4], 0.006)
    cylinder("shelf ceramic vessel", (-4.33+row*0.13,height+0.14,-2.61), 0.115, 0.28, cream)
    cube("shelf photo frame", (-3.38-row*0.1,height+0.19,-2.72),
         (0.39,0.34,0.055), black, 0.008)
    cube("shelf photo mat", (-3.38-row*0.1,height+0.19,-2.68),
         (0.31,0.26,0.005), cream)
# A small plant gives the personal shelf a natural silhouette in the wide view.
cylinder("plant ceramic pot", (-3.76,2.48,-2.57), 0.16, 0.28, terracotta, 20)
cylinder("plant soil", (-3.76,2.63,-2.57), 0.145, 0.018, dark, 20)
for angle in (0, math.pi/3, 2*math.pi/3, math.pi, 4*math.pi/3, 5*math.pi/3):
    stem_x = -3.76 + 0.13*math.cos(angle)
    stem_z = -2.57 + 0.13*math.sin(angle)
    tube("plant stem", (-3.76,2.62,-2.57), (stem_x,2.93,stem_z), 0.011, leafgreen, 6)
    leaf = sphere("plant leaf", (stem_x,2.95,stem_z), (0.085,0.17,0.035), leafgreen, 12, 6)
    leaf.rotation_euler.z = angle

# A run of slatted timber and a narrow dark reveal add depth behind the desk.
cube("desk oak wall inset", (-1.54,1.55,-4.485), (3.15,2.86,0.055), veneer, 0.008)
for x in (-2.94,-2.55,-2.16,-1.77,-1.38,-0.99,-0.60,-0.21):
    cube("desk wall timber slat", (x,1.55,-4.43), (0.055,2.82,0.07), oak, 0.009)
cube("desk wall shadow reveal", (-1.54,0.12,-4.425), (3.15,0.055,0.08), black)

# Central computer desk: a real monitor with a readable authored screen texture.
cube("computer oak desk", (-1.72,0.81,-2.11), (3.35,0.12,1.46), oak, 0.035)
for x in (-3.17,-0.28):
    for depth in (-2.71,-1.47):
        cube("computer desk leg", (x,0.39,depth), (0.09,0.79,0.09), black)
cube("monitor stand foot", (-1.71,0.9,-2.41), (0.6,0.055,0.37), black, 0.025)
cube("monitor stand neck", (-1.71,1.12,-2.4), (0.09,0.48,0.08), black)
cube("large computer monitor", (-1.71,1.63,-2.43), (1.85,1.18,0.09), black, 0.04)
image_plane("portfolio summary on screen", (-1.71,1.63,-2.365), 1.72,1.04,screenmat)
cube("low profile keyboard", (-1.72,0.9,-1.66), (1.2,0.04,0.33), dark, 0.02)
for i in range(11):
    cube("keyboard key row", (-2.23+i*0.1,0.925,-1.66), (0.06,0.008,0.21), black, 0.003)
cylinder("ceramic coffee cup", (-0.69,0.95,-1.75), 0.12, 0.21, cream)

# Personality objects within reach of the desk.
cube("camcorder body", (-2.92,0.96,-1.65), (0.31,0.21,0.22), black, 0.027)
cylinder("camcorder lens", (-2.73,0.97,-1.65), 0.09, 0.17, dark, rotation=(0,math.pi/2,0))
cube("camcorder handle", (-2.98,1.12,-1.65), (0.22,0.035,0.07), black)
cube("camcorder flip screen", (-3.14,1.03,-1.65), (0.03,0.21,0.2), dark)
for i in range(14):
    ang = math.pi*(i/13)
    a = (-1.0+0.22*math.cos(ang),0.96+0.24*math.sin(ang),-1.58)
    b = (-1.0+0.22*math.cos(ang+math.pi/13),0.96+0.24*math.sin(ang+math.pi/13),-1.58)
    tube("headphone arch", a,b,0.024,black)
for x in (-1.22,-0.78):
    cube("headphone ear cup", (x,0.96,-1.58), (0.12,0.19,0.13), dark, 0.025)
cube("handwritten recipe notebook", (-2.37,0.9,-1.39), (0.34,0.018,0.24), cream, 0.012)
tube("recipe pencil", (-2.53,0.94,-1.4), (-2.24,0.94,-1.41),0.009,brass)

# Workbench takes the foreground. Each sheet remains a separate clickable mesh.
cube("oak workbench top", (2.28,0.91,1.04), (5.45,0.17,2.77), oak, 0.035)
for x in (-0.15,4.72):
    for depth in (-0.12,2.15):
        cube("workbench steel leg", (x,0.43,depth), (0.12,0.85,0.12), black)
cube("workbench back rail", (2.28,0.62,-0.15), (4.85,0.075,0.07), black)
for i,(x,z,angle) in enumerate(((0.86,0.72,-0.08),(2.48,0.93,0.09),(3.78,1.41,-0.065)),1):
    paper = cube(f"project {i} blueprint paper", (x,1.025,z), (1.53,0.025,1.09), blue, 0.008)
    paper.rotation_euler.z = -angle
    image_plane(f"project {i} blueprint artwork", (x,1.042,z),1.46,1.02,sheetmats[i-1],horizontal=True,rotation=angle)
for x,z in ((0.23,1.62),(3.1,0.11),(4.34,2.02)):
    cylinder("brass drawing weight", (x,1.07,z),0.043,0.075,brass)
tube("architect ruler", (0.55,1.05,2.12),(1.93,1.05,2.12),0.018,brass)
cube("closed sample book", (4.13,1.02,0.12),(0.57,0.06,0.48),cream,0.014)
# A shallow tool tray makes the table read as a used workspace without
# crossing the blueprint hit areas in the overhead project view.
cube("workbench tool tray", (0.27,1.04,-0.02), (0.7,0.045,0.31), black, 0.012)
for x in (0.10,0.24,0.38):
    tube("drafting pen", (x,1.08,-0.13), (x,1.08,0.08), 0.009, brass, 8)

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
imported("modern_arm_chair_01", (-1.74,0.0,-0.55), 1.03)
imported("american_football", (-3.75,1.53,-2.62), 0.33)

# The imported props and roughness masks are tiny in the room view. Keep the
# source files untouched; pack smaller temporary copies into the editable
# Blender file and exported GLB to lower the browser and GPU texture budget.
image_cache = tempfile.TemporaryDirectory(prefix="loft-image-cache-")
for image in bpy.data.images:
    if image.source != "FILE":
        continue
    name = image.name.lower()
    prop = any(part in name for part in ("american_football", "desk_lamp_arm_01", "modern_arm_chair_01"))
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
