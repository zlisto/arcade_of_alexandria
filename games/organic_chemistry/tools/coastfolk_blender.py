"""The Tide Coast's people for The Legend of Valence, exported to public/models/coastfolk.glb.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/coastfolk_blender.py -- <glb_path> <render_dir>

Brønsted & Lowry, the Proton Ferrymen (assets/characters/ferrymen.png): twin boatmen in long coats, one red
and one blue, each with an oar, standing in a weathered rowboat. The glowing proton stays in the game.
  fm_boat           the rowboat, in the boat group's frame (length along x)
  fm_manL / fm_manR a boatman at x -0.95 / +0.95 (his feet at y 0.35 in the boat frame), facing +z, oar in
                    hand; his coat's material is 'coat' (the game tints it red or blue)
Water-folk (H2O): a round red oxygen with two hydrogen ears at 104.5 degrees, a face and a little hat.
  wf_body           own frame (feet on y = 0, facing +z); 'hat' is tinted per person
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'coastfolk.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'hull': ('#7a5030', 0, 0.85), 'hullDark': ('#5a3a22', 0, 0.9), 'moss': ('#5f8a3a', 0, 0.95), 'wood': ('#6a4a30', 0, 0.8),
    'coat': ('#c0394b', 0, 0.75), 'shirt': ('#8a8a8a', 0, 0.9), 'trousers': ('#2a2a33', 0, 0.9), 'boots': ('#3a2a1a', 0, 0.7),
    'skin': ('#d9a07e', 0, 0.6), 'hair': ('#2a2420', 0, 0.6), 'eye': ('#1a1414', 0, 0.5), 'eyeWhite': ('#f4f1ec', 0, 0.4),
    'lip': ('#a85a50', 0, 0.5), 'button': ('#c8a860', 0.6, 0.4),
    'o': ('#d8423a', 0, 0.45), 'h': ('#f6f6f6', 0, 0.4), 'face': ('#2a0a0a', 0, 0.6), 'hat': ('#2f6fd8', 0, 0.7), 'lp': ('#ffd760', 0, 0.3, 2.0),
}

# ================================================================ the rowboat (boat frame; hull centre at y 0.25, length along x)
def hull_pt(u, v):
    """u in [-1, 1] along the boat, v in [0, 1] from keel to gunwale (and around to the other side by sign)."""
    L, Bm, D = 1.85, 0.62, 0.55
    w = Bm * (1 - abs(u) ** 2.2) ** 0.6
    a = v * PI / 2
    x = u * L
    y = 0.62 - D * math.cos(a) * (1 - 0.15 * abs(u)) + 0.12 * abs(u) ** 3  # a sheer that rises at bow and stern
    return x, y
hb = bmesh.new()
NU, NV = 28, 8
rows = []
for i in range(NU + 1):
    u = -1 + 2 * i / NU
    L, Bm = 1.85, 0.62
    w = Bm * max(0.0, 1 - abs(u) ** 2.2) ** 0.6
    ring = []
    for j in range(-NV, NV + 1):
        v = j / NV
        a = v * PI / 2
        x = u * L
        y = 0.64 - 0.55 * math.cos(a) * (1 - 0.15 * abs(u)) + 0.14 * abs(u) ** 3
        z = w * math.sin(a)
        ring.append(hb.verts.new((x, y - 0.25, z)))
    rows.append(ring)
for i in range(NU):
    for j in range(2 * NV):
        hb.faces.new((rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]))
bmesh.ops.recalc_face_normals(hb, faces=hb.faces)
add('fm_boat', hb, 'hull', None, [SOLID(0.04, -1)])
for k in range(4):  # plank seams (strakes)
    v = 0.2 + k * 0.22
    pts = []
    for i in range(NU + 1):
        u = -1 + 2 * i / NU
        w = 0.62 * max(0.0, 1 - abs(u) ** 2.2) ** 0.6
        a = v * PI / 2
        pts.append((u * 1.85, 0.64 - 0.55 * math.cos(a) * (1 - 0.15 * abs(u)) + 0.14 * abs(u) ** 3 - 0.25, w * math.sin(a) + 0.01))
    for sgn in (1, -1):
        add('fm_boat', tube([(p[0], p[1], p[2] * sgn + 0.005 * sgn) for p in pts], [0.012] * len(pts), 4), 'hullDark')
# gunwale rails, stem posts, thwarts (seats) and floorboards
for sgn in (1, -1):
    pts = []
    for i in range(NU + 1):
        u = -1 + 2 * i / NU
        w = 0.62 * max(0.0, 1 - abs(u) ** 2.2) ** 0.6
        pts.append((u * 1.85, 0.64 + 0.14 * abs(u) ** 3 - 0.25, w * sgn))
    add('fm_boat', tube(pts, [0.035] * len(pts), 6), 'wood')
for x in (-1.85, 1.85):
    add('fm_boat', box(0.12, 0.75, 0.1), 'hullDark', TRS((x * 0.99, 0.38, 0), (0, 0, -0.25 if x > 0 else 0.25)), [BEVEL(0.02, 1)])
for x in (-1.25, 0.0, 1.25):
    add('fm_boat', box(0.28, 0.06, 1.0 if x == 0 else 0.8), 'wood', TRS((x, 0.28, 0)), [BEVEL(0.01, 1)])
add('fm_boat', box(3.0, 0.04, 0.5), 'wood', TRS((0, 0.03, 0)))

# ================================================================ a boatman (part frame = the boat frame, standing at x = side * 0.95)
def boatman(seg, side):
    F = Vector((side * 0.95, 0.35, 0.0))
    def P(x, y, z):
        return tuple(F + Vector((x, y, z)))
    # legs and boots
    for s in (-1, 1):
        add(seg, tube([P(s * 0.11, 0.05, 0), P(s * 0.11, 0.45, 0), P(s * 0.11, 0.8, 0)], [0.085, 0.08, 0.09], 10), 'trousers')
        add(seg, box(0.15, 0.22, 0.27), 'boots', TRS(P(s * 0.11, 0.11, 0.04)), [BEVEL(0.04, 2)])
    # the long coat: from the shoulders to the knees, open at the front below the waist
    coat = lathe([(0.3, 0.42), (0.29, 0.75), (0.27, 1.0), (0.26, 1.2), (0.27, 1.38), (0.22, 1.5), (0.12, 1.56)], 26, False, False)
    for v in coat.verts:
        v.co.z *= 0.8
    bmesh.ops.delete(coat, geom=[v for v in coat.verts if v.co.y < 0.95 and v.co.z > 0.12 and abs(v.co.x) < 0.07], context='VERTS')
    add(seg, coat, 'coat', TRS(P(0, 0, 0)), [SOLID(0.025, 1)])
    add(seg, lathe([(0.2, 1.0), (0.21, 1.3), (0.15, 1.5)], 18, False, False), 'shirt', TRS(P(0, 0, 0.01), scl=(1, 1, 0.8)))
    # turned-down lapels and a collar
    for s in (-1, 1):
        lap = poly_sheet([(0, 0), (s * 0.12, 0.02), (s * 0.15, -0.28), (s * 0.04, -0.34)], 2)
        add(seg, lap, 'coat', TRS(P(s * 0.03, 1.52, 0.2), (-0.25, s * 0.35, 0)), [SOLID(0.03, 0)])
    add(seg, torus(0.13, 0.04, 16, 6), 'coat', TRS(P(0, 1.55, 0), scl=(1, 1, 0.85)))
    for k in range(4):  # buttons down the front
        add(seg, sphere(0.018, 8, 6), 'button', TRS(P(0.08, 1.33 - k * 0.12, 0.215)))
    # the oar, held across the body; the arms reach to it
    th = side * 0.55
    d = Vector((-math.sin(th), math.cos(th), 0))
    c = F + Vector((-side * 0.25, 1.05, 0.15))
    a, b = c - d * 1.2, c + d * 1.2
    add(seg, tube([tuple(a), tuple(b)], [0.03, 0.03], 8), 'wood')
    blade = box(0.05, 0.55, 0.16)
    add(seg, blade, 'wood', Matrix.Translation(a + d * 0.25) @ Vector((0, 1, 0)).rotation_difference(d).to_matrix().to_4x4(), [BEVEL(0.015, 1)])
    hands = [c + d * 0.35, c - d * 0.25]
    for s, hnd in zip((side * -1, side), hands):  # the near arm holds high, the far arm low
        sh = F + Vector((s * 0.27, 1.45, 0.0))
        el = sh.lerp(hnd, 0.5) + Vector((s * 0.12, -0.12, -0.05))
        add(seg, tube([tuple(sh), tuple(el), tuple(hnd)], [0.075, 0.07, 0.06], 10), 'coat')
        add(seg, sphere(0.055, 10, 8), 'skin', TRS(tuple(hnd), scl=(1, 1.1, 0.9)))
    # neck and head
    add(seg, cyl(0.06, 0.055, 0.12, 10), 'skin', TRS(P(0, 1.6, 0)))
    head = deform(sphere(1.0, 26, 20), lambda v: head_shape(v, jaw_narrow=0.15, nose=0.12, socket=0.04, brow=0.05, cheek=0.05))
    H = Vector(P(0, 1.78, 0.01))
    add(seg, head, 'skin', TRS(tuple(H), scl=(0.15, 0.165, 0.155)))
    for s in (-1, 1):
        add(seg, sphere(0.032, 10, 8), 'skin', TRS(tuple(H + Vector((s * 0.14, 0.0, -0.01))), scl=(0.45, 1, 0.7)))
        add(seg, sphere(0.018, 10, 8), 'eyeWhite', TRS(tuple(H + Vector((s * 0.05, 0.02, 0.128))), scl=(1.2, 0.8, 0.5)))
        add(seg, sphere(0.01, 8, 6), 'eye', TRS(tuple(H + Vector((s * 0.05, 0.02, 0.137)))))
        add(seg, tube([tuple(H + Vector((s * 0.025, 0.06, 0.135))), tuple(H + Vector((s * 0.055, 0.068, 0.132))), tuple(H + Vector((s * 0.08, 0.06, 0.118)))], [0.008, 0.008, 0.004], 5), 'hair')
    add(seg, tube([tuple(H + Vector((x, -0.06 + 3.0 * x * x, 0.136 - abs(x) * 0.4))) for x in (-0.04, -0.02, 0, 0.02, 0.04)], [0.004, 0.007, 0.008, 0.007, 0.004], 5), 'lip')  # a wide grin
    # short dark hair, swept up and back
    cap = hemi(0.158, 22, 10)
    add(seg, cap, 'hair', TRS(tuple(H + Vector((0, 0.045, -0.02))), (-0.35, 0, 0), scl=(1.0, 0.72, 1.02)))
    for k in range(14):
        az = -1.2 + 2.4 * k / 13
        st = H + Vector((math.sin(az) * 0.13, 0.11, math.cos(az) * 0.12))
        add(seg, tube([tuple(st), tuple(st + Vector((0, 0.05, -0.04))), tuple(st + Vector((0.01 * math.sin(az), 0.04, -0.1)))], [0.03, 0.025, 0.004], 5), 'hair')
boatman('fm_manL', -1)
boatman('fm_manR', 1)

# ================================================================ a water-folk (H2O; own frame)
add('wf_body', sphere(0.5, 32, 24), 'o', TRS((0, 0.62, 0)))
for s in (-1, 1):
    a = s * math.radians(104.5 / 2)
    add('wf_body', sphere(0.24, 24, 18), 'h', TRS((math.sin(a) * 0.55, 0.62 + math.cos(a) * 0.55, 0)))
    add('wf_body', cyl(0.08, 0.08, 0.25, 12), 'h', TRS((math.sin(a) * 0.4, 0.62 + math.cos(a) * 0.4, 0), (0, 0, -a)))
    # big round eyes with highlights, rosy cheeks
    add('wf_body', sphere(0.075, 14, 10), 'eyeWhite', TRS((s * 0.15, 0.73, 0.43), scl=(0.9, 1.15, 0.5)))
    add('wf_body', sphere(0.05, 12, 8), 'face', TRS((s * 0.15, 0.72, 0.465), scl=(0.9, 1.15, 0.5)))
    add('wf_body', sphere(0.015, 8, 6), 'eyeWhite', TRS((s * 0.15 + 0.015, 0.745, 0.49)))
    add('wf_body', sphere(0.06, 10, 8), 'lip', TRS((s * 0.27, 0.6, 0.41), scl=(1, 0.6, 0.35)))
    add('wf_body', sphere(0.12, 14, 10), 'o', TRS((s * 0.18, 0.08, 0.05), scl=(1, 0.5, 1.4)))  # feet
    add('wf_body', sphere(0.036, 10, 8), 'lp', TRS((s * 0.22, 0.28, 0.33)))  # its two lone pairs
add('wf_body', tube([(x, 0.56 + 6.0 * x * x, 0.47 - abs(x) * 0.5) for x in (-0.08, -0.04, 0, 0.04, 0.08)], [0.008, 0.013, 0.015, 0.013, 0.008], 6), 'face')
add('wf_body', cyl(0.17, 0.22, 0.16, 18), 'hat', TRS((0, 1.08, 0)))
add('wf_body', cyl(0.3, 0.3, 0.03, 20), 'hat', TRS((0, 1.0, 0)))

# ---------------------------------------------------------------- build, bake, export
objs = build_objects(MATS, 'coastfolk', smooth_parts=('fm_manL', 'fm_manR', 'wf_body'))
bake_ao(objs, distance=0.25, samples=32, floor=0.6)
export_glb(objs, GLB)
if RENDERS:
    pl = [('fm_boat', TRS()), ('fm_manL', TRS()), ('fm_manR', TRS()), ('wf_body', TRS((2.6, 0, 0.6), (0, -0.4, 0)))]
    preview(objs, pl, [('ferrymen.png', (0.6, 2.0, 5.5), (0, 1.3, 0), 36), ('ferry_faces.png', (0, 1.9, 2.0), (0, 1.75, 0), 45), ('waterfolk.png', (2.8, 1.0, 2.6), (2.6, 0.7, 0.6), 40)],
            RENDERS, sky='#a8d4ea', ground='#cfc09a')
    print('RENDERS', RENDERS)
