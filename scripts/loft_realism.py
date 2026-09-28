"""Furniture proportions, imported focal pieces, and physical surface detail."""
import math
import bpy
from mathutils import Vector


def dress_loft(env):
    cube, tube, imported, xyz = (env[k] for k in ('cube', 'tube', 'imported', 'xyz'))
    layout, simple, texture = (env[k] for k in ('layout', 'simple', 'texture'))
    oak, steel, cream = (env[k] for k in ('veneer', 'black', 'cream'))

    # Gallery objects share a furniture anchor and an eye-level hanging line.
    imported('modern_wooden_cabinet', (4.5, 0, -5.16), 3.7)
    for i in range(3):
        cube('gallery monograph stack', (5.62, 1.055 + i*.038, -5.12),
             (.46, .035, .33), (cream, steel, oak)[i], .005)
    # One detailed leather lounge chair gives the small nook comfortable scale.
    imported('mid_century_lounge_chair', (-6.83, 0, -.65), 1.48, rotation_z=math.pi/2)

    # The workbench has its own textile island, pendant and storage trolley.
    woven = texture('studio woven floor textile', 'rough_linen', 4.0)
    cube('studio workbench rug', (4.0, .024, -.5), (5.55, .025, 4.0), woven, .012)
    cube('computer work area rug', (.1, .025, -2.55), (3.6, .022, 2.8), woven, .01)
    seam = simple('rug bound edge', (.13, .17, .18), .99)
    for x in (1.3, 6.7):
        cube('studio rug binding', (x, .04, -.5), (.028, .008, 3.88), seam, .003)
    for z in (-2.44, 1.44):
        cube('studio rug binding', (4., .04, z), (5.42, .008, .028), seam, .003)
    # Modest task lighting hangs over the table instead of arbitrary empty floor.
    bx = 2.28 + layout['workbenchOffset'][0]
    bz = 1.04 + layout['workbenchOffset'][2]
    for obj in list(bpy.data.objects):
        if obj.name.startswith(('pendant metal shade', 'pendant brass collar', 'warm pendant bulb', 'pendant wire')) and obj.location.x > 2:
            obj.hide_render = True
            bpy.data.objects.remove(obj, do_unlink=True)
    for x in (bx-.65, bx+.65):
        tube('workshop pendant suspension', (x,5.17,bz), (x,5.9,bz), .006, steel)
    cube('workshop linear pendant', (bx,5.15,bz), (2.05,.065,.19), steel,.025,5)
    cube('workshop frosted diffuser', (bx,5.109,bz), (1.95,.014,.13), env['glow'],.006)
    # Small storage at the wall gives the drafting area a useful edge.
    for y in (.16,.54):
        cube('workshop trolley shelf', (6.66,y,-1.5), (.57,.055,.79), oak,.018,4)
    for x in (6.43,6.89):
        for z in (-1.82,-1.18):
            tube('workshop trolley frame', (x,.08,z),(x,.81,z),.014,steel)
    for i in range(4):
        cube('workshop materials book', (6.63,.2+i*.055,-1.46), (.38,.049,.5), (cream,oak,seam)[i%3],.004)

    # Dense enough cushions for subtle sag and wrinkles, with real seam piping.
    cloth = bpy.data.materials.get('lounge woven linen')
    stitching = simple('upholstery seam', (.20,.26,.28), .95)
    for obj in list(bpy.data.objects):
        if not obj.name.startswith(('lounge sofa seat cushion','lounge sofa back cushion','lounge loose olive pillow')):
            continue
        bpy.context.view_layer.objects.active = obj
        for modifier in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        sub = obj.modifiers.new('cloth surface grid', 'SUBSURF')
        sub.subdivision_type = 'SIMPLE'; sub.levels = 2
        bpy.ops.object.modifier_apply(modifier=sub.name)
        grain = bpy.data.textures.get('cushion broad wrinkles') or bpy.data.textures.new('cushion broad wrinkles', 'CLOUDS')
        grain.noise_scale = .15; grain.noise_depth = 1
        displace = obj.modifiers.new('subtle cloth irregularity', 'DISPLACE')
        displace.texture = grain; displace.strength = .008; displace.mid_level = .5
        for face in obj.data.polygons:
            face.use_smooth = True
        if obj.name.startswith('lounge sofa seat cushion'):
            # Indent the center of the top upholstery, keeping the piped edges full.
            for vertex in obj.data.vertices:
                p = vertex.co
                if p.z > .08:
                    p.z -= .025 * max(0,1-(p.x/.62)**2) * max(0,1-(p.y/.58)**2)
            cx = obj.location.x
            points = [(cx-.51, .57,11.49),(cx+.51,.57,11.49),(cx+.62,.57,11.59),
                      (cx+.62,.57,12.45),(cx+.51,.57,12.56),(cx-.51,.57,12.56),
                      (cx-.62,.57,12.45),(cx-.62,.57,11.59)]
            curve = bpy.data.curves.new('tailored cushion seam','CURVE')
            curve.dimensions='3D'; curve.bevel_depth=.0035; curve.bevel_resolution=2
            path=curve.splines.new('BEZIER'); path.bezier_points.add(len(points)-1)
            for vertex,position in zip(path.bezier_points,points):
                vertex.co=Vector(xyz(*position)); vertex.handle_left_type='AUTO'; vertex.handle_right_type='AUTO'
            path.use_cyclic_u=True
            seam_obj=bpy.data.objects.new('lounge sofa tailored piping',curve)
            bpy.context.collection.objects.link(seam_obj); seam_obj.data.materials.append(stitching)
            bpy.ops.object.select_all(action='DESELECT'); seam_obj.select_set(True)
            bpy.context.view_layer.objects.active=seam_obj; bpy.ops.object.convert(target='MESH')
    # Textiles have shallow normal detail; polished metal keeps a distinct response.
    if cloth:
        for node in cloth.node_tree.nodes:
            if node.type == 'NORMAL_MAP': node.inputs['Strength'].default_value=.22
    bpy.context.view_layer.update()
