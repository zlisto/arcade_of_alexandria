"""World 5's architecture for The Legend of Valence, exported to public/models/palace.glb.
Modeled on assets/locations/world-5-mirror-palace.png: an elegant silver crystal palace on a perfectly still lake,
twin spiral towers (one twisting left, one twisting right), pale blue and silver, moonlight. The game draws the
lake's reflection by mirroring the palace part below the water line.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/palace_blender.py -- <glb_path> <render_dir>

Parts (world frame unless noted):
  lk_shore     the walkable shore (y = 0) south of the lake, rocks and silver grass tufts, x −45…45, z −10…45
  lk_hills     low hills and far snowy mountains round the lake
  lk_palace    the palace on its island (centre (0, 0, −95)): halls, spires, the twin spiral towers
  lk_causeway  one crystal causeway slab, 4 m long along z, 3.4 m wide, top at y = 0 (own frame)
  p5_wall      a dungeon wall run 4 m long along z, inner face at x = 0 facing +x: pale crystal blocks, a mirror panel
  p5_colL      a column twisting left (own frame);  p5_colR  the same column twisting right (its mirror image)
  p5_mirror    a tall standing mirror in a silver frame (own frame, facing +z)
  p5_plinth    a statue plinth, top at y = 1.0 (own frame)
  p5_scope     a polarimeter: a brass tube on a stand with an eyepiece and an analyzer dial (own frame)
  p5_shield    the Mirror Shield (own frame, facing +z, about 0.7 m across)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'palace.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'grass': ('#7a8a8a', 0, 0.95), 'rock': ('#6a7280', 0, 0.9), 'snow': ('#e8eef8', 0, 0.8), 'far': ('#7a88a0', 0, 1.0),
    'crystal': ('#dce6f2', 0.2, 0.25), 'crystalDark': ('#9aa8c0', 0.3, 0.3), 'silver': ('#d8dce8', 0.95, 0.2), 'glass': ('#c8e0f0', 0.6, 0.08),
    'mirror': ('#d0dcea', 1.0, 0.04), 'glow': ('#bfe8ff', 0, 0.2, 2.0), 'brass': ('#c09a50', 0.85, 0.3), 'dark': ('#1a1e2a', 0.2, 0.6),
    'gemR': ('#ff5a6a', 0.1, 0.2, 1.2), 'gemB': ('#5aa0ff', 0.1, 0.2, 1.2), 'gemY': ('#ffd04a', 0.1, 0.2, 1.2),
}
PZ = -95  # palace island centre

# ================================================================ the shore
g = bmesh.new()
bmesh.ops.create_grid(g, x_segments=45, y_segments=28, size=1.0)
for v in g.verts:
    v.co.x *= 45; v.co.y *= 28
bmesh.ops.rotate(g, verts=g.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-PI / 2, 3, 'X'))
for v in g.verts:
    v.co.z += 17  # z −11 … 45
add('lk_shore', g, 'grass', smooth=False)
for i in range(40):  # rocks along the waterline and silver tufts
    x = -42 + i * 2.1 + 1.2 * hash3(i, 1, 1)
    z = -10 + 1.5 * hash3(i, 2, 2)
    add('lk_shore', rock_bm(0.4 + 0.6 * hash3(i, 3, 3), i, 2, 0.25, 0.8), 'rock', TRS((x, 0.05, z)), smooth=False)
for i in range(70):
    x = -40 + 80 * hash3(i, 4, 4); z = -6 + 48 * hash3(i, 5, 5)
    if abs(x) < 3.5:
        continue
    for k in range(3):
        add('lk_shore', cyl(0.05, 0.0, 0.5 + 0.3 * hash3(i, k, 6), 4), 'crystalDark', TRS((x + 0.1 * k, 0.2, z), (0.2 * (k - 1), 0, 0.25 * (k - 1))), smooth=False)

# ================================================================ hills and snowy mountains round the lake
for i in range(16):
    a = (i / 16) * 2 * PI
    r = 150 + 20 * hash3(i, 7, 7)
    h = 40 + 30 * hash3(i, 8, 8)
    m = cyl(1.0, 0.0, 1.0, 7)
    add('lk_hills', m, 'far', TRS((math.sin(a) * r, h / 2 - 2, PZ + math.cos(a) * r), (0, a, 0), scl=(40, h, 40)), smooth=False)
    add('lk_hills', cyl(1.0, 0.0, 1.0, 7), 'snow', TRS((math.sin(a) * r, h * 0.78 - 2, PZ + math.cos(a) * r), (0, a, 0), scl=(13, h * 0.32, 13)), smooth=False)
for s in (-1, 1):  # wooded hills either side of the shore
    for k in range(4):
        add('lk_hills', deform(sphere(1.0, 18, 8), lambda v: (v.x, max(v.y, 0) * 0.4, v.z)), 'grass', TRS((s * (52 + 6 * k), -0.3, 10 - 14 * k), scl=(14, 14, 16)))

# ================================================================ the palace on its island
add('lk_palace', deform(cyl(1.0, 0.85, 1.0, 40), lambda v: v), 'crystalDark', TRS((0, -0.6, PZ), scl=(30, 1.6, 18)))  # the island's rim
def spire(x, z, h, r, mat='crystal'):
    add('lk_palace', cyl(r, r * 0.85, h, 12), mat, TRS((x, h / 2, z)))
    add('lk_palace', cyl(r * 1.1, 0.02, h * 0.45, 12), 'silver', TRS((x, h + h * 0.22, z)))
# the main hall: stacked crystal tiers with tall windows
for k, (w, h, d) in enumerate(((22, 8, 14), (16, 7, 10), (10, 6, 7))):
    y = sum((8, 7, 6)[:k])
    add('lk_palace', box(w, h, d), 'crystal', TRS((0, y + h / 2, PZ)), [BEVEL(0.15, 1)])
    for j in range(int(w / 2)):
        x = -w / 2 + 1 + j * 2
        add('lk_palace', box(0.8, h * 0.55, 0.1), 'glow', TRS((x, y + h * 0.5, PZ + d / 2 + 0.05)))
spire(0, PZ, 30, 1.6, 'silver')
for (x, z, h) in ((-9, PZ + 5, 14), (9, PZ + 5, 14), (-6, PZ - 4, 18), (6, PZ - 4, 18), (-12, PZ - 1, 11), (12, PZ - 1, 11)):
    spire(x, z, h, 1.0)
# the twin spiral towers: a ribbon winding up each, one turning left, one turning right (mirror images)
for s in (-1, 1):
    cx, cz = s * 17, PZ + 2
    add('lk_palace', cyl(1.8, 1.0, 36, 16), 'crystalDark', TRS((cx, 18, cz)))
    pts, rad = [], []
    for k in range(140):
        t = k / 139
        a = s * t * 7 * 2 * PI
        r = 2.6 - 1.4 * t
        pts.append((cx + math.cos(a) * r, 1 + t * 38, cz + math.sin(a) * r))
        rad.append(0.75 - 0.5 * t)
    add('lk_palace', tube(pts, rad, 8), 'crystal')
    add('lk_palace', cyl(0.6, 0.0, 6, 10), 'silver', TRS((cx, 42, cz)))

# ================================================================ a causeway slab
add('lk_causeway', box(3.4, 0.5, 4.0), 'crystal', TRS((0, -0.25, 0)), [BEVEL(0.06, 1)])
for s in (-1, 1):
    add('lk_causeway', box(0.2, 0.5, 4.0), 'silver', TRS((s * 1.6, 0.2, 0)), [BEVEL(0.03, 1)])
    add('lk_causeway', sphere(0.18, 10, 8), 'glow', TRS((s * 1.6, 0.6, 1.8)))

# ================================================================ dungeon pieces
add('p5_wall', box(2.0, 8.0, 4.0), 'crystalDark', TRS((-1.0, 4.0, 0)))
for row in range(4):
    y = 0.9 + row * 2.0
    for k, z in enumerate((-1.0, 1.0)):
        if row in (1, 2) and k == 0:
            continue
        add('p5_wall', box(0.16, 1.9, 1.9), 'crystal', TRS((0.02, y, z)), [BEVEL(0.06, 1)])
add('p5_wall', box(0.06, 3.6, 1.7), 'mirror', TRS((0.05, 3.9, -1.0)))  # a mirror panel set in the wall
add('p5_wall', box(0.14, 3.9, 0.12), 'silver', TRS((0.08, 3.9, -1.92)))
add('p5_wall', box(0.14, 3.9, 0.12), 'silver', TRS((0.08, 3.9, -0.08)))
add('p5_wall', box(0.3, 0.3, 4.0), 'silver', TRS((0.1, 7.9, 0)))
for nm, s in (('p5_colL', 1), ('p5_colR', -1)):
    add(nm, cyl(0.5, 0.5, 7.0, 16), 'crystal', TRS((0, 3.5, 0)))
    for j in range(3):
        pts = [(math.cos(s * (t / 40) * 4 * PI + j * 2.09) * 0.52, 0.2 + (t / 40) * 6.6, math.sin(s * (t / 40) * 4 * PI + j * 2.09) * 0.52) for t in range(41)]
        add(nm, tube(pts, [0.07] * 41, 6), 'silver')
    add(nm, cyl(0.75, 0.75, 0.4, 16), 'silver', TRS((0, 0.2, 0)), [BEVEL(0.04, 1)])
    add(nm, cyl(0.7, 0.55, 0.5, 16), 'silver', TRS((0, 7.2, 0)), [BEVEL(0.04, 1)])
add('p5_mirror', box(1.4, 2.6, 0.06), 'mirror', TRS((0, 1.6, 0)))
for (w, h, x, y) in ((1.7, 0.16, 0, 2.95), (1.7, 0.16, 0, 0.25), (0.16, 2.86, -0.77, 1.6), (0.16, 2.86, 0.77, 1.6)):
    add('p5_mirror', box(w, h, 0.14), 'silver', TRS((x, y, 0)), [BEVEL(0.03, 1)])
add('p5_mirror', cyl(0.12, 0.0, 0.4, 6), 'silver', TRS((0, 3.25, 0)), smooth=False)
add('p5_plinth', cyl(0.55, 0.65, 0.9, 16), 'crystal', TRS((0, 0.45, 0)), [BEVEL(0.03, 1)])
add('p5_plinth', cyl(0.7, 0.7, 0.12, 16), 'silver', TRS((0, 0.96, 0)), [BEVEL(0.02, 1)])
add('p5_scope', cyl(0.2, 0.3, 0.9, 10), 'dark', TRS((0, 0.45, 0)))
add('p5_scope', cyl(0.12, 0.12, 2.2, 16), 'brass', TRS((0, 1.15, 0), (0, 0, PI / 2)))
add('p5_scope', torus(0.3, 0.04, 32, 6), 'brass', TRS((1.1, 1.15, 0), (0, 0, PI / 2)))
add('p5_scope', cyl(0.28, 0.28, 0.04, 32), 'glass', TRS((1.1, 1.15, 0), (0, 0, PI / 2)))
add('p5_scope', cyl(0.06, 0.08, 0.2, 10), 'brass', TRS((1.25, 1.15, 0), (0, 0, PI / 2)))
add('p5_scope', cyl(0.18, 0.18, 0.12, 16), 'brass', TRS((-1.1, 1.15, 0), (0, 0, PI / 2)))
# the Mirror Shield: a round silver shield, a mirror face, a rim like a steering wheel with four gems of different sizes
add('p5_shield', cyl(0.36, 0.36, 0.05, 40), 'silver', TRS((0, 0, 0), (PI / 2, 0, 0)), [BEVEL(0.01, 1)])
add('p5_shield', cyl(0.3, 0.3, 0.02, 40), 'mirror', TRS((0, 0, 0.03), (PI / 2, 0, 0)))
add('p5_shield', torus(0.33, 0.025, 40, 6), 'silver', TRS((0, 0, 0.035), (PI / 2, 0, 0)))
for k in range(6):
    a = k / 6 * 2 * PI
    add('p5_shield', box(0.02, 0.26, 0.015), 'silver', TRS((math.sin(a) * 0.15, math.cos(a) * 0.15, 0.04), (0, 0, -a)))
add('p5_shield', sphere(0.06, 14, 10), 'dark', TRS((0, 0, 0.05), scl=(1, 1, 0.5)))
for k, (mat, r) in enumerate((('gemR', 0.035), ('gemB', 0.03), ('gemY', 0.026), ('dark', 0.022))):
    a = k / 4 * 2 * PI + 0.4
    add('p5_shield', sphere(r, 10, 8), mat, TRS((math.sin(a) * 0.33, math.cos(a) * 0.33, 0.05)))

objs = build_objects(MATS, 'palace', smooth_parts=('lk_hills',))
BIG = ('lk_shore', 'lk_hills', 'lk_palace')
bake_ao({k: v for k, v in objs.items() if k not in BIG}, distance=0.4, samples=24, floor=0.6)
colour_pass(objs['lk_shore'], lambda p: 0.78 + 0.22 * fbm((p[0], 0, p[2]), 0.08, 3))
colour_pass(objs['lk_hills'], lambda p: 0.7 + 0.3 * min(1.0, max(0.0, p[1] / 30.0)))
colour_pass(objs['lk_palace'], lambda p: 0.7 + 0.3 * min(1.0, max(0.0, p[1] / 20.0)))
export_glb(objs, GLB)
if RENDERS:
    pl = [('lk_shore', TRS()), ('lk_hills', TRS()), ('lk_palace', TRS()), ('lk_palace', TRS((0, 0, 0), scl=(1, -1, 1)))]
    pl += [('p5_wall', TRS((200, 0, 0))), ('p5_colL', TRS((202, 0, 3))), ('p5_colR', TRS((202, 0, -3))), ('p5_mirror', TRS((203, 0, 0))), ('p5_plinth', TRS((205, 0, 0))), ('p5_scope', TRS((205, 0, 3))), ('p5_shield', TRS((206.5, 1.2, 0), scl=2))]
    preview(objs, pl, [('lake_view.png', (0, 4, 30), (0, 8, -95), 32), ('pieces.png', (210, 2.5, 7), (204, 1.5, 0), 40)], RENDERS, sky='#8aa0c0', ground=None)
    print('RENDERS', RENDERS)
