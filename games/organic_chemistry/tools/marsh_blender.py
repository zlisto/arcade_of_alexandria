"""World 10's landscape and dungeon pieces for The Legend of Valence, exported to public/models/marsh.glb.
Modeled on assets/locations/world-10-halogen-marsh.png: a misty marsh of dead twisted trees, reeds and cattails,
brown bromine pools, a wooden stilt hut with a glowing ring hung over its door, wolves' eyes in the grass.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/marsh_blender.py -- <glb_path> <render_dir>

Parts (world frame unless noted):
  ms_ground  the walkable marsh (y = 0), x −50…50, z −50…50: dark grass and mud
  ms_pools   bromine pools (brown) and chlorine pools (green), a hair below the ground, and the far trees
  ms_path    a boardwalk path from the north gate to the Sunken Forge (south)
  ms_tree    a dead twisted tree (own frame)
  ms_reeds   a clump of reeds and cattails (own frame)
  ms_hut     Magnus's stilt hut (own frame, door facing +z), with a glowing ring over the door
  ms_forge   the Sunken Forge's mouth: a mossy stone arch half sunk in the bog (own frame, opening facing +z, 6 m wide)
  f10_wall   a forge wall run 4 m along z, inner face at x = 0 facing +x: wet stone, moss, a dripping pipe
  f10_stone  a bond stepping-stone (own frame, top at y = 0.3)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'marsh.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'grass': ('#3e4a2e', 0, 0.95), 'mud': ('#3a3024', 0, 1.0), 'bromine': ('#7a3a1e', 0.3, 0.15), 'chlorine': ('#7a9a3a', 0.3, 0.15),
    'wood': ('#4a3a2a', 0, 0.9), 'woodDark': ('#2e241a', 0, 0.9), 'bark': ('#3a3228', 0, 0.95), 'reed': ('#6a7a3a', 0, 0.9),
    'cattail': ('#4a2e1a', 0, 0.9), 'stone': ('#5a5e56', 0, 0.9), 'moss': ('#4a6a2a', 0, 0.95), 'ring': ('#e8f0ff', 0, 0.2, 3.0),
    'window': ('#ffcf7a', 0, 0.3, 2.0), 'far': ('#2e3a2e', 0, 1.0), 'rust': ('#7a4a2a', 0.6, 0.6), 'drip': ('#7aff9a', 0, 0.2, 1.2),
}

g = bmesh.new()
bmesh.ops.create_grid(g, x_segments=50, y_segments=50, size=50)
bmesh.ops.rotate(g, verts=g.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-PI / 2, 3, 'X'))
add('ms_ground', g, 'grass', smooth=False)
for i in range(18):  # mud patches
    x, z = -44 + 88 * hash3(i, 1, 1), -44 + 88 * hash3(i, 2, 2)
    add('ms_ground', cyl(2 + 3 * hash3(i, 3, 3), 2 + 3 * hash3(i, 3, 3), 0.02, 14), 'mud', TRS((x, 0.01, z)))
for i, (x, z, r, m) in enumerate([(-24, 18, 6, 'bromine'), (22, 24, 5, 'chlorine'), (-30, -16, 7, 'bromine'), (26, -20, 6, 'bromine'), (8, 36, 4, 'chlorine'), (-12, -34, 5, 'chlorine')]):
    add('ms_pools', deform(cyl(r, r, 0.02, 24), lambda v, i=i: (v.x * (1 + 0.15 * math.sin(math.atan2(v.z, v.x) * 3 + i)), v.y, v.z)), m, TRS((x, 0.03, z)))
for i in range(60):
    a = i / 60 * 2 * PI
    r = 64 + 10 * hash3(i, 4, 4)
    add('ms_pools', cyl(0.5, 0.3, 14, 6), 'far', TRS((math.sin(a) * r, 6, math.cos(a) * r)), smooth=False)
    add('ms_pools', sphere(1.0, 8, 6), 'far', TRS((math.sin(a) * r, 13 + 3 * hash3(i, 5, 5), math.cos(a) * r), scl=(5, 3, 5)), smooth=False)
# the boardwalk: planks along a gentle path north → south (the forge at z −44)
path = [(0, 49), (3, 34), (-2, 18), (2, 2), (-1, -16), (0, -40)]
for i in range(len(path) - 1):
    A, B = Vector((path[i][0], 0, path[i][1])), Vector((path[i + 1][0], 0, path[i + 1][1]))
    d = B - A; L = d.length; ang = math.atan2(d.x, d.z)
    n = int(L / 0.6)
    for k in range(n):
        p = A.lerp(B, (k + 0.5) / n)
        add('ms_path', box(2.2, 0.08, 0.5), 'wood' if k % 3 else 'woodDark', TRS((p.x, 0.06, p.z), (0, ang, 0)))
# a dead twisted tree
add('ms_tree', deform(lathe([(0.6, 0.0), (0.4, 0.4), (0.3, 2.0), (0.25, 3.5), (0.12, 5.0)], 10, False, True), lambda v: (v.x + 0.3 * math.sin(v.y * 0.8), v.y, v.z + 0.2 * math.cos(v.y))), 'bark')
for b in range(5):
    a = b / 5 * 2 * PI + 0.3
    p0 = Vector((0.2 * math.sin(2.5 * 0.8) + 0.0, 2.2 + b * 0.5, 0))
    p1 = p0 + Vector((math.sin(a) * 1.4, 0.9, math.cos(a) * 1.4))
    p2 = p1 + Vector((math.sin(a + 0.5) * 1.2, 0.4 - 0.6 * (b % 2), math.cos(a + 0.5) * 1.2))
    add('ms_tree', tube([tuple(p0), tuple(p1), tuple(p2)], [0.12, 0.07, 0.02], 6), 'bark')
for k in range(5):
    add('ms_tree', tube([(0.1 * math.sin(k), 0.1, 0.1 * math.cos(k)), (0.9 * math.sin(k * 1.3), -0.2, 0.9 * math.cos(k * 1.3))], [0.14, 0.04], 6), 'bark')
# reeds and cattails
for k in range(14):
    a = hash3(k, 6, 6) * 2 * PI; r = 0.4 * hash3(k, 7, 7)
    x, z = math.sin(a) * r, math.cos(a) * r
    h = 0.9 + 0.7 * hash3(k, 8, 8)
    add('ms_reeds', tube([(x, 0, z), (x + 0.1 * math.sin(a), h, z + 0.1 * math.cos(a))], [0.015, 0.006], 4), 'reed', smooth=False)
    if k % 3 == 0:
        add('ms_reeds', capsule(0.035, 0.18, 6, 4), 'cattail', TRS((x + 0.08 * math.sin(a), h * 0.85, z + 0.08 * math.cos(a))), smooth=False)
# Magnus's stilt hut
for sx in (-1, 1):
    for sz in (-1, 1):
        add('ms_hut', cyl(0.14, 0.14, 1.4, 8), 'woodDark', TRS((sx * 2.0, 0.7, sz * 1.6)))
add('ms_hut', box(4.6, 0.2, 3.8), 'wood', TRS((0, 1.4, 0)))
add('ms_hut', box(4.0, 2.6, 3.2), 'wood', TRS((0, 2.8, -0.1)), [BEVEL(0.04, 1)])
for k in range(6):
    add('ms_hut', box(4.05, 0.06, 3.25), 'woodDark', TRS((0, 1.7 + k * 0.42, -0.1)))
roof = bmesh.new()
pts = [(-2.5, 4.0, -2.1), (2.5, 4.0, -2.1), (2.5, 4.0, 1.9), (-2.5, 4.0, 1.9), (0, 5.8, -2.1), (0, 5.8, 1.9)]
vs = [roof.verts.new(p) for p in pts]
for f in ((0, 4, 5, 3), (1, 2, 5, 4), (0, 1, 4), (3, 5, 2)):
    roof.faces.new([vs[i] for i in f])
bmesh.ops.recalc_face_normals(roof, faces=roof.faces)
add('ms_hut', roof, 'woodDark', None, [SOLID(0.12, 0)], smooth=False)
add('ms_hut', box(1.0, 1.8, 0.1), 'woodDark', TRS((0.6, 2.4, 1.52)))
add('ms_hut', box(0.7, 0.6, 0.1), 'window', TRS((-1.2, 3.0, 1.52)))
add('ms_hut', torus(0.45, 0.06, 32, 8), 'ring', TRS((0.6, 3.9, 1.7), (PI / 2, 0, 0)))
for k in range(4):  # steps up to the porch
    add('ms_hut', box(1.2, 0.1, 0.4), 'wood', TRS((0.6, 0.3 + k * 0.32, 2.4 + (3 - k) * 0.35)))
# the Sunken Forge's mouth
for s_ in (-1, 1):
    add('ms_forge', box(1.6, 6.0, 2.0), 'stone', TRS((s_ * 3.8, 3.0, 0)), [BEVEL(0.15, 1)])
    add('ms_forge', rock_bm(1.2, 40 + s_, 2, 0.3, 0.6), 'moss', TRS((s_ * 3.9, 6.0, 0.4), scl=(1.2, 0.5, 1.2)), smooth=False)
add('ms_forge', box(9.2, 1.4, 2.2), 'stone', TRS((0, 6.6, 0)), [BEVEL(0.15, 1)])
add('ms_forge', box(6.0, 6.0, 0.5), 'woodDark', TRS((0, 3.0, -0.9)))
add('ms_forge', box(1.6, 1.6, 0.1), 'drip', TRS((0, 6.6, 1.12)))
# inside: wet stone with moss and a dripping pipe
add('f10_wall', box(2.0, 8.0, 4.0), 'stone', TRS((-1.0, 4.0, 0)))
for k in range(5):
    add('f10_wall', rock_bm(0.5 + 0.3 * hash3(k, 9, 9), 200 + k, 2, 0.3, 0.5), 'moss', TRS((0.15, 0.5 + k * 1.5, -1.5 + 3 * hash3(k, 10, 10)), scl=(0.5, 1, 1.2)), smooth=False)
add('f10_wall', cyl(0.12, 0.12, 4.0, 10), 'rust', TRS((0.25, 6.5, 0), (PI / 2, 0, 0)))
add('f10_wall', cyl(0.12, 0.12, 0.6, 10), 'rust', TRS((0.25, 6.2, 0.6)))
add('f10_wall', sphere(0.08, 8, 6), 'drip', TRS((0.25, 5.7, 0.6)))
add('f10_stone', cyl(0.9, 1.1, 0.6, 9), 'stone', TRS((0, 0.0, 0)), smooth=False)
add('f10_stone', rock_bm(0.5, 77, 2, 0.3, 0.4), 'moss', TRS((0.3, 0.3, 0.2), scl=(1, 0.3, 1)), smooth=False)

objs = build_objects(MATS, 'marsh')
BIG = ('ms_ground', 'ms_pools', 'ms_path')
bake_ao({k: v for k, v in objs.items() if k not in BIG}, distance=0.4, samples=24, floor=0.6)
colour_pass(objs['ms_ground'], lambda p: 0.75 + 0.25 * fbm((p[0], 0, p[2]), 0.09, 3))
export_glb(objs, GLB)
if RENDERS:
    pl = [('ms_ground', TRS()), ('ms_pools', TRS()), ('ms_path', TRS()), ('ms_hut', TRS((14, 0, -6), (0, -0.5, 0))), ('ms_forge', TRS((0, 0, -44)))]
    for k in range(8):
        pl.append(('ms_tree', TRS((-20 + k * 6, 0, -10 - 6 * hash3(k, 1, 1)), (0, k, 0))))
        pl.append(('ms_reeds', TRS((-14 + k * 4, 0, 14 + 3 * hash3(k, 2, 2)))))
    preview(objs, pl, [('marsh_view.png', (2, 4, 30), (0, 4, -40), 45)], RENDERS, sky='#5a6a5a', ground=None)
    print('RENDERS', RENDERS)
