"""The Valence Fields (the overworld between the village, the Tide Coast and Carbon Castle) for The Legend
of Valence, exported to public/models/field.glb. Trees, rocks, flowers and grass reuse the village kit.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/field_blender.py -- <glb_path> <render_dir>

Parts (frames match src/scenes/Field.jsx):
  fld_ground    the meadow (world frame): grass to the edges and out to a wide skirt, so no edge shows
  fld_roads     the dirt roads (world frame), same lines as the old Road components
  fld_beach     the beach and the surf shelf down to the sea (world frame)
  fld_banks     pebbled banks along the stream (world frame)
  fld_horizon   the realm on the skyline: snowy peaks north, the smoking volcano and Malradix's keep
                north-east (the overworld concept art), rolling hills west and south
  fld_bridge    a plank bridge in its group frame (length along x, width along z)
  fld_gate      a gatehouse (two crenellated towers and an arch), in its own frame; 'stone' can be tinted
  fld_castle    Carbon Castle in its group frame at (0, 0, -118); the crown cradle stays in the game
  fld_ruin      a broken colonnade (own frame)
  fld_hill      a rounded hill at unit radius and height (the game scales it per hill)
  fld_fence     one 4 m fence segment along x
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'field.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'groundGrass': ('#6f9a4e', 0, 0.95), 'path': ('#b89f74', 0, 1.0), 'pathRim': ('#8f7a58', 0, 1.0), 'sand': ('#e3d3a0', 0, 1.0),
    'wetSand': ('#b8a878', 0, 0.6), 'pebble': ('#9a958c', 0, 0.9), 'timber': ('#7a5a3a', 0, 0.85), 'timberDark': ('#5a4028', 0, 0.9),
    'stone': ('#a8a090', 0, 0.9), 'stoneDark': ('#7c7568', 0, 0.95), 'roof': ('#2d3a5a', 0, 0.7), 'castleStone': ('#5a5f6e', 0, 0.9),
    'castleDark': ('#3a3e4a', 0, 0.9), 'window': ('#ffcf7a', 0, 0.3, 1.5), 'banner': ('#c9a24a', 0.4, 0.5),
    'hill': ('#6a9450', 0, 0.95), 'cliff': ('#7f7a6c', 0, 0.95), 'snow': ('#f2f4f8', 0, 0.7), 'mountain': ('#6a6e78', 0, 0.95),
    'farHill': ('#5f8a4a', 0, 0.95), 'lava': ('#ff5a1a', 0, 0.5, 4.0), 'ash': ('#3a3434', 0, 0.95), 'keep': ('#1e1a24', 0.2, 0.6),
    'keepGlow': ('#ff3a2a', 0, 0.5, 3.0), 'moss': ('#5f7f3e', 0, 0.95),
}
HALF, SEA_X = 70, 58
COAST_GATE = (62, -43)

# ================================================================ ground: the meadow plus a wide skirt (world frame)
gb = bmesh.new()
N = 60
grid = []
for j in range(N + 1):
    row = []
    for i in range(N + 1):
        # denser in the walkable square, stretching out to +-220 beyond it
        def m(u):
            s = u * 2 - 1
            return math.copysign((abs(s) * 1.0) ** 1.0, s)
        u, v = i / N, j / N
        x = -220 + 440 * u if (u < 0.15 or u > 0.85) else -HALF - 3 + (2 * HALF + 6) * (u - 0.15) / 0.7
        z = -220 + 440 * v if (v < 0.15 or v > 0.85) else -HALF - 3 + (2 * HALF + 6) * (v - 0.15) / 0.7
        y = 0.0
        out = max(abs(x) - HALF - 2, abs(z) - HALF - 2, 0)
        if out > 0 and x < SEA_X:  # beyond the walls: gentle rolling land
            y = min(14, out * 0.08) * (0.6 + 0.4 * (0.5 + 0.5 * vnoise((x, 0, z), 0.03)))
        if x >= SEA_X + 4:
            y = -2.0  # under the sea (the beach shelf part covers the join)
        row.append(gb.verts.new((x, y, z)))
    grid.append(row)
for j in range(N):
    for i in range(N):
        gb.faces.new((grid[j][i], grid[j + 1][i], grid[j + 1][i + 1], grid[j][i + 1]))
for f in gb.faces:
    if f.normal.y < 0:
        f.normal_flip()
add('fld_ground', gb, 'groundGrass')

# roads (same lines as the old Road components)
ROADS = [([(-HALF, 0), (-20, 0), (10, -8), (35, -30), (HALF, COAST_GATE[1])], 2.1),
         ([(-20, 0), (-10, -30), (0, -66)], 1.8), ([(10, -8), (30, 20), (SEA_X - 2, 30)], 1.6), ([(-20, 0), (-40, -68)], 1.7)]
for k, (pts, half) in enumerate(ROADS):
    road, edge = ribbon(pts, half, 0.45, 0.03, seed=k * 5.0)
    add('fld_roads', road, 'path')
    add('fld_roads', edge, 'pathRim')

# beach: dry sand, a wet band, and a shelf sloping under the sea
bb = bmesh.new()
cols = [(SEA_X - 4, 0.035), (SEA_X + 2, 0.03), (SEA_X + 7, -0.1), (SEA_X + 10, -0.45), (SEA_X + 16, -1.6), (SEA_X + 40, -2.2)]
rows = 30
g = []
for r in range(rows + 1):
    z = -HALF - 30 + (2 * HALF + 60) * r / rows
    g.append([bb.verts.new((x + 1.2 * vnoise((0, 0, z), 0.08), y, z)) for (x, y) in cols])
for r in range(rows):
    for c in range(len(cols) - 1):
        bb.faces.new((g[r][c], g[r + 1][c], g[r + 1][c + 1], g[r][c + 1]))
for f in bb.faces:
    if f.normal.y < 0:
        f.normal_flip()
add('fld_beach', bb, 'sand')
for k in range(40):  # shells and pebbles on the sand
    x = SEA_X - 3 + 8 * hash3(k, 1, 1)
    z = -HALF + 2 * HALF * hash3(k, 2, 2)
    add('fld_beach', rock_bm(0.12 + 0.15 * hash3(k, 3, 3), k, 1, 0.3, 0.6), 'pebble', TRS((x, 0.02, z)), smooth=False)

# stream banks: pebbles and reeds along the stream (the water is the game's)
ang = 0.25
BRIDGE_Z = (-12.3, 5.0)
for k in range(110):
    t = (k / 110) * 150 - 75
    side = 1 if k % 2 else -1
    off = side * (2.6 + 0.5 * hash3(k, 4, 4))
    x = 18 + t * math.sin(-ang) * 0 + off * math.cos(ang)
    # the stream plane is rotated about y by 0.25 (Field.jsx): its long axis is along local y -> world z
    cx = 18 + math.sin(ang) * t * -1.0
    cz = -math.cos(ang) * t  # the stream plane's long axis runs along (-sin, -cos) of its 0.25 rad turn
    px, pz = cx + math.cos(ang) * off, cz - math.sin(ang) * off
    if any(abs(pz - bz) < 3.2 and abs(px - (18 + math.tan(ang) * bz)) < 5 for bz in BRIDGE_Z):
        continue  # leave the bridges clear (one where each road crosses: Field.jsx BRIDGES)
    add('fld_banks', rock_bm(0.25 + 0.3 * hash3(k, 5, 5), k * 1.3, 1, 0.35, 0.55), 'pebble', TRS((px, 0.02, pz), (0, hash3(k, 6, 6) * 6, 0)), smooth=False)

# ================================================================ the horizon (world frame)
def mountain(cx, cz, r, h, seed, snow=True):
    m = lathe([(r, -1), (r * 0.8, h * 0.28), (r * 0.52, h * 0.6), (r * 0.22, h * 0.88), (r * 0.03, h)], 24, False, True)
    deform(m, lambda v: (v.x * (1 + 0.16 * fbm((v.x + seed, v.y, v.z), 0.06, 3)), v.y * (1 + 0.05 * fbm((v.z, v.y + seed, v.x), 0.08, 2)), v.z * (1 + 0.16 * fbm((v.z, v.y, v.x + seed), 0.06, 3))))
    add('fld_horizon', m, 'mountain', TRS((cx, 0, cz)), smooth=False)
    if snow:
        cap = lathe([(r * 0.3, h * 0.78), (r * 0.18, h * 0.9), (r * 0.03, h + 0.4)], 24, True, True)
        deform(cap, lambda v: (v.x * (1 + 0.2 * fbm((v.x + seed, v.y, v.z), 0.1, 2)) * 1.06, v.y, v.z * (1 + 0.2 * fbm((v.z, v.y, v.x + seed), 0.1, 2)) * 1.06))
        add('fld_horizon', cap, 'snow', TRS((cx, 0, cz)), smooth=False)
for k in range(11):  # the snowy range across the north
    x = -170 + k * 30 + 12 * hash3(k, 1, 7)
    if x > 95:
        continue  # leave the sky clear round Malradix's keep
    mountain(x, -175 - 25 * hash3(k, 2, 7), 32 + 14 * hash3(k, 3, 7), 45 + 30 * hash3(k, 4, 7), k * 3.1)
for k in range(9):  # rolling hills to the west and south (lower, green)
    a = PI * 0.55 + k * PI * 0.12
    x, z = math.cos(a) * 175, -math.sin(a) * 175
    m = lathe([(40, -1), (30, 8), (16, 16), (3, 20)], 20, False, True)
    deform(m, lambda v: (v.x * (1 + 0.1 * fbm(v, 0.05, 2)), v.y * (0.7 + 0.5 * hash3(k, 5, 5)), v.z * (1 + 0.1 * fbm(v, 0.05, 2))))
    add('fld_horizon', m, 'farHill', TRS((x, 0, z)))
for k in range(8):
    x = -170 + k * 50
    m = lathe([(38, -1), (28, 7), (14, 14), (3, 18)], 20, False, True)
    add('fld_horizon', m, 'farHill', TRS((x, 0, 170 + 15 * hash3(k, 8, 8)), scl=(1, 0.6 + 0.6 * hash3(k, 9, 9), 1)))
# the volcano (north-east), its crater glowing
VX, VZ = 80, -165
volc = lathe([(48, -1), (36, 14), (22, 34), (11, 52), (8, 54), (6, 51)], 32, False, False)
deform(volc, lambda v: (v.x * (1 + 0.1 * fbm(v, 0.08, 3)), v.y, v.z * (1 + 0.1 * fbm((v.z, v.y, v.x), 0.08, 3))))
add('fld_horizon', volc, 'ash', TRS((VX, 0, VZ)), smooth=False)
add('fld_horizon', cyl(7.5, 7.5, 0.4, 24), 'lava', TRS((VX, 51.5, VZ)))
for k in range(6):  # lava runnels down the flank
    a = -0.6 + k * 0.25
    pts = [(VX + math.sin(a) * (8 + t * 30), 52 - t * 40 + 2 * math.sin(t * 9 + k), VZ + math.cos(a) * (8 + t * 30)) for t in [i / 8 for i in range(9)]]
    add('fld_horizon', tube(pts, [1.2 - 0.1 * i for i in range(9)], 5), 'lava', smooth=False)
# Malradix's keep, beyond the volcano: black spires with red windows
KX, KZ = 135, -170
add('fld_horizon', box(40, 18, 26), 'keep', TRS((KX, 9, KZ)))
for k in range(7):
    x = KX - 18 + k * 6
    h = 30 + 28 * (1 - abs(k - 3) / 3.5) + 6 * hash3(k, 1, 4)
    add('fld_horizon', cyl(2.8, 2.2, h, 8), 'keep', TRS((x, h / 2, KZ + 4 * hash3(k, 2, 4))))
    add('fld_horizon', cyl(3.2, 0.0, 12, 8), 'keep', TRS((x, h + 6, KZ + 4 * hash3(k, 2, 4))))
    for w in range(3):
        add('fld_horizon', box(0.8, 1.8, 0.3), 'keepGlow', TRS((x, h * (0.35 + 0.2 * w), KZ + 4 * hash3(k, 2, 4) + 2.8)))

# ================================================================ the plank bridge (group frame: deck along x, 7.5 x 4.2)
for k in range(15):
    x = -3.5 + k * 0.5
    add('fld_bridge', box(0.46, 0.12, 4.2), 'timber', TRS((x, 0.32 + 0.01 * hash3(k, 1, 1), 0), (0, 0, 0.02 * (hash3(k, 2, 2) - 0.5))), [BEVEL(0.015, 1)])
for z in (-1.9, 1.9):
    add('fld_bridge', box(7.6, 0.18, 0.2), 'timberDark', TRS((0, 0.2, z)), [BEVEL(0.02, 1)])
    add('fld_bridge', box(7.6, 0.1, 0.1), 'timberDark', TRS((0, 0.95, z)), [BEVEL(0.015, 1)])
    for x in (-3.6, -1.2, 1.2, 3.6):
        add('fld_bridge', box(0.16, 1.0, 0.16), 'timberDark', TRS((x, 0.55, z)), [BEVEL(0.02, 1)])
        add('fld_bridge', cyl(0.12, 0.12, 1.4, 8), 'timberDark', TRS((x, -0.4, z)))  # piles

# ================================================================ a gatehouse (own frame; arch 4.6 wide)
for x in (-3, 3):
    add('fld_gate', box(1.6, 5.4, 1.8), 'stone', TRS((x, 2.7, 0)), [BEVEL(0.05, 1)])
    add('fld_gate', box(1.9, 0.35, 2.1), 'stoneDark', TRS((x, 0.17, 0)), [BEVEL(0.04, 1)])
    for (cx, cz) in ((-0.55, -0.6), (0.55, -0.6), (-0.55, 0.6), (0.55, 0.6)):  # crenellations
        add('fld_gate', box(0.5, 0.6, 0.5), 'stone', TRS((x + cx, 7.1, cz)), [BEVEL(0.03, 1)])
    add('fld_gate', box(1.9, 0.4, 2.1), 'stoneDark', TRS((x, 6.6, 0)), [BEVEL(0.03, 1)])
    add('fld_gate', box(1.75, 0.9, 1.95), 'stone', TRS((x, 6.0, 0)), [BEVEL(0.03, 1)])
# the arch and the wall over it
pts = [(-2.3 * math.cos(PI * i / 16), 4.2 + 1.1 * math.sin(PI * i / 16), 0) for i in range(17)]
add('fld_gate', tube(pts, [0.35] * 17, 6), 'stoneDark')
add('fld_gate', box(4.6, 1.3, 1.6), 'stone', TRS((0, 5.85, 0)), [BEVEL(0.04, 1)])
for k in range(5):  # stone courses on the towers
    for x in (-3, 3):
        add('fld_gate', box(1.64, 0.05, 1.84), 'stoneDark', TRS((x, 1.0 + k * 1.0, 0)))

# ================================================================ Carbon Castle (group frame at (0, 0, -118))
add('fld_castle', box(30, 16, 16), 'castleStone', TRS((0, 8, 0)), [BEVEL(0.2, 1)])
for x in [-14 + 2 * i for i in range(15)]:  # battlements
    add('fld_castle', box(1.0, 1.2, 16.4), 'castleStone', TRS((x, 16.6, 0)))
for k in range(5):  # rows of lit windows
    for x in (-10, -5, 5, 10):
        add('fld_castle', box(0.9, 1.8, 0.3), 'window', TRS((x, 4 + k * 2.6, 8.1)))
for x in (-15, 15):  # corner towers
    for zz in (8, -8):
        add('fld_castle', cyl(3.2, 3.6, 24, 16), 'castleDark', TRS((x, 12, zz)))
        add('fld_castle', cyl(4.0, 0.0, 9, 16), 'roof', TRS((x, 28.5, zz)))
        add('fld_castle', torus(3.5, 0.35, 24, 5), 'castleStone', TRS((x, 24, zz)))
        add('fld_castle', cyl(0.08, 0.08, 4, 6), 'castleDark', TRS((x, 34.5, zz)))
        add('fld_castle', box(1.6, 0.9, 0.05), 'banner', TRS((x + 0.8, 35.6, zz)))
# the great central spire (the crown cradle at y 49 is the game's)
add('fld_castle', cyl(4.5, 5.2, 34, 20), 'castleStone', TRS((0, 23, -2)))
add('fld_castle', cyl(6.2, 0.6, 9, 20), 'roof', TRS((0, 44.5, -2)))
for k in range(4):
    a = k * PI / 2 + PI / 4
    add('fld_castle', cyl(1.1, 1.2, 12, 10), 'castleDark', TRS((math.cos(a) * 5.0, 30, -2 + math.sin(a) * 5.0)))
    add('fld_castle', cyl(1.5, 0.0, 5, 10), 'roof', TRS((math.cos(a) * 5.0, 38.5, -2 + math.sin(a) * 5.0)))
for k in range(6):
    add('fld_castle', box(1.0, 2.2, 0.3), 'window', TRS((0, 14 + k * 4.5, 3.05)))
# curtain wall and gate in front
add('fld_castle', box(46, 8, 2.2), 'castleStone', TRS((0, 4, 14)))
add('fld_castle', box(7, 6, 2.4), 'castleDark', TRS((0, 3, 14.2)))
for x in [-22 + 2 * i for i in range(23)]:
    add('fld_castle', box(1.0, 1.0, 2.4), 'castleStone', TRS((x, 8.5, 14)))

# ================================================================ a ruin (own frame)
for (x, h, z) in ((-1.5, 2.6, 0), (1.5, 1.4, 0), (0, 3.2, -1.6)):
    col = cyl(0.45, 0.5, h, 12)
    for v in col.verts:  # broken tops
        if v.co.y > h / 2 - 0.05:
            v.co.y -= 0.35 * hash3(round(v.co.x * 10), round(v.co.z * 10), x)
    add('fld_ruin', col, 'stone', TRS((x, h / 2 + 0.2, z)), smooth=False)
    add('fld_ruin', box(1.2, 0.25, 1.2), 'stoneDark', TRS((x, 0.12, z)), [BEVEL(0.03, 1)])
    add('fld_ruin', box(1.0, 0.22, 1.0), 'stone', TRS((x, 0.32, z)), [BEVEL(0.03, 1)])
add('fld_ruin', box(3.4, 0.5, 1.0), 'stone', TRS((0, 0.25, -0.6), (0, 0.4, 0.1)), [BEVEL(0.04, 1)], smooth=False)
for k in range(6):
    add('fld_ruin', rock_bm(0.25, k * 2.2, 1, 0.3, 0.6), 'stoneDark', TRS(((hash3(k, 1, 3) - 0.5) * 4, 0.05, (hash3(k, 2, 3) - 0.5) * 3)), smooth=False)
for (x, h) in ((-1.5, 2.4), (0, 3.0)):
    add('fld_ruin', sphere(0.4, 10, 6), 'moss', TRS((x, h * 0.4, 0.3 if x else -1.3), scl=(1.2, 0.5, 0.6)))

# ================================================================ a hill (unit radius / height) with rock outcrops
hl = lathe([(1.05, -0.05), (0.95, 0.2), (0.75, 0.52), (0.45, 0.82), (0.15, 0.97), (0.0, 1.0)], 28, False, True)
deform(hl, lambda v: (v.x * (1 + 0.08 * fbm(v, 1.5, 2)), v.y, v.z * (1 + 0.08 * fbm((v.z, v.y, v.x), 1.5, 2))))
add('fld_hill', hl, 'hill')
for k in range(4):
    a = k * 1.7
    add('fld_hill', rock_bm(0.16, k * 3.0, 2, 0.3, 0.7), 'cliff', TRS((math.cos(a) * 0.62, 0.48, math.sin(a) * 0.62), (0.3, a, 0), scl=(1.4, 1, 0.8)), smooth=False)

# ================================================================ a fence segment (4 m along x)
for x in (-2, 2):
    add('fld_fence', box(0.16, 1.1, 0.16), 'timberDark', TRS((x, 0.55, 0)), [BEVEL(0.02, 1)])
for y in (0.45, 0.85):
    add('fld_fence', box(4.1, 0.1, 0.07), 'timber', TRS((0, y, 0.02), (0, 0, 0.01 * (y - 0.6))), [BEVEL(0.015, 1)])

# ---------------------------------------------------------------- build, shade, export
objs = build_objects(MATS, 'field', smooth_parts=('fld_ground', 'fld_roads', 'fld_beach', 'fld_hill'))
BIG = ('fld_ground', 'fld_roads', 'fld_beach', 'fld_horizon', 'fld_banks')
bake_ao(objs, distance=0.8, samples=24, floor=0.5, skip=BIG + ('fld_castle',))
colour_pass(objs['fld_ground'], lambda p: 0.84 + 0.16 * fbm((p[0], 0, p[2]), 0.05, 3) + 0.05 * fbm((p[0], 0, p[2]), 0.4, 2))
colour_pass(objs['fld_roads'], lambda p: 0.9 + 0.1 * fbm((p[0], 0, p[2]), 0.4, 2))
colour_pass(objs['fld_beach'], lambda p: 0.92 + 0.08 * fbm((p[0], 0, p[2]), 0.2, 2))
colour_pass(objs['fld_banks'], lambda p: 0.8 + 0.2 * hash3(round(p[0] * 2), 1, round(p[2] * 2)))
colour_pass(objs['fld_horizon'], lambda p: 0.8 + 0.2 * fbm(p, 0.05, 2))
colour_pass(objs['fld_castle'], lambda p: 0.75 + 0.25 * min(1.0, p[1] / 10.0))
export_glb(objs, GLB)
if RENDERS:
    pl = [('fld_ground', TRS()), ('fld_roads', TRS()), ('fld_beach', TRS()), ('fld_banks', TRS()), ('fld_horizon', TRS()),
          ('fld_castle', TRS((0, 0, -118))), ('fld_bridge', TRS((18 + math.tan(0.25) * -12.3, 0, -12.3), (0, 0.25 + PI / 2, 0))),
          ('fld_gate', TRS((0, 0, -HALF + 0.4))), ('fld_gate', TRS((HALF - 1.5, 0, -43), (0, PI / 2, 0))),
          ('fld_ruin', TRS((-30, 0, -32), (0, 0.4, 0))), ('fld_hill', TRS((-40, -0.4, 20), scl=(9, 10, 9))), ('fld_hill', TRS((45, -0.4, -55), scl=(7, 8, 7)))]
    for k in range(6):
        pl.append(('fld_fence', TRS((-60 + k * 4, 0, 3.6))))
    preview(objs, pl, [('field_north.png', (5, 8, 30), (0, 10, -60), 32), ('field_bridge.png', (22, 4, 4), (16, 0.5, -3.5), 40),
                       ('field_ne.png', (30, 10, 10), (75, 20, -120), 30), ('field_ruin.png', (-24, 3, -26), (-30, 1, -32), 40)], RENDERS, sky='#a8cfe8', ground=None)
    print('RENDERS', RENDERS)
