"""World 4's architecture for The Legend of Valence, exported to public/models/fortress.glb.
Modeled on assets/locations/world-4-chair-fortress.png: rolling olive-gold hills under a violet sky; on the
ridge a fortress of rings — the six-sided chair palace (zigzag walls rising and falling), a cramped
triangular tower, a square keep and a puckered pentagon — in violet-grey stone.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/fortress_blender.py -- <glb_path> <render_dir>

Parts (world frame unless noted):
  hl_ground    the walkable hills floor (flat, y = 0) with grass and dirt shading, 100 × 100 m
  hl_hills     rolling hills beyond the walkable square, and far ridges
  hl_road      the dirt road from the forest gate (west) to the drawbridge (north)
  hl_fortress  the fortress on the ridge (north): the Chair Tower, the honeycomb courts, a pyramid tower, square keeps
  hl_drawbridge the drawbridge (own frame: hinge at y = 0, z = 0, lying along −z when down)
  f4_wall      a dungeon wall run, 4 m long along z, 2 m thick, 8 m tall, its inner face at x = 0 facing +x
  f4_column    a dungeon column (own frame)
  f4_pad       a chair carbon pad: a stone drum r 1.1, h 0.6 with a steel rim (own frame, top at y = 0.6)
  f4_bridge    a stone walkway 1 m long (along z), 2.2 m wide, top at y = 0 (own frame)
  f4_altar     a ring altar: a column with a wide round top at y = 1.6 (own frame)
  f4_gauntlet  the Ring-Flip Gauntlet (own frame, about 0.6 m long, fingers up)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'fortress.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'grass': ('#8a8a4c', 0, 0.95), 'grassDark': ('#5f6a3a', 0, 0.95), 'dirt': ('#8a7458', 0, 1.0), 'rock': ('#6a6478', 0, 0.9),
    'stone': ('#6e6a82', 0, 0.85), 'stoneDark': ('#4a4660', 0, 0.9), 'stoneLight': ('#8a86a0', 0, 0.8), 'roof': ('#3a3450', 0, 0.8),
    'steel': ('#4a4a5a', 0.85, 0.3), 'glow': ('#5ff0ff', 0, 0.2, 2.5), 'banner': ('#6a3aa8', 0, 0.8), 'wood': ('#5a4030', 0, 0.85),
    'crystal': ('#ff6ab8', 0.1, 0.2, 1.2), 'far': ('#6a5a7a', 0, 1.0),
}
HALF = 50

# ================================================================ the hills floor: flat, shaded by noise into grass, dark grass and dirt
g = bmesh.new()
bmesh.ops.create_grid(g, x_segments=60, y_segments=60, size=HALF)
bmesh.ops.rotate(g, verts=g.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-PI / 2, 3, 'X'))
add('hl_ground', g, 'grass', smooth=False)

# ================================================================ rolling hills beyond the square, ridges far away
for i in range(46):
    a = i / 46 * 2 * PI + 0.07 * hash3(i, 1, 1)
    r = HALF + 6 + 10 * hash3(i, 2, 2)
    x, z = math.sin(a) * r, math.cos(a) * r
    if z < -40 and abs(x) < 26:
        continue  # leave the view to the fortress clear
    s = 9 + 9 * hash3(i, 3, 3)
    hb = deform(sphere(1.0, 20, 10), lambda v: (v.x, max(v.y, -0.05) * (0.35 + 0.15 * hash3(i, 4, 4)), v.z))
    add('hl_hills', hb, 'grassDark' if i % 3 == 0 else 'grass', TRS((x, -0.4, z), (0, a, 0), scl=(s, s * 0.8, s * 1.2)))
for i in range(14):  # violet far ridges with jagged tops
    a = i / 14 * 2 * PI
    r = 150
    m = deform(cyl(1.0, 0.0, 1.0, 7), lambda v: (v.x * (1 + 0.2 * hash3(round(v.x * 9), i, 3)), v.y, v.z))
    add('hl_hills', m, 'far', TRS((math.sin(a) * r, 8, math.cos(a) * r), (0, a, 0), scl=(30 + 10 * hash3(i, 5, 5), 26 + 20 * hash3(i, 6, 6), 30)), smooth=False)
for i in range(30):  # rocks and pink crystals on the slopes (concept)
    a = i / 30 * 2 * PI + 0.3
    r = 30 + 18 * hash3(i, 7, 7)
    x, z = math.sin(a) * r, math.cos(a) * r
    if abs(x) < 6 and z < 0:
        continue
    add('hl_hills', rock_bm(0.6 + 0.9 * hash3(i, 8, 8), i, 2, 0.25, 0.8), 'rock', TRS((x, 0.1, z)), smooth=False)
    if i % 3 == 0:
        for k in range(4):
            add('hl_hills', cyl(0.12, 0.0, 0.9 + 0.5 * hash3(i, k, 9), 5), 'crystal', TRS((x + 0.9 + 0.2 * k, 0.4, z + 0.3 * (k - 1.5)), (0.3 * (k - 1.5), 0, 0.4 - 0.25 * k)), smooth=False)

# ================================================================ the road: from the west gate across the hills to the drawbridge
road, edge = ribbon([(-HALF + 1, 6), (-30, 8), (-14, 2), (0, -10), (0, -30), (0, -40)], 1.8, 0.4, 0.02, 3)
add('hl_road', road, 'dirt', smooth=False)
add('hl_road', edge, 'grassDark', smooth=False)

# ================================================================ the fortress on the ridge (north, around z = −62)
FZ = -66
def wall_run(a, b, h, thick, mat='stone', zig=False):
    A, B = Vector(a), Vector(b)
    d = B - A
    L = d.length
    ang = math.atan2(d.x, d.z)
    add('hl_fortress', box(thick, h, L), mat, TRS(tuple((A + B) * 0.5 + Vector((0, h / 2, 0))), (0, ang, 0)), [BEVEL(0.08, 1)])
    n = max(2, int(L / 1.6))
    for k in range(n):  # crenellations
        t = (k + 0.5) / n
        p = A.lerp(B, t)
        add('hl_fortress', box(thick + 0.2, 0.8, L / n * 0.55), 'stoneLight', TRS((p.x, h + 0.4, p.z), (0, ang, 0)), [BEVEL(0.04, 1)])
# the Chair Tower (concept art: assets/locations/world-4-chair-fortress.png): a keep built as a giant armchair —
# two leg blocks with an arch between, a seat slab, arms, and a tall crenellated backrest
LIFT = 7.0  # it stands on a rock shelf, so its seat clears the gatehouse
CX, CZ, YAW = 0.0, FZ - 4, 0.85  # turned three-quarters to the road, so its seat-and-back profile reads
def cp(name, bm, mat, lx, ly, lz, rx=0.0, mods=None):
    c, s_ = math.cos(YAW), math.sin(YAW)
    add(name, bm, mat, TRS((CX + lx * c + lz * s_, ly + LIFT, CZ - lx * s_ + lz * c), (rx, YAW, 0)), mods or [])
add('hl_fortress', rock_bm(9.0, 41, 2, 0.2, 0.7), 'rock', TRS((CX, 2.0, CZ), scl=(1.3, 0.75, 1.2)), smooth=False)  # the shelf
for s_ in (-1, 1):
    cp('hl_fortress', box(3.4, 7.0, 12.0), 'stone', s_ * 5.3, 3.5, 0, mods=[BEVEL(0.1, 1)])  # legs
    cp('hl_fortress', box(2.4, 4.0, 11.0), 'stoneLight', s_ * 6.0, 11.6, 0.5, mods=[BEVEL(0.1, 1)])  # arms
cp('hl_fortress', box(14.0, 2.6, 12.0), 'stone', 0, 8.3, 0, mods=[BEVEL(0.1, 1)])  # the seat
cp('hl_fortress', box(8.0, 0.6, 9.0), 'banner', 0, 9.9, 0.8)  # a violet cushion
cp('hl_fortress', box(14.0, 30.0, 3.6), 'stone', 0, 15.0, -7.6, -0.08, [BEVEL(0.12, 1)])  # the backrest
for k in range(6):
    cp('hl_fortress', box(1.4, 1.4, 4.0), 'stoneLight', -6.0 + k * 2.4, 30.6, -8.8, -0.08, [BEVEL(0.04, 1)])
cp('hl_fortress', box(2.0, 3.0, 0.2), 'glow', 0, 21.0, -5.4, -0.08)  # lit windows in the back
cp('hl_fortress', box(1.4, 2.2, 0.2), 'glow', -3.6, 15.0, -5.4, -0.08)
cp('hl_fortress', box(1.4, 2.2, 0.2), 'glow', 3.6, 15.0, -5.4, -0.08)
# the honeycomb: a row of open hexagonal courts west of the tower, their wall tops zig-zagging up and down
# like a chair's carbons (each court a cyclohexane ring)
HR = 5.0
for i in range(4):
    hx, hz = -14.5 - i * HR * math.sqrt(3), FZ + 3 + (1.2 if i % 2 else 0)
    V = [(hx + math.sin(k / 6 * 2 * PI) * HR, hz + math.cos(k / 6 * 2 * PI) * HR) for k in range(6)]
    for k in range(6):
        (ax, az), (bx, bz) = V[k], V[(k + 1) % 6]
        wall_run((ax, 0, az), (bx, 0, bz), 9.0 if k % 2 == 0 else 6.5, 1.3)
    for k, (x, z) in enumerate(V):
        h = 10.5 if k % 2 == 0 else 6.0
        add('hl_fortress', box(1.6, h, 1.6), 'stoneLight', TRS((x, h / 2, z), (0, k / 6 * 2 * PI, 0)), [BEVEL(0.06, 1)])
        add('hl_fortress', box(0.5, 0.5, 0.5), 'crystal', TRS((x, h + 0.25, z), (0.6, 0.6, 0)))
# the cyclopropane tower: a cramped three-sided pyramid, east of the tower; then square keeps along the ridge
add('hl_fortress', cyl(5.6, 0.0, 10.0, 3), 'stoneDark', TRS((13.5, 5.0, FZ + 1)), smooth=False)
add('hl_fortress', box(0.8, 0.8, 0.8), 'crystal', TRS((13.5, 10.2, FZ + 1), (0.6, 0.6, 0)))
def sq_keep(x, z, w, h):
    add('hl_fortress', box(w, h, w), 'stone', TRS((x, h / 2, z)), [BEVEL(0.1, 1)])
    for k in range(4):
        for j in range(3):
            ang = k * PI / 2
            ox, oz = math.sin(ang) * (w / 2), math.cos(ang) * (w / 2)
            t = (j - 1) * w / 3
            add('hl_fortress', box(0.9, 1.0, 0.9), 'stoneLight', TRS((x + ox + math.cos(ang) * t, h + 0.5, z + oz - math.sin(ang) * t)), [BEVEL(0.04, 1)])
    add('hl_fortress', box(0.8, 1.4, 0.15), 'glow', TRS((x, h * 0.7, z + w / 2 + 0.05)))
sq_keep(22, FZ + 2, 6.5, 13)
sq_keep(30, FZ - 6, 5.0, 10)
sq_keep(36, FZ + 1, 4.0, 8)
wall_run((16.5, 0, FZ + 4), (22, 0, FZ + 4), 6, 1.4)
wall_run((25, 0, FZ + 2), (34, 0, FZ + 2), 6, 1.4)
# a curtain wall with the gatehouse facing the road (south), and a great hall roof inside the chair
wall_run((-9, 0, -48), (-4, 0, -48), 6, 1.6)
wall_run((4, 0, -48), (9, 0, -48), 6, 1.6)
for s in (-1, 1):
    add('hl_fortress', box(3.2, 10, 3.2), 'stone', TRS((s * 5.6, 5, -48)), [BEVEL(0.1, 1)])
    for k in range(3):
        add('hl_fortress', box(0.9, 0.9, 3.4), 'stoneLight', TRS((s * 5.6 - 1.1 + k * 1.1, 10.45, -48)), [BEVEL(0.04, 1)])
    add('hl_fortress', box(0.04, 3.2, 1.6), 'banner', TRS((s * 5.6, 6.8, -46.38), (0, PI / 2, 0)))
add('hl_fortress', box(8.0, 3.0, 3.2), 'stone', TRS((0, 8.5, -48)), [BEVEL(0.1, 1)])  # the arch lintel
add('hl_fortress', torus(4.0, 0.3, 24, 6, -PI / 2, PI / 2), 'stoneLight', TRS((0, 3.0, -46.4), (PI / 2, 0, PI / 2), scl=(1, 1, 1.6)))
# a dark moat under the drawbridge
add('hl_fortress', box(10, 0.2, 5), 'stoneDark', TRS((0, -0.15, -44.5)))

# ================================================================ the drawbridge (own frame: hinge at origin, deck along −z when lowered... it runs toward +z)
add('hl_drawbridge', box(6.4, 0.3, 6.0), 'wood', TRS((0, 0.15, 3.0)), [BEVEL(0.03, 1)])
for k in range(9):
    add('hl_drawbridge', box(6.5, 0.06, 0.08), 'steel', TRS((0, 0.32, 0.3 + k * 0.68)))
for s in (-1, 1):
    add('hl_drawbridge', tube([(s * 3.0, 0.3, 5.9), (s * 3.0, 4.0, 2.5), (s * 3.0, 8.0, -0.2)], [0.05, 0.05, 0.05], 6), 'steel')

# ================================================================ dungeon pieces
# a wall run: violet-grey ashlar courses, a plinth, a cornice and zigzag merlons along the top (inner face at x = 0, facing +x)
add('f4_wall', box(2.0, 8.0, 4.0), 'stoneDark', TRS((-1.0, 4.0, 0)))
for row in range(7):
    y = 0.6 + row * 1.0
    off = 0.0 if row % 2 == 0 else 1.0
    for k in range(3):
        z = -2 + off + k * 2.0
        if z - 1.0 < -2 or z + 1.0 > 2.001:
            continue
        add('f4_wall', box(0.18, 0.92, 1.9), 'stone' if (row + k) % 3 else 'stoneLight', TRS((0.02, y, z)), [BEVEL(0.05, 1)])
add('f4_wall', box(0.4, 0.5, 4.0), 'stoneLight', TRS((0.1, 0.25, 0)), [BEVEL(0.05, 1)])
add('f4_wall', box(0.5, 0.35, 4.0), 'stoneLight', TRS((0.12, 7.4, 0)), [BEVEL(0.05, 1)])
for k in range(2):  # zigzag merlons: up, down — the chair pattern runs along every wall
    z = -1 + k * 2
    add('f4_wall', box(1.6, 1.2 if k == 0 else 0.6, 1.4), 'stone', TRS((-0.8, 8.0 + (0.6 if k == 0 else 0.3), z)), [BEVEL(0.05, 1)])
add('f4_column', cyl(0.55, 0.6, 7.0, 16), 'stone', TRS((0, 3.5, 0)))
add('f4_column', cyl(0.85, 0.85, 0.5, 16), 'stoneLight', TRS((0, 0.25, 0)), [BEVEL(0.04, 1)])
add('f4_column', cyl(0.8, 0.6, 0.7, 16), 'stoneLight', TRS((0, 7.2, 0)), [BEVEL(0.04, 1)])
for k in range(8):
    a = k / 8 * 2 * PI
    add('f4_column', box(0.12, 6.0, 0.12), 'stoneDark', TRS((math.sin(a) * 0.57, 3.6, math.cos(a) * 0.57), (0, a, 0)))
# a chair carbon pad
add('f4_pad', cyl(1.1, 1.15, 0.6, 24), 'stone', TRS((0, 0.3, 0)), [BEVEL(0.04, 1)])
add('f4_pad', torus(1.1, 0.06, 32, 6), 'steel', TRS((0, 0.58, 0)))
add('f4_pad', torus(0.6, 0.035, 32, 4), 'glow', TRS((0, 0.61, 0)))
for k in range(6):
    a = k / 6 * 2 * PI
    add('f4_pad', box(0.18, 0.5, 0.08), 'steel', TRS((math.sin(a) * 1.13, 0.3, math.cos(a) * 1.13), (0, a, 0)))
# a walkway: a slab with low curbs
add('f4_bridge', box(2.2, 0.35, 1.0), 'stone', TRS((0, -0.175, 0)), [BEVEL(0.02, 1)])
for s in (-1, 1):
    add('f4_bridge', box(0.18, 0.2, 1.0), 'stoneLight', TRS((s * 1.05, 0.08, 0)))
# a ring altar
add('f4_altar', cyl(0.45, 0.55, 1.4, 12), 'stone', TRS((0, 0.7, 0)))
add('f4_altar', cyl(0.75, 0.75, 0.25, 16), 'stoneLight', TRS((0, 0.12, 0)), [BEVEL(0.04, 1)])
add('f4_altar', cyl(0.9, 0.6, 0.25, 16), 'stoneLight', TRS((0, 1.48, 0)), [BEVEL(0.04, 1)])
# the Ring-Flip Gauntlet: a dark steel glove, fingers up, a chair-ring sigil ringed by cyan arrows on the back
G = TRS((0, 0, 0))
add('f4_gauntlet', cyl(0.11, 0.09, 0.22, 16), 'steel', TRS((0, 0.11, 0)), [BEVEL(0.01, 1)])  # cuff
add('f4_gauntlet', torus(0.105, 0.012, 20, 4), 'stoneLight', TRS((0, 0.2, 0)))
add('f4_gauntlet', box(0.2, 0.16, 0.09), 'steel', TRS((0, 0.3, 0)), [BEVEL(0.02, 2)])  # back of the hand
for k in range(4):
    x = -0.072 + k * 0.048
    for j in range(3):
        add('f4_gauntlet', box(0.04, 0.06, 0.05), 'steel', TRS((x, 0.41 + j * 0.065, -0.005 * j)), [BEVEL(0.008, 1)])
add('f4_gauntlet', box(0.045, 0.1, 0.05), 'steel', TRS((0.12, 0.3, 0.02), (0, 0, -0.7)), [BEVEL(0.008, 1)])  # thumb
add('f4_gauntlet', torus(0.065, 0.008, 32, 4), 'glow', TRS((0, 0.3, 0.047), (PI / 2, 0, 0)))
for k in range(3):  # the arrows round the ring
    a = k / 3 * 2 * PI
    add('f4_gauntlet', cyl(0.016, 0.0, 0.03, 3), 'glow', TRS((math.sin(a) * 0.065, 0.3 + math.cos(a) * 0.065, 0.05), (0, 0, -a - PI / 2)), smooth=False)
hexpts = [(0.03 * math.sin(k / 6 * 2 * PI), 0.03 * math.cos(k / 6 * 2 * PI) * (1 if k % 2 else 0.6)) for k in range(6)]
for k in range(6):
    a, b = hexpts[k], hexpts[(k + 1) % 6]
    add('f4_gauntlet', tube([(a[0], 0.3 + a[1], 0.05), (b[0], 0.3 + b[1], 0.05)], [0.005, 0.005], 4), 'glow')

# ---------------------------------------------------------------- build, export (big ground parts get a colour pass instead of a bake)
objs = build_objects(MATS, 'fortress', smooth_parts=('hl_hills',))
BIG = ('hl_ground', 'hl_hills', 'hl_road', 'hl_fortress')
bake_ao({k: v for k, v in objs.items() if k not in BIG}, distance=0.4, samples=24, floor=0.6)
colour_pass(objs['hl_ground'], lambda p: 0.78 + 0.22 * fbm((p[0], 0, p[2]), 0.06, 3))
colour_pass(objs['hl_hills'], lambda p: 0.7 + 0.3 * min(1.0, max(0.0, p[1] / 6.0)))
colour_pass(objs['hl_road'], lambda p: 0.85 + 0.15 * fbm((p[0], 0, p[2]), 0.4, 2))
colour_pass(objs['hl_fortress'], lambda p: 0.62 + 0.38 * min(1.0, max(0.0, p[1] / 12.0)))
export_glb(objs, GLB)
if RENDERS:
    pl = [('hl_ground', TRS()), ('hl_hills', TRS()), ('hl_road', TRS()), ('hl_fortress', TRS()), ('hl_drawbridge', TRS((0, 0, -46.4)))]
    pl += [('f4_wall', TRS((60, 0, 0))), ('f4_column', TRS((62, 0, 3))), ('f4_pad', TRS((63, 0, 0))), ('f4_bridge', TRS((63, 0.6, 2.2))), ('f4_altar', TRS((65, 0, 0))), ('f4_gauntlet', TRS((66.5, 1.0, 0), scl=3))]
    preview(objs, pl, [('hills_view.png', (0, 4, 30), (0, 6, -50), 30), ('fortress_close.png', (-14, 6, -26), (0, 6, -60), 35),
                       ('pieces.png', (70, 3, 7), (63, 1.5, 0), 40)], RENDERS, sky='#6a5a8a', ground=None)
    print('RENDERS', RENDERS)
