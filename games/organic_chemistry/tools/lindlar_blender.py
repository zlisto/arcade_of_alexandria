"""World 9's characters for The Legend of Valence, exported to public/models/lindlar.glb.

Sage Lindlar (assets/characters/sage-lindlar.png): a calm young engineer of the cliffs with short dark hair, a long
grey robe with a draped cowl and wide sleeves, a brown sash, a scroll in his left hand and a tall perfectly straight
staff of cyan light in his right (a triple bond: linear, 180°).
The Acetylide Viper (assets/enemies/acetylide-viper.png): a dark purple serpent ringed with cyan bands whose snout
carries a glowing negative charge (the carbanion lone pair); it strikes in straight lines.
Malradix's Mimic: a faceless violet mannequin wrapped in three loose shells (its disguises) that peel away.
The Retrosynthesis Map (assets/items/retro-map.png): a parchment with a branching tree of glowing nodes and a compass.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/lindlar_blender.py -- <glb_path> <render_dir>

Parts (feet on y = 0, facing +z unless noted):
  lin_body    Lindlar: robe, cowl, sleeves, sash, hands, scroll, staff, head, hair
  lin_eyes    his eyes (frame: (0, 1.66, 0.05))
  vip_body    a viper (own frame: coiled, head raised toward +z at about y = 1.0)
  mim_body    the Mimic's core figure (own frame, about 2.6 m)
  mim_shell   one disguise shell (own frame, a loose wrapping around the core, about 2.8 m)
  t9_map      the Map (own frame, a scroll about 0.5 m wide, facing +z)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'lindlar.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'robe': ('#8a8a8e', 0, 0.85), 'robeDark': ('#5a5a62', 0, 0.9), 'sash': ('#6a4a30', 0, 0.8), 'skin': ('#e0b898', 0, 0.55),
    'hair': ('#2a2420', 0, 0.75), 'eye': ('#f2eee8', 0, 0.3), 'iris': ('#3a4a5a', 0, 0.3), 'dark': ('#141010', 0, 0.8), 'lip': ('#b07070', 0, 0.5),
    'staff': ('#7af0ff', 0, 0.2, 3.0), 'paper': ('#e8d8b0', 0, 0.9), 'ink': ('#6a4a2a', 0, 0.9), 'node': ('#5ff0ff', 0, 0.2, 2.5), 'brass': ('#c8a050', 0.85, 0.3),
    'viper': ('#3a1a4a', 0.1, 0.45), 'viperBelly': ('#6a3a7a', 0, 0.5), 'band': ('#5ff0ff', 0, 0.2, 2.2), 'fang': ('#f0e8e0', 0, 0.3), 'charge': ('#9ff8ff', 0, 0.2, 3.5),
    'mimic': ('#6a4a9a', 0.2, 0.4), 'mimicDark': ('#2a1a40', 0, 0.6), 'shell': ('#b8a0d8', 0.1, 0.5),
}
HEAD = Vector((0, 1.66, 0.05))

# ================================================================ Lindlar: a long robe, a cowl, wide sleeves
robe = lathe([(0.3, 0.02), (0.27, 0.4), (0.23, 0.9), (0.21, 1.2), (0.23, 1.38), (0.18, 1.48), (0.1, 1.53)], 36, False, True)
for v in robe.verts:
    v.co.z *= 0.82
add('lin_body', robe, 'robe')
for y in (0.03, 0.5):
    add('lin_body', torus(0.3 - 0.06 * (y / 0.5), 0.015, 36, 4), 'robeDark', TRS((0, y + 0.01, 0), scl=(1, 1, 0.82)))
add('lin_body', torus(0.22, 0.035, 32, 6), 'sash', TRS((0, 0.98, 0), scl=(1, 1, 0.82)))
add('lin_body', box(0.07, 0.4, 0.02), 'sash', TRS((0.08, 0.78, 0.19), (0, 0, 0.1)))
cowl = torus(0.17, 0.07, 32, 10)
add('lin_body', cowl, 'robe', TRS((0, 1.47, -0.01), scl=(1, 0.8, 0.95)))
add('lin_body', deform(sphere(1.0, 16, 10), lambda v: (v.x * 0.2, v.y * 0.25, max(-0.1, v.z) * 0.18)), 'robe', TRS((0, 1.28, -0.16)))  # the drape down the back
for s in (-1, 1):
    sh = Vector((s * 0.23, 1.42, 0.0))
    el = Vector((s * 0.3, 1.14, 0.08))
    hd = Vector((s * 0.26, 1.02, 0.28)) if s < 0 else Vector((0.3, 1.05, 0.22))
    add('lin_body', sphere(0.08, 12, 10), 'robe', TRS(tuple(sh)))
    add('lin_body', tube([tuple(sh), tuple(el)], [0.075, 0.08], 12), 'robe')
    add('lin_body', lathe([(0.08, 0.0), (0.12, 0.12), (0.13, 0.2)], 16, False, False), 'robe', Matrix.Translation(el) @ Vector((0, 1, 0)).rotation_difference((hd - el).normalized()).to_matrix().to_4x4(), [SOLID(0.01, 0)])  # wide sleeve
    add('lin_body', tube([tuple(el.lerp(hd, 0.4)), tuple(hd)], [0.04, 0.035], 10), 'skin')
    add('lin_body', sphere(0.042, 12, 10), 'skin', TRS(tuple(hd), scl=(1, 1.2, 1)))
# the scroll in his left hand, half unrolled, with a branching map line
SC = Vector((-0.24, 1.08, 0.33))
add('lin_body', box(0.26, 0.34, 0.006), 'paper', TRS(tuple(SC + Vector((0.02, 0.02, 0))), (0, 0.4, 0)))
for k in range(2):
    add('lin_body', cyl(0.018, 0.018, 0.3, 10), 'paper', TRS(tuple(SC + Vector((0.02, 0.19 - k * 0.38, 0))), (0, 0.4, PI / 2)))
add('lin_body', tube([tuple(SC + Vector((0.02, -0.12, 0.006))), tuple(SC + Vector((0.02, 0.0, 0.006))), tuple(SC + Vector((-0.05, 0.1, 0.006)))], [0.004] * 3, 4), 'node')
# the staff: perfectly straight, a rod of light
ST = Vector((0.3, 1.05, 0.22))
add('lin_body', cyl(0.02, 0.02, 2.3, 10), 'staff', TRS(tuple(ST + Vector((0, 0.15, 0)))))
add('lin_body', cyl(0.035, 0.035, 0.12, 12), 'brass', TRS(tuple(ST)))
# head: calm, young; short dark hair
add('lin_body', cyl(0.05, 0.06, 0.1, 12), 'skin', TRS((0, 1.55, 0.03)))
def addh(bm, mat, M=None, mods=(), seg='lin_body', smooth=True):
    add(seg, bm, mat, TRS(tuple(HEAD)) @ (M if M is not None else TRS()), mods, smooth)
face = deform(sphere(1.0, 28, 20), lambda v: head_shape(v, jaw_narrow=0.15, nose=0.1, socket=0.05, brow=0.06, cheek=0.04))
addh(face, 'skin', TRS((0, 0, 0), scl=(0.108, 0.128, 0.112)))
for s in (-1, 1):
    addh(sphere(0.016, 10, 8), 'dark', TRS((s * 0.038, 0.02, 0.09), scl=(1.3, 0.7, 0.4)))
    addh(tube([(s * 0.014, 0.048, 0.102), (s * 0.04, 0.054, 0.1), (s * 0.062, 0.046, 0.088)], [0.006, 0.007, 0.003], 4), 'hair')
addh(tube([(-0.02, -0.066, 0.097), (0.0, -0.068, 0.1), (0.02, -0.066, 0.097)], [0.006, 0.007, 0.006], 6), 'lip')
hair = meta([((0, 0.05, -0.02), (0.118, 0.1, 0.118), (0, 0, 0)), ((0, 0.1, 0.03), (0.09, 0.05, 0.09), (0, 0, 0))], 0.012)
bmesh.ops.delete(hair, geom=[v for v in hair.verts if (v.co.z > 0.02 and v.co.y < 0.075) or v.co.y < -0.05], context='VERTS')
addh(hair, 'hair')
for s in (-1, 1):
    add('lin_eyes', sphere(0.014, 12, 8), 'eye', TRS((s * 0.038, 0.02, 0.09), scl=(1.2, 0.65, 0.5)))
    add('lin_eyes', sphere(0.007, 10, 6), 'iris', TRS((s * 0.038, 0.02, 0.097), scl=(1, 1, 0.5)))

# ================================================================ an Acetylide Viper: a coil on the ground, the neck raised, a glowing snout
pts, rad = [], []
for k in range(90):
    t = k / 89
    if t < 0.6:
        a = t / 0.6 * 1.8 * 2 * PI
        r = 0.55 - 0.15 * t
        pts.append((math.cos(a) * r, 0.12 + 0.02 * t, math.sin(a) * r))
    else:
        u = (t - 0.6) / 0.4
        pts.append((0.42 * (1 - u), 0.14 + u * 0.95, 0.1 + u * 0.55))
    rad.append(0.05 + 0.08 * min(1.0, t * 3) * (1 - 0.3 * t))
add('vip_body', tube(pts, rad, 12), 'viper')
for k in range(6, 90, 9):
    add('vip_body', torus(rad[k] + 0.005, 0.012, 16, 4), 'band', Matrix.Translation(Vector(pts[k])) @ Vector((0, 0, 1)).rotation_difference((Vector(pts[min(k + 1, 89)]) - Vector(pts[k])).normalized()).to_matrix().to_4x4())
H = Vector(pts[-1])
add('vip_body', deform(sphere(1.0, 16, 12), lambda v: (v.x * 0.14, v.y * 0.1, v.z * 0.24 + 0.1)), 'viper', TRS(tuple(H)))
for s in (-1, 1):
    add('vip_body', sphere(0.018, 8, 6), 'band', TRS(tuple(H + Vector((s * 0.06, 0.04, 0.12)))))
    add('vip_body', cyl(0.008, 0.0, 0.05, 4), 'fang', TRS(tuple(H + Vector((s * 0.03, -0.05, 0.2))), (PI, 0, 0)), smooth=False)
add('vip_body', sphere(0.07, 12, 10), 'charge', TRS(tuple(H + Vector((0, 0, 0.3)))))

# ================================================================ Malradix's Mimic: a faceless mannequin, and a loose shell
add('mim_body', capsule(0.32, 1.1, 16, 10), 'mimic', TRS((0, 1.35, 0)))
add('mim_body', sphere(0.24, 18, 12), 'mimic', TRS((0, 2.3, 0)))
add('mim_body', deform(sphere(1.0, 14, 10), lambda v: (v.x * 0.16, v.y * 0.05, max(0.0, v.z) * 0.06)), 'mimicDark', TRS((0, 2.32, 0.2)))  # a slit where a face should be
for s in (-1, 1):
    add('mim_body', tube([(s * 0.3, 1.9, 0), (s * 0.55, 1.4, 0.15), (s * 0.6, 0.95, 0.25)], [0.09, 0.07, 0.05], 10), 'mimic')
    add('mim_body', capsule(0.09, 0.5, 10, 6), 'mimic', TRS((s * 0.15, 0.4, 0)))
for k in range(6):
    a = k / 6 * 2 * PI
    add('mim_body', sphere(0.05, 8, 6), 'node', TRS((math.sin(a) * 0.33, 1.5, math.cos(a) * 0.33)))
shell = lathe([(0.55, 0.1), (0.62, 0.8), (0.58, 1.6), (0.48, 2.2), (0.3, 2.6), (0.05, 2.75)], 24, False, False)
for v in shell.verts:  # ragged, with holes: a wrapping
    a = math.atan2(v.co.z, v.co.x)
    v.co.x *= 1 + 0.08 * math.sin(a * 5 + v.co.y * 3)
    v.co.z *= 1 + 0.08 * math.sin(a * 5 + v.co.y * 3)
bmesh.ops.delete(shell, geom=[f for f in shell.faces if hash3(int(f.calc_center_median().x * 10), int(f.calc_center_median().y * 10), int(f.calc_center_median().z * 10)) > 0.72], context='FACES')
add('mim_shell', shell, 'shell', None, [SOLID(0.03, 0)])

# ================================================================ the Retrosynthesis Map
add('t9_map', box(0.46, 0.56, 0.008), 'paper', TRS((0, 0.28, 0)))
for k in (0, 1):
    add('t9_map', cyl(0.025, 0.025, 0.5, 10), 'paper', TRS((0, k * 0.56, 0), (0, 0, PI / 2)))
tree = [((0, 0.47), (0, 0.33)), ((0, 0.33), (-0.1, 0.22)), ((0, 0.33), (0.1, 0.22)), ((-0.1, 0.22), (-0.15, 0.1)), ((-0.1, 0.22), (-0.04, 0.1)), ((0.1, 0.22), (0.15, 0.1)), ((0.1, 0.22), (0.05, 0.1))]
for (a, b) in tree:
    add('t9_map', tube([(a[0], a[1], 0.006), (b[0], b[1], 0.006)], [0.005, 0.005], 4), 'ink')
for p in {a for e in tree for a in e}:
    add('t9_map', cyl(0.014, 0.014, 0.004, 10), 'node', TRS((p[0], p[1], 0.008), (PI / 2, 0, 0)))
add('t9_map', torus(0.04, 0.006, 16, 4), 'brass', TRS((-0.15, 0.06, 0.008), (PI / 2, 0, 0)))

objs = build_objects(MATS, 'lindlar')
bake_ao(objs, distance=0.3, samples=24, floor=0.6)
export_glb(objs, GLB)
if RENDERS:
    pl = [('lin_body', TRS((-1.6, 0, 0))), ('lin_eyes', TRS(tuple(HEAD + Vector((-1.6, 0, 0))))), ('vip_body', TRS((-0.3, 0, 0.5))), ('mim_body', TRS((1.2, 0, 0))), ('mim_shell', TRS((2.6, 0, 0))), ('t9_map', TRS((0.2, 1.4, 0.6), scl=2))]
    preview(objs, pl, [('lindlar_all.png', (0.4, 1.8, 7.5), (0.4, 1.2, 0), 45), ('lindlar_face.png', (-1.55, 1.74, 0.9), (-1.6, 1.64, 0), 45)], RENDERS, sky='#5a6478', ground='#4a4a52')
    print('RENDERS', RENDERS)
