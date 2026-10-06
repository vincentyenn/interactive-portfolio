"""Expand the authored room and add connected upstairs and rear living areas.

Called by build_loft.py before packing/exporting. Runtime camera anchors use
content/loft-layout.json too; props move rigidly and architecture alone expands.
"""
import math
import bpy
from mathutils import Matrix


def expand_loft(env):
    cube, tube, cylinder, sphere, imported, torus = (env[key] for key in ('cube', 'tube', 'cylinder', 'sphere', 'imported', 'torus'))
    simple, xyz, layout, zones = (env[key] for key in ('simple', 'xyz', 'layout', 'zones'))
    oak, veneer, steel, plaster, concrete, cream, glow = (env[key] for key in ('oak', 'veneer', 'black', 'plaster', 'concrete', 'cream', 'glow'))
    scale = Matrix.Diagonal((layout['shellScale'][0], layout['shellScale'][2], 1, 1))
    bpy.context.view_layer.update()
    for obj in zones['shell']:
        obj.matrix_world = scale @ obj.matrix_world
    for zone in ('computer', 'workbench', 'experience'):
        transform = Matrix.Translation(xyz(*layout[f'{zone}Offset']))
        if zone == 'workbench':
            pivot = Matrix.Translation(xyz(2.28, 0, 1.04))
            bench_scale = Matrix.Diagonal((layout['workbenchScale'], layout['workbenchScale'], 1, 1))
            transform = transform @ pivot @ bench_scale @ pivot.inverted()
        for obj in zones[zone]:
            obj.matrix_world = transform @ obj.matrix_world
            if zone == 'computer' and obj.name.startswith(('desk oak wall', 'desk wall')):
                obj.location.y -= layout['experienceOffset'][2] - layout['computerOffset'][2]
    # Imported desk accessories are created later than their parent station.
    for obj in list(bpy.data.objects):
        name = obj.name.lower()
        if obj.type != 'MESH':
            continue
        if name.startswith('modern_arm_chair_01'):
            obj.matrix_world = Matrix.Translation(xyz(*layout['computerOffset'])) @ obj.matrix_world
        elif name.startswith('desk_lamp_arm_01'):
            pivot = Matrix.Translation(xyz(2.28, 0, 1.04))
            lamp_scale = Matrix.Diagonal((layout['workbenchScale'], layout['workbenchScale'], 1, 1))
            obj.matrix_world = Matrix.Translation(xyz(*layout['workbenchOffset'])) @ pivot @ lamp_scale @ pivot.inverted() @ obj.matrix_world
        elif name.startswith(('pendant ', 'warm pendant')):
            obj.matrix_world = scale @ obj.matrix_world
        elif name.startswith('floor rug'):
            obj.location.x += layout['computerOffset'][0]
    bpy.context.view_layer.update()

    # The main 16 m room continues behind its starting camera into a living bay.
    cube('lounge continuous concrete floor', (0, -.14, 10.1), (16, .28, 8.2), concrete, .0)
    for x in (-7.948, 7.948):
        cube('lounge side plaster wall', (x, 3.15, 10.1), (.28, 6.3, 8.2), plaster)
        cube('lounge side oak skirting', (x + (.17 if x < 0 else -.17), .075, 10.1), (.12, .15, 8.2), veneer)
    cube('lounge ceiling', (0, 6.28, 10.1), (16, .24, 8.45), env['dark'])
    for z in (7.2, 10.2, 13.2):
        cube('lounge ceiling cross beam', (0, 5.99, z), (15.8, .22, .17), oak)
    # Full-height glazing makes the city part of the living room, as in the
    # reference loft. The glass is intentionally open geometry for the browser
    # renderer; the mullions and sill give the opening its architectural edge.
    cube('lounge rear lower wall', (0, .27, 14.15), (16, .54, .22), plaster)
    cube('lounge rear upper wall', (0, 6.06, 14.15), (16, .48, .22), plaster)
    for x in (-7.7, 7.7):
        cube('lounge rear window pier', (x, 3.17, 14.15), (.24, 5.25, .22), steel)
    for x in (-5.5, -3.3, -1.1, 1.1, 3.3, 5.5):
        cube('lounge rear window mullion', (x, 3.17, 14.15), (.13, 5.25, .18), steel)
    # The uninterrupted height makes each pane feel vertical while the glazing
    # still spans the full rear wall of the loft.
    for y in (.58, 5.76):
        cube('lounge rear window transom', (0, y, 14.12), (16, .09, .12), steel)
    cube('lounge rear skirting', (0, .075, 13.98), (15.8, .15, .12), veneer)

    leather = simple('lounge aged leather', (.47, .25, .16), .71)
    leather_nodes = leather.node_tree.nodes
    leather_links = leather.node_tree.links
    leather_bsdf = leather_nodes.get('Principled BSDF')
    leather_coord = leather_nodes.new('ShaderNodeTexCoord')
    leather_mapping = leather_nodes.new('ShaderNodeMapping')
    leather_mapping.inputs['Scale'].default_value = (2.3, 2.3, 2.3)
    leather_links.new(leather_coord.outputs['UV'], leather_mapping.inputs['Vector'])
    leather_diffuse = leather_nodes.new('ShaderNodeTexImage')
    leather_diffuse.image = bpy.data.images.load(str(env['GRAPHICS'] / 'lounge_leather.png'), check_existing=True)
    leather_links.new(leather_mapping.outputs['Vector'], leather_diffuse.inputs['Vector'])
    leather_links.new(leather_diffuse.outputs['Color'], leather_bsdf.inputs['Base Color'])
    leather_normal_image = leather_nodes.new('ShaderNodeTexImage')
    leather_normal_image.image = bpy.data.images.load(str(env['SOURCE'] / 'textures' / 'concrete_floor_worn_001' / 'concrete_floor_worn_001_nor_gl_1k.jpg'), check_existing=True)
    leather_normal_image.image.colorspace_settings.name = 'Non-Color'
    leather_normal = leather_nodes.new('ShaderNodeNormalMap')
    leather_normal.inputs['Strength'].default_value = .1
    leather_links.new(leather_mapping.outputs['Vector'], leather_normal_image.inputs['Vector'])
    leather_links.new(leather_normal_image.outputs['Color'], leather_normal.inputs['Color'])
    leather_links.new(leather_normal.outputs['Normal'], leather_bsdf.inputs['Normal'])
    charcoal = simple('lounge charcoal upholstery', (.08, .085, .085), .91)
    olive = simple('moss book cloth', (.18, .23, .19), .94)
    rug = simple('lounge woven wool rug', (.23, .23, .22), .98)
    rug_nodes = rug.node_tree.nodes
    rug_normal_image = rug_nodes.new('ShaderNodeTexImage')
    rug_normal_image.image = bpy.data.images.load(str(env['SOURCE'] / 'textures' / 'rough_linen' / 'rough_linen_nor_gl_1k.jpg'), check_existing=True)
    rug_normal_image.image.colorspace_settings.name = 'Non-Color'
    rug_normal = rug_nodes.new('ShaderNodeNormalMap')
    rug_normal.inputs['Strength'].default_value = .26
    rug.node_tree.links.new(rug_normal_image.outputs['Color'], rug_normal.inputs['Color'])
    rug.node_tree.links.new(rug_normal.outputs['Normal'], rug_nodes.get('Principled BSDF').inputs['Normal'])
    cube('lounge wool rug', (.4, .018, 10.48), (8.45, .028, 4.35), rug, .012, 3)
    binding = simple('lounge rug binding', (.15, .16, .15), .99)
    for x in (-3.77, 4.57):
        cube('lounge rug bound edge', (x, .038, 10.48), (.025, .007, 4.26), binding, .003)
    for z in (8.35, 12.61):
        cube('lounge rug bound edge', (.4, .038, z), (8.36, .007, .025), binding, .003)
    # Upholstery has generous radii and a low continuous silhouette; the
    # tailored seams and surface irregularity are finished in loft_realism.py.
    cube('lounge sofa leather rail', (.55, .58, 12.73), (4.9, 1.02, .28), leather, .12, 8)
    cube('lounge sofa oak plinth', (.55, .2, 12.18), (4.75, .22, 1.5), steel, .07, 6)
    for i in range(3):
        x = -.82 + i * 1.37
        cube('lounge sofa seat cushion', (x, .49, 12.02), (1.33, .34, 1.22), leather, .16, 9)
        back = cube('lounge sofa back cushion', (x, 1.02, 12.57), (1.34, .91, .36), leather, .14, 9)
        back.rotation_euler.x = math.radians(-8)
    for x in (-1.75, 2.86):
        cube('lounge sofa armrest', (x, .69, 12.14), (.38, .84, 1.52), leather, .18, 9)
    pillow = cube('lounge loose olive pillow', (-.93, .93, 12.0), (.58, .55, .22), charcoal, .12, 7)
    pillow.rotation_euler = (math.radians(-16), math.radians(7), math.radians(13))
    # One low table keeps the seating area open and gives the personal objects a home.
    stone = simple('lounge honed stone', (.22, .23, .22), .86)
    cube('lounge coffee table top', (.15, .39, 9.86), (3.25, .095, 1.38), stone, .09, 7)
    cube('lounge coffee table plinth', (.15, .19, 9.86), (2.18, .36, .9), steel, .04, 5)
    cube('lounge photo book', (-.55, .46, 9.67), (.72, .045, .51), cream, .008)
    cube('lounge photo book dark cover', (-.55, .488, 9.67), (.7, .012, .49), charcoal, .004)
    cylinder('lounge ceramic bowl', (.47, .48, 9.98), .15, .11, cream, 32)
    # A slim magazine and a cup add life without obscuring the interactive book.
    magazine_cover = simple('lounge terracotta magazine cover', (.47, .25, .18), .9)
    pages = cube('lounge magazine pages', (-1.05, .455, 9.42), (.53, .018, .34), cream, .003)
    magazine = cube('lounge magazine cover', (-1.05, .47, 9.42), (.54, .009, .35), magazine_cover, .003)
    pages.rotation_euler.z = magazine.rotation_euler.z = math.radians(9)
    cube('lounge magazine masthead', (-1.05, .479, 9.31), (.38, .003, .025), cream, .001)
    cup = simple('lounge matte espresso ceramic', (.68, .59, .47), .82)
    cylinder('lounge cup saucer', (1.11, .455, 9.55), .18, .025, cup, 32)
    cylinder('lounge cup body', (1.11, .53, 9.55), .105, .13, cup, 32)
    torus('lounge cup rim', (1.11, .60, 9.55), .085, .013, cream)
    cylinder('lounge coffee surface', (1.11, .595, 9.55), .075, .003, charcoal, 32)
    for start, end in (((1.2,.57,9.55),(1.28,.57,9.55)),
                       ((1.28,.57,9.55),(1.29,.49,9.55)),
                       ((1.29,.49,9.55),(1.2,.49,9.55))):
        tube('lounge cup handle', start, end, .013, cup, 10)
    # The source chair has proper upholstery and a shaped frame. A pair on the
    # right side faces the sofa instead of duplicating the music nook.
    for index, center in enumerate(((-2.58, 0, 8.95), (-3.67, 0, 10.36))):
        before = set(bpy.data.objects)
        imported('modern_arm_chair_01', center, 1.18, rotation_z=math.radians(125 - index*20))
        for obj in set(bpy.data.objects) - before:
            obj.name = f'lounge guest chair {index+1} / ' + obj.name
    cylinder('lounge floor lamp base', (4.42, .06, 11.1), .25, .12, steel, 40)
    tube('lounge floor lamp stem', (4.42, .12, 11.1), (4.42, 1.93, 11.1), .017, env['brass'], 14)
    cylinder('lounge linen lampshade', (4.42, 1.83, 11.1), .28, .36, cream, 40)
    before = set(bpy.data.objects)
    imported('potted_plant_04', (-5.7, 0, 12.25), 1.12)
    for obj in set(bpy.data.objects) - before:
        obj.name = 'lounge living plant / ' + obj.name

    # A real landing leads into the rear mezzanine studio; the stair void stays open.
    cube('upper studio landing extension', (-.8, 3.13, -4.453), (2.51, .26, 2.28), oak, .02)
    for x in (-.18, .4):
        tube('upper studio east guardrail post', (x, 3.26, -3.33), (x, 4.17, -3.33), .025, steel)
    tube('upper studio east guardrail top', (-.18, 4.17, -3.33), (.4, 4.17, -3.33), .038, steel)
    for x in (-6.2, -5.2, -4.2, -3.2, -2.3):
        tube('upper studio north edge post', (x,3.26,-3.35),(x,4.17,-3.35),.025,steel)
    tube('upper studio north edge handrail', (-6.2,4.17,-3.35),(-2.3,4.17,-3.35),.038,steel)
    tube('upper studio north edge lower rail', (-6.2,3.6,-3.35),(-2.3,3.6,-3.35),.02,steel)
    cube('upper studio reading desk', (-5.2, 4.02, -4.98), (3.4, .12, .92), oak, .04, 5)
    for x in (-6.65, -3.75):
        cube('upper studio desk trestle', (x, 3.64, -4.98), (.09, .76, .72), steel, .02)
    for i in range(5):
        cube('upper studio book stack', (-6.2, 4.12 + .04*i, -4.96), (.53, .038, .42), (cream, olive, veneer)[i%3], .006)
    cube('upper studio open journal left', (-4.82, 4.105, -4.92), (.42, .025, .52), cream, .009)
    cube('upper studio open journal right', (-4.39, 4.105, -4.92), (.42, .025, .52), cream, .009)
    for i in range(6):
        tube('upper journal writing', (-4.93,4.12,-5.1+i*.056),(-4.69,4.12,-5.1+i*.056),.002,env['dark'],6)
    tube('upper studio lamp stem', (-3.92,4.08,-5.12), (-3.92,4.58,-5.12), .018, env['brass'])
    cylinder('upper studio lamp shade', (-3.92,4.53,-5.12), .18,.24,cream,32)
    before = set(bpy.data.objects)
    imported('modern_arm_chair_01', (-5.1,3.26,-3.82), .84, rotation_z=math.pi)
    for obj in set(bpy.data.objects)-before:
        obj.name = 'upper studio chair / '+obj.name
    # Open timber screen marks the transition to the upstairs nook.
    for i in range(7):
        cube('upper studio timber screen', (-7.1+i*.18,4.44,-3.37), (.045,2.32,.08), veneer,.009)
    cube('upper studio framed print', (-7.68,4.45,-4.7), (.06,1.12,.8), steel,.025)
    cube('upper studio print mat', (-7.64,4.45,-4.7), (.018,.99,.67), cream,.015)
    bpy.context.view_layer.update()
