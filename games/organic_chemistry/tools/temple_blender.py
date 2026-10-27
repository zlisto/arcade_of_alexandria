"""The Tide Temple (World 2 dungeon) for The Legend of Valence, exported to public/models/temple.glb.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/temple_blender.py -- <glb_path> <render_dir>

An open-air temple standing in the sea (assets/locations/world-2-tide-temple.png): pale dressed-stone
floors on deep piers, low walls with a wave frieze, carved pillars in red (electron-rich, delta-) and blue
(electron-poor, delta+), a stepped tower with a glowing orb beyond the Hydra's pool, and giant pillars
rising from the sea all round. One part per room (world frame, rooms along -z, |x| < 9; collision stays in
src/scenes/Temple.jsx):
  tmp_entrance tmp_2-1 tmp_2-2 tmp_2-3 tmp_2-4 tmp_2-5 tmp_boss   and   tmp_horizon
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'temple.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'floor': ('#9fb0b8', 0, 0.8), 'floorDark': ('#7a909a', 0, 0.85), 'trim': ('#d8d0bc', 0, 0.8), 'wall': ('#5c707b', 0, 0.9),
    'wallDark': ('#46585f', 0, 0.95), 'pillarRed': ('#c0394b', 0, 0.55), 'pillarBlue': ('#2f6fd8', 0, 0.55), 'wood': ('#8a6440', 0, 0.9),
    'woodDark': ('#5a3c26', 0, 0.9), 'glow': ('#7ff4ff', 0, 0.3, 1.6), 'orb': ('#9ff6ff', 0, 0.3, 3.0), 'gold': ('#c9a24a', 0.85, 0.3),
    'algae': ('#3f6a4a', 0, 0.95),
}
W = 9.0
ROOMS = [('entrance', 10, -16), ('2-1', -16, -36), ('2-2', -36, -54), ('2-3', -54, -84), ('2-4', -84, -110), ('2-5', -110, -140), ('boss', -140, -178)]
TIERS = [(0.0, (-84, -89)), (1.2, (-91.5, -96)), (2.4, (-98.5, -103)), (3.6, (-105.5, -110))]
LOCKS = [-89, -96, -103]
POOL = ((-6.5, 6.5), (-164.5, -151.5))
AX = 13.0

def room_of(z):
    for (rid, a, b) in ROOMS:
        if a >= z > b:
            return 'tmp_' + rid
    return 'tmp_boss'

def slab(x0, z0, x1, z1, y=0.0, depth=2.6, tile=1.5, mat='floor', seed=0.0, edge_frieze=True):
    """A dressed-stone platform (top at y) on the sea: flagstones, a pale moulding round the top edge,
    a deep base with a wave frieze, algae at the waterline. z0 > z1. Split across rooms automatically."""
    nx = max(1, int(round((x1 - x0) / tile)))
    nz = max(1, int(round((z0 - z1) / tile)))
    cx, cz = (x1 - x0) / nx, (z0 - z1) / nz
    for i in range(nx):
        for j in range(nz):
            x = x0 + (i + 0.5) * cx
            z = z0 - (j + 0.5) * cz
            h = 0.06 + 0.012 * hash3(i + seed, j, 1)
            m = mat if hash3(i, j + seed, 2) > 0.25 else 'floorDark'
            add(room_of(z), box(cx - 0.04, h, cz - 0.04), m, TRS((x, y - 0.06 + h / 2, z)), smooth=False)
    # the body of the platform under the flagstones, down into the sea
    zs = sorted(set([z0, z1] + [b for (_, a, b) in ROOMS if z0 > b > z1]), reverse=True)
    for a, b in zip(zs[:-1], zs[1:]):
        seg = room_of((a + b) / 2)
        add(seg, box(x1 - x0, depth, a - b), 'wallDark', TRS(((x0 + x1) / 2, y - 0.06 - depth / 2, (a + b) / 2)), smooth=False)
        if edge_frieze:
            for (ex, ez, ew, ed) in (((x0 + x1) / 2, a + 0.05, x1 - x0 + 0.2, 0.2), ((x0 + x1) / 2, b - 0.05, x1 - x0 + 0.2, 0.2)):
                add(seg, box(ew, 0.18, ed), 'trim', TRS((ex, y - 0.09, ez)), [BEVEL(0.03, 1)], smooth=False)
            add(seg, box(x1 - x0 + 0.06, 0.25, a - b + 0.06), 'algae', TRS(((x0 + x1) / 2, -0.62, (a + b) / 2)), smooth=False)

def pillar(seg, x, z, y, red, h=6.0):
    """A carved temple pillar (concept): base, banded shaft with incised rings, a wide capital."""
    mat = 'pillarRed' if red else 'pillarBlue'
    add(seg, box(1.15, 0.24, 1.15), 'trim', TRS((x, y + 0.12, z)), [BEVEL(0.04, 1)], smooth=False)
    add(seg, lathe([(0.55, 0.24), (0.5, 0.42), (0.46, 0.5)], 16, False, False), 'trim', TRS((x, y, z)))
    shaft = cyl(0.44, 0.4, h - 0.9, 16)
    add(seg, shaft, mat, TRS((x, y + 0.5 + (h - 0.9) / 2, z)))
    for k in range(3):  # carved bands
        yy = y + 1.4 + k * (h - 2.4) / 2
        add(seg, torus(0.44, 0.05, 16, 4), 'trim', TRS((x, yy, z)))
        for q in range(4):  # incised wave glyphs on each band
            a = q * PI / 2 + k
            add(seg, box(0.22, 0.06, 0.03), 'trim', TRS((x + math.sin(a) * 0.44, yy + 0.35, z + math.cos(a) * 0.44), (0, a, 0.5)))
    add(seg, lathe([(0.42, y + h - 0.45), (0.58, y + h - 0.2), (0.62, y + h - 0.1)], 16, False, False), 'trim', TRS((x, 0, z)))
    add(seg, box(1.3, 0.3, 1.3), 'trim', TRS((x, y + h + 0.05, z)), [BEVEL(0.05, 1)], smooth=False)

def pillar_row(z0, z1, x=W - 0.4, y=0.0, step=4.0):
    z = z0 - 1
    i = 0
    while z > z1:
        for s in (-1, 1):
            red = (i + (1 if s > 0 else 0)) % 2 == 1
            pillar(room_of(z), s * x, z, y, red)
        z -= step
        i += 1

def walls(z0, z1, half=W, h=7.0, y=0.0):
    """Low side walls with a wave frieze and a pale cornice. z0 > z1."""
    zs = sorted(set([z0, z1] + [b for (_, a, b) in ROOMS if z0 > b > z1]), reverse=True)
    for a, b in zip(zs[:-1], zs[1:]):
        seg = room_of((a + b) / 2)
        L = a - b
        for s in (-1, 1):
            x = s * (half + 1)
            add(seg, box(2, h + 4, L), 'wall', TRS((x, y + h / 2 - 2, (a + b) / 2)), smooth=False)
            add(seg, box(2.6, 0.3, L), 'trim', TRS((x, y + h + 0.15, (a + b) / 2)), [BEVEL(0.04, 1)], smooth=False)
            add(seg, box(2.3, 0.22, L), 'trim', TRS((x, y + 0.11, (a + b) / 2)), smooth=False)
            # coloured courses: a red band and a blue band along the wall
            add(seg, box(0.06, 0.35, L), 'pillarRed', TRS((x - s * 1.02, y + h - 1.2, (a + b) / 2)))
            add(seg, box(0.06, 0.35, L), 'pillarBlue', TRS((x - s * 1.02, y + h - 1.75, (a + b) / 2)))
            # the wave frieze: a run of curls along the inner face
            n = int(L / 1.2)
            for k in range(n):
                zz = a - (k + 0.5) * L / n
                pts = [(x - s * 1.03, y + h - 2.6 + 0.25 * math.sin(t * PI), zz - 0.45 + 0.9 * t) for t in [i / 6 for i in range(7)]]
                add(seg, tube(pts, [0.05] * 7, 4), 'trim', smooth=False)
                add(seg, torus(0.13, 0.04, 10, 4), 'trim', TRS((x - s * 1.03, y + h - 2.45, zz + 0.45), (0, 0, PI / 2)))

# ================================================================ floors
slab(-3, 9, 3, 4, 0.0, 1.2, 0.6, 'floor', 1)  # the ferry landing (stone here; the planks go on top)
for k in range(9):
    add('tmp_entrance', box(5.8, 0.05, 0.5), 'wood', TRS((0, 0.02, 8.7 - k * 0.55)), [BEVEL(0.01, 1)])
for x in (-3.3, 3.3):  # rails at the landing
    add('tmp_entrance', box(0.12, 0.9, 5.0), 'woodDark', TRS((x, 0.6, 6.5)))
    add('tmp_entrance', box(0.2, 0.1, 5.2), 'wood', TRS((x, 1.08, 6.5)))
add('tmp_entrance', box(6.8, 0.1, 0.2), 'wood', TRS((0, 1.08, 9.3)))
slab(-W, 4, W, -62, 0.0, 2.6, 1.5, 'floor', 2)
slab(-W, -72, W, -84, 0.0, 2.6, 1.5, 'floor', 3)
for i, (y, (za, zb)) in enumerate(TIERS):
    ztop = -84 if i == 0 else LOCKS[i - 1] - 1.6
    slab(-W, ztop, W, zb, y, 2.6 + y, 1.5, 'floor' if i % 2 == 0 else 'floorDark', 4 + i)
    if i > 0:  # two steps up behind each water lock
        lz, py = LOCKS[i - 1], TIERS[i - 1][0]
        slab(-W, lz, W, lz - 0.8, py + 0.4, 2.6 + py, 0.8, 'trim', 10 + i, False)
        slab(-W, lz - 0.8, W, lz - 1.6, py + 0.8, 2.6 + py, 0.8, 'trim', 20 + i, False)
slab(-W, -116, W, -121, 0.0, 2.6, 1.5, 'floor', 30)
slab(-W, -134, W, -140, 0.0, 2.6, 1.5, 'floor', 31)
(px0, px1), (pz0, pz1) = POOL
slab(-AX, -140, AX, pz1, 0.0, 2.6, 1.6, 'floor', 40)
slab(-AX, pz0, AX, -176, 0.0, 2.6, 1.6, 'floor', 41)
slab(-AX, pz1, px0, pz0, 0.0, 2.6, 1.6, 'floor', 42)
slab(px1, pz1, AX, pz0, 0.0, 2.6, 1.6, 'floor', 43)
# the pool's rim: pale stones and a ring of glowing glyphs
for (x, z, w, d) in ((0, pz1 - 0.15, px1 - px0 + 0.6, 0.3), (0, pz0 + 0.15, px1 - px0 + 0.6, 0.3), (px0 + 0.15, (pz0 + pz1) / 2, 0.3, pz1 - pz0), (px1 - 0.15, (pz0 + pz1) / 2, 0.3, pz1 - pz0)):
    add('tmp_boss', box(w, 0.35, d), 'trim', TRS((x, 0.05, z)), [BEVEL(0.05, 1)], smooth=False)
for k in range(16):
    t = k / 16
    if t < 0.25:
        x, z = px0 + (px1 - px0) * t * 4, pz1 - 0.15
    elif t < 0.5:
        x, z = px1 - 0.15, pz1 - (pz1 - pz0) * (t - 0.25) * 4
    elif t < 0.75:
        x, z = px1 - (px1 - px0) * (t - 0.5) * 4, pz0 + 0.15
    else:
        x, z = px0 + 0.15, pz0 + (pz1 - pz0) * (t - 0.75) * 4
    add('tmp_boss', torus(0.12, 0.03, 10, 4), 'glow', TRS((x, 0.24, z)))

# ================================================================ walls and pillars (as in Temple.jsx)
walls(4, -84)
walls(-84, -110, h=10)
walls(-116, -140)
walls(-140, -176, half=AX, h=8)
add('tmp_boss', box(2 * AX + 4, 10, 2), 'wall', TRS((0, 3, -177)), smooth=False)  # the arena's back wall (as low as its sides)
add('tmp_boss', box(2 * AX + 4.6, 0.3, 2.6), 'trim', TRS((0, 8.15, -177)), smooth=False)
for (x0, x1) in ((-AX - 2, -W), (W, AX + 2)):  # the arena's front shoulders
    add('tmp_boss', box(x1 - x0, 10, 2), 'wall', TRS(((x0 + x1) / 2, 3, -140)), smooth=False)
pillar_row(4, -62)
pillar_row(-72, -84)
pillar_row(-116, -121, step=3)
pillar_row(-134, -140, step=3)
pillar_row(-140, -176, x=AX - 0.6, step=4.5)
# the decree's stand (at (5, 0, -11)), as in the caverns
add('tmp_entrance', box(1.0, 1.15, 0.6), 'wallDark', TRS((5, 0.575, -11)), [BEVEL(0.05, 2)], smooth=False)
add('tmp_entrance', box(1.25, 0.14, 0.95), 'trim', TRS((5, 1.28, -10.95), (0.45, 0, 0)), [BEVEL(0.04, 1)], smooth=False)
# a great arch over the temple's threshold
for x in (-W - 0.5, W + 0.5):
    add('tmp_entrance', box(2.2, 11, 2.2), 'wall', TRS((x, 5.5, 2.5)), [BEVEL(0.08, 1)], smooth=False)
pts = [(-(W + 0.5) * math.cos(PI * i / 20), 10.5 + 3.2 * math.sin(PI * i / 20), 2.5) for i in range(21)]
add('tmp_entrance', tube(pts, [0.9] * 21, 6), 'trim', smooth=False)
add('tmp_entrance', sphere(0.7, 16, 12), 'orb', TRS((0, 13.9, 2.5)))

# ================================================================ the horizon: the stepped tower and the sea pillars
TZ = -205
for k in range(8):
    w = 30 - k * 3.4
    add('tmp_horizon', box(w, 3.6, w * 0.8), 'wall', TRS((0, -1 + 1.8 + k * 3.6, TZ)), [BEVEL(0.2, 1)], smooth=False)
    for q in range(int(w / 2.2)):  # block courses
        add('tmp_horizon', box(0.08, 3.4, w * 0.8 + 0.05), 'wallDark', TRS((-w / 2 + (q + 0.5) * 2.2, -1 + 1.8 + k * 3.6, TZ)))
add('tmp_horizon', box(1.6, 29, 0.4), 'trim', TRS((0, 13.5, TZ + 12.2)))  # the ladder up its face
for k in range(14):
    add('tmp_horizon', box(1.7, 0.12, 0.5), 'trim', TRS((0, 0.5 + k * 2.0, TZ + 12.4)))
add('tmp_horizon', sphere(5.0, 24, 16), 'orb', TRS((0, 8, TZ + 16)))
for k in range(14):  # giant pillars standing in the sea along both sides
    side = -1 if k % 2 else 1
    z = 0 - (k // 2) * 30
    x = side * (34 + 6 * hash3(k, 1, 1))
    h = 26 + 8 * hash3(k, 2, 2)
    red = ((k // 2) + (0 if side > 0 else 1)) % 2 == 0
    add('tmp_horizon', cyl(2.6, 2.9, h, 16), 'pillarRed' if red else 'pillarBlue', TRS((x, h / 2 - 2, z)))
    add('tmp_horizon', box(6.4, 1.6, 6.4), 'trim', TRS((x, h - 1.5, z)), [BEVEL(0.15, 1)], smooth=False)
    for b in range(4):
        add('tmp_horizon', torus(2.75, 0.2, 20, 4), 'trim', TRS((x, 2 + b * h * 0.22, z)))

# ---------------------------------------------------------------- build, shade, export
objs = build_objects(MATS, 'temple')
for ob in objs.values():
    for p in ob.data.polygons:
        p.use_smooth = ob.data.materials[p.material_index].name.startswith('pillar') or ob.data.materials[p.material_index].name in ('orb',)
for name, ob in objs.items():  # per-face weathering, darker toward the waterline
    me = ob.data
    attr = me.color_attributes.new('AO', 'FLOAT_COLOR', 'CORNER')
    me.color_attributes.active_color = attr
    for p in me.polygons:
        c = p.center
        gx, gy, gz = c.x, c.z, -c.y
        a = 0.82 + 0.18 * hash3(round(gx * 1.7), round(gy * 1.3), round(gz * 1.7))
        if gy < 0:
            a *= 0.6 + 0.4 * max(0.0, 1 + gy / 3.0)
        for li in p.loop_indices:
            attr.data[li].color = (a, a, a, 1.0)
export_glb(objs, GLB)
if RENDERS:
    pl = [(n, TRS()) for n in objs]
    preview(objs, pl, [('temple_entry.png', (6, 7, 16), (0, 2, -20), 34), ('temple_ladder.png', (7, 7, -78), (0, 2, -100), 36),
                       ('temple_boss.png', (8, 9, -138), (0, 3, -170), 34)], RENDERS, sky='#bcd6e0', ground=None)
    print('RENDERS', RENDERS)
