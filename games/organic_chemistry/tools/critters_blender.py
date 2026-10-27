"""World 2 critters for The Legend of Valence, exported to public/models/critters.glb.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/critters_blender.py -- <glb_path> <render_dir>

Lone-Pair Imp (assets/enemies/lone-pair-imp.png): a wiry red imp with curled horns, long ears, bat wings
and a spade tail, cupping its glowing electron pair (the pair itself stays procedural in the game).
  imp_body      in the imp's "body" group frame (feet on y = 0, facing +z)
Hydronium Crab (assets/enemies/hydronium-crab.png): a deep-blue crab, three hydrogens glowing on its shell.
  crab_body     in the crab's "body" group frame
  crab_clawL    in the clawL group at (-0.36, 0.32, 0.3)
  crab_clawR    in the clawR group at (0.36, 0.32, 0.3) (the game swings it to throw)
Material names match src/actors/Critters.jsx.
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'critters.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'red': ('#d0303c', 0, 0.55), 'redDark': ('#8a1c26', 0, 0.6), 'wing': ('#a8323e', 0, 0.7), 'horn': ('#2a1a1a', 0, 0.4),
    'eye': ('#f4e8ff', 0, 0.3, 3.0), 'dark': ('#2a0a0a', 0, 0.6), 'teeth': ('#fff6e8', 0, 0.4),
    'shell': ('#2f6fd8', 0.2, 0.25), 'shellDark': ('#1d4592', 0, 0.35), 'h': ('#ffffff', 0, 0.3, 1.2), 'crabEye': ('#7ff0ff', 0, 0.3, 2.5),
}

# ================================================================ Lone-Pair Imp
imp = meta([
    ((0, 0.43, 0.0), (0.085, 0.13, 0.07), (0.15, 0, 0)),    # chest
    ((0, 0.31, -0.01), (0.075, 0.08, 0.065), (0, 0, 0)),    # belly and hips
    ((0, 0.53, 0.02), (0.035, 0.05, 0.035), (0.3, 0, 0)),   # neck
    ((0, 0.64, 0.04), (0.12, 0.12, 0.115), (0, 0, 0)),      # head
    ((0, 0.57, 0.09), (0.07, 0.06, 0.07), (0.4, 0, 0)),     # pointed chin and jaw
], 0.02)
add('imp_body', imp, 'red')
# legs: crouched for a hop, thin with backward knees and clawed feet
for s in (-1, 1):
    hip = Vector((s * 0.06, 0.29, -0.01))
    knee = Vector((s * 0.09, 0.2, 0.09))
    ankle = Vector((s * 0.08, 0.07, -0.03))
    toe = Vector((s * 0.085, 0.01, 0.07))
    add('imp_body', tube([tuple(hip), tuple(knee), tuple(ankle), tuple(toe)], [0.04, 0.028, 0.02, 0.012], 8), 'red')
    for k in (-1, 0, 1):
        add('imp_body', cyl(0.007, 0.0, 0.04, 5), 'horn', TRS(tuple(toe + Vector((k * 0.015, -0.005, 0.03))), (PI / 2, 0, 0)))
# arms: reaching forward, hands cupped round the pair at (0, 0.38, 0.24)
for s in (-1, 1):
    sh = Vector((s * 0.085, 0.5, 0.0))
    el = Vector((s * 0.13, 0.4, 0.1))
    wr = Vector((s * 0.09, 0.37, 0.21))
    add('imp_body', tube([tuple(sh), tuple(el), tuple(wr)], [0.03, 0.022, 0.018], 8), 'red')
    add('imp_body', sphere(0.028, 10, 8), 'red', TRS(tuple(wr + Vector((s * -0.01, -0.01, 0.02))), scl=(1, 0.6, 1.2)))
    for k in range(3):  # long fingers curled round the electrons
        f0 = wr + Vector((s * (-0.01 - k * 0.012), -0.015, 0.035))
        add('imp_body', tube([tuple(f0), tuple(f0 + Vector((s * -0.03, -0.005, 0.03))), tuple(f0 + Vector((s * -0.055, 0.02, 0.035)))], [0.008, 0.007, 0.003], 5), 'red')
# head: long pointed ears, curled horns, glowing eyes, a wide toothy grin, a little earring
HD = Vector((0, 0.64, 0.04))
for s in (-1, 1):
    ear = cyl(0.05, 0.002, 0.22, 8)
    for v in ear.verts:
        v.co.z *= 0.35
    add('imp_body', ear, 'red', TRS(tuple(HD + Vector((s * 0.15, 0.04, -0.01))), (0.1, s * 0.25, -s * 1.15)))
    add('imp_body', torus(0.012, 0.003, 10, 4), 'horn', TRS(tuple(HD + Vector((s * 0.19, -0.0, 0.0))), (0, 0, PI / 2)))
    pts, rr = [], []
    for i in range(8):  # a horn curling up and back
        t = i / 7
        a = t * 1.6
        pts.append(tuple(HD + Vector((s * (0.06 + 0.05 * math.sin(a * 0.8)), 0.09 + 0.12 * math.sin(a), -0.02 - 0.09 * (1 - math.cos(a))))))
        rr.append(0.028 * (1 - t) + 0.002)
    add('imp_body', tube(pts, rr, 8), 'horn')
    add('imp_body', sphere(0.026, 12, 8), 'eye', TRS(tuple(HD + Vector((s * 0.048, 0.012, 0.106))), (0, s * 0.3, s * -0.45), scl=(1.15, 0.38, 0.4)))
    add('imp_body', tube([tuple(HD + Vector((s * 0.02, 0.05, 0.11))), tuple(HD + Vector((s * 0.06, 0.04, 0.11))), tuple(HD + Vector((s * 0.09, 0.055, 0.09)))], [0.008, 0.007, 0.003], 5), 'redDark')
add('imp_body', tube([tuple(HD + Vector((x, -0.058 + 7.0 * x * x, 0.128 - abs(x) * 0.35))) for x in (-0.065, -0.035, 0, 0.035, 0.065)], [0.006, 0.011, 0.012, 0.011, 0.006], 6), 'dark')  # a wide grin, corners up
for x in (-0.03, -0.015, 0.0, 0.015, 0.03):
    add('imp_body', cyl(0.006, 0.0, 0.016, 4), 'teeth', TRS(tuple(HD + Vector((x, -0.05 + 7.0 * x * x, 0.135 - abs(x) * 0.35))), (PI, 0, 0)))
add('imp_body', sphere(0.018, 10, 8), 'red', TRS(tuple(HD + Vector((0, 0.0, 0.122))), scl=(0.8, 1, 0.9)))  # nose
# tail: long, whipping round behind, ending in a spade
tail = [(0, 0.28, -0.07), (0.04, 0.2, -0.2), (0.12, 0.15, -0.3), (0.2, 0.2, -0.36), (0.25, 0.3, -0.34)]
add('imp_body', tube(tail, [0.022, 0.018, 0.014, 0.01, 0.008], 6), 'redDark')
spade = poly_sheet([(0, 0.07), (0.05, 0.0), (0.0, -0.02), (-0.05, 0.0)], 1)
add('imp_body', spade, 'redDark', TRS((0.26, 0.33, -0.33), (0, PI / 2, -0.6)), [SOLID(0.012, 0)])
# wings: bat-like, a bony arm with three fingers and a scalloped, tattered membrane
for s in (-1, 1):
    root = Vector((s * 0.05, 0.5, -0.06))
    elbow = root + Vector((s * 0.13, 0.1, -0.07))
    tips = [elbow + Vector((s * 0.16, 0.14, -0.02)), elbow + Vector((s * 0.21, 0.0, -0.03)), elbow + Vector((s * 0.16, -0.14, -0.02))]
    add('imp_body', tube([tuple(root), tuple(elbow)], [0.016, 0.012], 6), 'redDark')
    for tp in tips:
        add('imp_body', tube([tuple(elbow), tuple(tp)], [0.01, 0.004], 5), 'redDark')
    add('imp_body', cyl(0.012, 0.0, 0.05, 5), 'horn', TRS(tuple(elbow + Vector((0, 0.03, 0))), (0, 0, 0)))
    # membrane: fan from root through the finger tips, edge scalloped between fingers
    edge = [root + Vector((0, -0.12, 0.01))]
    for i in range(len(tips)):
        edge.append(tips[i])
        if i < len(tips) - 1:
            mid = (tips[i] + tips[i + 1]) / 2
            edge.append(elbow.lerp(mid, 0.62))
    edge.append(root + Vector((0, -0.12, 0.01)))
    bm = bmesh.new()
    c = bm.verts.new(tuple(elbow * 0.6 + root * 0.4))
    vs = [bm.verts.new(tuple(p)) for p in edge]
    vs.insert(0, bm.verts.new(tuple(root)))
    for i in range(len(vs) - 1):
        try:
            bm.faces.new((c, vs[i], vs[i + 1]))
        except ValueError:
            pass
    add('imp_body', bm, 'wing', None, [SOLID(0.006, 0)])
    for k in range(3):  # holes in the membrane (dark spots)
        p = elbow.lerp(tips[k], 0.55) + Vector((0, -0.03, 0.006))
        add('imp_body', sphere(0.012, 6, 4), 'dark', TRS(tuple(p), scl=(1, 1, 0.3)))

# ================================================================ Hydronium Crab (body frame)
cara = deform(sphere(1.0, 32, 20), lambda v: (v.x * (1 + 0.08 * max(0, v.z)), v.y * (0.55 if v.y > 0 else 0.3) + 0.06 * math.cos(v.x * 3), v.z * 0.82))
for vv in cara.verts:  # a ridged rim with small spikes at the front corners
    r = math.hypot(vv.co.x, vv.co.z)
    if abs(vv.co.y) < 0.12 and r > 0.9:
        vv.co.x *= 1.06; vv.co.z *= 1.06
add('crab_body', cara, 'shell', TRS((0, 0.31, -0.02), scl=0.42))
add('crab_body', torus(0.4, 0.03, 40, 6), 'shellDark', TRS((0, 0.3, -0.02), scl=(1.05, 1, 0.84)))
for s in (-1, 1):
    add('crab_body', cyl(0.035, 0.0, 0.12, 6), 'shellDark', TRS((s * 0.36, 0.33, 0.22), (0, 0, -s * 1.1)))
for k in range(14):  # bumpy speckles on the shell
    a = hash3(k, 1, 2) * 2 * PI
    rr2 = 0.1 + 0.25 * hash3(k, 3, 4)
    add('crab_body', sphere(0.018, 6, 4), 'shellDark', TRS((math.cos(a) * rr2, 0.5 - rr2 * 0.35, math.sin(a) * rr2 * 0.8 - 0.02)))
# three hydrogens set into the shell (H3O+)
for k in range(3):
    a = (k / 3) * PI * 2 + 0.3
    p = (math.cos(a) * 0.17, 0.5, math.sin(a) * 0.14)
    add('crab_body', torus(0.075, 0.014, 18, 5), 'shellDark', TRS((p[0], p[1] - 0.02, p[2])))
    add('crab_body', sphere(0.07, 14, 10), 'h', TRS(p))
# face plate, mouth parts and glowing eyes on short stalks
add('crab_body', sphere(1.0, 16, 10), 'shellDark', TRS((0, 0.3, 0.3), scl=(0.16, 0.08, 0.06)))
for k in range(3):
    add('crab_body', box(0.05, 0.012, 0.02), 'shell', TRS((0, 0.27 - k * 0.02, 0.35)), [BEVEL(0.004, 1)])
for s in (-1, 1):
    add('crab_body', tube([(s * 0.1, 0.4, 0.27), (s * 0.12, 0.47, 0.3), (s * 0.12, 0.5, 0.31)], [0.018, 0.016, 0.014], 6), 'shellDark')
    add('crab_body', sphere(0.032, 10, 8), 'crabEye', TRS((s * 0.12, 0.52, 0.32)))
# six walking legs, three each side, segmented and splayed
for s in (-1, 1):
    for k in range(3):
        z = -0.18 + k * 0.15
        a = Vector((s * 0.33, 0.24, z))
        b = Vector((s * 0.55, 0.34, z + 0.02))
        c = Vector((s * 0.7, 0.12, z + 0.05))
        d = Vector((s * 0.76, 0.0, z + 0.07))
        b = Vector((s * 0.52, 0.38, z + 0.02))
        c = Vector((s * 0.7, 0.18, z + 0.05))
        add('crab_body', tube([tuple(a), tuple(a.lerp(b, 0.5) + Vector((0, 0.03, 0))), tuple(b)], [0.03, 0.027, 0.024], 10), 'shell')
        add('crab_body', sphere(0.026, 10, 8), 'shellDark', TRS(tuple(b)))
        add('crab_body', tube([tuple(b), tuple(b.lerp(c, 0.5) + Vector((s * 0.02, 0.02, 0))), tuple(c), tuple(d)], [0.022, 0.02, 0.014, 0.003], 10), 'shell')
# claws (their own frames): a heavy palm with a fixed finger and a hinged finger, teeth along the bite
for seg, s in (('crab_clawL', -1), ('crab_clawR', 1)):
    add(seg, tube([(s * -0.12, -0.04, -0.12), (s * -0.04, -0.01, -0.04), (0, 0, 0.0)], [0.035, 0.04, 0.045], 8), 'shell')  # arm
    add(seg, sphere(1.0, 16, 12), 'shell', TRS((0, 0.01, 0.12), (0.2, 0, 0), scl=(0.1, 0.075, 0.14)))
    for (fy, up) in ((-0.03, -1), (0.05, 1)):
        pts = [(s * 0.02, fy, 0.22), (s * 0.03, fy + up * 0.02, 0.3), (s * 0.015, fy + up * 0.005 - up * 0.01, 0.37)]
        add(seg, tube(pts, [0.04, 0.03, 0.004], 8), 'shell')
        for k in range(3):
            add(seg, cyl(0.009, 0.0, 0.02, 4), 'shellDark', TRS((s * 0.025, fy - up * 0.02, 0.25 + k * 0.035), (up * PI / 2 * -1, 0, 0)))
    for k in range(6):
        a = hash3(k, s, 9) * PI
        add(seg, sphere(0.014, 6, 4), 'shellDark', TRS((math.cos(a) * 0.09, 0.01 + math.sin(a) * 0.06, 0.1 + 0.05 * hash3(k, 2, s))))

# ---------------------------------------------------------------- build, bake, export
objs = build_objects(MATS, 'critters', smooth_parts=('imp_body', 'crab_body', 'crab_clawL', 'crab_clawR'))
bake_ao(objs, distance=0.2, samples=32, floor=0.55)
export_glb(objs, GLB)
if RENDERS:
    pl = [('imp_body', TRS((-0.6, 0, 0), (0, 0.4, 0))), ('crab_body', TRS((0.7, 0, 0), (0, -0.4, 0))),
          ('crab_clawL', TRS((0.7, 0, 0), (0, -0.4, 0)) @ TRS((-0.36, 0.32, 0.3))), ('crab_clawR', TRS((0.7, 0, 0), (0, -0.4, 0)) @ TRS((0.36, 0.32, 0.3), (-0.8, 0, 0)))]
    preview(objs, pl, [('critters.png', (0, 0.9, 2.6), (0, 0.35, 0), 40), ('imp_face.png', (-0.5, 0.7, 0.8), (-0.6, 0.62, 0), 45), ('crab_close.png', (1.4, 0.8, 1.2), (0.7, 0.3, 0), 40)],
            RENDERS, sky='#1c2240', ground='#3a3a48')
    print('RENDERS', RENDERS)
