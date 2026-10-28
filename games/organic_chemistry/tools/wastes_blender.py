"""World 11's landscape and dungeon pieces for The Legend of Valence, exported to public/models/wastes.glb.
Modeled on assets/locations/world-11-arena-of-five.png: a volcanic coliseum of cracked black stone veined with lava,
five barred gates each under its own coloured banner, a jagged volcano and a dark keep beyond, a violet moon.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/wastes_blender.py -- <glb_path> <render_dir>

Parts (world frame unless noted):
  vw_ground  the walkable wastes (y = 0), x −50…50, z −50…50: black rock, ash, glowing lava cracks
  vw_far     the volcano, far ridges and the keep on the horizon
  vw_path    the cooled lava road from the west gate to the coliseum (north)
  vw_col     the coliseum's outer wall (own frame, centre at origin, radius 16, an entrance gap facing +z)
  vw_rock    a jagged rock spire (own frame)
  a11_wall   an under-hall wall run 4 m along z, inner face at x = 0 facing +x: dark stone with lava seams
  a11_gate   an arena gate with its banner pole (own frame, facing +z; banner colour set in code)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'wastes.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'rock': ('#2a2428', 0, 0.9), 'rockLight': ('#4a3e3e', 0, 0.85), 'ash': ('#5a4e4a', 0, 0.95), 'lava': ('#ff5a1a', 0, 0.3, 3.0),
    'lavaDim': ('#c83a10', 0, 0.4, 1.4), 'stone': ('#3a3234', 0, 0.85), 'stoneLight': ('#5a4e4e', 0, 0.8), 'iron': ('#2a2a30', 0.7, 0.45),
    'far': ('#2a1e2a', 0, 1.0), 'keep': ('#1a141e', 0, 0.9), 'glow': ('#ff8a3a', 0, 0.3, 2.0), 'cloth': ('#d8d0c8', 0, 0.85),
}

g = bmesh.new()
bmesh.ops.create_grid(g, x_segments=50, y_segments=50, size=50)
bmesh.ops.rotate(g, verts=g.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-PI / 2, 3, 'X'))
add('vw_ground', g, 'rock', smooth=False)
for i in range(22):  # ash drifts and lava cracks
    x, z = -44 + 88 * hash3(i, 1, 1), -44 + 88 * hash3(i, 2, 2)
    add('vw_ground', cyl(2 + 3 * hash3(i, 3, 3), 2 + 3 * hash3(i, 3, 3), 0.02, 12), 'ash', TRS((x, 0.01, z)))
for i in range(16):
    pts = []
    x, z = -40 + 80 * hash3(i, 4, 4), -40 + 80 * hash3(i, 5, 5)
    a = hash3(i, 6, 6) * 2 * PI
    for k in range(7):
        pts.append((x, 0.03, z)); a += 0.8 * (hash3(i, k, 7) - 0.5); x += math.cos(a) * 2.0; z += math.sin(a) * 2.0
    add('vw_ground', tube(pts, [0.12] * len(pts), 4), 'lava', smooth=False)
# the far volcano, ridges and the keep
add('vw_far', lathe([(60, 0), (40, 30), (14, 70), (10, 72)], 20, False, False), 'far', TRS((-30, -2, -190)), smooth=False)
add('vw_far', cyl(10, 10, 1, 20), 'lava', TRS((-30, 70.5, -190)))
for i in range(22):
    a = i / 22 * 2 * PI
    r = 80 + 14 * hash3(i, 8, 8)
    add('vw_far', cyl(1.0, 0.0, 1.0, 5), 'far', TRS((math.sin(a) * r, -1, math.cos(a) * r), (0, a, 0), scl=(16, 18 + 18 * hash3(i, 9, 9), 16)), smooth=False)
for k, (x, h) in enumerate([(-8, 30), (0, 44), (8, 32), (-4, 24), (4, 26)]):
    add('vw_far', box(4, h, 4), 'keep', TRS((30 + x, h / 2 + 8, -170)))
    add('vw_far', cyl(2.6, 0.0, 8, 4), 'keep', TRS((30 + x, h + 12, -170)), smooth=False)
# the road
road, edge = ribbon([(-49, 6), (-30, 4), (-14, -6), (-4, -20), (0, -28)], 1.8, 0.5, 0.02, 7)
add('vw_path', road, 'ash', smooth=False)
add('vw_path', edge, 'rockLight', smooth=False)
# the coliseum: a round wall with buttresses, lava seams, and an entrance gap facing +z
R = 16
for k in range(40):
    a = k / 40 * 2 * PI
    if abs(math.sin(a)) < 0.12 and math.cos(a) > 0:
        continue  # the entrance (+z)
    x, z = math.sin(a) * R, math.cos(a) * R
    add('vw_col', box(2.6, 12, 2.0), 'stone', TRS((x, 6, z), (0, a, 0)), [BEVEL(0.1, 1)])
    if k % 4 == 0:
        add('vw_col', box(1.6, 14, 2.6), 'stoneLight', TRS((math.sin(a) * (R + 0.8), 7, math.cos(a) * (R + 0.8)), (0, a, 0)), [BEVEL(0.1, 1)])
    if k % 3 == 1:
        add('vw_col', box(0.15, 6, 2.1), 'lavaDim', TRS((math.sin(a) * (R + 1.02), 4, math.cos(a) * (R + 1.02)), (0, a, 0.2)))
for s_ in (-1, 1):
    add('vw_col', box(2.2, 15, 2.2), 'stoneLight', TRS((s_ * 2.6, 7.5, R + 0.4)), [BEVEL(0.1, 1)])
add('vw_col', box(7.4, 2, 2.2), 'stoneLight', TRS((0, 14, R + 0.4)), [BEVEL(0.1, 1)])
# a jagged rock spire
add('vw_rock', deform(cyl(1.2, 0.1, 5.0, 6), lambda v: (v.x + 0.2 * math.sin(v.y * 2), v.y, v.z + 0.15 * math.cos(v.y * 3))), 'rockLight', TRS((0, 2.5, 0)), smooth=False)
add('vw_rock', rock_bm(1.3, 5, 2, 0.35, 0.6), 'rock', TRS((0.4, 0.4, 0.3)), smooth=False)
# the under-halls
add('a11_wall', box(2.0, 8.0, 4.0), 'stone', TRS((-1.0, 4.0, 0)))
add('a11_wall', box(0.1, 6.0, 0.15), 'lavaDim', TRS((0.02, 3.5, -1.0), (0, 0, 0.15)))
add('a11_wall', box(0.1, 4.0, 0.12), 'lavaDim', TRS((0.02, 2.5, 1.2), (0, 0, -0.2)))
add('a11_wall', box(0.4, 0.5, 4.0), 'stoneLight', TRS((0.15, 7.75, 0)))
add('a11_wall', box(0.3, 0.3, 0.3), 'glow', TRS((0.2, 4.6, 0.0)))
# an arena gate: two posts, a barred portcullis, a banner pole (the banner is drawn in code)
for s_ in (-1, 1):
    add('a11_gate', box(0.8, 5.0, 0.8), 'stoneLight', TRS((s_ * 1.6, 2.5, 0)), [BEVEL(0.06, 1)])
add('a11_gate', box(4.0, 0.7, 0.9), 'stoneLight', TRS((0, 5.2, 0)), [BEVEL(0.06, 1)])
for k in range(6):
    add('a11_gate', box(0.08, 4.6, 0.08), 'iron', TRS((-1.0 + k * 0.4, 2.3, 0.1)))
add('a11_gate', box(2.4, 0.08, 0.08), 'iron', TRS((0, 3.4, 0.1)))
add('a11_gate', cyl(0.05, 0.05, 2.0, 6), 'iron', TRS((0, 6.4, 0.3)))

objs = build_objects(MATS, 'wastes')
BIG = ('vw_ground', 'vw_far', 'vw_path', 'vw_col')
bake_ao({k: v for k, v in objs.items() if k not in BIG}, distance=0.4, samples=24, floor=0.6)
colour_pass(objs['vw_ground'], lambda p: 0.75 + 0.25 * fbm((p[0], 0, p[2]), 0.09, 3))
export_glb(objs, GLB)
if RENDERS:
    pl = [('vw_ground', TRS()), ('vw_far', TRS()), ('vw_path', TRS()), ('vw_col', TRS((0, 0, -46)))]
    for k in range(5):
        pl.append(('vw_rock', TRS((-30 + k * 14, 0, -10 - 8 * hash3(k, 1, 1)))))
    preview(objs, pl, [('wastes_view.png', (0, 5, 26), (0, 8, -60), 50)], RENDERS, sky='#4a2a3a', ground=None)
    print('RENDERS', RENDERS)
