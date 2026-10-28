"""World 4's giants for The Legend of Valence, exported to public/models/giants.glb.

The Axial Ogre (assets/enemies/axial-ogre.png): a huge grumpy olive ogre, tusks, pointed ears, pot belly,
loincloth, a stone club. The tert-Butyl Titan (boss): a stone giant whose torso is a quaternary carbon
core (Malradix's violet spark in its seams) carrying three CH₃ groups — its head and two shoulder boulders,
pink like every CH₃ in the game, each with three white H nubs.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/giants_blender.py -- <glb_path> <render_dir>

Parts (feet on y = 0, facing +z):
  ogr_body   legs, belly, chest, left arm, head, ears, tusks, loincloth
  ogr_arm    right arm with the club (frame: shoulder (0.62, 1.95, 0)), so it can swing
  ttn_body   legs, hips, the carbon core, the head CH₃, the two shoulder CH₃ boulders
  ttn_armL   left arm and fist (frame: shoulder (-1.75, 4.3, 0))
  ttn_armR   right arm and fist (frame: shoulder (1.75, 4.3, 0))
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'giants.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'ogreSkin': ('#7a8a5a', 0, 0.7), 'ogreDark': ('#55603e', 0, 0.75), 'tusk': ('#e8dcc0', 0, 0.45), 'cloth': ('#6a4a30', 0, 0.9),
    'eye': ('#ffd860', 0, 0.3, 1.2), 'dark': ('#140e0e', 0, 0.8), 'club': ('#5a5468', 0, 0.85), 'rope': ('#8a7050', 0, 0.9),
    'stone': ('#8a84a8', 0, 0.8), 'stoneDark': ('#625c80', 0, 0.85), 'core': ('#4a4062', 0.3, 0.4), 'seam': ('#b070ff', 0, 0.3, 2.5),
    'methyl': ('#d0508e', 0.1, 0.45), 'hydrogen': ('#f2f2f2', 0, 0.35), 'titanEye': ('#ffb04a', 0, 0.3, 2.0),
}

# ================================================================ the Axial Ogre (about 2.4 m)
ogre = meta([
    ((0, 1.25, 0.05), (0.52, 0.5, 0.48), (0, 0, 0)),     # belly
    ((0, 1.75, -0.02), (0.6, 0.42, 0.4), (0, 0, 0)),     # chest
    ((0, 2.05, -0.05), (0.5, 0.22, 0.3), (0, 0, 0)),     # shoulders' yoke
    ((-0.62, 1.95, 0), (0.22, 0.22, 0.22), (0, 0, 0)),   # left shoulder
    ((0.62, 1.95, 0), (0.22, 0.22, 0.22), (0, 0, 0)),    # right shoulder
    ((-0.26, 0.75, 0), (0.24, 0.32, 0.24), (0, 0, 0.1)), # thighs
    ((0.26, 0.75, 0), (0.24, 0.32, 0.24), (0, 0, -0.1)),
    ((-0.28, 0.32, 0.02), (0.18, 0.3, 0.18), (0, 0, 0)), # shins
    ((0.28, 0.32, 0.02), (0.18, 0.3, 0.18), (0, 0, 0)),
], 0.045)
add('ogr_body', ogre, 'ogreSkin')
for s in (-1, 1):  # big flat feet
    add('ogr_body', meta([((s * 0.3, 0.07, 0.1), (0.17, 0.09, 0.26), (0, 0, 0))], 0.03), 'ogreDark')
    for k in range(3):
        add('ogr_body', sphere(0.045, 8, 6), 'tusk', TRS((s * 0.3 + (k - 1) * 0.08, 0.06, 0.34)))
# left arm hanging, knuckles near the knee
add('ogr_body', meta([((-0.72, 1.65, 0.02), (0.17, 0.32, 0.17), (0, 0, -0.15)), ((-0.8, 1.15, 0.08), (0.15, 0.3, 0.15), (0, 0, -0.05)),
                       ((-0.82, 0.8, 0.12), (0.17, 0.14, 0.17), (0, 0, 0))], 0.04), 'ogreSkin')
# loincloth and a rope belt
add('ogr_body', arc_sheet(0.5, 0.46, 0.62, 0.42, -2.6, 2.6, 24, 3, -0.08), 'cloth', TRS((0, 0, 0.03)), [SOLID(0.025, 0)])
add('ogr_body', torus(0.5, 0.04, 32, 6), 'rope', TRS((0, 1.02, 0.04), scl=(1, 1, 0.95)))
# head: a heavy jaw, low brow, pointed ears, tusks, small yellow eyes
H = Vector((0, 2.32, 0.12))
add('ogr_body', meta([((0, 2.36, 0.08), (0.26, 0.24, 0.24), (0, 0, 0)), ((0, 2.22, 0.18), (0.27, 0.15, 0.2), (0, 0, 0)),
                       ((0, 2.43, 0.22), (0.24, 0.07, 0.1), (0.3, 0, 0))], 0.025), 'ogreSkin')
for s in (-1, 1):
    add('ogr_body', cyl(0.07, 0.0, 0.26, 6), 'ogreSkin', TRS((s * 0.29, 2.4, 0.06), (0, 0, -s * 1.15), scl=(1, 1, 0.45)))
    add('ogr_body', cyl(0.045, 0.0, 0.22, 8), 'tusk', TRS((s * 0.13, 2.25, 0.37), (-0.35, 0, s * 0.2)))
    add('ogr_body', sphere(0.04, 12, 8), 'eye', TRS((s * 0.1, 2.39, 0.325), scl=(1.2, 0.75, 0.6)))
    add('ogr_body', sphere(0.02, 8, 6), 'dark', TRS((s * 0.1, 2.39, 0.35)))
    add('ogr_body', box(0.12, 0.035, 0.05), 'ogreDark', TRS((s * 0.1, 2.435, 0.33), (0.2, 0, -s * 0.35)))  # a scowling brow
add('ogr_body', box(0.26, 0.035, 0.04), 'dark', TRS((0, 2.2, 0.385)))  # grim mouth
add('ogr_body', sphere(0.065, 10, 8), 'ogreDark', TRS((0, 2.31, 0.38), scl=(1.1, 0.8, 0.8)))  # nose
# right arm with a stone club (frame: shoulder)
SH = Vector((0.62, 1.95, 0))
add('ogr_arm', meta([((0.1, -0.3, 0.05), (0.17, 0.32, 0.17), (0, 0, 0.15)), ((0.18, -0.75, 0.2), (0.15, 0.28, 0.15), (0.6, 0, 0)),
                      ((0.2, -0.95, 0.42), (0.17, 0.14, 0.17), (0, 0, 0))], 0.04), 'ogreSkin')
add('ogr_arm', cyl(0.06, 0.09, 1.1, 10), 'club', TRS((0.2, -0.65, 0.95), (1.35, 0, 0)))
add('ogr_arm', rock_bm(0.26, 3.1, 2, 0.25, 0.8), 'club', TRS((0.2, -0.5, 1.5)), smooth=False)
for k in range(4):
    add('ogr_arm', torus(0.075, 0.015, 12, 4), 'rope', TRS((0.2, -0.93 + k * 0.05, 0.45 + k * 0.1), (1.35, 0, 0)))

# ================================================================ the tert-Butyl Titan (about 6.5 m)
for s in (-1, 1):  # pillar legs of stacked stone round a solid core
    add('ttn_body', cyl(0.42, 0.5, 2.7, 12), 'stoneDark', TRS((s * 0.75, 1.35, 0)))
    for k in range(4):
        add('ttn_body', rock_bm(0.5 - k * 0.03, 10 + k + s, 2, 0.12, 0.85), 'stone', TRS((s * 0.75, 0.45 + k * 0.62, 0), scl=(1, 0.75, 1)), smooth=False)
    add('ttn_body', box(0.9, 0.35, 1.2), 'stoneDark', TRS((s * 0.75, 0.17, 0.15)), [BEVEL(0.06, 1)])
add('ttn_body', rock_bm(1.1, 21, 2, 0.12, 0.85), 'stoneDark', TRS((0, 2.75, 0), scl=(1.25, 0.6, 0.9)), smooth=False)  # hips
# the quaternary carbon: a dark core sphere with glowing violet seams
add('ttn_body', sphere(1.55, 40, 28), 'core', TRS((0, 4.0, 0)))
for k in range(5):
    a = k / 5 * PI
    add('ttn_body', torus(1.56, 0.035, 64, 4), 'seam', TRS((0, 4.0, 0), (PI / 2, a, 0.3 * k)))
# four bonds out of the core: one down (to the hips) and three up-and-out to the CH₃ groups (tetrahedral)
METH = [Vector((0, 6.35, 0.15)), Vector((-1.85, 5.15, -0.1)), Vector((1.85, 5.15, -0.1))]
for m in METH:
    d = (m - Vector((0, 4.0, 0)))
    q = Vector((0, 1, 0)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    add('ttn_body', cyl(0.32, 0.28, d.length, 14), 'stoneDark', Matrix.Translation(Vector((0, 4.0, 0)) + d * 0.5) @ q)
for i, m in enumerate(METH):
    r = 0.95 if i == 0 else 0.85
    add('ttn_body', rock_bm(r, 30 + i, 2, 0.1, 0.9), 'methyl', TRS(tuple(m)), smooth=False)
    out = (m - Vector((0, 4.0, 0))).normalized()
    for k in range(3):  # three H nubs per CH₃, pointing away from the core
        a = k / 3 * 2 * PI + i
        side = out.cross(Vector((0, 0, 1)) if abs(out.z) < 0.9 else Vector((1, 0, 0))).normalized()
        up = out.cross(side).normalized()
        dirv = (out * 0.45 + side * 0.9 * math.cos(a) + up * 0.9 * math.sin(a)).normalized()
        p = m + dirv * (r + 0.25)
        add('ttn_body', cyl(0.08, 0.08, 0.35, 8), 'hydrogen', Matrix.Translation(m + dirv * (r + 0.05)) @ Vector((0, 1, 0)).rotation_difference(dirv).to_matrix().to_4x4())
        add('ttn_body', sphere(0.24, 14, 10), 'hydrogen', TRS(tuple(p)))
# the head CH₃ has a face: two burning eyes and a brow
HD = METH[0]
for s in (-1, 1):
    add('ttn_body', sphere(0.15, 12, 10), 'titanEye', TRS(tuple(HD + Vector((s * 0.33, 0.05, 0.82))), scl=(1.3, 0.7, 0.6)))
add('ttn_body', box(1.0, 0.16, 0.3), 'stoneDark', TRS(tuple(HD + Vector((0, 0.3, 0.75))), (0.3, 0, 0)), [BEVEL(0.04, 1)])
add('ttn_body', box(0.6, 0.08, 0.2), 'dark', TRS(tuple(HD + Vector((0, -0.35, 0.82)))))
# arms (each in its shoulder frame), hanging with huge fists
for nm, s in (('ttn_armL', -1), ('ttn_armR', 1)):
    add(nm, tube([(s * 0.2, 0.1, 0.0), (s * 0.35, -1.2, 0.08), (s * 0.42, -2.5, 0.2)], [0.42, 0.36, 0.38], 12), 'stoneDark')
    for k in range(3):
        add(nm, rock_bm(0.48 - k * 0.04, 40 + k + s, 2, 0.12, 0.85), 'stone', TRS((s * 0.35, -0.5 - k * 0.75, 0.1), scl=(0.9, 1.0, 0.9)), smooth=False)
    add(nm, rock_bm(0.65, 50 + s, 2, 0.1, 0.85), 'stoneDark', TRS((s * 0.45, -2.75, 0.25)), smooth=False)
    for k in range(3):
        add(nm, torus(0.42 - k * 0.04, 0.03, 32, 4), 'seam', TRS((s * 0.35, -0.85 - k * 0.75, 0.1)))

# ---------------------------------------------------------------- build, bake, export
objs = build_objects(MATS, 'giants', smooth_parts=('ogr_body', 'ogr_arm'))
bake_ao(objs, distance=0.5, samples=32, floor=0.55)
export_glb(objs, GLB)
if RENDERS:
    pl = [('ogr_body', TRS((-3, 0, 0))), ('ogr_arm', TRS((-3 + 0.62, 1.95, 0))),
          ('ttn_body', TRS((2.5, 0, 0))), ('ttn_armL', TRS((2.5 - 1.75, 4.3, 0))), ('ttn_armR', TRS((2.5 + 1.75, 4.3, 0)))]
    preview(objs, pl, [('giants_front.png', (0, 4.0, 13), (0, 3.0, 0), 35), ('ogre_face.png', (-2.6, 2.4, 2.2), (-3, 2.2, 0), 45),
                       ('titan_side.png', (9, 5, 6), (2.5, 3.5, 0), 35)], RENDERS, sky='#3a3848', ground='#3a3a44')
    print('RENDERS', RENDERS)
