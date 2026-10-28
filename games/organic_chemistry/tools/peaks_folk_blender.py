"""World 6's characters for The Legend of Valence, exported to public/models/peaksfolk.glb.

Pass-Warden Hammond (assets/characters/warden-hammond.png): a weathered mountain guide in a heavy orange parka
with a white fur-trimmed hood, a grey beard, a coil of rope over one shoulder, brown gloves, and a wooden staff
whose head is carved with a mountain profile: two peaks and a valley, an energy diagram.
The Transition Wyrm (assets/enemies/transition-wyrm.png): a long translucent dragon coiled up a summit, ribbed
wings, a crest of spines, coloured lights along its body. It lives only on summits: it can't be caught, only crossed.
The Carbocation Wisp (assets/enemies/carbocation-wisp.png): a flat, glowing triangular ghost with an empty ring
(the vacant p orbital) and trailing tendrils.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/peaks_folk_blender.py -- <glb_path> <render_dir>

Parts (feet on y = 0, facing +z unless noted):
  ham_body   Hammond: boots, trousers, parka, hood, gloves, rope, belt, head, beard, staff
  ham_eyes   his eyes (frame: (0, 1.6, 0.04))
  wyr_body   the Wyrm's coiled body round a vertical axis (own frame: coil from y = 0 to 9, head end at the top)
  wyr_head   the head (frame: neck at origin, snout toward +z)
  wyr_wingL, wyr_wingR  the wings (frame: shoulder at origin, spreading to −x / +x)
  wsp_body   a wisp (own frame, centre at y = 1.4)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'peaksfolk.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'parka': ('#c8622a', 0, 0.75), 'parkaDark': ('#8a4018', 0, 0.8), 'fur': ('#efe8dc', 0, 0.95), 'trousers': ('#2a2a30', 0, 0.9),
    'boots': ('#3a2a1e', 0, 0.8), 'glove': ('#5a3a24', 0, 0.75), 'belt': ('#2a1e16', 0.2, 0.6), 'buckle': ('#9a9aa8', 0.85, 0.3),
    'rope': ('#8a7050', 0, 0.9), 'skin': ('#d49a7e', 0, 0.6), 'beard': ('#8a8a8e', 0, 0.85), 'wood': ('#6a4428', 0, 0.75),
    'eye': ('#f2eee8', 0, 0.3), 'iris': ('#3a4a5a', 0, 0.3), 'dark': ('#141010', 0, 0.8),
    'wyrm': ('#c8b8d8', 0.2, 0.4), 'wyrmDark': ('#6a5a7a', 0.2, 0.5), 'spine': ('#e8e0f0', 0.1, 0.3), 'light': ('#ff6a6a', 0, 0.2, 2.5),
    'lightB': ('#6ab0ff', 0, 0.2, 2.5), 'lightG': ('#7aff9a', 0, 0.2, 2.5), 'membrane': ('#9a7ab0', 0, 0.6), 'wyrmEye': ('#ff4a4a', 0, 0.2, 3.0),
    'wisp': ('#bfe8ff', 0, 0.3, 1.6),
}
HEAD = Vector((0, 1.6, 0.04))

# ================================================================ Hammond: legs and boots
for s in (-1, 1):
    add('ham_body', box(0.15, 0.13, 0.3), 'boots', TRS((s * 0.12, 0.065, 0.04)), [BEVEL(0.04, 2)])
    add('ham_body', lathe([(0.09, 0.1), (0.1, 0.24), (0.11, 0.3)], 14, False, True), 'boots', TRS((s * 0.12, 0, 0)))
    add('ham_body', capsule(0.085, 0.36, 14, 10), 'trousers', TRS((s * 0.12, 0.5, 0)))
# the parka: a long padded coat, quilted bands, two big pockets, toggles
pk = lathe([(0.29, 0.5), (0.31, 0.62), (0.3, 0.86), (0.31, 1.1), (0.3, 1.3), (0.26, 1.42), (0.15, 1.5)], 36, False, False)
for v in pk.verts:
    v.co.z *= 0.86
add('ham_body', pk, 'parka', None, [SOLID(0.025, 1)])
for y in (0.7, 0.92, 1.14):  # quilted seams
    add('ham_body', torus(0.305, 0.012, 36, 4), 'parkaDark', TRS((0, y, 0), scl=(1, 1, 0.87)))
add('ham_body', torus(0.3, 0.035, 36, 6), 'fur', TRS((0, 0.5, 0), scl=(1, 1, 0.87)))  # fur hem
add('ham_body', box(0.025, 0.85, 0.02), 'parkaDark', TRS((0, 0.98, 0.265)))  # placket
for k in range(4):
    add('ham_body', capsule(0.012, 0.03, 6, 4), 'buckle', TRS((0, 0.75 + k * 0.18, 0.28), (0, 0, PI / 2)))
for s in (-1, 1):
    add('ham_body', box(0.14, 0.14, 0.04), 'parka', TRS((s * 0.16, 0.7, 0.25), (0, s * 0.35, 0)), [BEVEL(0.015, 1)])
    add('ham_body', box(0.15, 0.04, 0.05), 'parkaDark', TRS((s * 0.16, 0.78, 0.255), (0, s * 0.35, 0)), [BEVEL(0.01, 1)])
add('ham_body', torus(0.3, 0.03, 36, 6), 'belt', TRS((0, 0.95, 0), scl=(1, 1, 0.87)))
add('ham_body', box(0.08, 0.06, 0.025), 'buckle', TRS((0, 0.95, 0.265)), [BEVEL(0.01, 1)])
# the rope coil over his left shoulder, across to the right hip
for k in range(5):
    pts = []
    for t in range(25):
        a = t / 24 * 2 * PI
        pts.append((-0.06 + 0.17 * math.cos(a) + k * 0.01, 1.05 + 0.27 * math.sin(a), 0.255 + 0.03 * math.cos(a) + k * 0.008))
    add('ham_body', tube(pts, [0.018] * 25, 6), 'rope', TRS((0, 0, 0), (0, 0, 0.35)))
# arms: left hanging with a glove, right holding the staff upright
for s in (-1, 1):
    sh = Vector((s * 0.3, 1.36, 0.0))
    el = Vector((s * 0.36, 1.08, 0.06)) if s < 0 else Vector((s * 0.36, 1.1, 0.12))
    hd = Vector((s * 0.33, 0.82, 0.12)) if s < 0 else Vector((s * 0.34, 1.02, 0.32))
    add('ham_body', sphere(0.1, 14, 10), 'parka', TRS(tuple(sh)))
    add('ham_body', tube([tuple(sh), tuple(el), tuple(hd)], [0.09, 0.085, 0.08], 12), 'parka')
    add('ham_body', torus(0.075, 0.03, 16, 6), 'fur', Matrix.Translation(hd.lerp(el, 0.2)) @ Vector((0, 1, 0)).rotation_difference((hd - el).normalized()).to_matrix().to_4x4())
    add('ham_body', sphere(0.065, 12, 10), 'glove', TRS(tuple(hd), scl=(1, 1.2, 1)))
STAFF = Vector((0.34, 1.02, 0.32))
add('ham_body', tube([tuple(STAFF + Vector((0, -1.0, 0))), tuple(STAFF + Vector((0, 0.9, 0)))], [0.03, 0.032], 8), 'wood')
# the staff head: a flat paddle carved with two peaks and a valley
prof = [(-0.09, 0.0), (-0.05, 0.12), (-0.02, 0.06), (0.03, 0.2), (0.08, 0.08), (0.1, 0.0)]
add('ham_body', box(0.24, 0.32, 0.04), 'wood', TRS(tuple(STAFF + Vector((0, 1.05, 0)))), [BEVEL(0.02, 2)])
for i in range(len(prof) - 1):
    a, b = prof[i], prof[i + 1]
    add('ham_body', tube([(STAFF.x + a[0], STAFF.y + 0.95 + a[1], STAFF.z + 0.025), (STAFF.x + b[0], STAFF.y + 0.95 + b[1], STAFF.z + 0.025)], [0.008, 0.008], 4), 'parkaDark')
# head: weathered face, grey beard, the fur-trimmed hood up
add('ham_body', cyl(0.06, 0.07, 0.1, 12), 'skin', TRS((0, 1.48, 0.02)))
def addh(bm, mat, M=None, mods=(), seg='ham_body', smooth=True):
    add(seg, bm, mat, TRS(tuple(HEAD)) @ (M if M is not None else TRS()), mods, smooth)
face = deform(sphere(1.0, 28, 20), lambda v: head_shape(v, jaw_narrow=0.1, nose=0.12, socket=0.05, brow=0.07, cheek=0.04))
addh(face, 'skin', TRS((0, 0, 0), scl=(0.12, 0.135, 0.125)))
addh(sphere(0.026, 12, 8), 'skin', TRS((0, -0.01, 0.128), scl=(0.9, 1, 0.9)))
for s in (-1, 1):
    addh(sphere(0.018, 10, 8), 'dark', TRS((s * 0.042, 0.02, 0.1), scl=(1.3, 0.7, 0.4)))
    addh(tube([(s * 0.015, 0.048, 0.113), (s * 0.045, 0.055, 0.11), (s * 0.07, 0.046, 0.095)], [0.007, 0.008, 0.004], 4), 'beard')
addh(meta([((0, -0.08, 0.07), (0.1, 0.08, 0.06), (0, 0, 0)), ((0, -0.13, 0.08), (0.075, 0.07, 0.05), (0, 0, 0)), ((0, -0.03, 0.1), (0.07, 0.025, 0.03), (0, 0, 0))], 0.012), 'beard')
hood = lathe([(0.13, -0.16), (0.17, -0.05), (0.175, 0.06), (0.16, 0.15), (0.11, 0.21), (0.03, 0.235)], 32, False, True)
bmesh.ops.delete(hood, geom=[v for v in hood.verts if v.co.z > 0.0 and ((v.co.x / 0.12) ** 2 + ((v.co.y + 0.01) / 0.15) ** 2) < 1.0], context='VERTS')
addh(hood, 'parka', TRS((0, 0.0, -0.02), scl=(1, 1, 1.08)), [SOLID(0.02, 0)])
addh(torus(0.135, 0.04, 32, 8), 'fur', TRS((0, 0.0, 0.08), (PI / 2, 0, 0), scl=(1, 1.15, 1)))  # the fur ruff round the face

for s in (-1, 1):
    add('ham_eyes', sphere(0.016, 12, 8), 'eye', TRS((s * 0.042, 0.02, 0.1), scl=(1.2, 0.6, 0.5)))
    add('ham_eyes', sphere(0.008, 10, 6), 'iris', TRS((s * 0.042, 0.02, 0.108), scl=(1, 1, 0.5)))

# ================================================================ the Transition Wyrm, coiled round a summit (axis y)
pts, rad = [], []
for k in range(160):
    t = k / 159
    a = t * 3.2 * 2 * PI
    r = 2.6 - 1.6 * t
    pts.append((math.cos(a) * r, 0.3 + t * 9.0, math.sin(a) * r))
    rad.append(0.12 + 0.48 * min(1.0, t * 4) * (1 - 0.3 * t))  # a thin tail at the foot, thick up to the neck
add('wyr_body', tube(pts, rad, 12), 'wyrm')
for k in range(0, 160, 4):  # a row of spines and the coloured lights along it
    p = Vector(pts[k]); t = k / 159
    nxt = Vector(pts[min(k + 1, 159)]) - p
    out = Vector((p.x, 0, p.z)).normalized() if p.length > 0.01 else Vector((1, 0, 0))
    up = out.cross(nxt.normalized()).normalized()
    if up.y < 0:
        up = -up
    add('wyr_body', cyl(0.06, 0.0, 0.3 + 0.2 * (1 - t), 4), 'spine', Matrix.Translation(p + up * rad[k]) @ Vector((0, 1, 0)).rotation_difference(up).to_matrix().to_4x4(), smooth=False)
    if k % 8 == 0:
        mat = ('light', 'lightB', 'lightG')[(k // 8) % 3]
        add('wyr_body', sphere(0.07, 8, 6), mat, TRS(tuple(p + out * rad[k] * 0.95)))
# head (frame: neck at origin, snout +z): long snout, horns, a crest, red eyes
add('wyr_head', deform(sphere(1.0, 24, 16), lambda v: (v.x * 0.32, v.y * 0.3, v.z * 0.7 + 0.35)), 'wyrm')
add('wyr_head', deform(sphere(1.0, 16, 10), lambda v: (v.x * 0.22, v.y * 0.1 - 0.17, v.z * 0.55 + 0.45)), 'wyrmDark')  # jaw
for s in (-1, 1):
    add('wyr_head', sphere(0.06, 10, 8), 'wyrmEye', TRS((s * 0.18, 0.12, 0.55), scl=(1, 0.6, 0.8)))
    add('wyr_head', cyl(0.06, 0.0, 0.6, 6), 'spine', TRS((s * 0.15, 0.25, 0.0), (-1.0, 0, s * 0.35)), smooth=False)
for k in range(6):
    add('wyr_head', cyl(0.035, 0.0, 0.35 - k * 0.03, 4), 'spine', TRS((0, 0.28, 0.3 - k * 0.12), (-0.6, 0, 0)), smooth=False)
for k in range(5):  # teeth
    add('wyr_head', cyl(0.018, 0.0, 0.08, 4), 'spine', TRS(((k - 2) * 0.06, -0.08, 0.95 - abs(k - 2) * 0.05), (PI, 0, 0)), smooth=False)
# wings: ribs fanning out with a membrane between
for nm, s in (('wyr_wingL', -1), ('wyr_wingR', 1)):
    tips = [Vector((s * (1.4 + 0.6 * k), 1.2 - 0.45 * k, -0.2 - 0.25 * k)) for k in range(4)]
    for tp in tips:
        add(nm, tube([(0, 0, 0), tuple(tp * 0.5 + Vector((0, 0.3, 0))), tuple(tp)], [0.06, 0.045, 0.01], 6), 'wyrmDark')
    for i in range(3):
        a, b = tips[i], tips[i + 1]
        bm = bmesh.new()
        v0 = bm.verts.new((0, 0, 0)); v1 = bm.verts.new(tuple(a)); v2 = bm.verts.new(tuple(b))
        bm.faces.new((v0, v1, v2))
        add(nm, bm, 'membrane', None, [SOLID(0.02, 0)], smooth=False)

# ================================================================ a carbocation wisp: a flat triangle with an empty ring and tendrils
w = poly_sheet([(-0.6, -0.35), (0.6, -0.35), (0.0, 0.7)], 3)
add('wsp_body', w, 'wisp', TRS((0, 1.4, 0)), [SOLID(0.05, 0)], smooth=False)
add('wsp_body', torus(0.16, 0.035, 24, 6), 'wisp', TRS((0, 1.55, 0.03), (PI / 2, 0, 0)))
for k in range(4):
    x = -0.45 + k * 0.3
    pts = [(x, 1.08, 0), (x * 1.1, 0.8, 0.05 * k), (x * 0.9 + 0.08, 0.5, -0.05), (x * 1.2, 0.25, 0.04)]
    add('wsp_body', tube(pts, [0.07, 0.05, 0.03, 0.005], 6), 'wisp')

objs = build_objects(MATS, 'peaksfolk', smooth_parts=('wyr_body',))
bake_ao(objs, distance=0.3, samples=24, floor=0.6)
export_glb(objs, GLB)
if RENDERS:
    pl = [('ham_body', TRS((-2.5, 0, 0))), ('ham_eyes', TRS(tuple(HEAD + Vector((-2.5, 0, 0))))), ('wyr_body', TRS((3, 0, -2))), ('wyr_head', TRS((3 + 1.0, 9.4, -2), (0.3, 0, 0))),
          ('wyr_wingL', TRS((3, 7.5, -2.5))), ('wyr_wingR', TRS((3, 7.5, -2.5))), ('wsp_body', TRS((-0.5, 0, 1)))]
    preview(objs, pl, [('peaks_folk.png', (0, 4.5, 14), (0.5, 4, 0), 35), ('hammond_face.png', (-2.4, 1.65, 0.9), (-2.5, 1.55, 0), 50)], RENDERS, sky='#8a9ab8', ground='#d8dce8')
    print('RENDERS', RENDERS)
