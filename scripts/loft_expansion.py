"""Expand the authored room and add connected upstairs and rear living areas.

Called by build_loft.py before packing/exporting. Runtime camera anchors use
content/loft-layout.json too; props move rigidly and architecture alone expands.
"""
import math
import bpy
from mathutils import Matrix


def expand_loft(env):
    cube, tube, cylinder, sphere, imported = (env[key] for key in ('cube', 'tube', 'cylinder', 'sphere', 'imported'))
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
    # A clerestory keeps the rear room enclosed without blocking its city light.
    cube('lounge rear lower wall', (0, 1.7, 14.15), (16, 3.4, .22), plaster)
    cube('lounge rear upper wall', (0, 6.0, 14.15), (16, .6, .22), plaster)
    for x in (-7.7, -4, 0, 4, 7.7):
        cube('lounge rear window pier', (x, 4.55, 14.15), (.24, 2.3, .22), steel)
    for y in (3.4, 5.7):
        cube('lounge rear window transom', (0, y, 14.12), (16, .09, .12), steel)
    cube('lounge rear skirting', (0, .075, 13.98), (15.8, .15, .12), veneer)

    fabric = env['texture']('lounge woven linen', 'rough_linen', 3.0)
    olive = simple('moss green upholstery', (.18, .23, .19), .94)
    rug = simple('sand woven rug', (.49, .43, .33), .99)
    cube('lounge wool rug', (.5, .018, 10.55), (7.1, .028, 4.1), rug, .08, 5)
    cube('lounge sofa oak plinth', (.55, .18, 12.18), (4.35, .2, 1.35), oak, .05, 5)
    for i in range(3):
        x = -.82 + i * 1.37
        cube('lounge sofa seat cushion', (x, .48, 12.02), (1.33, .34, 1.22), fabric, .14, 7)
        back = cube('lounge sofa back cushion', (x, .98, 12.56), (1.34, .94, .36), fabric, .12, 7)
        back.rotation_euler.x = math.radians(-8)
    for x in (-1.75, 2.86):
        cube('lounge sofa armrest', (x, .68, 12.14), (.34, .86, 1.43), fabric, .14, 7)
    pillow = cube('lounge loose olive pillow', (-.96, .94, 12.03), (.65, .62, .24), olive, .12, 7)
    pillow.rotation_euler = (math.radians(-18), math.radians(9), math.radians(14))
    # Rounded oak coffee table and slim listening console face the new camera.
    cube('lounge coffee table top', (.35, .55, 9.92), (2.8, .12, 1.25), oak, .16, 8)
    for x in (-.65, 1.35):
        cube('lounge coffee table leg', (x, .25, 9.92), (.16, .5, .75), steel, .025)
    for i in range(3):
        cube('lounge stacked photo book', (-.38, .63 + i*.045, 9.92), (.72, .04, .52), (cream, olive, veneer)[i], .008)
    cylinder('lounge ceramic bowl', (1.08, .7, 9.98), .19, .16, cream, 40)
    cube('lounge record console', (4.8, .5, 11.65), (2.55, .72, .73), veneer, .045, 5)
    for x in (3.85, 5.75):
        for z in (11.43, 11.88):
            cube('lounge console foot', (x, .12, z), (.055, .24, .055), steel)
    for x in (4.13, 5.48):
        cube('lounge speaker', (x, 1.1, 11.7), (.35, .52, .3), steel, .028, 4)
        sphere('lounge speaker cone', (x, 1.12, 11.535), (.105, .105, .015), env['dark'])
    cube('lounge record player base', (4.8, .935, 11.6), (.78, .12, .51), oak, .024, 5)
    tube('lounge tonearm', (5.1, 1.035, 11.78), (4.94, 1.035, 11.45), .009, env['brass'], 12)
    cylinder('lounge floor lamp base', (-3.1, .06, 11.45), .29, .12, steel, 48)
    tube('lounge floor lamp stem', (-3.1, .12, 11.45), (-3.1, 1.98, 11.45), .021, env['brass'], 16)
    cylinder('lounge linen lampshade', (-3.1, 1.85, 11.45), .31, .4, cream, 48)
    # Use the detailed source armchair in the lounge, with a distinct node name.
    before = set(bpy.data.objects)
    imported('modern_arm_chair_01', (-3.7, 0, 9.5), 1.1, rotation_z=-math.pi / 3)
    for obj in set(bpy.data.objects) - before:
        obj.name = 'lounge reading chair / ' + obj.name

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
