"""World 9's landscape and dungeon pieces for The Legend of Valence, exported to public/models/spire.glb.
Modeled on assets/locations/world-9-triple-spire.png: three tall, straight stone towers rising from a stormy sea
between grassy cliffs, joined by bridges of three glowing parallel bars (triple bonds), lightning overhead.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/spire_blender.py -- <glb_path> <render_dir>

Parts (world frame unless noted):
  cl_ground   the cliff-top meadow (y = 0), x −50…50, z −50…44, with a cliff edge to the south (z 44 … 50 drops away)
  cl_sea      the sea below and the far cliffs round it
  cl_path     the path from the west gate along the cliffs to the spire bridge
  cl_spires   the three towers off the north cliff and the triple bridges between them (world frame)
  cl_rock     a boulder (own frame)
  s9_wall     a spire wall run 4 m along z, inner face at x = 0 facing +x: grey stone, a lit slit, mossy
  s9_well     a shifting well: a round stone well (own frame)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'spire.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'grass': ('#4a6a4a', 0, 0.95), 'grassDark': ('#3a5a3a', 0, 0.95), 'rock': ('#5a5e66', 0, 0.9), 'rockDark': ('#3a3e46', 0, 0.9),
    'sea': ('#1e4a5a', 0.2, 0.25), 'foam': ('#c8e8f0', 0, 0.6), 'path': ('#7a7468', 0, 1.0), 'moss': ('#4a6a3a', 0, 0.95),
    'stone': ('#6a6e76', 0, 0.85), 'stoneLight': ('#8a8e96', 0, 0.8), 'bar': ('#5ff0ff', 0, 0.2, 2.8), 'window': ('#ffd88a', 0, 0.3, 2.0),
    'water': ('#3a7a9a', 0.3, 0.15),
}

# ================================================================ the meadow and the cliff edge
g = bmesh.new()
bmesh.ops.create_grid(g, x_segments=50, y_segments=47, size=1)
for v in g.verts:
    v.co = Vector((v.co.x * 50, 0, (v.co.y * 47) - 3))
add('cl_ground', g, 'grass', smooth=False)
add('cl_ground', box(100, 30, 2), 'rock', TRS((0, -15, 45)), smooth=False)  # the cliff face to the south
for i in range(30):
    x = -48 + i * 3.3
    add('cl_ground', rock_bm(1.2 + 1.2 * hash3(i, 1, 1), i, 2, 0.3, 0.7), 'rockDark', TRS((x, -2 - 6 * hash3(i, 2, 2), 45.5 + 0.8 * hash3(i, 3, 3))), smooth=False)
for i in range(26):
    a = i / 26 * 2 * PI
    r = 40 + 8 * hash3(i, 4, 4)
    x, z = math.sin(a) * r, math.cos(a) * r
    if z > 40 or (z < -36 and abs(x) < 12):
        continue
    add('cl_ground', rock_bm(1.0 + 1.4 * hash3(i, 5, 5), i + 40, 2, 0.3, 0.7), 'rock', TRS((x, 0.3, z)), smooth=False)

# ================================================================ the sea far below and the far cliffs
s = bmesh.new()
bmesh.ops.create_grid(s, x_segments=20, y_segments=20, size=1)
for v in s.verts:
    v.co = Vector((v.co.x * 260, -30, v.co.y * 260))
add('cl_sea', s, 'sea', smooth=False)
for i in range(24):
    a = i / 24 * 2 * PI
    r = 120 + 20 * hash3(i, 6, 6)
    add('cl_sea', deform(sphere(1.0, 10, 8), lambda v: (v.x, max(-1.0, v.y), v.z)), 'rock' if i % 2 else 'rockDark', TRS((math.sin(a) * r, -20, math.cos(a) * r), (0, a, 0), scl=(20, 35 + 15 * hash3(i, 7, 7), 14)), smooth=False)
    add('cl_sea', deform(sphere(1.0, 10, 6), lambda v: (v.x, max(0.0, v.y), v.z)), 'grassDark', TRS((math.sin(a) * r, 14 + 15 * hash3(i, 7, 7), math.cos(a) * r), (0, a, 0), scl=(18, 3, 12)), smooth=False)

# ================================================================ the path
road, edge = ribbon([(-49, 6), (-30, 10), (-12, 4), (-4, -14), (0, -30), (0, -44)], 1.6, 0.5, 0.02, 7)
add('cl_path', road, 'path', smooth=False)
add('cl_path', edge, 'grassDark', smooth=False)

# ================================================================ the three spires (north, off the cliff) and their triple bridges
SP = [(-26, -80, 70), (0, -86, 84), (26, -80, 72)]
for (x, z, h) in SP:
    prof = [(5.0, -40), (4.4, 0), (3.8, h * 0.5), (3.0, h * 0.9), (1.4, h), (0.0, h + 4)]
    add('cl_spires', deform(lathe(prof, 14, False, False), lambda v: (v.x * (1 + 0.06 * math.sin(v.y * 0.3)), v.y, v.z * (1 + 0.06 * math.cos(v.y * 0.27)))), 'stone', TRS((x, 0, z)), smooth=False)
    for k in range(6):
        y = 6 + k * h / 7
        add('cl_spires', box(0.6, 1.4, 0.3), 'window', TRS((x + math.sin(k * 2.1) * 4.1, y, z + math.cos(k * 2.1) * 4.1), (0, k * 2.1, 0)))
    for k in range(8):
        add('cl_spires', rock_bm(1.6, int(x) + k, 2, 0.3, 0.6), 'moss', TRS((x + math.sin(k) * 4.4, 4 + k * 5.5, z + math.cos(k) * 4.4), scl=(1, 0.5, 1)), smooth=False)
# the bridges: three parallel glowing bars, sagging slightly, from the cliff to the middle spire and between spires
def triple(a, b, sag=2.0):
    A, B = Vector(a), Vector(b)
    side = (B - A).cross(Vector((0, 1, 0))).normalized()
    for k in (-1, 0, 1):
        pts = []
        for t in range(25):
            u = t / 24
            p = A.lerp(B, u) + side * (k * 0.45) + Vector((0, -sag * 4 * u * (1 - u), 0))
            pts.append(tuple(p))
        add('cl_spires', tube(pts, [0.12] * 25, 8), 'bar')
triple((0, 3, -44), (0, 26, -82))
triple((-22, 40, -80), (-4, 46, -86))
triple((4, 46, -86), (22, 40, -80))
# the gate at the cliff edge: two stone posts where the bridge begins
for s_ in (-1, 1):
    add('cl_spires', box(1.4, 6, 1.4), 'stoneLight', TRS((s_ * 2.6, 3, -45)), [BEVEL(0.1, 1)])
    add('cl_spires', box(1.8, 0.6, 1.8), 'stone', TRS((s_ * 2.6, 6.3, -45)))
add('cl_spires', box(6.6, 0.8, 1.2), 'stoneLight', TRS((0, 6.6, -45)), [BEVEL(0.08, 1)])
for k in range(5):
    add('cl_rock', rock_bm(0.8 + 0.4 * hash3(k, 8, 8), k + 70, 2, 0.3, 0.7), 'rock', TRS((0.6 * math.sin(k), 0.5, 0.6 * math.cos(k))), smooth=False)

# ================================================================ inside the spire
add('s9_wall', box(2.0, 8.0, 4.0), 'stone', TRS((-1.0, 4.0, 0)))
for k in range(4):
    add('s9_wall', box(0.1, 0.1, 4.0), 'rockDark', TRS((0.02, 1.0 + k * 1.8, 0)))
add('s9_wall', box(0.1, 1.8, 0.3), 'window', TRS((0.02, 4.4, 0.0)))
add('s9_wall', rock_bm(0.6, 300, 2, 0.3, 0.5), 'moss', TRS((0.2, 0.3, -1.4), scl=(0.8, 0.6, 1.2)), smooth=False)
add('s9_wall', box(0.6, 0.4, 4.0), 'stoneLight', TRS((0.2, 7.9, 0)))
add('s9_well', lathe([(0.9, 0.0), (1.0, 0.1), (1.0, 0.8), (0.85, 0.85), (0.8, 0.1)], 24, False, False), 'stoneLight', None, [SOLID(0.05, 0)])
add('s9_well', cyl(0.8, 0.8, 0.05, 24), 'water', TRS((0, 0.55, 0)))
for s_ in (-1, 1):
    add('s9_well', box(0.12, 1.4, 0.12), 'stone', TRS((s_ * 0.9, 1.3, 0)))
add('s9_well', box(2.0, 0.12, 0.12), 'stone', TRS((0, 2.0, 0)))

objs = build_objects(MATS, 'spire')
BIG = ('cl_ground', 'cl_sea', 'cl_path', 'cl_spires')
bake_ao({k: v for k, v in objs.items() if k not in BIG}, distance=0.4, samples=24, floor=0.6)
colour_pass(objs['cl_ground'], lambda p: 0.78 + 0.22 * fbm((p[0], 0, p[2]), 0.08, 3))
colour_pass(objs['cl_spires'], lambda p: 0.7 + 0.3 * min(1.0, max(0.0, (p[1] + 20) / 100.0)))
export_glb(objs, GLB)
if RENDERS:
    pl = [('cl_ground', TRS()), ('cl_sea', TRS()), ('cl_path', TRS()), ('cl_spires', TRS())]
    preview(objs, pl, [('cliffs_view.png', (0, 6, 30), (0, 30, -80), 50)], RENDERS, sky='#4a5468', ground=None)
    print('RENDERS', RENDERS)
