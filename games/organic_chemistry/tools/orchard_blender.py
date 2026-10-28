"""World 8's landscape and dungeon pieces for The Legend of Valence, exported to public/models/orchard.glb.
Modeled on assets/locations/world-8-reagent-orchards.png: a shady orchard of old broad trees hung with glowing
flasks and test tubes, crystals in the grass, and Borana's tall glass-and-brass tower wrapped in a glass spiral.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/orchard_blender.py -- <glb_path> <render_dir>

Parts (world frame unless noted):
  or_ground   the walkable orchard floor (y = 0), x −50…50, z −50…50: grass and moss
  or_hills    the far wood round the orchard
  or_path     the path from the north gate to the glass tower's door (south)
  or_tree     one flask tree (own frame, trunk at origin, about 9 m tall), flasks hanging from its boughs
  or_tower    Borana's glass tower (own frame, door facing +z)
  or_crystal  a crystal cluster (own frame)
  g8_wall     a greenhouse wall run 4 m along z, inner face at x = 0 facing +x: brass frame, glass panes, planters
  g8_altar    a reagent altar: a stone basin on a brass stand (own frame)
  g8_tree     a small flask tree for the dungeon (own frame, about 4 m tall)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'orchard.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'grass': ('#5a7a3a', 0, 0.95), 'moss': ('#4a6a2a', 0, 0.95), 'path': ('#8a7a5a', 0, 1.0), 'far': ('#3a5a3a', 0, 1.0),
    'bark': ('#5a3e2a', 0, 0.9), 'barkDark': ('#3a2a1a', 0, 0.9), 'leaf': ('#4a7a3a', 0, 0.8), 'leafDark': ('#2e5a2a', 0, 0.85),
    'glass': ('#d8f0ec', 0.1, 0.08), 'brass': ('#c8a050', 0.85, 0.3), 'stone': ('#8a8478', 0, 0.85), 'roof': ('#6a8a7a', 0.6, 0.35),
    'window': ('#ffdf9a', 0, 0.3, 2.2), 'crystal': ('#e8e0a0', 0.1, 0.15, 0.8),
    'fR': ('#ff5a5a', 0, 0.15, 1.5), 'fB': ('#5ad0ff', 0, 0.15, 1.5), 'fP': ('#b05aff', 0, 0.15, 1.5), 'fG': ('#7aff7a', 0, 0.15, 1.5), 'fY': ('#ffd060', 0, 0.15, 1.5),
    'soil': ('#4a3424', 0, 1.0), 'basin': ('#6a6a72', 0, 0.6),
}
FL = ['fR', 'fB', 'fP', 'fG', 'fY']

# ================================================================ ground, far wood, path
g = bmesh.new()
bmesh.ops.create_grid(g, x_segments=50, y_segments=50, size=50)
bmesh.ops.rotate(g, verts=g.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-PI / 2, 3, 'X'))
add('or_ground', g, 'grass', smooth=False)
for i in range(70):
    a = i / 70 * 2 * PI
    r = 62 + 10 * hash3(i, 1, 1)
    add('or_hills', sphere(1.0, 10, 8), 'far' if i % 2 else 'leafDark', TRS((math.sin(a) * r, 7 + 4 * hash3(i, 2, 2), math.cos(a) * r), scl=(8, 9 + 4 * hash3(i, 3, 3), 8)))
    add('or_hills', cyl(0.8, 0.6, 9, 8), 'barkDark', TRS((math.sin(a) * r, 2, math.cos(a) * r)))
road, edge = ribbon([(0, 49), (2, 34), (-3, 18), (0, 2), (0, -30)], 1.7, 0.5, 0.02, 7)
add('or_path', road, 'path', smooth=False)
add('or_path', edge, 'moss', smooth=False)

# ================================================================ a flask tree: a thick twisted trunk, broad boughs, leaf clouds, hanging flasks
def flask(seg, p, k, scale=1.0):
    m = FL[k % 5]
    add(seg, tube([tuple(p + Vector((0, 0.5 * scale, 0))), tuple(p + Vector((0, 0.2 * scale, 0)))], [0.008, 0.008], 4), 'barkDark')
    if k % 3 == 0:
        add(seg, sphere(0.16 * scale, 12, 10), 'glass', TRS(tuple(p)))
        add(seg, sphere(0.13 * scale, 10, 8), m, TRS(tuple(p + Vector((0, -0.03 * scale, 0)))))
        add(seg, cyl(0.04 * scale, 0.04 * scale, 0.14 * scale, 8), 'glass', TRS(tuple(p + Vector((0, 0.17 * scale, 0)))))
    else:
        add(seg, cyl(0.045 * scale, 0.045 * scale, 0.36 * scale, 8), 'glass', TRS(tuple(p)))
        add(seg, cyl(0.038 * scale, 0.038 * scale, 0.22 * scale, 8), m, TRS(tuple(p + Vector((0, -0.06 * scale, 0)))))
def tree(seg, h, seed, scale=1.0):
    add(seg, deform(lathe([(1.0, 0.0), (0.7, 0.1), (0.55, 0.4), (0.5, 0.8), (0.45, 1.0)], 12, False, False), lambda v: (v.x + 0.12 * math.sin(v.y * 5 + seed), v.y, v.z + 0.1 * math.cos(v.y * 4 + seed))), 'bark', TRS((0, 0, 0), scl=(0.6 * scale, h * 0.45, 0.6 * scale)))
    flasks = []
    for b in range(5):
        a = b / 5 * 2 * PI + seed
        p0 = Vector((0, h * 0.42, 0)); p1 = Vector((math.sin(a) * 2.2 * scale, h * 0.58, math.cos(a) * 2.2 * scale)); p2 = Vector((math.sin(a) * 3.6 * scale, h * 0.62, math.cos(a) * 3.6 * scale))
        add(seg, tube([tuple(p0), tuple(p1), tuple(p2)], [0.28 * scale, 0.16 * scale, 0.06 * scale], 8), 'bark')
        add(seg, sphere(1.0, 12, 8), 'leaf' if b % 2 else 'leafDark', TRS(tuple(p2 + Vector((0, 0.9 * scale, 0))), scl=(2.0 * scale, 1.2 * scale, 2.0 * scale)))
        for f in range(3):
            q = p1.lerp(p2, 0.3 + 0.3 * f) + Vector((0, -0.55 * scale, 0))
            flasks.append(q)
    add(seg, sphere(1.0, 14, 10), 'leaf', TRS((0, h * 0.82, 0), scl=(3.0 * scale, 1.8 * scale, 3.0 * scale)))
    for k, q in enumerate(flasks):
        flask(seg, q, k + int(seed * 7), scale)
tree('or_tree', 9.0, 0.3)
tree('g8_tree', 4.4, 1.1, 0.5)

# ================================================================ Borana's tower: tiers of glass and brass, a glass spiral, a domed cap
TH = 26.0
for k, (r, y0, y1) in enumerate(((4.2, 0, 7), (3.4, 7, 13), (2.8, 13, 18.5), (2.2, 18.5, 23))):
    add('or_tower', cyl(r, r * 0.95, y1 - y0, 24), 'glass', TRS((0, (y0 + y1) / 2, 0)))
    for j in range(8):
        a = j / 8 * 2 * PI
        add('or_tower', cyl(0.12, 0.12, y1 - y0, 8), 'brass', TRS((math.sin(a) * r, (y0 + y1) / 2, math.cos(a) * r)))
    add('or_tower', torus(r + 0.3, 0.18, 32, 6), 'brass', TRS((0, y1, 0)))
    add('or_tower', cyl(r + 0.6, r + 0.6, 0.25, 32), 'brass', TRS((0, y1 + 0.1, 0)))
    add('or_tower', cyl(r * 0.6, r * 0.6, (y1 - y0) * 0.8, 16), 'window', TRS((0, (y0 + y1) / 2, 0)))
add('or_tower', deform(sphere(1.0, 24, 12), lambda v: (v.x, max(0.0, v.y), v.z)), 'roof', TRS((0, 23, 0), scl=(2.4, 2.6, 2.4)))
add('or_tower', cyl(0.12, 0.02, 3, 8), 'brass', TRS((0, 27, 0)))
pts, rad = [], []
for k in range(200):
    t = k / 199
    a = t * 2.6 * 2 * PI
    y = 1 + t * 21
    r = 4.6 - 2.2 * t
    pts.append((math.sin(a) * r, y, math.cos(a) * r)); rad.append(0.32)
add('or_tower', tube(pts, rad, 10), 'glass')
add('or_tower', box(2.0, 3.2, 0.3), 'brass', TRS((0, 1.6, 4.2)), [BEVEL(0.05, 1)])
add('or_tower', box(1.5, 2.8, 0.1), 'window', TRS((0, 1.5, 4.36)))
for s in (-1, 1):
    add('or_tower', cyl(0.6, 0.5, 4.5, 12), 'brass', TRS((s * 3.2, 2.25, 3.2)))
    add('or_tower', cyl(0.6, 0.0, 1.4, 12), 'roof', TRS((s * 3.2, 5.2, 3.2)))
for k in range(5):
    add('or_crystal', cyl(0.18, 0.0, 0.8 + 0.6 * hash3(k, 1, 1), 6), 'crystal', TRS((0.2 * math.sin(k * 1.3), 0.3, 0.2 * math.cos(k * 1.3)), (0.4 * math.sin(k * 2.1), 0, 0.4 * math.cos(k * 2.1))), smooth=False)

# ================================================================ inside the glasshouse
add('g8_wall', box(0.6, 8.0, 4.0), 'stone', TRS((-0.3, 4.0, 0)))
add('g8_wall', box(0.15, 7.4, 3.8), 'glass', TRS((0.08, 4.3, 0)))
for z in (-1.9, 0, 1.9):
    add('g8_wall', box(0.18, 8.0, 0.12), 'brass', TRS((0.1, 4.0, z)))
for y in (2.0, 4.6, 7.2):
    add('g8_wall', box(0.18, 0.1, 4.0), 'brass', TRS((0.1, y, 0)))
add('g8_wall', box(0.8, 0.6, 3.6), 'soil', TRS((0.45, 0.3, 0)), [BEVEL(0.04, 1)])  # a planter
for k in range(4):
    add('g8_wall', sphere(0.35, 10, 8), 'leaf' if k % 2 else 'leafDark', TRS((0.5, 0.8, -1.3 + k * 0.85), scl=(1, 0.8, 1)))
add('g8_altar', cyl(0.25, 0.32, 0.9, 12), 'brass', TRS((0, 0.45, 0)))
add('g8_altar', cyl(0.6, 0.6, 0.12, 20), 'brass', TRS((0, 0.06, 0)))
add('g8_altar', lathe([(0.2, 0.0), (0.7, 0.1), (0.75, 0.35), (0.65, 0.4)], 24, False, True), 'basin', TRS((0, 0.9, 0)), [SOLID(0.04, 0)])

objs = build_objects(MATS, 'orchard')
BIG = ('or_ground', 'or_hills', 'or_path')
bake_ao({k: v for k, v in objs.items() if k not in BIG}, distance=0.4, samples=24, floor=0.6)
colour_pass(objs['or_ground'], lambda p: 0.75 + 0.25 * fbm((p[0], 0, p[2]), 0.08, 3))
export_glb(objs, GLB)
if RENDERS:
    pl = [('or_ground', TRS()), ('or_hills', TRS()), ('or_path', TRS()), ('or_tower', TRS((0, 0, -36)))]
    for k in range(10):
        pl.append(('or_tree', TRS((-14 + (k % 2) * 28 + 3 * hash3(k, 4, 4), 0, 30 - k * 6), (0, k, 0))))
    pl += [('g8_altar', TRS((4, 0, 32))), ('g8_tree', TRS((7, 0, 30)))]
    preview(objs, pl, [('orchard_view.png', (1, 3, 44), (0, 9, -30), 42)], RENDERS, sky='#8ab098', ground=None)
    print('RENDERS', RENDERS)
