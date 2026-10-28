"""Sister Tartara (World 5's sage) for The Legend of Valence, exported to public/models/tartara.glb.
Modeled on assets/characters/sister-tartara.png: a serene young scholar-nun in a silver and pale-blue habit and
wimple, fine silver tweezers in each hand, sorting mirror-image crystals (one pile gold, one silver) on a stone
table, a tall mirror behind her.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/tartara_blender.py -- <glb_path> <render_dir>

Parts (feet on y = 0, facing +z):
  tar_body   robe, scapular, wimple and veil, sleeves, hands with tweezers, face, belt
  tar_eyes   eyes (frame: (0, 1.58, 0.0)), so they can blink
  tar_table  the sorting table with the two crystal piles and the mirror behind (own frame, table front at z = 0.6)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'tartara.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'robe': ('#b8c4d8', 0, 0.7), 'robeLight': ('#dfe6f2', 0, 0.65), 'veil': ('#8a9ab8', 0, 0.7), 'wimple': ('#eef2f8', 0, 0.6),
    'skin': ('#ecc8b4', 0, 0.55), 'lip': ('#c07a78', 0, 0.5), 'hair': ('#2a2228', 0, 0.6), 'silver': ('#dcdcea', 0.9, 0.2),
    'eye': ('#f2eee8', 0, 0.3), 'iris': ('#4a6a8a', 0, 0.3), 'dark': ('#120e18', 0, 0.8), 'stone': ('#5a6070', 0, 0.85),
    'stoneLight': ('#7a8090', 0, 0.8), 'gold': ('#ffcf6a', 0.3, 0.2, 1.4), 'crys': ('#e8f4ff', 0.2, 0.1, 1.2), 'mirror': ('#c8d8e8', 1.0, 0.05),
    'frame': ('#8a90a0', 0.8, 0.3),
}
HEAD = Vector((0, 1.58, 0.0))

# ================================================================ the habit: a long robe, a lighter scapular down the front, a belt
robe = lathe([(0.17, 1.38), (0.2, 1.25), (0.22, 1.05), (0.27, 0.7), (0.34, 0.35), (0.42, 0.04), (0.43, 0.0)], 40, False, False)
for v in robe.verts:
    a = math.atan2(v.co.x, v.co.z)
    k = max(0.0, (1.0 - v.co.y) / 1.0)
    f = 1 + 0.05 * k * math.sin(a * 7)
    v.co.x *= f
    v.co.z *= f * 0.92
add('tar_body', robe, 'robe', None, [SOLID(0.015, 1)])
sc = lathe([(0.12, 1.3), (0.13, 1.0), (0.14, 0.6), (0.15, 0.2), (0.16, 0.02)], 24, False, False)
bmesh.ops.delete(sc, geom=[v for v in sc.verts if v.co.z < 0.0 or abs(math.atan2(v.co.x, v.co.z)) > 0.7], context='VERTS')
for v in sc.verts:
    v.co.z += 0.14 + 0.1 * (1.0 - v.co.y / 1.4)
add('tar_body', sc, 'robeLight', None, [SOLID(0.008, 1)])
add('tar_body', torus(0.2, 0.022, 32, 6), 'robeLight', TRS((0, 0.98, 0), scl=(1, 1, 0.92)))
add('tar_body', box(0.06, 0.06, 0.025), 'silver', TRS((0, 0.98, 0.2)), [BEVEL(0.01, 1)])
# a capelet over the shoulders (the folded veil falls onto it)
add('tar_body', lathe([(0.3, 1.1), (0.29, 1.2), (0.25, 1.3), (0.17, 1.38), (0.07, 1.43)], 36, False, False), 'robeLight', TRS(scl=(1, 1, 0.9)), [SOLID(0.012, 0)])  # a capelet over the shoulders

# ================================================================ sleeves and hands, both forward over the table, each with tweezers
for s in (-1, 1):
    sh = Vector((s * 0.2, 1.34, 0.0))
    el = Vector((s * 0.25, 1.08, 0.14))
    hd = Vector((s * 0.15, 1.0, 0.36))
    add('tar_body', tube([tuple(sh), tuple(sh.lerp(el, 0.5)), tuple(el)], [0.06, 0.06, 0.065], 12), 'robe')
    # wide bell sleeve
    add('tar_body', tube([tuple(el), tuple(el.lerp(hd, 0.5)), tuple(hd - (hd - el).normalized() * 0.06)], [0.07, 0.09, 0.11], 14, cap=False), 'robe', None, [SOLID(0.01, 0)])
    q = Vector((0, 1, 0)).rotation_difference((hd - el).normalized()).to_matrix().to_4x4()
    add('tar_body', sphere(1.0, 12, 8), 'skin', Matrix.Translation(hd) @ q @ TRS(scl=(0.032, 0.05, 0.024)))
    # tweezers: two thin silver blades, tips down toward the crystals
    tip = hd + Vector((0, -0.16, 0.06))
    for k in (-1, 1):
        add('tar_body', tube([tuple(hd + Vector((k * 0.008, 0.01, 0.0))), tuple(tip + Vector((k * 0.003, 0, 0)))], [0.005, 0.003], 4), 'silver')

# ================================================================ head: face in a white wimple, a pale-blue veil falling behind
add('tar_body', cyl(0.042, 0.048, 0.12, 14), 'skin', TRS((0, 1.46, 0.0)))
def addh(bm, mat, M=None, mods=(), seg='tar_body', smooth=True):
    add(seg, bm, mat, TRS(tuple(HEAD)) @ (M if M is not None else TRS()), mods, smooth)
face = deform(sphere(1.0, 30, 22), lambda v: head_shape(v, jaw_narrow=0.22, nose=0.09, socket=0.05, brow=0.03, cheek=0.035, chin=0.08))
addh(face, 'skin', TRS((0, 0, 0), scl=(0.1, 0.12, 0.105)))
addh(sphere(0.016, 12, 8), 'lip', TRS((0, -0.068, 0.088), scl=(1.1, 0.3, 0.3)))
for s in (-1, 1):
    addh(sphere(0.015, 10, 8), 'dark', TRS((s * 0.034, 0.018, 0.084), scl=(1.3, 0.7, 0.4)))
    addh(tube([(s * 0.014, 0.036, 0.096), (s * 0.038, 0.042, 0.094), (s * 0.06, 0.036, 0.083)], [0.004, 0.005, 0.003], 4), 'hair')
# dark hair, parted, showing only at the forehead under the wimple's edge
hair = meta([((0, 0.03, -0.005), (0.104, 0.118, 0.11), (0, 0, 0))], 0.012)
bmesh.ops.delete(hair, geom=[v for v in hair.verts if v.co.y < 0.035 or v.co.z < 0.0], context='VERTS')
addh(hair, 'hair', TRS((0, 0.004, 0.002)))
# the wimple: a white hood hugging the head, with an oval opening for the face, closed under the chin
wim = lathe([(0.07, -0.2), (0.11, -0.14), (0.125, -0.04), (0.128, 0.05), (0.12, 0.12), (0.09, 0.17), (0.03, 0.195)], 36, False, True)
bmesh.ops.delete(wim, geom=[v for v in wim.verts if v.co.z > 0.02 and ((v.co.x / 0.095) ** 2 + ((v.co.y - 0.0) / 0.125) ** 2) < 1.0], context='VERTS')
addh(wim, 'wimple', TRS((0, 0, -0.008), scl=(1, 1, 1.06)), [SOLID(0.01, 0)])
# the veil: falls from the crown over the back of the hood to the shoulders, open at the front
veil = lathe([(0.25, -0.42), (0.21, -0.25), (0.165, -0.08), (0.15, 0.06), (0.13, 0.15), (0.07, 0.215)], 36, False, False)
bmesh.ops.delete(veil, geom=[v for v in veil.verts if v.co.z > 0.03 - 0.12 * max(0.0, -v.co.y)], context='VERTS')
addh(veil, 'veil', TRS((0, 0.005, -0.012)), [SOLID(0.012, 0)])

# ================================================================ eyes (frame: HEAD)
for s in (-1, 1):
    add('tar_eyes', sphere(0.013, 12, 8), 'eye', TRS((s * 0.034, 0.018, 0.086), scl=(1.2, 0.6, 0.5)))
    add('tar_eyes', sphere(0.007, 10, 6), 'iris', TRS((s * 0.034, 0.018, 0.0915), scl=(1, 1, 0.5)))

# ================================================================ the sorting table, the two crystal piles, the mirror
add('tar_table', box(1.4, 0.9, 0.55), 'stone', TRS((0, 0.45, 0.85)), [BEVEL(0.03, 2)])
add('tar_table', box(1.5, 0.08, 0.62), 'stoneLight', TRS((0, 0.93, 0.85)), [BEVEL(0.02, 1)])
def crystal(cx, cz, mat, hand, seed):
    for k in range(7):
        a = k / 7 * 2 * PI + seed
        r = 0.03 + 0.06 * hash3(k, seed, 1)
        h = 0.08 + 0.1 * hash3(k, seed, 2)
        tilt = (0.35 if hand > 0 else -0.35) * (0.6 + 0.4 * hash3(k, seed, 3))
        add('tar_table', cyl(0.025, 0.0, h, 6), mat, TRS((cx + math.sin(a) * r, 0.97 + h / 2, cz + math.cos(a) * r), (0.15 * math.cos(a), 0, tilt)), smooth=False)
crystal(-0.35, 0.82, 'gold', 1, 1.0)
crystal(0.35, 0.82, 'crys', -1, 2.0)
# the tall mirror behind her
add('tar_table', box(1.1, 2.1, 0.06), 'mirror', TRS((0, 1.45, -0.55)))
add('tar_table', box(1.26, 0.1, 0.1), 'frame', TRS((0, 2.55, -0.55)), [BEVEL(0.02, 1)])
add('tar_table', box(1.26, 0.1, 0.1), 'frame', TRS((0, 0.37, -0.55)), [BEVEL(0.02, 1)])
for s in (-1, 1):
    add('tar_table', box(0.1, 2.3, 0.1), 'frame', TRS((s * 0.6, 1.45, -0.55)), [BEVEL(0.02, 1)])

# ---------------------------------------------------------------- build, bake, export
objs = build_objects(MATS, 'tartara')
bake_ao(objs, distance=0.2, samples=32, floor=0.62)
export_glb(objs, GLB)
if RENDERS:
    pl = [('tar_body', TRS()), ('tar_eyes', TRS(tuple(HEAD))), ('tar_table', TRS())]
    preview(objs, pl, [('tartara_front.png', (0.3, 1.5, 3.2), (0, 1.1, 0.3), 38), ('tartara_face.png', (0.12, 1.62, 0.75), (0, 1.57, 0), 50),
                       ('tartara_side.png', (2.6, 1.4, 1.6), (0, 1.0, 0.3), 38)], RENDERS, sky='#8aa0c0', ground='#4a5060')
    print('RENDERS', RENDERS)
