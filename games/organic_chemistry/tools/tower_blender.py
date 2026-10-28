"""World 7's landscape and dungeon pieces for The Legend of Valence, exported to public/models/tower.glb.
Modeled on assets/locations/world-7-tower-of-addition.png: endless golden wheat at sunset, a tall round stone
tower wrapped by a glowing cyan double-bar spiral (its floors joined by double bonds), a thatched farmhouse and a
windmill at its foot, glowing motes over the fields.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/tower_blender.py -- <glb_path> <render_dir>

Parts (world frame unless noted):
  pl_ground  the walkable plain (y = 0), x −50…50, z −50…50: golden earth and stubble
  pl_hills   low hills, hedgerows and a far tree line round the plain
  pl_road    the dirt road from the west gate past the farm to the tower door (north)
  pl_wheat   one tuft of standing wheat (own frame, about 1.1 m tall, 1.6 m across)
  pl_farm    Markov's farmhouse (own frame, door facing +z)
  pl_mill    the windmill's body (own frame); pl_sails its sails (hub at origin, they turn about z)
  pl_tower   the Tower of Addition (own frame, door facing +z, radius 6, about 42 m tall) with its cyan spiral
  t7_wall    an interior wall run 4 m along z, inner face at x = 0 facing +x: sandstone courses, a slit window, sacks
  t7_crate   a harvest crate with a round dial on its front (own frame, front facing +z)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'tower.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'earth': ('#b8904a', 0, 0.95), 'stubble': ('#d8b060', 0, 0.95), 'grass': ('#8a9a4a', 0, 0.95), 'hedge': ('#4a6a30', 0, 0.9),
    'far': ('#8a6a5a', 0, 1.0), 'road': ('#9a7a54', 0, 1.0), 'wheat': ('#e8c050', 0, 0.7), 'wheatDark': ('#b88a30', 0, 0.8),
    'stone': ('#9a8a7a', 0, 0.85), 'stoneDark': ('#6a5a4e', 0, 0.9), 'stoneLight': ('#b8a890', 0, 0.8), 'thatch': ('#a8844a', 0, 0.95),
    'wood': ('#6a4428', 0, 0.8), 'woodDark': ('#4a2e1a', 0, 0.85), 'plaster': ('#e8dcc0', 0, 0.9), 'window': ('#ffcf7a', 0, 0.3, 2.0),
    'spiral': ('#5ff0ff', 0, 0.2, 2.8), 'sail': ('#e8dcc8', 0, 0.9), 'sack': ('#c8b088', 0, 0.95), 'brass': ('#c8a050', 0.8, 0.35),
    'dial': ('#2a2430', 0, 0.6),
}

# ================================================================ the plain
g = bmesh.new()
bmesh.ops.create_grid(g, x_segments=50, y_segments=50, size=50)
bmesh.ops.rotate(g, verts=g.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-PI / 2, 3, 'X'))
add('pl_ground', g, 'earth', smooth=False)

# ================================================================ hills, hedgerows, the far tree line
for i in range(26):
    a = i / 26 * 2 * PI
    r = 72 + 14 * hash3(i, 4, 4)
    hb = deform(sphere(1.0, 16, 8), lambda v: (v.x, max(0.0, v.y), v.z))
    add('pl_hills', hb, 'stubble' if i % 3 else 'grass', TRS((math.sin(a) * r, -1, math.cos(a) * r), (0, a, 0), scl=(30, 9 + 8 * hash3(i, 5, 5), 18)))
for i in range(60):
    a = i / 60 * 2 * PI
    r = 110 + 10 * hash3(i, 6, 6)
    add('pl_hills', sphere(1.0, 10, 6), 'hedge', TRS((math.sin(a) * r, 5, math.cos(a) * r), scl=(6 + 3 * hash3(i, 7, 7), 6 + 4 * hash3(i, 8, 8), 6)))
for (x0, z0, x1, z1) in ((-48, 20, -10, 20), (10, 24, 48, 24), (-48, -20, -16, -20), (16, -18, 48, -18)):  # hedgerows between fields
    n = int(math.hypot(x1 - x0, z1 - z0) / 2.2)
    for k in range(n):
        t = k / max(1, n - 1)
        add('pl_hills', sphere(1.0, 8, 6), 'hedge', TRS((x0 + (x1 - x0) * t, 0.6, z0 + (z1 - z0) * t), scl=(1.3, 0.9 + 0.3 * hash3(k, 9, int(x0)), 1.1)))

# ================================================================ the road: from the west gate past the farm to the tower door
road, edge = ribbon([(-49, 6), (-34, 8), (-22, 4), (-10, -6), (-2, -22), (0, -38)], 1.8, 0.5, 0.02, 7)
add('pl_road', road, 'road', smooth=False)
add('pl_road', edge, 'stubble', smooth=False)

# ================================================================ a tuft of wheat: stalks with grain heads, bending a little
for k in range(22):
    a = k / 22 * 2 * PI + hash3(k, 1, 2)
    r = 0.15 + 0.55 * hash3(k, 2, 3)
    x, z = math.cos(a) * r, math.sin(a) * r
    h = 0.85 + 0.3 * hash3(k, 3, 4)
    lean = Vector((0.08 * hash3(k, 4, 5) - 0.04, 0, 0.12))
    top = Vector((x, h, z)) + lean
    add('pl_wheat', tube([(x, 0, z), (x + lean.x * 0.4, h * 0.6, z + lean.z * 0.4), tuple(top)], [0.012, 0.01, 0.008], 4), 'wheatDark', smooth=False)
    head = capsule(0.028, 0.13, 6, 4)
    add('pl_wheat', head, 'wheat', Matrix.Translation(top + Vector((0, 0.07, 0.03))) @ TRS((0, 0, 0), (0.4, a, 0)), smooth=False)

# ================================================================ Markov's farmhouse: plaster walls, timber frame, deep thatched roof
add('pl_farm', box(6.4, 3.0, 4.6), 'plaster', TRS((0, 1.5, 0)), [BEVEL(0.06, 1)])
for x in (-3.15, -1.0, 1.0, 3.15):
    add('pl_farm', box(0.2, 3.0, 4.7), 'woodDark', TRS((x, 1.5, 0)))
add('pl_farm', box(6.5, 0.2, 4.7), 'woodDark', TRS((0, 1.6, 0)))
roof = bmesh.new()
pts = [(-3.8, 2.9, -2.9), (3.8, 2.9, -2.9), (3.8, 2.9, 2.9), (-3.8, 2.9, 2.9), (-3.2, 5.4, 0), (3.2, 5.4, 0)]
vs = [roof.verts.new(p) for p in pts]
for f in ((0, 4, 5, 1), (3, 2, 5, 4), (0, 3, 4), (1, 5, 2)):
    roof.faces.new([vs[i] for i in f])
bmesh.ops.recalc_face_normals(roof, faces=roof.faces)
add('pl_farm', roof, 'thatch', None, [SOLID(0.35, 0)], smooth=False)
add('pl_farm', box(1.1, 2.0, 0.12), 'wood', TRS((0.0, 1.0, 2.32)), [BEVEL(0.03, 1)])
for x in (-2.0, 2.0):
    add('pl_farm', box(0.9, 0.8, 0.1), 'window', TRS((x, 1.9, 2.32)))
add('pl_farm', box(0.8, 2.2, 0.8), 'stoneDark', TRS((2.4, 5.0, -0.6)), [BEVEL(0.05, 1)])  # chimney
for k in range(5):  # a fence along the front
    add('pl_farm', box(0.12, 1.0, 0.12), 'wood', TRS((-4.5 + k * 2.2 + (1.2 if k > 1 else 0), 0.5, 4.2)))
add('pl_farm', box(4.0, 0.1, 0.08), 'wood', TRS((-3.4, 0.8, 4.2)))
add('pl_farm', box(4.0, 0.1, 0.08), 'wood', TRS((3.4, 0.8, 4.2)))
for k in range(3):  # hay bales
    add('pl_farm', cyl(0.6, 0.6, 1.0, 16), 'thatch', TRS((-4.6 + k * 0.4, 0.6, -1.0 + k * 1.3), (PI / 2, 0.3 * k, 0)))

# ================================================================ the windmill
add('pl_mill', cyl(2.0, 1.4, 7.0, 16), 'plaster', TRS((0, 3.5, 0)))
add('pl_mill', cyl(1.7, 0.2, 2.2, 16), 'thatch', TRS((0, 8.1, 0)))
add('pl_mill', box(1.0, 1.8, 0.1), 'wood', TRS((0, 0.9, 1.95)), [BEVEL(0.03, 1)])
add('pl_mill', box(0.6, 0.6, 0.1), 'window', TRS((0, 4.2, 1.72)))
add('pl_mill', cyl(0.2, 0.2, 1.0, 10), 'woodDark', TRS((0, 6.8, 1.6), (PI / 2, 0, 0)))
add('pl_sails', cyl(0.3, 0.3, 0.3, 12), 'woodDark', TRS((0, 0, 0), (PI / 2, 0, 0)))
for k in range(4):
    a = k * PI / 2
    add('pl_sails', box(0.18, 4.8, 0.08), 'woodDark', TRS((math.sin(a) * 2.4, math.cos(a) * 2.4, 0), (0, 0, -a)))
    add('pl_sails', box(1.1, 3.6, 0.04), 'sail', TRS((math.sin(a) * 2.9 + math.cos(a) * 0.62, math.cos(a) * 2.9 - math.sin(a) * 0.62, 0.05), (0, 0, -a)))

# ================================================================ the Tower of Addition: a round sandstone tower, banded every floor,
# lit slit windows, crenellated top, a door facing +z, and the cyan double-bar spiral winding up it
R, H = 6.0, 42.0
add('pl_tower', cyl(R, R * 0.92, H, 40), 'stone', TRS((0, H / 2, 0)))
for k in range(1, 7):
    add('pl_tower', torus(R * (1 - 0.08 * k / 7) + 0.1, 0.22, 40, 6), 'stoneLight', TRS((0, k * H / 7, 0)))
add('pl_tower', cyl(R * 0.98, R * 0.98, 1.0, 40), 'stoneLight', TRS((0, H + 0.5, 0)))
for k in range(16):
    a = k / 16 * 2 * PI
    add('pl_tower', box(1.2, 1.3, 0.8), 'stoneLight', TRS((math.sin(a) * R * 0.95, H + 1.6, math.cos(a) * R * 0.95), (0, a, 0)), [BEVEL(0.05, 1)])
for k in range(10):
    a = k * 2.4 + 0.5
    y = 6 + k * 3.5
    rr = R * (1 - 0.08 * y / H)
    add('pl_tower', box(0.5, 1.2, 0.3), 'window', TRS((math.sin(a) * rr, y, math.cos(a) * rr), (0, a, 0)))
add('pl_tower', box(2.6, 3.6, 0.6), 'woodDark', TRS((0, 1.8, R - 0.1)), [BEVEL(0.05, 1)])
add('pl_tower', box(3.8, 0.7, 0.9), 'stoneLight', TRS((0, 3.95, R)), [BEVEL(0.05, 1)])
for s in (-1, 1):
    add('pl_tower', box(0.6, 3.6, 0.8), 'stoneLight', TRS((s * 1.6, 1.8, R)))
# the spiral: two parallel glowing bars (a double bond) wound three times round, with rungs
for b in (0.0, 0.5):
    pts, rad = [], []
    for k in range(240):
        t = k / 239
        a = t * 3.2 * 2 * PI
        y = 8 + t * 30 + b
        rr = R * (1 - 0.08 * y / H) + 1.0
        pts.append((math.sin(a) * rr, y, math.cos(a) * rr))
        rad.append(0.16)
    add('pl_tower', tube(pts, rad, 8), 'spiral')
for k in range(0, 240, 12):
    t = k / 239
    a = t * 3.2 * 2 * PI
    y = 8 + t * 30
    rr = R * (1 - 0.08 * y / H) + 1.0
    add('pl_tower', cyl(0.08, 0.08, 0.6, 6), 'stoneDark', TRS((math.sin(a) * rr, y + 0.25, math.cos(a) * rr)))

# ================================================================ inside: a sandstone wall run with a slit window and grain sacks
add('t7_wall', box(2.0, 8.0, 4.0), 'stone', TRS((-1.0, 4.0, 0)))
for k in range(6):
    add('t7_wall', box(0.12, 0.08, 4.0), 'stoneDark', TRS((0.02, 0.6 + k * 1.3, 0)))
add('t7_wall', box(0.1, 1.6, 0.3), 'window', TRS((0.02, 4.2, 0)))
add('t7_wall', box(0.3, 0.3, 1.2), 'stoneLight', TRS((0.12, 3.3, 0)))
for k in range(2):
    add('t7_wall', deform(sphere(1.0, 12, 8), lambda v: (v.x * 0.35, max(-0.3, v.y * 0.42), v.z * 0.32)), 'sack', TRS((0.4, 0.38, -1.3 + k * 0.7)))
add('t7_wall', box(0.5, 0.5, 4.0), 'stoneLight', TRS((0.15, 7.8, 0)))

# ================================================================ a harvest crate with a dial on its front
add('t7_crate', box(1.4, 1.2, 1.2), 'wood', TRS((0, 0.6, 0)), [BEVEL(0.04, 1)])
for y in (0.2, 0.6, 1.0):
    add('t7_crate', box(1.45, 0.1, 1.25), 'woodDark', TRS((0, y, 0)))
add('t7_crate', cyl(0.42, 0.42, 0.06, 32), 'dial', TRS((0, 1.0, 0.63), (PI / 2, 0, 0)))
add('t7_crate', torus(0.42, 0.03, 32, 6), 'brass', TRS((0, 1.0, 0.65), (PI / 2, 0, 0)))
for k in range(5):
    a = -PI / 2 + k * PI / 4
    add('t7_crate', box(0.04, 0.1, 0.02), 'brass', TRS((math.sin(a) * 0.34, 1.0 + math.cos(a) * 0.34, 0.67), (0, 0, -a)))
add('t7_crate', deform(sphere(1.0, 12, 8), lambda v: (v.x * 0.5, max(-0.4, v.y * 0.5), v.z * 0.45)), 'wheatDark', TRS((0, 1.25, -0.1), scl=(1, 0.5, 1)))

objs = build_objects(MATS, 'tower')
BIG = ('pl_ground', 'pl_hills', 'pl_road', 'pl_wheat')
bake_ao({k: v for k, v in objs.items() if k not in BIG}, distance=0.4, samples=24, floor=0.6)
colour_pass(objs['pl_ground'], lambda p: 0.8 + 0.2 * fbm((p[0], 0, p[2]), 0.08, 3))
colour_pass(objs['pl_road'], lambda p: 0.85 + 0.15 * fbm((p[0], 0, p[2]), 0.4, 2))
export_glb(objs, GLB)
if RENDERS:
    pl = [('pl_ground', TRS()), ('pl_hills', TRS()), ('pl_road', TRS()), ('pl_tower', TRS((0, 0, -48))), ('pl_farm', TRS((-22, 0, -4))), ('pl_mill', TRS((-30, 0, -14))), ('pl_sails', TRS((-30, 6.8, -12.1)))]
    for k in range(40):
        pl.append(('pl_wheat', TRS((-30 + (k % 10) * 6 + 2 * hash3(k, 1, 1), 0, 10 + (k // 10) * 5))))
    pl += [('t7_crate', TRS((8, 0, 20))), ('t7_wall', TRS((12, 0, 20)))]
    preview(objs, pl, [('plains_view.png', (2, 4, 30), (0, 14, -50), 40), ('tower_bits.png', (10, 2, 25), (10, 1, 20), 45)], RENDERS, sky='#e8a070', ground=None)
    print('RENDERS', RENDERS)
