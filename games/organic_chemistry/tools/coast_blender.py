"""The Tide Coast for The Legend of Valence, exported to public/models/coast.glb.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/coast_blender.py -- <glb_path> <render_dir>

Parts (frames match src/scenes/Coast.jsx; collision stays in the game):
  cst_land        the cove: sand sloping under the sea, a grassy back shore, the road west, cliffs round it
  cst_dock        the pier (deck at y 0.35) with piles, bollards and rope
  cst_spit        the rocky spit out to the lighthouse
  cst_lighthouse  in its group frame at LIGHT; the lamp glass and beam stay in the game (they light up)
  cst_stilt       a stilt house (own frame); 'roof' is tinted per house
  cst_palm        a palm (own frame, its lean built in)
  cst_props       crates, barrels, nets and a beached boat (world frame)
  cst_temple      the Tide Temple far out at sea (group frame at (10, -0.3, -120)): red and blue
                  pillars standing in the water and a stepped tower (world-2-tide-temple.png)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'coast.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'sand': ('#e3d3a0', 0, 1.0), 'wetSand': ('#b8a878', 0, 0.6), 'grass': ('#7a9a56', 0, 0.95), 'path': ('#b89a6a', 0, 1.0),
    'cliff': ('#8a7f6c', 0, 0.95), 'cliffTop': ('#6f8f4a', 0, 0.95), 'rock': ('#7a7468', 0, 0.95), 'plank': ('#8a6440', 0, 0.9),
    'pile': ('#5a3c26', 0, 0.9), 'rope': ('#c8b080', 0, 0.9), 'iron': ('#3a3a40', 0.7, 0.4), 'white': ('#f2efe6', 0, 0.7),
    'red': ('#c0394b', 0, 0.7), 'roof': ('#2f6fd8', 0, 0.8), 'wall': ('#e8dcc0', 0, 0.9), 'window': ('#ffe3a0', 0, 0.4, 0.8),
    'trunk': ('#8a6a46', 0, 0.9), 'frond': ('#3f8a3a', 0, 0.8), 'coconut': ('#5a4028', 0, 0.8), 'net': ('#6a5a40', 0, 0.9),
    'boat': ('#2f6fd8', 0, 0.7), 'templeStone': ('#8a96a0', 0, 0.9), 'templeRed': ('#b0384a', 0, 0.7), 'templeBlue': ('#2f5fb8', 0, 0.7),
    'orb': ('#9ff6ff', 0, 0.3, 3.0),
}
SEA_Z = -18
LIGHT = (22, 0, -27)

# ================================================================ the cove (world frame)
lb = bmesh.new()
NX, NZ = 48, 40
g = []
for j in range(NZ + 1):
    z = SEA_Z - 14 + (32 + 30 - SEA_Z + 14) * j / NZ  # from under the sea to behind the back shore
    row = []
    for i in range(NX + 1):
        x = -60 + 120 * i / NX
        y = 0.0
        if z < SEA_Z:  # the beach shelves down under the water
            y = max(-2.0, (z - SEA_Z) * 0.18)
        if abs(x) > 35 or z > 31:  # rising ground beyond the walls (the cliffs sit on it)
            out = max(abs(x) - 35, z - 31, 0)
            y = max(y, min(8.0, out * 0.6))
        y += 0.06 * vnoise((x, 0, z), 0.3) if z > SEA_Z - 1 else 0
        row.append(lb.verts.new((x, y, z)))
    g.append(row)
for j in range(NZ):
    for i in range(NX):
        lb.faces.new((g[j][i], g[j + 1][i], g[j + 1][i + 1], g[j][i + 1]))
for f in lb.faces:
    if f.normal.y < 0:
        f.normal_flip()
add('cst_land', lb, 'sand')
# grass along the back shore and a dirt road to the west gate (laid just above the sand)
gr = bmesh.new()
gg = []
for j in range(6):
    z = 20.5 + 11 * j / 5
    gg.append([gr.verts.new((x, 0.025, z + (1.4 * vnoise((x, 0, 0), 0.15) if j == 0 else 0))) for x in [-34 + 68 * i / 34 for i in range(35)]])
for j in range(5):
    for i in range(34):
        gr.faces.new((gg[j][i], gg[j + 1][i], gg[j + 1][i + 1], gg[j][i + 1]))
for f in gr.faces:
    if f.normal.y < 0:
        f.normal_flip()
add('cst_land', gr, 'grass')
road, edge = ribbon([(-36, 10), (-26, 9.5), (-14, 10.5), (-5, 9)], 1.9, 0.4, 0.03, seed=3.0)
add('cst_land', road, 'path')
add('cst_land', edge, 'path')
# cliffs round the cove: west, east and behind, broken rock faces with grassy tops
def cliff_band(pts, h, seed):
    for k, (x, z) in enumerate(pts):
        r = 4.5 + 2.5 * hash3(k, seed, 1)
        hh = h * (0.75 + 0.5 * hash3(k, seed, 2))
        m = lathe([(r, -0.5), (r * 0.92, hh * 0.5), (r * 0.75, hh * 0.92), (r * 0.5, hh)], 12, False, True)
        deform(m, lambda v: (v.x * (1 + 0.15 * fbm((v.x + seed, v.y, v.z + k), 0.4, 2)), v.y, v.z * (1 + 0.15 * fbm((v.z, v.y + seed, v.x + k), 0.4, 2))))
        add('cst_land', m, 'cliff', TRS((x, 0, z)), smooth=False)
        add('cst_land', lathe([(r * 0.55, hh - 0.2), (r * 0.4, hh + 0.5), (0.2, hh + 0.7)], 12, True, True), 'cliffTop', TRS((x, 0, z)), smooth=False)
cliff_band([(-40, -20 + k * 6.5) for k in range(5)] + [(-40, 18 + k * 6) for k in range(3)], 9, 1)
cliff_band([(40, -36 + k * 6.5) for k in range(11)], 10, 2)
cliff_band([(-36 + k * 7, 37) for k in range(11)], 12, 3)

# ================================================================ the dock (world frame)
for k in range(27):
    z = -34 + k * 0.6 + 0.3
    add('cst_dock', box(3.2, 0.12, 0.56), 'plank', TRS((0, 0.29 + 0.012 * hash3(k, 1, 1), z), (0, 0, 0.015 * (hash3(k, 2, 2) - 0.5))), [BEVEL(0.012, 1)])
for x in (-1.5, 1.5):
    add('cst_dock', box(0.18, 0.22, 16.2), 'pile', TRS((x, 0.15, -26)), [BEVEL(0.02, 1)])
    for k in range(9):
        z = SEA_Z - k * 2
        add('cst_dock', cyl(0.14, 0.15, 2.4, 8), 'pile', TRS((x, -0.8, z)))
        add('cst_dock', torus(0.15, 0.025, 10, 4), 'rope', TRS((x, -0.2, z)))
for (x, z) in ((-1.4, -33.4), (1.4, -33.4), (1.4, -26)):
    add('cst_dock', cyl(0.16, 0.13, 0.5, 10), 'iron', TRS((x, 0.6, z)))
    add('cst_dock', sphere(0.17, 10, 6), 'iron', TRS((x, 0.85, z), scl=(1, 0.5, 1)))
add('cst_dock', tube([(1.4, 0.7, -26), (1.6, 0.3, -27.5), (1.5, 0.6, -29), (1.4, 0.75, -30)], [0.03] * 4, 5), 'rope')

# ================================================================ the spit (world frame): a rocky tongue of sand to the lighthouse
sp = bmesh.new()
sg = []
for j in range(10):
    z = SEA_Z + 1 - 15 * j / 9
    sg.append([sp.verts.new((x, -0.02 + (0 if 17.5 < x < 26.5 else -0.4) + 0.05 * vnoise((x, 0, z), 0.5), z)) for x in [15.5 + 13 * i / 13 for i in range(14)]])
for j in range(9):
    for i in range(13):
        sp.faces.new((sg[j][i], sg[j + 1][i], sg[j + 1][i + 1], sg[j][i + 1]))
for f in sp.faces:
    if f.normal.y < 0:
        f.normal_flip()
add('cst_spit', sp, 'wetSand')
for k, (x, z, s) in enumerate(((18, -20, 1.5), (26, -22, 1.4), (19, -30, 1.6), (27, -29, 1.5), (16.2, -25, 1.0), (28, -25.5, 1.1), (17, -32, 1.2), (25, -32.5, 1.3))):
    add('cst_spit', rock_bm(s, k * 2.7, 2, 0.32, 0.7), 'rock', TRS((x, 0.1, z), (0, k, 0)), smooth=False)

# ================================================================ the lighthouse (group frame)
add('cst_lighthouse', lathe([(2.6, 0.0), (2.5, 0.22), (2.25, 0.3)], 20, False, True), 'rock', smooth=False)  # a low rim: only the tower is solid
for k in range(10):  # the base's stones round the tower's foot
    a = k / 10 * 2 * PI
    add('cst_lighthouse', box(1.2, 0.35, 0.4), 'cliff', TRS((math.sin(a) * 1.95, 0.28, math.cos(a) * 1.95), (0, a, 0)), [BEVEL(0.05, 1)])
for k in range(5):  # tapered red and white bands
    r0, r1 = 1.72 - k * 0.12, 1.6 - k * 0.12
    add('cst_lighthouse', lathe([(r0, 1.2 + k * 2), (r1, 3.2 + k * 2)], 24, False, False), 'red' if k % 2 else 'white')
for (y, r) in ((5.5, 1.5), (9.5, 1.3)):  # little windows
    add('cst_lighthouse', box(0.4, 0.6, 0.1), 'iron', TRS((0, y, r + 0.02)))
# gallery with railing, the lantern room's frame, the cap and weather vane
add('cst_lighthouse', cyl(1.75, 1.75, 0.25, 24), 'iron', TRS((0, 11.3, 0)))
for k in range(16):
    a = k / 16 * 2 * PI
    add('cst_lighthouse', cyl(0.03, 0.03, 0.8, 5), 'iron', TRS((math.sin(a) * 1.65, 11.8, math.cos(a) * 1.65)))
add('cst_lighthouse', torus(1.65, 0.035, 32, 4), 'iron', TRS((0, 12.2, 0)))
for k in range(6):
    a = k / 6 * 2 * PI
    add('cst_lighthouse', box(0.08, 1.9, 0.08), 'iron', TRS((math.sin(a) * 1.02, 12.4, math.cos(a) * 1.02)))
add('cst_lighthouse', cyl(1.55, 0.12, 1.4, 16), 'iron', TRS((0, 14.0, 0)))
add('cst_lighthouse', sphere(0.18, 10, 8), 'iron', TRS((0, 14.8, 0)))
add('cst_lighthouse', box(0.04, 0.5, 0.04), 'iron', TRS((0, 15.1, 0)))
add('cst_lighthouse', box(0.5, 0.15, 0.02), 'iron', TRS((0.15, 15.3, 0)))
# the door with its frame
add('cst_lighthouse', box(0.95, 1.85, 0.12), 'pile', TRS((0, 2.15, 1.66)), [BEVEL(0.02, 1)])
pts = [(-0.55 * math.cos(PI * i / 10), 3.05 + 0.3 * math.sin(PI * i / 10), 1.7) for i in range(11)]
add('cst_lighthouse', tube(pts, [0.07] * 11, 5), 'cliff')

# ================================================================ a stilt house (own frame)
for (x, z) in ((-1.6, -1.4), (1.6, -1.4), (-1.6, 1.4), (1.6, 1.4)):
    add('cst_stilt', cyl(0.14, 0.17, 2.0, 8), 'pile', TRS((x, 0.95, z)))
add('cst_stilt', box(4.2, 0.2, 3.8), 'plank', TRS((0, 1.95, 0)), [BEVEL(0.02, 1)])
for k in range(7):  # plank walls
    add('cst_stilt', box(3.4, 0.28, 3.0), 'wall', TRS((0, 2.2 + k * 0.28, 0)), [BEVEL(0.02, 1)])
add('cst_stilt', box(0.85, 1.45, 0.06), 'pile', TRS((0, 2.8, 1.52)))
add('cst_stilt', box(0.62, 0.62, 0.06), 'window', TRS((-1.0, 3.25, 1.52)))
add('cst_stilt', box(0.62, 0.62, 0.06), 'window', TRS((1.72, 3.25, 0.4), (0, PI / 2, 0)))
roof = cyl(3.05, 0.15, 1.7, 4)
add('cst_stilt', roof, 'roof', TRS((0, 4.95, 0), (0, PI / 4, 0)), [BEVEL(0.03, 1)], smooth=False)
add('cst_stilt', cyl(3.15, 3.0, 0.15, 4), 'roof', TRS((0, 4.1, 0), (0, PI / 4, 0)), smooth=False)
for k in range(5):  # a ladder down from the porch
    add('cst_stilt', box(0.7, 0.05, 0.08), 'pile', TRS((0, 0.3 + k * 0.38, 2.05)))
for x in (-0.35, 0.35):
    add('cst_stilt', box(0.07, 2.0, 0.07), 'pile', TRS((x, 1.0, 2.05)))
add('cst_stilt', torus(0.3, 0.05, 12, 4), 'rope', TRS((1.9, 2.6, 1.2), (PI / 2, 0, 0)))

# ================================================================ a palm (own frame): a ringed, leaning trunk and drooping fronds
H = 5.0
pts, rr = [], []
for i in range(11):
    t = i / 10
    pts.append((0.9 * t * t, H * t, 0.0))
    rr.append(0.26 - 0.1 * t)
add('cst_palm', tube(pts, rr, 8), 'trunk')
for i in range(1, 10):
    t = i / 10
    add('cst_palm', torus(0.27 - 0.1 * t, 0.025, 12, 4), 'trunk', TRS((0.9 * t * t, H * t, 0)))
TOP = Vector((0.9, H, 0))
for k in range(8):
    a = k / 8 * 2 * PI + 0.2
    d = Vector((math.cos(a), 0, math.sin(a)))
    L = 2.2 + 0.4 * hash3(k, 1, 1)
    spine = [TOP + d * (L * u) + Vector((0, 0.5 * math.sin(u * PI * 0.8) - 1.3 * u * u, 0)) for u in [i / 6 for i in range(7)]]
    bm = bmesh.new()
    left, right = [], []
    side = d.cross(Vector((0, 1, 0))).normalized()
    for i, p in enumerate(spine):
        w = 0.32 * math.sin(PI * min(1, i / 6 + 0.1))
        left.append(bm.verts.new(tuple(p + side * w - Vector((0, w * 0.4, 0)))))
        right.append(bm.verts.new(tuple(p - side * w - Vector((0, w * 0.4, 0)))))
    mid = [bm.verts.new(tuple(p)) for p in spine]
    for i in range(6):
        bm.faces.new((mid[i], left[i], left[i + 1], mid[i + 1]))
        bm.faces.new((mid[i], mid[i + 1], right[i + 1], right[i]))
    add('cst_palm', bm, 'frond', None, [SOLID(0.02, 0)])
for k in range(3):
    a = k / 3 * 2 * PI
    add('cst_palm', sphere(0.14, 10, 8), 'coconut', TRS(tuple(TOP + Vector((math.cos(a) * 0.2, -0.25, math.sin(a) * 0.2)))))

# ================================================================ props (world frame)
for (x, z, s, r) in ((-6, -10, 1.0, 0.2), (-4.8, -9.4, 0.8, 0.7), (-5.5, -8.4, 0.7, 1.1)):
    add('cst_props', box(s, s * 0.8, s), 'plank', TRS((x, s * 0.4, z), (0, r, 0)), [BEVEL(0.03, 1)])
    for yy in (0.15, 0.65):
        add('cst_props', box(s + 0.02, 0.06, s + 0.02), 'pile', TRS((x, s * 0.8 * yy, z), (0, r, 0)))
for (x, z) in ((-7.2, -9.2), (-7.0, -10.6)):  # barrels
    add('cst_props', lathe([(0.3, 0), (0.36, 0.35), (0.3, 0.7)], 14, True, True), 'plank', TRS((x, 0, z)))
    for yy in (0.12, 0.58):
        add('cst_props', torus(0.33, 0.02, 14, 4), 'iron', TRS((x, yy, z)))
# a fishing net hung on poles
for x in (-12, -9):
    add('cst_props', cyl(0.07, 0.07, 2.2, 6), 'pile', TRS((x, 1.1, -12)))
net = poly_sheet([(0, 0), (3, 0), (3, -1.6), (0, -1.6)], 6)
deform(net, lambda p: (p[0], p[1] - 0.3 * math.sin(p[0] / 3 * PI), 0.1 * math.sin(p[0] * 2 + p[1] * 3)))
add('cst_props', net, 'net', TRS((-12, 2.1, -12)), [SOLID(0.02, 0)])
# the beached boat, upturned on the sand
hull = lathe([(0.02, -1.5), (0.4, -1.2), (0.55, -0.4), (0.55, 0.4), (0.4, 1.2), (0.02, 1.5)], 14, False, False)
bmesh.ops.delete(hull, geom=[v for v in hull.verts if v.co.x < -0.01], context='VERTS')
add('cst_props', hull, 'boat', TRS((8, 0.0, -12), (0, 0.6, PI / 2), scl=(1, 1, 0.55)), [SOLID(0.04)])

# ================================================================ the Tide Temple on the horizon (group frame)
for k in range(5):  # the stepped tower
    w = 14 - k * 2.6
    add('cst_temple', box(w, 3.2, w * 0.75), 'templeStone', TRS((0, 1.6 + k * 3.2, -4)), [BEVEL(0.15, 1)])
add('cst_temple', box(1.2, 16, 0.3), 'iron', TRS((0, 8, -4 + 5.4)))  # the ladder up its face
add('cst_temple', sphere(2.4, 20, 14), 'orb', TRS((0, 6.0, 3.5)))
for k in range(10):  # pillars standing in the sea, red and blue
    side = -1 if k % 2 else 1
    x = side * (6 + (k // 2) * 4.5)
    z = 6 - (k // 2) * 5
    h = 12 - (k // 2) * 1.2
    add('cst_temple', cyl(1.0, 1.1, h, 12), 'templeRed' if (k // 2) % 2 == (0 if side > 0 else 1) else 'templeBlue', TRS((x, h / 2 - 1, z)))
    add('cst_temple', box(2.6, 0.7, 2.6), 'templeStone', TRS((x, h - 0.6, z)), [BEVEL(0.08, 1)])
    for b in range(3):
        add('cst_temple', torus(1.06, 0.08, 16, 4), 'templeStone', TRS((x, 1 + b * h * 0.28, z)))

# ---------------------------------------------------------------- build, shade, export
objs = build_objects(MATS, 'coast', smooth_parts=('cst_land', 'cst_palm'))
BIG = ('cst_land', 'cst_spit', 'cst_temple')
bake_ao(objs, distance=0.6, samples=24, floor=0.5, skip=BIG)
colour_pass(objs['cst_land'], lambda p: (0.84 + 0.16 * fbm((p[0], 0, p[2]), 0.08, 3)) * (0.75 if p[2] < SEA_Z + 1.5 else 1.0))
colour_pass(objs['cst_spit'], lambda p: 0.85 + 0.15 * fbm((p[0], 0, p[2]), 0.4, 2))
colour_pass(objs['cst_temple'], lambda p: 0.8 + 0.2 * fbm(p, 0.2, 2))
export_glb(objs, GLB)
if RENDERS:
    pl = [('cst_land', TRS()), ('cst_dock', TRS()), ('cst_spit', TRS()), ('cst_lighthouse', TRS(LIGHT)), ('cst_props', TRS()),
          ('cst_stilt', TRS((-20, 0, -6), (0, 0.3, 0))), ('cst_stilt', TRS((-10, 0, 10), (0, -0.2, 0))), ('cst_stilt', TRS((12, 0, 12), (0, 0.5, 0))),
          ('cst_temple', TRS((10, -0.3, -120)))]
    for k, (x, z) in enumerate(((-14, 2), (-24, 8), (6, 14), (16, 6), (-28, -10), (24, 18))):
        pl.append(('cst_palm', TRS((x, 0, z), (0, k * 1.3, 0))))
    preview(objs, pl, [('coast_wide.png', (-28, 9, 26), (6, 0, -20), 34), ('coast_light.png', (12, 3, -14), (22, 6, -27), 40), ('coast_temple.png', (0, 4, -20), (10, 4, -120), 30)],
            RENDERS, sky='#a8d4ea', ground=None)
    print('RENDERS', RENDERS)
