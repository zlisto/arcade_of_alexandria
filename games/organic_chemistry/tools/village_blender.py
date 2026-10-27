"""Hydrogen Village kit for The Legend of Valence: builds each prop in Blender, bakes soft ambient
occlusion into its vertex colours, exports public/models/village.glb, and renders previews.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/village_blender.py -- <glb_path> <render_dir>

Every prop is built in its own frame (base on y = 0, front = +z) and placed by src/scenes/Village.jsx,
which still owns all collision. Coordinates are in the game frame (see tools/blkit.py).
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'village.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'stone': ('#8f897d', 0, 0.95), 'stoneDark': ('#6c675d', 0, 0.95), 'stoneLight': ('#a59f90', 0, 0.9),
    'plaster': ('#f1ece2', 0, 0.9), 'timber': ('#6b4a30', 0, 0.8), 'door': ('#5a3b24', 0, 0.75),
    'roof': ('#6f8a3a', 0, 0.9), 'wellRoof': ('#8e4436', 0, 0.75), 'glass': ('#ffd98a', 0, 0.3, 1.4),
    'metal': ('#2e2e30', 0.8, 0.4), 'petalR': ('#e0506a', 0, 0.7), 'petalY': ('#f2d24a', 0, 0.7),
    'leaf': ('#3f7a34', 0, 0.8), 'pine': ('#2f5c3a', 0, 0.85), 'oakLeaf': ('#4f8238', 0, 0.85), 'bark': ('#4a3426', 0, 0.9),
    'rock': ('#8a8580', 0, 0.95), 'cliff': ('#6f6a5c', 0, 0.95), 'hill': ('#7b9a52', 0, 0.95),
    'grass': ('#7fb653', 0, 0.9), 'petal': ('#ffffff', 0, 0.7), 'pollen': ('#f2c94a', 0, 0.7), 'stem': ('#3f7a34', 0, 0.8),
    'rope': ('#b59a6a', 0, 0.9), 'water': ('#3a9ac8', 0, 0.1),
    'caveRock': ('#4a4850', 0, 0.95), 'rimRock': ('#8d887b', 0, 0.95), 'torchMetal': ('#3a3530', 0.6, 0.5), 'path': ('#b89f74', 0, 1.0), 'pathRim': ('#8f7a58', 0, 1.0), 'groundGrass': ('#6f9a4e', 0, 0.95),
    'brambleLeaf': ('#355a2a', 0, 0.9), 'thorn': ('#5a4630', 0, 0.8),
}
R = lambda: rnd_state.__next__()
def _gen(seed):
    s = seed
    while True:
        s = (s * 16807) % 2147483647
        yield s / 2147483647
rnd_state = _gen(97)

def frustum_ring(r0, y0, r1, y1, seg=32, dip=0.0, jag=0.0):
    """An open frustum (bottom r0,y0 to top r1,y1) whose bottom edge can scallop (dip) and zig-zag (jag)."""
    bm = bmesh.new()
    bot, top = [], []
    for k in range(seg):
        a = 2 * PI * k / seg
        odd = k % 2
        rb = r0 * (1 - jag * odd)
        bot.append(bm.verts.new((rb * math.sin(a), y0 - dip * (1 - odd), rb * math.cos(a))))
        top.append(bm.verts.new((r1 * math.sin(a), y1, r1 * math.cos(a))))
    for k in range(seg):
        bm.faces.new((bot[k], bot[(k + 1) % seg], top[(k + 1) % seg], top[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def jag_cone(r, h, seg=12, droop=0.18, jag=0.22, rows=3):
    """A pine tier: a cone whose skirt zig-zags and droops at the tips."""
    bm = bmesh.new()
    rings = []
    for j in range(rows + 1):
        t = j / rows
        rr = r * (1 - t)
        ring = []
        for k in range(seg):
            a = 2 * PI * k / seg
            tip = (k % 2 == 0)
            rj = rr * (1 + (jag if tip else -jag * 0.3) * (1 - t))
            y = h * t - (droop if (tip and j == 0) else 0)
            ring.append(bm.verts.new((rj * math.sin(a), y, rj * math.cos(a))))
        rings.append(ring)
    for j in range(rows):
        for k in range(seg):
            bm.faces.new((rings[j][k], rings[j][(k + 1) % seg], rings[j + 1][(k + 1) % seg], rings[j + 1][k]))
    apex = bm.verts.new((0, h * 1.08, 0))
    for k in range(seg):
        bm.faces.new((rings[-1][k], rings[-1][(k + 1) % seg], apex))
    bm.faces.new(list(reversed(rings[0])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

# ================================================================ cottage (concept art: round, white, a moss dome, one tall white chimney)
CR = 2.3
for k in range(20):  # a low stone footing
    a = 2 * PI * k / 20
    st = rock_bm(1.0, seed=k * 3.1, sub=1, rough=0.18, flat=0.9)
    add('cottage', st, 'stone', TRS((math.sin(a) * (CR + 0.06), 0.12, math.cos(a) * (CR + 0.06)), (0, a, 0), (0.42, 0.16, 0.2)))
# whitewashed wall, bellied a little
wall = lathe([(CR, 0.2), (CR + 0.04, 0.8), (CR + 0.05, 1.5), (CR + 0.03, 2.2), (CR - 0.02, 2.9)], 36)
deform(wall, lambda v: (v.x * (1 + 0.012 * fbm(v, 3.0)), v.y, v.z * (1 + 0.012 * fbm(v, 3.0))))
add('cottage', wall, 'plaster')
# moss dome: a lumpy cushion from a thick rounded eave up to a soft crown
EAVE_R, EAVE_Y, DOME_H = CR + 0.42, 2.78, 1.85
prof = []
for i in range(9):
    t = i / 8
    prof.append((max(0.02, EAVE_R * math.cos(t * PI / 2) ** 0.85), EAVE_Y + DOME_H * math.sin(t * PI / 2)))
dome = lathe(prof, 36, close_bottom=True, close_top=True)
deform(dome, lambda v: (v.x * (1 + 0.05 * fbm((v.x, v.y, v.z), 1.6, 3)), v.y + 0.07 * fbm((v.z, v.x, v.y), 2.2, 2), v.z * (1 + 0.05 * fbm((v.x, v.y, v.z), 1.6, 3))))
add('cottage', dome, 'roof')
eave = torus(EAVE_R - 0.06, 0.2, 40, 8)
deform(eave, lambda v: (v.x, v.y + 0.05 * fbm(v, 2.5), v.z))
add('cottage', eave, 'roof', TRS((0, EAVE_Y, 0)))
# the tall white chimney, banded and capped (hydrogen makes one bond)
CH = (0.75, 0, -0.85)
add('cottage', box(0.52, 2.9, 0.52), 'plaster', TRS((CH[0], 4.15, CH[2])), [BEVEL(0.03, 2)])
for j in range(4):
    add('cottage', box(0.55, 0.04, 0.55), 'stoneLight', TRS((CH[0], 3.3 + j * 0.62, CH[2])))
add('cottage', box(0.66, 0.14, 0.66), 'stoneLight', TRS((CH[0], 5.62, CH[2])), [BEVEL(0.03, 1)])
add('cottage', box(0.4, 0.1, 0.4), 'stoneDark', TRS((CH[0], 5.72, CH[2])))
# arched door with a moss hood, stone steps
DZ = CR + 0.02
door = box(0.95, 1.6, 0.1)
add('cottage', door, 'door', TRS((0, 0.98, DZ)), [BEVEL(0.015, 2)])
add('cottage', cyl(0.475, 0.475, 0.1, 18), 'door', TRS((0, 1.78, DZ), (PI / 2, 0, 0)))
for x in (-0.22, 0.0, 0.22):
    add('cottage', box(0.012, 1.95, 0.02), 'timber', TRS((x, 1.15, DZ + 0.055)))
add('cottage', torus(0.55, 0.075, 18, 6, PI / 2, 3 * PI / 2), 'stoneLight', TRS((0, 1.78, DZ + 0.02), (PI / 2, 0, 0)))
for x in (-0.55, 0.55):
    add('cottage', box(0.15, 1.6, 0.16), 'stoneLight', TRS((x, 0.98, DZ + 0.02)), [BEVEL(0.02, 1)])
hood = hemi(0.78, 18, 6)
deform(hood, lambda v: (v.x, v.y + 0.03 * fbm(v, 3), v.z))
add('cottage', hood, 'roof', TRS((0, 2.32, DZ + 0.02), (0.25, 0, 0), (1.0, 0.42, 0.62)), [SOLID(0.05, -1)])  # a moss canopy over the door
add('cottage', sphere(0.045, 10, 8), 'metal', TRS((0.3, 1.0, DZ + 0.08)))
for j, (w, d) in enumerate(((1.25, 0.5), (1.05, 0.35))):
    add('cottage', rock_bm(1.0, seed=5.0 + j, sub=2, rough=0.08, flat=0.5), 'stone', TRS((0, 0.05 + j * 0.13, DZ + 0.38 - j * 0.14), scl=(w * 0.55, 0.16, d * 0.6)))
# two small round-topped windows, glowing warm
for a in (-0.82, 0.82):
    P = TRS((math.sin(a) * (CR + 0.03), 0, math.cos(a) * (CR + 0.03)), (0, a, 0))
    add('cottage', cyl(0.3, 0.3, 0.06, 18), 'glass', P @ TRS((0, 1.65, 0.0), (PI / 2, 0, 0)))
    add('cottage', torus(0.33, 0.06, 20, 6), 'stoneLight', P @ TRS((0, 1.65, 0.04), (PI / 2, 0, 0)))
    add('cottage', box(0.03, 0.6, 0.03), 'timber', P @ TRS((0, 1.65, 0.05)))
    add('cottage', box(0.6, 0.03, 0.03), 'timber', P @ TRS((0, 1.65, 0.05)))
    add('cottage', box(0.5, 0.07, 0.14), 'stoneLight', P @ TRS((0, 1.28, 0.07)), [BEVEL(0.015, 1)])

# a shrub (instanced round the cottages): three leafy lumps
for k, (x, y, z, r) in enumerate(((0, 0.32, 0, 0.42), (0.38, 0.24, 0.1, 0.32), (-0.34, 0.22, -0.05, 0.3))):
    add('shrub', rock_bm(r, seed=70 + k * 2.1, sub=2, rough=0.3, flat=0.85), 'oakLeaf', TRS((x, y, z)))

# ================================================================ trees (instanced in the game)
add('pine', cyl(0.24, 0.12, 1.4, 9), 'bark', TRS((0, 0.7, 0)))
add('pine', cyl(0.38, 0.24, 0.25, 9), 'bark', TRS((0, 0.12, 0)))
for i, (r, y0, h) in enumerate(((1.55, 0.95, 1.5), (1.25, 1.65, 1.35), (0.95, 2.3, 1.2), (0.62, 2.95, 1.05))):
    tier = jag_cone(r, h, 14, droop=0.22, jag=0.2)
    deform(tier, lambda v, i=i: (v.x + 0.06 * fbm((v.x, v.y + i, v.z), 2.0), v.y, v.z + 0.06 * fbm((v.z, v.y - i, v.x), 2.0)))
    add('pine', tier, 'pine', TRS((0, y0, 0), (0, i * 0.4, 0)))
add('oak', cyl(0.3, 0.17, 1.9, 10), 'bark', TRS((0, 0.95, 0)))
add('oak', cyl(0.45, 0.3, 0.3, 10), 'bark', TRS((0, 0.15, 0)))
for s in (-1, 1):
    add('oak', tube([(0, 1.6, 0), (s * 0.45, 2.1, 0.1), (s * 0.75, 2.5, 0.15)], [0.14, 0.09, 0.05], 7), 'bark')
for k, (x, y, z, r) in enumerate(((0, 3.0, 0, 1.25), (-0.85, 2.55, 0.25, 0.95), (0.9, 2.6, -0.1, 0.95), (0.2, 2.45, 0.85, 0.85), (-0.2, 2.5, -0.85, 0.9), (0.1, 3.7, 0.1, 0.8))):
    add('oak', rock_bm(r, seed=k * 2.3 + 1, sub=2, rough=0.22, flat=0.85), 'oakLeaf', TRS((x, y, z)))

# ================================================================ rocks, grass, flowers
for k in range(3):
    add('rock%d' % k, rock_bm(1.0, seed=10 + k * 7.7, sub=3, rough=0.34, flat=0.7 + 0.1 * k), 'rock', TRS((0, 0.26, 0)))
tuft = bmesh.new()
for k in range(7):
    a = 2 * PI * k / 7 + 0.3 * (k % 2)
    h = 0.28 + 0.12 * ((k * 37) % 5) / 4
    lean = 0.12 + 0.05 * (k % 3)
    b0 = tuft.verts.new((math.sin(a + 1.5) * 0.025, 0, math.cos(a + 1.5) * 0.025))
    b1 = tuft.verts.new((-math.sin(a + 1.5) * 0.025, 0, -math.cos(a + 1.5) * 0.025))
    m0 = tuft.verts.new((math.sin(a) * lean * 0.5 + math.sin(a + 1.5) * 0.018, h * 0.55, math.cos(a) * lean * 0.5 + math.cos(a + 1.5) * 0.018))
    m1 = tuft.verts.new((math.sin(a) * lean * 0.5 - math.sin(a + 1.5) * 0.018, h * 0.55, math.cos(a) * lean * 0.5 - math.cos(a + 1.5) * 0.018))
    tp = tuft.verts.new((math.sin(a) * lean, h, math.cos(a) * lean))
    tuft.faces.new((b0, b1, m1, m0))
    tuft.faces.new((m0, m1, tp))
add('tuft', tuft, 'grass')
for k in range(5):
    a = 2 * PI * k / 5
    add('flowerHead', sphere(0.06, 8, 6), 'petal', TRS((math.sin(a) * 0.06, 0.32, math.cos(a) * 0.06), scl=(1, 0.35, 0.65)))
add('flowerStem', sphere(0.032, 8, 6), 'pollen', TRS((0, 0.335, 0)))
add('flowerStem', tube([(0, 0, 0), (0.02, 0.15, 0), (0, 0.31, 0)], [0.012, 0.01, 0.008], 5), 'stem')
add('flowerStem', sphere(0.04, 6, 4), 'stem', TRS((0.04, 0.12, 0), scl=(1.4, 0.3, 0.7)))

# ================================================================ fence post (the hydrogen ball on top stays in the game)
add('fencePost', box(0.16, 1.0, 0.16), 'timber', TRS((0, 0.5, 0)), [BEVEL(0.03, 2)])
add('fencePost', box(0.2, 0.06, 0.2), 'timber', TRS((0, 0.94, 0)), [BEVEL(0.02, 1)])

# ================================================================ the well (water surface stays in the game: it changes when sealed)
for c in range(3):
    n = 15
    for k in range(n):
        a = 2 * PI * (k + 0.5 * (c % 2)) / n
        blk = rock_bm(1.0, seed=c * 20 + k, sub=1, rough=0.12, flat=1.0)
        add('well', blk, 'stone' if (k + c) % 3 else 'stoneDark', TRS((math.sin(a) * 1.22, 0.16 + c * 0.3, math.cos(a) * 1.22), (0, a, 0), (0.27, 0.16, 0.17)))
add('well', torus(1.22, 0.13, 36, 8), 'stoneLight', TRS((0, 0.98, 0), scl=(1, 0.6, 1)))
add('well', lathe([(1.04, 0.0), (1.04, 0.98)], 28, False, False), 'stoneDark', None, [SOLID(0.04)])  # inner wall: the water never shows through the joints
for s in (-1, 1):
    add('well', box(0.18, 2.3, 0.18), 'timber', TRS((s * 1.12, 1.95, 0)), [BEVEL(0.025, 2)])
    add('well', box(0.1, 0.5, 0.1), 'timber', TRS((s * 0.9, 2.6, 0), (0, 0, -s * 0.8)), [BEVEL(0.015, 1)])
for s in (-1, 1):  # gabled roof with shingle rows
    P = TRS((0, 3.08, s * 0.42), (s * 0.72, 0, 0))
    add('well', box(2.9, 0.07, 1.15), 'timber', P, [BEVEL(0.015, 1)])
    for j in range(4):
        add('well', box(3.0, 0.05, 0.34), 'wellRoof', P @ TRS((0, 0.05 + 0.006 * j, -0.42 + j * 0.27), (-0.12, 0, 0)), [BEVEL(0.01, 1)])
add('well', box(3.1, 0.12, 0.14), 'timber', TRS((0, 3.42, 0)), [BEVEL(0.02, 1)])
add('well', cyl(0.07, 0.07, 2.45, 10), 'timber', TRS((0, 2.05, 0), (0, 0, PI / 2)))
add('well', box(0.06, 0.38, 0.06), 'metal', TRS((1.3, 1.9, 0.0)))
add('well', cyl(0.035, 0.035, 0.3, 8), 'timber', TRS((1.42, 1.72, 0.0), (0, 0, PI / 2)))
add('well', cyl(0.011, 0.011, 0.75, 6), 'rope', TRS((0, 1.65, 0)))
add('well', cyl(0.17, 0.2, 0.26, 12), 'timber', TRS((0, 1.15, 0)), [BEVEL(0.01, 1)])
add('well', torus(0.19, 0.012, 16, 5), 'metal', TRS((0, 1.2, 0)))

# ================================================================ methane pedestal (carved, octagonal)
add('pedestal', cyl(0.48, 0.46, 0.14, 8), 'stoneDark', TRS((0, 0.07, 0)), [BEVEL(0.02, 1)])
add('pedestal', cyl(0.38, 0.32, 0.66, 8), 'stone', TRS((0, 0.47, 0)), [BEVEL(0.015, 1)])
for y in (0.3, 0.64):
    add('pedestal', torus(0.36, 0.02, 8, 4), 'stoneDark', TRS((0, y, 0), (0, PI / 8, 0)))
add('pedestal', cyl(0.36, 0.45, 0.14, 8), 'stoneLight', TRS((0, 0.86, 0)), [BEVEL(0.02, 1)])

# ================================================================ the cave (frame: the CaveMouth group). A grassy hillside cut by a rock-rimmed tunnel.
# The walkable passage (|x| < 2.2, below y 4.1) stays clear; the tunnel ellipse is 2.35 wide by 3.7 high.
TW, TH = 2.35, 3.7
def arch_h(x):
    return TH * math.sqrt(max(0.0, 1 - (x / TW) ** 2))
def hill_y(x, z):
    h = 11.5 * math.exp(-((x / 12.5) ** 2) - (((z + 8.5) / 9.5) ** 2))
    h += 4.0 * math.exp(-(((x + 11) / 6) ** 2) - (((z + 4) / 6) ** 2)) + 3.5 * math.exp(-(((x - 12) / 6) ** 2) - (((z + 5) / 6) ** 2))
    h += 0.5 * fbm((x, 0, z), 0.18, 3)
    return max(0.0, h - 0.5)
hb = bmesh.new()
NX, NZ, X0, X1, Z0, Z1 = 88, 60, -22.0, 22.0, -30.0, 3.0
grid = []
for j in range(NZ + 1):
    row = []
    for i in range(NX + 1):
        x = X0 + (X1 - X0) * i / NX
        z = Z0 + (Z1 - Z0) * j / NZ
        row.append(hb.verts.new((x, hill_y(x, z), z)))
    grid.append(row)
for j in range(NZ):
    for i in range(NX):
        q = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]]
        cx = sum(v.co.x for v in q) / 4
        cy = sum(v.co.y for v in q) / 4
        cz = sum(v.co.z for v in q) / 4
        if (cx / (TW + 0.15)) ** 2 + (cy / (TH + 0.15)) ** 2 < 1.0 and cz > -12.5:
            continue  # the mouth: leave a hole where the tunnel runs into the hill
        if all(v.co.y < 0.01 for v in q):
            continue  # flat ground is drawn by the level
        hb.faces.new(q)
bmesh.ops.delete(hb, geom=[v for v in hb.verts if not v.link_faces], context='VERTS')
bmesh.ops.recalc_face_normals(hb, faces=hb.faces)
for f in hb.faces:
    if f.normal.y < 0:
        f.normal_flip()
add('caveHill', hb, 'hill')
# the tunnel: an elliptical rocky bore seen from inside, running back into the hill
tb = bmesh.new()
rings = []
NA, NL = 18, 16
for j in range(NL + 1):
    u = j / NL
    z = 1.2 - 12.5 * u
    narrow = 1 - 0.45 * u * u  # the bore narrows as it runs into the dark
    bend = 1.4 * u * u          # and curves gently away, so you can't see its end
    ring = []
    for i in range(NA + 1):
        th = PI * i / NA
        x, y = TW * math.cos(th), arch_h(TW * math.cos(th)) if 0 < i < NA else 0.0
        k = (1 + 0.08 * fbm((x, y, z), 1.2, 2)) * narrow
        ring.append(tb.verts.new((x * k + bend, y * k, z)))
    rings.append(ring)
for j in range(NL):
    for i in range(NA):
        tb.faces.new((rings[j][i + 1], rings[j][i], rings[j + 1][i], rings[j + 1][i + 1]))
add('caveTunnel', tb, 'caveRock')
fl = bmesh.new()
fv = []
for j in range(NL + 1):
    u = j / NL
    z, w, b = 1.2 - 12.5 * u, TW * (1 - 0.45 * u * u), 1.4 * u * u
    fv.append((fl.verts.new((-w + b, 0.02, z)), fl.verts.new((w + b, 0.02, z))))
for j in range(NL):
    fl.faces.new((fv[j][0], fv[j][1], fv[j + 1][1], fv[j + 1][0]))
for f in fl.faces:
    if f.normal.y < 0:
        f.normal_flip()
add('caveTunnel', fl, 'caveRock')
# a rim of boulders round the mouth, and a few more on the slope
for k in range(19):
    th = k / 18 * PI
    x, y = (TW + 0.6) * math.cos(th), (TH + 0.5) * math.sin(th)
    sc = (0.8 + 0.35 * hash3(k, 3, 1)) * (1.35 if (th < 0.5 or th > PI - 0.5) else 1.0)
    add('caveCliff', rock_bm(1.0, seed=k * 2.7, sub=3, rough=0.34, flat=0.9), 'rimRock', TRS((x, max(0.25, y), 0.55 + 0.25 * hash3(k, 1, 2)), (hash3(k, 2, 2) * 3, hash3(k, 3, 3) * 6, 0), (sc * 1.1, sc, sc * 0.9)))
for k in range(14):
    x = (hash3(k, 9, 1) - 0.5) * 30
    z = -2 - hash3(k, 9, 2) * 16
    if abs(x) < 4 and z > -9:
        continue
    sc = 0.6 + hash3(k, 9, 3) * 1.4
    add('caveCliff', rock_bm(1.0, seed=k * 4.1 + 2, sub=3, rough=0.32, flat=0.7), 'rimRock', TRS((x, hill_y(x, z) - 0.45 * sc, z), (0, hash3(k, 9, 4) * 6, 0), sc))
# the mountain behind, with lobes
for (x, z, r, h) in ((0, -26, 17, 17), (-9, -22, 9, 11), (10, -24, 10, 12)):
    m = lathe([(r, -1), (r * 0.82, h * 0.3), (r * 0.55, h * 0.62), (r * 0.25, h * 0.88), (0.3, h)], 26, False, True)
    deform(m, lambda v: (v.x * (1 + 0.07 * fbm(v, 0.25, 3)), v.y, v.z * (1 + 0.07 * fbm((v.z, v.y, v.x), 0.25, 3))))
    add('caveCliff', m, 'hill', TRS((x, 0, z)))

# ================================================================ paths (world frame): winding ribbons with a darker rim, and a plaza round the well
def catmull(pts, step=0.6):
    out = []
    P = [Vector((p[0], 0, p[1])) for p in pts]
    P = [P[0]] + P + [P[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        n = max(2, int((p2 - p1).length / step))
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2])
    return out
def ribbon(pts, half=1.4, rim=0.32, y=0.018, seed=0):
    c = catmull(pts)
    road, edge = bmesh.new(), bmesh.new()
    L, Rr, LR, RR = [], [], [], []
    for i, p in enumerate(c):
        t = (c[min(i + 1, len(c) - 1)] - c[max(i - 1, 0)]).normalized()
        n = Vector((-t.z, 0, t.x))
        w = half * (1 + 0.12 * vnoise((p.x + seed, 0, p.z), 0.7)) * min(1.0, 0.35 + i / 8.0) * min(1.0, 0.35 + (len(c) - 1 - i) / 8.0)
        L.append(road.verts.new(p + n * w + Vector((0, y, 0))))
        Rr.append(road.verts.new(p - n * w + Vector((0, y, 0))))
        LR.append((edge.verts.new(p + n * w + Vector((0, y - 0.001, 0))), edge.verts.new(p + n * (w + rim * (0.7 + 0.6 * vnoise((p.z, 0, p.x + seed), 1.3))) + Vector((0, y - 0.004, 0)))))
        RR.append((edge.verts.new(p - n * w + Vector((0, y - 0.001, 0))), edge.verts.new(p - n * (w + rim * (0.7 + 0.6 * vnoise((p.x, 0, p.z - seed), 1.3))) + Vector((0, y - 0.004, 0)))))
    for i in range(len(c) - 1):
        road.faces.new((L[i], Rr[i], Rr[i + 1], L[i + 1]))
        edge.faces.new((LR[i][1], LR[i][0], LR[i + 1][0], LR[i + 1][1]))
        edge.faces.new((RR[i][0], RR[i][1], RR[i + 1][1], RR[i + 1][0]))
    for b in (road, edge):
        for f in b.faces:
            if f.normal.y < 0:
                f.normal_flip()
    return road, edge
for k, (pts, half, y) in enumerate(((((0, 15), (0.7, 9), (-0.5, 3), (0.5, -4), (-0.6, -11), (0.4, -18), (-0.3, -25), (0, -31), (0, -37)), 1.45, 0.02),
                                    (((-0.2, -2.0), (2.6, -3.4), (5.0, -3.0)), 1.15, 0.022),
                                    (((0.6, -0.6), (6, 0.4), (14, -0.6), (22, 0.5), (30, -0.4), (38, 0.3), (47, 0.0), (64, 0.0)), 1.35, 0.024))):
    road, edge = ribbon(pts, half, 0.34, y, k * 7.0)
    add('paths', road, 'path')
    add('paths', edge, 'pathRim')
plaza = bmesh.new()
cv = plaza.verts.new((7, 0.026, -3))
ring = []
for i in range(28):
    a = 2 * PI * i / 28
    r = 3.3 * (1 + 0.08 * vnoise((math.cos(a) * 3, 0, math.sin(a) * 3), 1.0))
    ring.append(plaza.verts.new((7 + math.cos(a) * r, 0.026, -3 + math.sin(a) * r)))
for i in range(28):
    plaza.faces.new((cv, ring[(i + 1) % 28], ring[i]))
for f in plaza.faces:
    if f.normal.y < 0:
        f.normal_flip()
add('paths', plaza, 'path')

# ================================================================ ground and the horizon (world frame)
gb = bmesh.new()
GX = 44
gv = []
for j in range(46):
    row = []
    for i in range(45):
        x = -GX + 2 * GX * i / 44
        z = -46 + 90 * j / 45
        row.append(gb.verts.new((x, 0.0, z)))
    gv.append(row)
for j in range(45):
    for i in range(44):
        gb.faces.new((gv[j][i], gv[j + 1][i], gv[j + 1][i + 1], gv[j][i + 1]))
for f in gb.faces:
    if f.normal.y < 0:
        f.normal_flip()
add('ground', gb, 'groundGrass')
skirt = bmesh.new()
inner = [skirt.verts.new((math.cos(2 * PI * i / 32) * 60, -0.03, math.sin(2 * PI * i / 32) * 60)) for i in range(32)]
outer = [skirt.verts.new((math.cos(2 * PI * i / 32) * 260, -0.03, math.sin(2 * PI * i / 32) * 260)) for i in range(32)]
sq = [skirt.verts.new(c) for c in ((-GX, -0.031, -46), (GX, -0.031, -46), (GX, -0.031, 44), (-GX, -0.031, 44))]
for i in range(32):
    skirt.faces.new((inner[i], outer[i], outer[(i + 1) % 32], inner[(i + 1) % 32]))
# fill between the square ground and the inner ring with a fan from the ring
for i in range(32):
    p = inner[i].co
    q = inner[(i + 1) % 32].co
    a = Vector((max(-GX, min(GX, p.x)), -0.031, max(-46, min(44, p.z))))
    b = Vector((max(-GX, min(GX, q.x)), -0.031, max(-46, min(44, q.z))))
    va, vb = skirt.verts.new(a), skirt.verts.new(b)
    skirt.faces.new((va, inner[i], inner[(i + 1) % 32], vb))
for f in skirt.faces:
    if f.normal.y < 0:
        f.normal_flip()
add('horizon', skirt, 'groundGrass')
for k in range(16):  # rolling hills all round, beyond the village fence
    a = 2 * PI * k / 16 + 0.2 * hash3(k, 1, 1)
    d = 62 + 22 * hash3(k, 2, 1)
    r = 16 + 14 * hash3(k, 3, 1)
    h = 6 + 9 * hash3(k, 4, 1)
    if a < 0.4 or a > 2 * PI - 0.4:
        continue  # the east road runs out between the hills
    if -2.2 < a < -0.9:  # the mountain covers the north already
        h *= 0.6
    m = lathe([(r, -0.5), (r * 0.78, h * 0.35), (r * 0.48, h * 0.75), (r * 0.15, h * 0.97), (0.3, h)], 24, False, True)
    deform(m, lambda v: (v.x, v.y + 0.6 * fbm(v, 0.12, 2) * (v.y > 0.2), v.z))
    add('horizon', m, 'hill', TRS((math.cos(a) * d, 0, math.sin(a) * d), scl=(1.3, 1, 1)))

# ================================================================ east gate (frame: the EastGate group)
for s in (-1, 1):
    for j in range(3):
        add('gate', box(1.2 - j * 0.06, 1.0, 1.2 - j * 0.06), 'stoneLight' if j % 2 else 'stone', TRS((0, 0.5 + j * 1.02, s * 3.6), (0, 0.04 * j, 0)), [BEVEL(0.05, 2)])
    add('gate', box(1.5, 0.3, 1.5), 'stoneLight', TRS((0, 3.2, s * 3.6)), [BEVEL(0.05, 2)])
add('gate', box(0.5, 0.4, 8.6), 'timber', TRS((0, 3.6, 0)), [BEVEL(0.04, 2)])
for s in (-1, 1):
    add('gate', cyl(0.09, 0.09, 0.6, 8), 'timber', TRS((0, 3.6, s * 4.0), (0, 0, PI / 2)))

# a little gabled roof over the gate, and drystone walls running off either side
for s in (-1, 1):
    add('gate', box(1.6, 0.07, 9.0), 'wellRoof', TRS((s * 0.48, 4.05, 0), (0, 0, -s * 0.62)), [BEVEL(0.015, 1)])
add('gate', box(0.12, 0.12, 9.1), 'timber', TRS((0, 4.32, 0)))
for s in (-1, 1):
    for k in range(26):
        z = s * (4.5 + k * 0.62)
        for row in range(3):
            add('gate', rock_bm(1.0, seed=k * 3 + row + (s + 1) * 50, sub=1, rough=0.15, flat=0.9), 'stone' if (k + row) % 3 else 'stoneDark',
                TRS((0.1 * hash3(k, row, s), 0.22 + row * 0.38, z + 0.31 * (row % 2)), (0, hash3(row, k, s) * 0.6, 0), (0.42, 0.21, 0.36)))
# brambles that choke the east road until the first shard is won (instanced in the game)
for k, (x, y, z, r) in enumerate(((0, 0.45, 0, 0.55), (0.4, 0.35, 0.35, 0.42), (-0.35, 0.32, -0.3, 0.4), (0.1, 0.75, -0.1, 0.38))):
    add('bramble', rock_bm(r, seed=90 + k, sub=2, rough=0.35, flat=0.85), 'brambleLeaf', TRS((x, y, z)))
for k in range(18):
    a = 2 * PI * k / 18
    el = 0.3 + 0.6 * hash3(k, 7, 1)
    d = Vector((math.cos(a) * math.cos(el), math.sin(el), math.sin(a) * math.cos(el)))
    base = Vector((0, 0.45, 0)) + d * 0.5
    add('bramble', tube([tuple(base), tuple(base + d * 0.18)], [0.02, 0.0015], 4), 'thorn')

# ================================================================ torch post (the flame is added in the game)
add('torch', cyl(0.07, 0.05, 1.5, 8), 'timber', TRS((0, 0.75, 0)), [BEVEL(0.01, 1)])
add('torch', cyl(0.14, 0.14, 0.12, 10), 'stone', TRS((0, 0.06, 0)), [BEVEL(0.02, 1)])
add('torch', cyl(0.08, 0.16, 0.14, 10, True), 'torchMetal', TRS((0, 1.55, 0)))
for k in range(4):
    a = k * PI / 2 + PI / 4
    add('torch', box(0.02, 0.22, 0.02), 'torchMetal', TRS((math.sin(a) * 0.11, 1.42, math.cos(a) * 0.11), (0.35 * math.cos(a), 0, -0.35 * math.sin(a))))

# ---------------------------------------------------------------- build, bake, export
objs = build_objects(MATS, 'village', smooth_parts=('pine', 'oak', 'rock0', 'rock1', 'rock2', 'tuft', 'flowerHead', 'flowerStem', 'caveCliff', 'caveHill', 'caveTunnel', 'shrub', 'bramble', 'horizon', 'ground', 'paths'))
NOISE_COLOURED = ('ground', 'horizon', 'caveHill', 'paths', 'caveTunnel')
bake_ao(objs, distance=1.0, samples=32, floor=0.4, skip=('tuft', 'flowerHead', 'flowerStem') + NOISE_COLOURED)
# big surfaces: soft patches of lighter and darker grass instead of baked occlusion
for name in NOISE_COLOURED:
    me = objs[name].data
    attr = me.color_attributes.get('AO') or me.color_attributes.new('AO', 'FLOAT_COLOR', 'POINT')
    me.color_attributes.active_color = attr
    for i, v in enumerate(me.vertices):
        gx, gy, gz = v.co.x, v.co.z, -v.co.y
        if name == 'caveTunnel':
            depth = max(0.0, min(1.0, -gz / 9.0))
            a = 0.85 - 0.55 * depth + 0.08 * fbm((gx, gy, gz), 0.8, 2)
        elif name == 'paths':
            a = 0.92 + 0.08 * fbm((gx, 0, gz), 0.35, 2)
        else:
            a = 0.86 + 0.14 * fbm((gx, 0, gz), 0.06, 3) + 0.05 * fbm((gx, 0, gz), 0.4, 2)
        attr.data[i].color = (a, a, a, 1.0)
# grass tufts: darker at the root, bright at the tips (no bake needed)
for name in ('tuft', 'flowerHead', 'flowerStem'):
    me = objs[name].data
    attr = me.color_attributes.get('AO') or me.color_attributes.new('AO', 'FLOAT_COLOR', 'POINT')
    me.color_attributes.active_color = attr
    for i, v in enumerate(me.vertices):
        hgt = v.co.z  # Blender z = game y
        a = 0.72 + 0.28 * min(1.0, hgt / 0.35) if name == 'tuft' else 1.0
        attr.data[i].color = (a, a, a, 1.0)
export_glb(objs, GLB)

if RENDERS:
    pl = [('cottage', TRS((0, 0, 0), (0, 0.3, 0))), ('well', TRS((5.5, 0, 1.5))), ('pedestal', TRS((3.5, 0, 3.4))),
          ('pine', TRS((-5, 0, -4), scl=1.1)), ('oak', TRS((-3.5, 0, -7))), ('pine', TRS((7, 0, -6), scl=0.9)),
          ('rock0', TRS((-3, 0, 3), scl=0.7)), ('rock1', TRS((2.6, 0, 5.5), scl=0.5)), ('rock2', TRS((-6, 0, 1.5), scl=0.9)),
          ('fencePost', TRS((-2, 0, 5))), ('fencePost', TRS((-1, 0, 5)))]
    for k in range(120):
        a = next(rnd_state) * 2 * PI
        d = 2.4 + next(rnd_state) * 7
        pl.append(('tuft', TRS((math.cos(a) * d, 0, math.sin(a) * d), (0, a, 0))))
    for k in range(30):
        a = next(rnd_state) * 2 * PI
        d = 2.6 + next(rnd_state) * 6
        pl.append(('flowerHead', TRS((math.cos(a) * d, 0, math.sin(a) * d))))
        pl.append(('flowerStem', TRS((math.cos(a) * d, 0, math.sin(a) * d))))
    preview(objs, pl, [('village_a.png', (6, 4.2, 11), (1.5, 1.6, 0), 32), ('cottage_close.png', (2.2, 2.2, 5.8), (0, 2.0, 0), 35),
                       ('well_close.png', (8.5, 2.6, 5.5), (5.5, 1.5, 1.5), 40)], RENDERS)
    # the cave mouth and the gate on their own
    for o in list(bpy.data.collections['preview'].objects):
        bpy.data.objects.remove(o)
    preview(objs, [('caveCliff', TRS()), ('caveHill', TRS()), ('caveTunnel', TRS()), ('gate', TRS((-20, 0, 10))), ('bramble', TRS((-20, 0, 8)))], [('cave.png', (5, 4, 18), (0, 4, -4), 30), ('gate.png', (-14, 3, 16), (-20, 2, 8), 35)], RENDERS, ground='#6f9a4e')
    print('RENDERS', RENDERS)
