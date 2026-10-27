"""The opening cutscene's cast and set for The Legend of Valence, exported to public/models/intro.glb.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/intro_blender.py -- <glb_path> <render_dir>

Parts (game frames, +y up, front = +z):
  hall          the throne hall of Valence (the Hall group's frame in src/scenes/Intro.jsx)
  mal_robe      Malradix's robes (the swaying robe group), feet on y = 0
  mal_body      mantle, hood, crown, sleeves and hands
  mal_head      his face (smooth-shaded)
  mal_staff     the twisted staff (in its group at (0.52, 0, 0.32)); the star stays procedural
  oct_body      Octavia's gown, overcoat, sleeves, hands and neck
  oct_head      her face and circlet (head frame at (0, 1.735, 0), modeled before the game's 1.22 scale)
  oct_eyes      her eyes (head frame + (0, 0.005, 0)), so the game can blink them
  oct_hair      her hair (head frame), so the game can sway it
Materials are named after the game's own; the game swaps in its lit versions.
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'intro.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    # hall
    'stone': ('#3a3442', 0, 0.75), 'floor': ('#221d2a', 0.2, 0.45), 'carpet': ('#5a1a26', 0, 0.95), 'gold': ('#c9a24a', 0.9, 0.3),
    'glass': ('#6f8fe8', 0, 0.3, 1.2), 'glassWarm': ('#c89a50', 0, 0.3, 0.4), 'glassViolet': ('#8a5ad0', 0, 0.3, 0.45), 'glassBlue': ('#4a70d0', 0, 0.3, 0.45), 'banner': ('#5e1222', 0, 0.9), 'wood': ('#3a2418', 0, 0.7),
    'cushion': ('#3a1f5e', 0, 0.9), 'lead': ('#14121a', 0.4, 0.6),
    # Malradix
    'robe': ('#7a1a28', 0, 0.75), 'robeDark': ('#18121c', 0, 0.85), 'mantle': ('#2a1e2e', 0, 0.7), 'skin': ('#a9a8ae', 0, 0.55),
    'silver': ('#c6cad2', 0.95, 0.22), 'sigil': ('#b07aff', 0, 0.4, 3.0), 'eye': ('#c890ff', 0, 0.3, 4.0), 'dark': ('#0a070c', 0, 0.8),
    'staffWood': ('#3a2620', 0, 0.8),
    # Octavia
    'silk': ('#f3efe6', 0, 0.55), 'silkShade': ('#e8e1d4', 0, 0.6), 'octGold': ('#d8b060', 0.9, 0.28), 'octSkin': ('#efcbb0', 0, 0.55),
    'hair': ('#0d0d12', 0.2, 0.35), 'eyeWhite': ('#f4f1ec', 0, 0.3), 'iris': ('#4a3226', 0, 0.25), 'pupil': ('#100c0c', 0, 0.5),
    'lip': ('#a8484c', 0, 0.45), 'light': ('#bff6ff', 0, 0.3, 4.0), 'lash': ('#100c0c', 0, 0.6),
}

# ================================================================ helpers
def robe_sheet(profile, a0, a1, n=48, rows=10, folds=7, fold_amp=0.05, hem_jag=0.0, seed=1.0, zs=1.0, vpoint=None):
    """An open (or closed) draped surface of revolution: profile [(r, y)] from hem to top; angle 0 = front (+z).
    folds ripple the radius (more at the hem); hem_jag cuts the hem into ragged points; vpoint(a) -> extra drop."""
    bm = bmesh.new()
    grid = []
    ys = [p[1] for p in profile]
    for j in range(rows + 1):
        t = j / rows
        # interpolate the profile
        yy = ys[0] + (ys[-1] - ys[0]) * t
        for k in range(len(profile) - 1):
            if profile[k][1] <= yy <= profile[k + 1][1] or k == len(profile) - 2:
                u = (yy - profile[k][1]) / max(1e-6, profile[k + 1][1] - profile[k][1])
                r = profile[k][0] + (profile[k + 1][0] - profile[k][0]) * max(0, min(1, u))
                break
        row = []
        for i in range(n + 1):
            a = a0 + (a1 - a0) * i / n
            rip = 1 + fold_amp * (1 - t) ** 1.2 * (math.sin(a * folds + seed) + 0.5 * math.sin(a * folds * 2.3 + seed * 3))
            y = yy
            if j == 0 and hem_jag:
                h = hash3(i * 0.37 + seed, seed, 1.3)
                y += hem_jag * (h if i % 2 else h * 0.25)
                y -= hem_jag * 0.3
            if vpoint:
                y -= vpoint(a) * (1 - t)
            row.append(bm.verts.new((r * rip * math.sin(a), y, r * rip * math.cos(a) * zs)))
        grid.append(row)
    for j in range(rows):
        for i in range(n):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def strip(points, w, normal_hint=(0, 0, 1)):
    """A flat ribbon of width w along points (thickness from SOLID)."""
    bm = bmesh.new()
    pts = [Vector(p) for p in points]
    nh = Vector(normal_hint)
    L, R = [], []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        side = t.cross(nh).normalized() * (w / 2)
        L.append(bm.verts.new(p - side))
        R.append(bm.verts.new(p + side))
    for i in range(len(pts) - 1):
        bm.faces.new((L[i], R[i], R[i + 1], L[i + 1]))
    return bm

def hand(seg, mat, M, curl=0.4, spread=0.12, length=0.075, palm=(0.045, 0.02, 0.05), thumb=True):
    """A hand hanging down its local -y: palm plus four fingers curling toward +z."""
    add(seg, sphere(1.0, 12, 8), mat, M @ TRS((0, -0.03, 0), scl=palm))
    for k in range(4):
        x = (k - 1.5) * 0.018
        a = (k - 1.5) * spread * 0.3
        L = length * (0.85 if k in (0, 3) else 1.0)
        pts, rr = [], []
        for i in range(5):
            t = i / 4
            ang = curl * t * 1.6
            pts.append((x + math.sin(a) * L * t, -0.06 - math.cos(ang) * L * t, math.sin(ang) * L * t * 0.9))
            rr.append(0.0085 * (1 - 0.35 * t))
        add(seg, tube(pts, rr, 6), mat, M)
    if thumb:
        add(seg, tube([(0.03, -0.035, 0.01), (0.045, -0.06, 0.03), (0.04, -0.08, 0.045)], [0.01, 0.009, 0.007], 6), mat, M)

def arch(center, R, along, r=0.3, n=20, m=6):
    """A semicircular arch rising from center, spanning +-R along the unit vector `along` (horizontal)."""
    c, u = Vector(center), Vector(along)
    pts = [tuple(c + u * (R * math.cos(PI * i / n)) + Vector((0, R * math.sin(PI * i / n), 0))) for i in range(n + 1)]
    return tube(pts, [r] * (n + 1), m)

# ================================================================ THE HALL
SLAB = 1.5
for ix in range(-6, 6):
    for iz in range(-5, 15):
        x, z = (ix + 0.5) * SLAB, (iz + 0.5) * SLAB
        add('hall', box(SLAB - 0.03, 0.1, SLAB - 0.03), 'floor', TRS((x, -0.05, z)), [BEVEL(0.008)])
# the red runner with gold borders, from the dais down the hall
add('hall', box(2.4, 0.025, 19.0), 'carpet', TRS((0, 0.012, 9.2)))
for s in (-1, 1):
    add('hall', box(0.09, 0.03, 19.0), 'gold', TRS((s * 1.16, 0.015, 9.2)))
for zz in (0.6, 4.0, 7.4, 10.8, 14.2):  # woven tetrahedral motifs down the runner
    for a in range(4):
        add('hall', box(0.04, 0.03, 0.42), 'gold', TRS((0, 0.016, zz), (0, a * PI / 4, 0)))
    add('hall', torus(0.26, 0.015, 24, 4), 'gold', TRS((0, 0.02, zz), scl=(1, 0.4, 1)))

# pillars: plinth, mouldings, a fluted shaft, a capital; arches spring between them along the aisle
def fluted(r, h, flutes=16, seg=48, rows=8):
    prof = [(r, h * j / rows) for j in range(rows + 1)]
    b = lathe(prof, seg, False, False)
    for v in b.verts:
        a = math.atan2(v.co.x, v.co.z)
        k = 1 - 0.045 * max(0, math.cos(a * flutes)) ** 2
        v.co.x *= k
        v.co.z *= k
    return b
PZ = [-6, -2, 2, 6, 10, 14]
for x in (-5, 5):
    for z in PZ:
        add('hall', box(1.3, 0.35, 1.3), 'stone', TRS((x, 0.175, z)), [BEVEL(0.03, 2)])
        add('hall', lathe([(0.62, 0.35), (0.62, 0.45), (0.56, 0.52), (0.5, 0.6)], 32), 'stone', TRS((x, 0, z)))
        add('hall', fluted(0.46, 6.8), 'stone', TRS((x, 0.6, z)))
        add('hall', lathe([(0.5, 7.4), (0.56, 7.5), (0.72, 7.75), (0.74, 7.8)], 32), 'stone', TRS((x, 0, z)))
        add('hall', box(1.55, 0.28, 1.55), 'stone', TRS((x, 7.94, z)), [BEVEL(0.03, 2)])
        add('hall', torus(0.5, 0.035, 32, 6), 'gold', TRS((x, 7.42, z)))
        add('hall', torus(0.6, 0.03, 32, 6), 'gold', TRS((x, 0.5, z)))
# arcades along each side: semicircular arches between neighbouring pillars, and a cornice above
for x in (-5, 5):
    for z0, z1 in zip(PZ[:-1], PZ[1:]):
        zc, R = (z0 + z1) / 2, (z1 - z0) / 2 - 0.7
        add('hall', arch((x, 7.9, zc), (z1 - z0) / 2 - 0.55, (0, 0, 1), 0.3, 20, 6), 'stone')
        # spandrel wall above the arch
        add('hall', box(0.5, 1.6, z1 - z0 - 1.2), 'stone', TRS((x, 9.4, zc)))
    add('hall', box(0.9, 0.35, 22.0), 'stone', TRS((x, 10.3, 4)), [BEVEL(0.03, 1)])

# outer walls with tall arched windows of night-blue glass, and a great rose window behind the throne
for s in (-1, 1):
    add('hall', box(0.6, 12, 31), 'stone', TRS((s * 8.6, 6, 5.5)))
    for z in (-4, 0, 4, 8, 12, 16):
        # recess frame and glass
        add('hall', box(0.2, 4.2, 1.5), 'lead', TRS((s * 8.25, 4.4, z)))
        add('hall', box(0.06, 4.0, 1.3), 'glass', TRS((s * 8.17, 4.4, z)))
        add('hall', cyl(0.65, 0.65, 0.06, 20), 'glass', TRS((s * 8.17, 6.4, z), (0, 0, PI / 2), scl=(1, 1, 1)))
        for k in range(1, 4):  # lead cames
            add('hall', box(0.08, 0.04, 1.3), 'lead', TRS((s * 8.14, 2.4 + k * 1.0, z)))
        add('hall', box(0.08, 4.6, 0.05), 'lead', TRS((s * 8.14, 4.6, z)))
        add('hall', arch((s * 8.2, 6.4, z), 0.7, (0, 0, 1), 0.08, 14, 6), 'stone')
add('hall', box(17.8, 12, 0.6), 'stone', TRS((0, 6, -8.3)))
# the entrance wall at the far end of the runner, with great iron-bound doors under a pointed arch
FZ = 20.5
for s2 in (-1, 1):
    add('hall', box(6.4, 12, 0.8), 'stone', TRS((s2 * 5.6, 6, FZ)))
    add('hall', box(0.7, 6.4, 1.0), 'stone', TRS((s2 * 2.35, 3.2, FZ - 0.1)), [BEVEL(0.03, 1)])
add('hall', box(4.0, 5.0, 0.8), 'stone', TRS((0, 9.5, FZ)))
for s2 in (-1, 1):  # the pointed arch over the doors
    pts = [(s2 * 2.0 * math.cos(PI / 2 * i / 12) , 6.2 + 2.2 * math.sin(PI / 2 * i / 12), FZ - 0.35) for i in range(13)]
    pts = [(p[0] * (1 - 0.25 * (i / 12)), p[1], p[2]) for i, p in enumerate(pts)]
    add('hall', tube(pts, [0.28] * 13, 6), 'stone')
for s2 in (-1, 1):  # two door leaves of dark planks with iron bands
    add('hall', box(1.95, 6.2, 0.18), 'wood', TRS((s2 * 1.0, 3.1, FZ - 0.05)), [BEVEL(0.02, 1)])
    for y in (1.0, 3.0, 5.0):
        add('hall', box(1.9, 0.12, 0.05), 'lead', TRS((s2 * 1.0, y, FZ - 0.17)))
    add('hall', torus(0.14, 0.025, 16, 4), 'gold', TRS((s2 * 0.3, 3.1, FZ - 0.2), (PI / 2, 0, 0)))
for k in range(16):  # sixteen panes in three colours
    a0, a1 = k * PI / 8, (k + 1) * PI / 8
    pane = poly_sheet([(0, 0), (2.2 * math.cos(a0), 2.2 * math.sin(a0)), (2.2 * math.cos((a0 + a1) / 2), 2.2 * math.sin((a0 + a1) / 2)), (2.2 * math.cos(a1), 2.2 * math.sin(a1))], 1)
    add('hall', pane, ('glassWarm', 'glassViolet', 'glassWarm', 'glassBlue')[k % 4], TRS((0, 6.6, -7.97)))
add('hall', torus(2.25, 0.18, 48, 8), 'stone', TRS((0, 6.6, -7.9), (PI / 2, 0, 0)))
for k in range(8):  # rose tracery: spokes and an inner ring
    a = k * PI / 8
    add('hall', box(0.07, 4.3, 0.06), 'lead', TRS((0, 6.6, -7.88), (0, 0, a)))
add('hall', torus(1.1, 0.06, 40, 6), 'lead', TRS((0, 6.6, -7.88), (PI / 2, 0, 0)))
add('hall', torus(0.4, 0.06, 24, 6), 'lead', TRS((0, 6.6, -7.88), (PI / 2, 0, 0)))
# ceiling: a dark vault with ribs over the aisle
add('hall', box(17.8, 0.4, 31), 'stone', TRS((0, 12.2, 5.5)))
for z in PZ + [-8, 10]:
    add('hall', box(17.6, 0.5, 0.5), 'stone', TRS((0, 11.75, z)), [BEVEL(0.03, 1)])

# the dais: three steps, a carved pedestal for the crown, and the empty throne behind
for k, (w, d) in enumerate(((3.0, 2.4), (2.6, 2.0), (2.2, 1.6))):
    add('hall', box(w, 0.4, d), 'stone', TRS((0, 0.2 + k * 0.4, -1.5 - k * 0.0)), [BEVEL(0.025, 2)])
    add('hall', box(w + 0.02, 0.04, d + 0.02), 'gold', TRS((0, 0.38 + k * 0.4, -1.5)))
add('hall', lathe([(0.32, 1.2), (0.32, 1.3), (0.2, 1.38), (0.16, 1.5), (0.14, 1.75), (0.18, 1.85), (0.3, 1.95), (0.32, 2.0)], 24), 'stone', TRS((0, 0, -1.6)))
add('hall', torus(0.3, 0.025, 24, 6), 'gold', TRS((0, 1.98, -1.6)))
add('hall', torus(0.16, 0.02, 20, 6), 'gold', TRS((0, 1.6, -1.6)))
# throne: high back with a pointed crest, arms, cushion
TZ = -2.55
add('hall', box(1.2, 0.5, 0.75), 'wood', TRS((0, 1.45, TZ)), [BEVEL(0.03, 2)])
add('hall', box(1.05, 0.12, 0.62), 'cushion', TRS((0, 1.75, TZ + 0.03)), [BEVEL(0.04, 2)])
add('hall', box(1.2, 2.5, 0.16), 'wood', TRS((0, 2.65, TZ - 0.33)), [BEVEL(0.03, 2)])
add('hall', box(0.9, 1.8, 0.04), 'cushion', TRS((0, 2.55, TZ - 0.24)))
crest = poly_sheet([(-0.6, 0), (0.6, 0), (0.0, 0.9)], 2)
add('hall', crest, 'wood', TRS((0, 3.9, TZ - 0.33)), [SOLID(0.16, 0)])
add('hall', sphere(0.11, 12, 8), 'gold', TRS((0, 4.85, TZ - 0.33)))
for s in (-1, 1):
    add('hall', box(0.14, 0.5, 0.75), 'wood', TRS((s * 0.62, 2.0, TZ)), [BEVEL(0.02, 2)])
    add('hall', sphere(0.09, 12, 8), 'gold', TRS((s * 0.62, 2.3, TZ + 0.33)))
    add('hall', box(0.04, 2.5, 0.18), 'gold', TRS((s * 0.62, 2.65, TZ - 0.33)))
# a carbon tetrahedron in gold on the throne back (the Octet's emblem)
EMB = Vector((0, 2.85, TZ - 0.21))
for d in ((0, 1, 0), (0.94, -0.33, 0), (-0.47, -0.33, 0.0), (0, -0.33, 0)):
    dv = Vector(d).normalized() * 0.32 if Vector(d).length > 0.1 else None
for a in (PI / 2, PI / 2 + 2 * PI / 3, PI / 2 + 4 * PI / 3):
    end = EMB + Vector((math.cos(a), math.sin(a), 0)) * 0.34
    add('hall', tube([tuple(EMB), tuple(end)], [0.025, 0.025], 6), 'gold')
    add('hall', sphere(0.06, 10, 8), 'gold', TRS(tuple(end)))
add('hall', sphere(0.09, 12, 8), 'gold', TRS(tuple(EMB + Vector((0, 0, 0.03)))))

# banners hang from the capitals on the aisle side: crimson, gold-edged, with the tetrahedral sign
for x in (-5, 5):
    s = 1 if x < 0 else -1
    for z in PZ:
        bx = x + s * 0.62
        ban = poly_sheet([(-0.42, 0), (0.42, 0), (0.42, -2.9), (0.0, -3.35), (-0.42, -2.9)], 4)
        deform(ban, lambda p: (p[0], p[1], 0.04 * math.sin(p[1] * 2.1 + p[0] * 1.3)))
        add('hall', ban, 'banner', TRS((bx, 7.6, z), (0, s * PI / 2, 0)), [SOLID(0.02, 0)])
        add('hall', cyl(0.03, 0.03, 1.05, 8), 'gold', TRS((bx, 7.62, z), (PI / 2, 0, 0)))
        for (px, py, q) in ((-0.38, -1.45, 0), (0.38, -1.45, 0)):
            add('hall', box(0.04, 2.9, 0.03), 'gold', TRS((bx + s * 0.013, 7.6 + py, z + px), (0, s * PI / 2, 0)))
        c = Vector((bx + s * 0.015, 5.9, z))
        add('hall', torus(0.2, 0.02, 24, 4), 'gold', TRS(tuple(c), (0, 0, PI / 2)))
        for a in (PI / 2, PI / 2 + 2 * PI / 3, PI / 2 + 4 * PI / 3):
            add('hall', box(0.02, 0.2, 0.03), 'gold', TRS((c.x, c.y + math.sin(a) * 0.1, c.z + math.cos(a) * 0.1 * s), (-s * (a - PI / 2), 0, 0)))

# ================================================================ MALRADIX
# robes: a black under-robe, and a tattered crimson outer robe open down the front, trailing on the floor
add('mal_robe', robe_sheet([(0.62, 0.0), (0.42, 0.5), (0.3, 1.2), (0.25, 1.95)], 0, 2 * PI, 40, 10, folds=9, fold_amp=0.07, hem_jag=0.04, seed=4.0, zs=0.85),
    'robeDark', None, [SOLID(0.012)])
add('mal_robe', robe_sheet([(1.0, -0.02), (0.75, 0.22), (0.5, 0.7), (0.4, 1.3), (0.36, 1.75), (0.34, 2.0)], 0.5, 2 * PI - 0.5, 56, 14,
                           folds=7, fold_amp=0.09, hem_jag=0.32, seed=1.7, zs=0.85), 'robe', None, [SOLID(0.014)])
# the dark front panel (stole) from collar to hem, with glowing molecule sigils
STOLE = [(0, 1.95, 0.29), (0, 1.5, 0.3), (0, 1.0, 0.36), (0, 0.5, 0.46), (0, 0.04, 0.58)]
add('mal_robe', strip(STOLE, 0.3, (1, 0, 0)), 'mantle', None, [SOLID(0.012, 1)])
def stole_at(y):
    for i in range(len(STOLE) - 1):
        a, b = STOLE[i], STOLE[i + 1]
        if b[1] <= y <= a[1]:
            u = (a[1] - y) / (a[1] - b[1])
            return Vector((0, y, a[2] + (b[2] - a[2]) * u + 0.016))
    return Vector((0, y, 0.3))
def hexring(c, r, rot=0.0):
    for k in range(6):
        a = rot + k * PI / 3 + PI / 6
        p = c + Vector((math.cos(a) * r * 0.87, math.sin(a) * r * 0.87, 0))
        add('mal_robe', box(r * 1.0, 0.008, 0.006), 'sigil', TRS(tuple(p), (0, 0, a + PI / 2)))
for (y, dx, r) in ((1.62, -0.05, 0.05), (1.32, 0.04, 0.045), (0.98, -0.02, 0.06), (0.62, 0.03, 0.065), (0.3, -0.03, 0.055)):
    c = stole_at(y) + Vector((dx, 0, 0))
    hexring(c, r)
    add('mal_robe', box(0.008, 0.11, 0.006), 'sigil', TRS(tuple(c + Vector((r * 0.9, r * 1.2, 0))), (0, 0, -0.5)))
    add('mal_robe', torus(0.014, 0.004, 10, 4), 'sigil', TRS(tuple(c + Vector((-r * 1.2, -r * 1.3, 0))), (PI / 2, 0, 0)))
    add('mal_robe', box(0.07, 0.008, 0.006), 'sigil', TRS(tuple(c + Vector((-r * 0.9, -r * 0.9, 0))), (0, 0, 0.6)))
# belt sash
add('mal_robe', torus(0.31, 0.03, 32, 6), 'robeDark', TRS((0, 1.22, 0.01), scl=(1, 1, 0.92)))

# mantle: a dark shoulder cape with a V point front and back, edged in crimson, a silver brooch
mantle = robe_sheet([(0.46, 1.62), (0.42, 1.85), (0.3, 2.02), (0.17, 2.1)], 0, 2 * PI, 48, 6, folds=5, fold_amp=0.03, seed=2.0, zs=0.78,
                    vpoint=lambda a: 0.32 * math.exp(-(a / 0.35) ** 2) + 0.32 * math.exp(-((a - PI) / 0.45) ** 2) + 0.32 * math.exp(-((a - 2 * PI) / 0.35) ** 2))
add('mal_body', mantle, 'mantle', None, [SOLID(0.02)])
mtrim = robe_sheet([(0.47, 1.6), (0.467, 1.635)], 0, 2 * PI, 48, 1, folds=5, fold_amp=0.03, seed=2.0, zs=0.78,
                   vpoint=lambda a: 0.32 * math.exp(-(a / 0.35) ** 2) + 0.32 * math.exp(-((a - PI) / 0.45) ** 2) + 0.32 * math.exp(-((a - 2 * PI) / 0.35) ** 2))
add('mal_body', mtrim, 'robe', None, [SOLID(0.024)])
for (y, dx, r) in ((1.9, -0.2, 0.035), (1.86, 0.21, 0.035)):  # sigils on the mantle
    for k in range(6):
        a = k * PI / 3 + PI / 6
        p = Vector((dx + math.cos(a) * r * 0.87, y + math.sin(a) * r * 0.87, 0.37 if abs(dx) < 0.25 else 0.3))
        add('mal_body', box(r, 0.007, 0.006), 'sigil', TRS(tuple(p), (-0.5, 0, a + PI / 2)))
add('mal_body', sphere(0.045, 8, 4), 'silver', TRS((0, 1.36, 0.36), scl=(0.7, 1.4, 0.5)))  # the brooch at the V's point
# neck
add('mal_body', cyl(0.05, 0.045, 0.2, 12), 'skin', TRS((0, 2.13, 0.02)))
# hood: a deep crimson cowl open at the face, falling onto the shoulders
hood = lathe([(0.24, -0.26), (0.25, -0.1), (0.24, 0.06), (0.2, 0.2), (0.13, 0.31), (0.05, 0.4), (0.01, 0.45)], 30, False, False)
bmesh.ops.delete(hood, geom=[v for v in hood.verts if v.co.z > 0.05 and v.co.y < 0.22 and abs(v.co.x) < 0.15], context='VERTS')
for v in hood.verts:
    if v.co.y > 0.15:  # the peak sweeps back
        v.co.z -= (v.co.y - 0.15) * 0.7
    if v.co.z > 0.03 and abs(v.co.x) > 0.1:  # the opening's edges reach forward past the face
        v.co.z += 0.05
add('mal_body', hood, 'robe', TRS((0, 2.3, -0.02), scl=(0.85, 1.12, 1.0)), [SOLID(0.02)])
# head: long, gaunt, sharp-chinned, pale
skullm = deform(sphere(1.0, 30, 24), lambda v: head_shape(v, jaw_narrow=0.3, nose=0.2, socket=0.09, brow=0.07, cheek=0.06, gaunt=0.18, chin=0.1))
add('mal_head', skullm, 'skin', TRS((0, 2.27, 0.05), scl=(0.118, 0.152, 0.132)))
for s in (-1, 1):
    add('mal_body', sphere(0.028, 10, 8), 'dark', TRS((s * 0.045, 2.3, 0.14), (0, 0, s * -0.35), scl=(1.2, 0.62, 0.45)))  # sunken sockets
    add('mal_body', sphere(0.022, 10, 8), 'eye', TRS((s * 0.045, 2.3, 0.151), (0, 0, s * -0.35), scl=(1.3, 0.6, 0.5)))
    add('mal_body', tube([(s * 0.015, 2.33, 0.165), (s * 0.05, 2.345, 0.16), (s * 0.08, 2.36, 0.14)], [0.005, 0.005, 0.002], 5), 'dark')  # sharp brows
    add('mal_body', tube([(s * 0.06, 2.24, 0.14), (s * 0.05, 2.18, 0.145)], [0.004, 0.002], 4), 'dark')  # cheek hollows
# a thin cruel grin
add('mal_body', tube([(-0.04, 2.168, 0.152), (-0.015, 2.162, 0.163), (0.015, 2.162, 0.163), (0.042, 2.172, 0.15)], [0.004, 0.005, 0.005, 0.003], 5), 'dark')
# spiked silver crown on the hood
add('mal_body', torus(0.16, 0.016, 32, 6), 'silver', TRS((0, 2.5, -0.01), (-0.08, 0, 0), scl=(1, 1, 0.95)))
for k in (-3, -2, -1, 0, 1, 2, 3):
    a = k * 0.36
    h = 0.42 if k == 0 else 0.26 - abs(k) * 0.035
    p = (math.sin(a) * 0.155, 2.5 + h / 2 - 0.01 + math.cos(a) * 0.01, math.cos(a) * 0.15)
    add('mal_body', cyl(0.028, 0.002, h, 4), 'silver', TRS(p, (math.cos(a) * 0.06, 0, -math.sin(a) * 0.12)))
add('mal_body', ico(0.024, 1), 'sigil', TRS((0, 2.53, 0.165)))
# sleeves (wide, ragged) and hands; the right arm reaches forward to grip the staff
for s in (-1, 1):
    A = TRS((s * 0.34, 1.95, 0), (-0.35 if s > 0 else 0.05, 0, s * 0.18))
    upper = robe_sheet([(0.1, -0.45), (0.085, 0.0)], 0, 2 * PI, 20, 3, folds=4, fold_amp=0.05, seed=s)
    add('mal_body', upper, 'robe', A, [SOLID(0.012)])
    bell = robe_sheet([(0.27, -0.88), (0.17, -0.6), (0.1, -0.42)], 0, 2 * PI, 28, 6, folds=5, fold_amp=0.1, hem_jag=0.14, seed=3 + s)
    add('mal_body', bell, 'robe', A @ TRS((0, 0, -0.03)), [SOLID(0.012)])
    add('mal_body', cyl(0.035, 0.03, 0.2, 10), 'skin', A @ TRS((0, -0.72, 0.01)))  # wrist
    if s > 0:  # a fist round the staff
        add('mal_body', sphere(1.0, 12, 8), 'skin', A @ TRS((0, -0.83, 0.03), scl=(0.05, 0.055, 0.045)))
        for k in range(4):
            add('mal_body', capsule(0.011, 0.03, 8, 6), 'skin', A @ TRS((0.032, -0.8 - k * 0.022, 0.04), (0, 0, PI / 2)))
        add('mal_body', capsule(0.01, 0.03, 8, 6), 'skin', A @ TRS((-0.02, -0.8, 0.07), (0.6, 0, 0.4)))
    else:  # long, open, clawed fingers
        hand('mal_body', 'skin', A @ TRS((0, -0.78, 0.01), (0.15, 0, 0)), curl=0.55, spread=0.5, length=0.1, palm=(0.045, 0.06, 0.02))

# the staff (staff frame): two gnarled strands twisting round each other, splitting at the top into
# two curling prongs that cradle the star at (0, 2.62, 0)
for k in (0, 1):
    pts, rr = [], []
    for i in range(41):
        t = i / 40
        y = t * 2.42
        a = t * 9.0 + k * PI
        rad = 0.018 + 0.006 * math.sin(t * 13)
        pts.append((math.cos(a) * rad + math.sin(t * 7) * 0.012, y, math.sin(a) * rad))
        rr.append(0.021 + 0.004 * math.sin(t * 23 + k) - 0.006 * (1 - min(1, t * 8)))
    # the prong: out and up, curling back in over the star
    side = 1 if k == 0 else -1
    for i in range(1, 13):
        u = i / 12
        ang = u * PI * 0.85
        pts.append((side * (0.02 + math.sin(ang) * 0.13), 2.42 + (1 - math.cos(ang)) * 0.15, 0.01 * side))
        rr.append(0.021 * (1 - u * 0.7))
    add('mal_staff', tube(pts, rr, 7), 'staffWood')
for (y, r) in ((0.9, 0.034), (1.55, 0.032), (2.05, 0.03)):  # knots
    add('mal_staff', sphere(r, 10, 8), 'staffWood', TRS((0.01, y, 0.0), scl=(1, 1.4, 1)))

# ================================================================ OCTAVIA
# the underdress: a long flare from a slim waist to a hem that pools on the floor, softly folded
add('oct_body', robe_sheet([(0.5, 0.0), (0.42, 0.12), (0.3, 0.4), (0.21, 0.7), (0.15, 0.95), (0.13, 1.12)], 0, 2 * PI, 48, 12,
                           folds=8, fold_amp=0.06, seed=0.5, zs=0.95), 'silk', None, [SOLID(0.01)])
add('oct_body', lathe([(0.125, 1.1), (0.13, 1.2), (0.145, 1.33), (0.15, 1.42), (0.125, 1.49), (0.07, 1.53), (0.045, 1.545)], 28, False, False), 'silk')
add('oct_body', lathe([(0.508, 0.0), (0.503, 0.07), (0.46, 0.13)], 48, False, False), 'octGold', TRS(scl=(1, 1, 0.95)))
# the overcoat: open down the front, falling from the shoulders to the floor, gold bands on its edges
OC = [(0.55, 0.0), (0.44, 0.25), (0.32, 0.6), (0.24, 0.95), (0.2, 1.2), (0.19, 1.42)]
add('oct_body', robe_sheet(OC, 0.55, 2 * PI - 0.55, 44, 12, folds=6, fold_amp=0.05, seed=2.2, zs=0.92), 'silkShade', None, [SOLID(0.012)])
for s in (-1, 1):  # gold bands down both front edges of the coat, and one inside each
    for off in (0.0, 0.18):
        a = s * (0.55 + off) if s > 0 else 2 * PI - 0.55 - off
        pts = []
        for j in range(13):
            t = j / 12
            yy = 1.42 * t
            for k in range(len(OC) - 1):
                if OC[k][1] <= yy <= OC[k + 1][1]:
                    u = (yy - OC[k][1]) / (OC[k + 1][1] - OC[k][1])
                    r = OC[k][0] + (OC[k + 1][0] - OC[k][0]) * u
                    break
            r += 0.014
            pts.append((r * math.sin(a), yy + 0.01, r * math.cos(a) * 0.92))
        n = (math.sin(a), 0, math.cos(a))
        add('oct_body', strip(pts, 0.032 if off == 0 else 0.02, n), 'octGold', None, [SOLID(0.006, 0)])
add('oct_body', robe_sheet([(0.56, 0.01), (0.555, 0.07)], 0.55, 2 * PI - 0.55, 44, 1, folds=6, fold_amp=0.05, seed=2.2, zs=0.92), 'octGold', None, [SOLID(0.008)])
# gold V-belt and waist band
add('oct_body', torus(0.137, 0.012, 32, 6), 'octGold', TRS((0, 1.15, 0), scl=(1, 1, 0.88)))
vb = poly_sheet([(-0.15, 0), (-0.11, 0), (0, -0.12), (0.11, 0), (0.15, 0), (0, -0.165)], 2)
add('oct_body', vb, 'octGold', TRS((0, 1.16, 0.128), (-0.15, 0, 0)), [SOLID(0.012, 0)])
# the gold V-neck collar lying on the shoulders
col = robe_sheet([(0.2, 1.4), (0.17, 1.48), (0.075, 1.545)], 0, 2 * PI, 40, 3, folds=0, fold_amp=0, zs=0.85,
                 vpoint=lambda a: 0.17 * math.exp(-(a / 0.5) ** 2) + 0.17 * math.exp(-((a - 2 * PI) / 0.5) ** 2))
add('oct_body', col, 'octGold', None, [SOLID(0.012)])
add('oct_body', cyl(0.038, 0.045, 0.12, 14), 'octSkin', TRS((0, 1.58, 0)))
# sleeves: shoulder, a wide bell from the elbow with a gold cuff; forearms reach forward, hands cupped palm up
for s in (-1, 1):
    S = TRS((s * 0.165, 1.46, 0), (0.1, 0, s * 0.1))
    add('oct_body', capsule(0.045, 0.2, 14, 10), 'silk', S @ TRS((0, -0.13, 0)))
    add('oct_body', hemi(0.07, 16, 8), 'octGold', S @ TRS((s * 0.01, 0, 0), scl=(1, 0.5, 1)))
    E = S @ TRS((0, -0.27, 0))
    bell = robe_sheet([(0.13, -0.42), (0.1, -0.25), (0.055, 0.0)], 0, 2 * PI, 28, 6, folds=5, fold_amp=0.08, seed=5 + s)
    add('oct_body', bell, 'silkShade', E @ TRS(rot=(0.12, 0, s * 0.04)), [SOLID(0.008)])
    add('oct_body', robe_sheet([(0.133, -0.43), (0.128, -0.37)], 0, 2 * PI, 28, 1, folds=5, fold_amp=0.08, seed=5 + s), 'octGold', E @ TRS(rot=(0.12, 0, s * 0.04)), [SOLID(0.008)])
    F = E @ TRS(rot=(-1.35, s * 0.55, 0))
    add('oct_body', capsule(0.027, 0.18, 10, 8), 'octSkin', F @ TRS((0, -0.12, 0)))
    hand('oct_body', 'octSkin', F @ TRS((0, -0.21, 0.0), (0, 0, 0)), curl=0.5, spread=0.15, length=0.055, palm=(0.036, 0.042, 0.016))

# head (head frame, pre-scale): a soft face, small nose, a smile
face = deform(sphere(1.0, 32, 24), lambda v: head_shape(v, jaw_narrow=0.22, nose=0.07, socket=0.03, brow=0.02, cheek=0.04))
add('oct_head', face, 'octSkin', TRS((0, 0.0, 0.0), scl=(0.104, 0.118, 0.118)))
for s in (-1, 1):
    add('oct_head', sphere(0.012, 8, 6), 'octSkin', TRS((s * 0.1, -0.005, -0.005), scl=(0.5, 1.4, 1)))  # ears (under the hair)
add('oct_head', tube([(-0.02, -0.05, 0.103), (-0.009, -0.056, 0.109), (0.009, -0.056, 0.109), (0.02, -0.05, 0.103)], [0.0015, 0.0026, 0.0026, 0.0015], 5), 'lip')
add('oct_head', tube([(-0.011, -0.06, 0.106), (0, -0.0615, 0.107), (0.011, -0.06, 0.106)], [0.0018, 0.0026, 0.0018], 5), 'lip')
for s in (-1, 1):  # fine dark brows
    add('oct_head', tube([(s * 0.02, 0.043, 0.109), (s * 0.04, 0.05, 0.106), (s * 0.06, 0.046, 0.096)], [0.0018, 0.0022, 0.001], 5), 'lash')
# circlet: a fine gold band with eight peaks, each holding a cyan light
add('oct_head', torus(0.128, 0.0055, 40, 6), 'octGold', TRS((0, 0.075, -0.005), (-0.2, 0, 0)))
for i in range(8):
    a = -1.25 + (i / 7) * 2.5
    M = TRS((0, 0.075, -0.005), (-0.2, 0, 0)) @ TRS((math.sin(a) * 0.13, 0, math.cos(a) * 0.13))
    add('oct_head', cyl(0.007, 0.002, 0.04, 4), 'octGold', M @ TRS((0, 0.02, 0)))
    add('oct_head', sphere(0.011, 8, 6), 'light', M @ TRS((0, 0.045, 0)))
    if i < 7:  # gold swags between the peaks
        b2 = -1.25 + ((i + 1) / 7) * 2.5
        P0 = M @ Vector((0, 0.04, 0))
        P2 = TRS((0, 0.075, -0.005), (-0.2, 0, 0)) @ Vector((math.sin(b2) * 0.13, 0.04, math.cos(b2) * 0.13))
        mid = (P0 + P2) / 2 + Vector((0, -0.025, 0))
        add('oct_head', tube([tuple(P0), tuple(mid), tuple(P2)], [0.002, 0.002, 0.002], 4), 'octGold')
# eyes: whites, brown irises, pupils, a lash line
for s in (-1, 1):
    add('oct_eyes', sphere(0.021, 14, 10), 'eyeWhite', TRS((s * 0.04, 0, 0.096), scl=(1.15, 0.72, 0.45)))
    add('oct_eyes', sphere(0.013, 12, 10), 'iris', TRS((s * 0.04, -0.002, 0.103), scl=(1, 1, 0.4)))
    add('oct_eyes', sphere(0.0055, 8, 6), 'pupil', TRS((s * 0.04, -0.002, 0.107)))
    add('oct_eyes', sphere(0.0025, 6, 4), 'eyeWhite', TRS((s * 0.04 + 0.004, 0.004, 0.1085)))  # catchlight
    add('oct_eyes', tube([(s * 0.018, 0.009, 0.104), (s * 0.04, 0.016, 0.107), (s * 0.064, 0.01, 0.098)], [0.0025, 0.003, 0.002], 5), 'lash')
# hair: a glossy cap, blunt bangs, and long straight strands falling to the waist behind; two front locks
add('oct_hair', hemi(0.133, 28, 12), 'hair', TRS((0, 0.012, -0.012), (-0.25, 0, 0), scl=(0.97, 1.08, 1.04)))
back = sphere(0.134, 28, 16)
bmesh.ops.delete(back, geom=[v for v in back.verts if v.co.z > 0.03], context='VERTS')
add('oct_hair', back, 'hair', TRS((0, 0.0, -0.012), scl=(0.98, 1.06, 1.05)))
HR = 0.137
for i in range(19):  # bangs: from the crown forward and down, cut straight above the brows
    x = -0.085 + i / 18 * 0.17
    zf = math.sqrt(max(0.0, HR * HR - x * x)) * 0.95
    pts = [(x * 0.6, 0.13, 0.03), (x * 0.85, 0.11, zf * 0.75), (x * 0.95, 0.085, zf + 0.008), (x, 0.06, zf + 0.008)]
    add('oct_hair', tube(pts, [0.012, 0.012, 0.011, 0.009], 4), 'hair', TRS(scl=(1, 1, 1)))
for i in range(44):  # the long fall behind: from the crown over the back of the head, straight down past the shoulders
    az = PI + (i / 43 - 0.5) * 3.6
    k = abs(i / 43 - 0.5) * 2  # 0 at the back, 1 at the sides
    L = -0.85 + 0.15 * k + (rnd() - 0.5) * 0.04
    r0 = HR + 0.004
    pts, rr = [], []
    for j in range(9):
        t = j / 8
        if t < 0.35:  # over the skull
            el = 0.9 - t / 0.35 * 1.15
            p = Vector((math.sin(az) * math.cos(el), math.sin(el), math.cos(az) * math.cos(el))) * r0
        else:  # falling straight, spreading a little
            u = (t - 0.35) / 0.65
            rad = r0 + 0.02 + u * 0.035
            p = Vector((math.sin(az) * rad * 1.02, -0.1 + (L + 0.1) * u, math.cos(az) * rad * 0.85 - 0.01))
        pts.append(tuple(p))
        rr.append(0.016 if t < 0.9 else 0.011)
    b = tube(pts, rr, 4)
    add('oct_hair', b, 'hair')
for s in (-1, 1):  # two locks in front of the shoulders
    for k in range(3):
        x = s * (0.1 + k * 0.012)
        add('oct_hair', tube([(x, 0.07, 0.02 - k * 0.012), (x * 1.08, -0.05, 0.03 - k * 0.012), (x * 1.18, -0.3, 0.04 - k * 0.012), (x * 1.22, -0.62 + k * 0.03, 0.03)],
                             [0.014, 0.014, 0.013, 0.006], 4), 'hair')

# ---------------------------------------------------------------- build, bake, export
objs = build_objects(MATS, 'intro', smooth_parts=('mal_robe', 'mal_head', 'oct_hair', 'oct_body', 'oct_head', 'oct_eyes'))
bake_ao(objs, distance=0.6, samples=24, floor=0.45, skip=('hall',))
# the hall is big: shade it with grime in the corners and a gentle variation per floor slab instead of a bake
def hall_shade(p):
    x, y, z = p
    if y < 0.02:  # floor slabs: each its own tone
        cx, cz = math.floor(x / SLAB), math.floor(z / SLAB)
        return 0.78 + 0.22 * hash3(cx, 0.5, cz) + 0.04 * fbm((x, 0, z), 0.8, 2)
    a = 0.86 + 0.1 * fbm((x, y, z), 0.6, 3)
    a *= 0.7 + 0.3 * min(1.0, y / 1.5)  # darker at the foot of walls and pillars
    return max(0.4, min(1.0, a))
colour_pass(objs['hall'], hall_shade)
export_glb(objs, GLB)

if RENDERS:
    pl = [('hall', TRS()), ('mal_robe', TRS((0.8, 0, 2.2), (0, PI, 0))), ('mal_body', TRS((0.8, 0, 2.2), (0, PI, 0))), ('mal_head', TRS((0.8, 0, 2.2), (0, PI, 0))),
          ('mal_staff', TRS((0.8, 0, 2.2), (0, PI, 0)) @ TRS((0.52, 0, 0.32), (0.08, 0, -0.06))),
          ('oct_body', TRS((-1.6, 0, -0.8), (0, 0.45, 0))), ('oct_head', TRS((-1.6, 0, -0.8), (0, 0.45, 0)) @ TRS((0, 1.735, 0), scl=1.22)),
          ('oct_eyes', TRS((-1.6, 0, -0.8), (0, 0.45, 0)) @ TRS((0, 1.74, 0), scl=1.22)),
          ('oct_hair', TRS((-1.6, 0, -0.8), (0, 0.45, 0)) @ TRS((0, 1.735, 0), scl=1.22))]
    preview(objs, pl, [('hall_wide.png', (0, 4, 16), (0, 2.5, 0), 32), ('hall_dais.png', (2.2, 3.6, 4.6), (0, 3, 0), 32)], RENDERS, sky='#151220', ground=None)
    for o in list(bpy.data.collections['preview'].objects):
        bpy.data.objects.remove(o)
    pl2 = [('mal_robe', TRS()), ('mal_body', TRS()), ('mal_head', TRS()), ('mal_staff', TRS((0.52, 0, 0.32), (0.08, 0, -0.06))),
           ('oct_body', TRS((-2, 0, 0))), ('oct_head', TRS((-2, 1.735, 0), scl=1.22)), ('oct_eyes', TRS((-2, 1.74, 0), scl=1.22)), ('oct_hair', TRS((-2, 1.735, 0), scl=1.22))]
    preview(objs, pl2, [('mal_full.png', (0.4, 1.6, 5.5), (0, 1.4, 0), 38), ('mal_face.png', (0.1, 2.3, 1.3), (0, 2.28, 0), 55),
                        ('oct_full.png', (-2, 1.1, 4.4), (-2, 1.0, 0), 38), ('oct_face.png', (-2, 1.78, 0.9), (-2, 1.74, 0), 55),
                        ('oct_back.png', (-2.6, 1.4, -2.8), (-2, 1.2, 0), 40)], RENDERS, sky='#2a2838', ground='#3a3442')
    print('RENDERS', RENDERS)
