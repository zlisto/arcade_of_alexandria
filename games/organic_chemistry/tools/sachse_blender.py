"""Lady Sachse of the Chair (World 4's sage) for The Legend of Valence, exported to public/models/sachse.glb.
Modeled on assets/characters/sage-sachse.png: a regal noblewoman in a violet-grey armour-dress, dark hair in
a high bun under a silver diadem with a violet gem, pointed pauldrons, a long gown with embroidered hem.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/sachse_blender.py -- <glb_path> <render_dir>

Parts (feet on y = 0, facing +z):
  sac_body    gown, bodice, pauldrons, arms, clasped hands, neck, head, hair, diadem
  sac_eyes    eyes (frame: (0, 1.62, 0.0)), so they can blink
  sac_throne  her chair-shaped throne: a zigzag six-carbon back with six cyan-flame posts (own frame)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'sachse.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'gown': ('#4e3f6e', 0, 0.75), 'gownLight': ('#7a6a9a', 0, 0.7), 'trim': ('#c8c0d8', 0.6, 0.35), 'armor': ('#7a5ab0', 0.7, 0.34),
    'armorDark': ('#4a3670', 0.7, 0.38), 'skin': ('#e8c2ac', 0, 0.55), 'lip': ('#b8686a', 0, 0.5), 'hair': ('#221a2a', 0, 0.6),
    'silver': ('#dcdcea', 0.9, 0.2), 'gem': ('#9a4ae8', 0.1, 0.15, 1.5), 'eye': ('#f2eee8', 0, 0.3), 'iris': ('#5a3a7a', 0, 0.3),
    'dark': ('#120e18', 0, 0.8), 'stone': ('#3a3846', 0, 0.85), 'stoneLight': ('#55526a', 0, 0.8), 'flame': ('#5ff0ff', 0, 0.2, 3.0),
}
HEAD = Vector((0, 1.62, 0.0))

# ================================================================ the gown: a long flared skirt with soft folds
def skirt_profile():
    return [(0.17, 1.02), (0.2, 0.92), (0.27, 0.7), (0.36, 0.45), (0.46, 0.2), (0.55, 0.02), (0.56, 0.0)]
sk = lathe(skirt_profile(), 48, False, False)
for v in sk.verts:  # folds deepen toward the hem; a little train behind
    a = math.atan2(v.co.x, v.co.z)
    k = max(0.0, (1.0 - v.co.y) / 1.0)
    f = 1 + 0.06 * k * math.sin(a * 9)
    v.co.x *= f
    v.co.z *= f
    if v.co.z < 0:
        v.co.z *= 1 + 0.35 * k * k
add('sac_body', sk, 'gown', None, [SOLID(0.015, 1)])
# a lighter front panel with an embroidered hem band
panel = lathe([(0.205, 0.9), (0.28, 0.68), (0.37, 0.43), (0.47, 0.18), (0.565, 0.02)], 48, False, False)
bmesh.ops.delete(panel, geom=[v for v in panel.verts if v.co.z < 0.0 or abs(math.atan2(v.co.x, v.co.z)) > 0.55], context='VERTS')
for v in panel.verts:
    v.co *= 1.012
add('sac_body', panel, 'gownLight', None, [SOLID(0.006, 1)])
add('sac_body', torus(0.565, 0.016, 64, 6), 'trim', TRS((0, 0.035, -0.02), scl=(1, 1, 1.06)))
for k in range(28):  # little silver scrolls along the hem
    a = k / 28 * 2 * PI
    add('sac_body', torus(0.028, 0.006, 10, 4), 'trim', TRS((math.sin(a) * 0.548, 0.075, math.cos(a) * 0.548 * (1.25 if math.cos(a) < 0 else 1.0)), (0, a, 0)))

# ================================================================ armoured bodice, belt, pauldrons
bod = lathe([(0.17, 0.98), (0.165, 1.08), (0.18, 1.2), (0.19, 1.3), (0.17, 1.4), (0.12, 1.46)], 32, False, False)
for v in bod.verts:
    v.co.z *= 0.78
    if v.co.z > 0 and 1.18 < v.co.y < 1.36:  # bust shaping
        v.co.z += 0.03 * math.exp(-((abs(v.co.x) - 0.07) / 0.06) ** 2)
add('sac_body', bod, 'armor', None, [SOLID(0.012, 1)])
add('sac_body', box(0.02, 0.36, 0.02), 'armorDark', TRS((0, 1.18, 0.158), (0.05, 0, 0)), [BEVEL(0.006, 1)])  # centre ridge
add('sac_body', torus(0.18, 0.02, 32, 6), 'silver', TRS((0, 1.0, 0), scl=(1, 1, 0.8)))  # belt
add('sac_body', cyl(0.035, 0.035, 0.02, 6), 'gem', TRS((0, 1.0, 0.146), (PI / 2, 0, 0)))
# a V-shaped neckline of silver and a high standing collar behind the neck
for s in (-1, 1):
    add('sac_body', tube([(s * 0.12, 1.43, 0.06), (s * 0.05, 1.33, 0.13), (0, 1.27, 0.15)], [0.012, 0.012, 0.01], 6), 'trim')
add('sac_body', arc_sheet(0.13, 0.11, 1.42, 0.16, PI * 0.6, PI * 1.4, 16, 2, 0.15), 'armorDark', TRS((0, 0, -0.01)), [SOLID(0.01, 0)])
for s in (-1, 1):  # pointed pauldrons
    P = Vector((s * 0.22, 1.42, -0.01))
    add('sac_body', hemi(0.12, 20, 8), 'armor', TRS(tuple(P), (0, 0, -s * 0.5), scl=(1.15, 0.8, 1.0)))
    add('sac_body', hemi(0.105, 20, 8), 'armorDark', TRS(tuple(P + Vector((s * 0.02, -0.035, 0))), (0, 0, -s * 0.6), scl=(1.2, 0.75, 1.02)))
    add('sac_body', cyl(0.03, 0.0, 0.16, 6), 'armor', TRS(tuple(P + Vector((s * 0.06, 0.07, 0))), (0, 0, -s * 0.5)), smooth=False)

# ================================================================ arms (violet sleeves, steel vambraces), hands clasped at the waist
for s in (-1, 1):
    sh = Vector((s * 0.22, 1.36, 0.0))
    el = Vector((s * 0.27, 1.12, 0.05))
    hd = Vector((s * 0.05, 0.98, 0.17))
    add('sac_body', tube([tuple(sh), tuple(sh.lerp(el, 0.5) + Vector((s * 0.01, 0, 0))), tuple(el)], [0.055, 0.05, 0.045], 12), 'gown')
    add('sac_body', sphere(0.048, 12, 8), 'gown', TRS(tuple(el)))
    add('sac_body', tube([tuple(el), tuple(el.lerp(hd, 0.55)), tuple(hd - (hd - el).normalized() * 0.04)], [0.046, 0.044, 0.036], 12), 'armor')
    add('sac_body', torus(0.047, 0.008, 14, 4), 'silver', Matrix.Translation(el.lerp(hd, 0.2)) @ Vector((0, 1, 0)).rotation_difference((hd - el).normalized()).to_matrix().to_4x4())
    q = Vector((0, 1, 0)).rotation_difference((hd - el).normalized()).to_matrix().to_4x4()
    add('sac_body', sphere(1.0, 12, 8), 'skin', Matrix.Translation(hd) @ q @ TRS(scl=(0.035, 0.05, 0.022)))
add('sac_body', sphere(0.02, 8, 6), 'silver', TRS((0, 0.985, 0.19)))  # a ring on the clasped hands

# ================================================================ neck and head
add('sac_body', cyl(0.045, 0.05, 0.14, 14), 'skin', TRS((0, 1.5, 0.0)))
def addh(bm, mat, M=None, mods=(), seg='sac_body', smooth=True):
    add(seg, bm, mat, TRS(tuple(HEAD)) @ (M if M is not None else TRS()), mods, smooth)
face = deform(sphere(1.0, 30, 22), lambda v: head_shape(v, jaw_narrow=0.22, nose=0.1, socket=0.05, brow=0.03, cheek=0.04, chin=0.1))
addh(face, 'skin', TRS((0, 0, 0), scl=(0.105, 0.125, 0.11)))
addh(sphere(0.018, 12, 8), 'lip', TRS((0, -0.07, 0.092), scl=(1.15, 0.32, 0.32)))
for s in (-1, 1):
    addh(sphere(0.016, 10, 8), 'dark', TRS((s * 0.036, 0.018, 0.088), scl=(1.3, 0.7, 0.4)))
    addh(tube([(s * 0.014, 0.036, 0.1), (s * 0.04, 0.043, 0.098), (s * 0.064, 0.036, 0.086)], [0.005, 0.006, 0.003], 4), 'hair')  # brows
    addh(sphere(0.02, 10, 8), 'skin', TRS((s * 0.104, 0.0, -0.01), scl=(0.4, 1, 0.7)))  # ears
# hair: smooth cap swept back, a high bun with a silver pin
hair = meta([((0, 0.035, -0.015), (0.114, 0.12, 0.118), (0, 0, 0)), ((0, 0.09, -0.04), (0.1, 0.07, 0.1), (0, 0, 0)),
             ((0, -0.03, -0.07), (0.1, 0.09, 0.06), (0, 0, 0))], 0.012)
# a hairline: clear the face and forehead (front and low), sweep the sides back behind the ears
bmesh.ops.delete(hair, geom=[v for v in hair.verts if v.co.z > 0.03 - 0.25 * max(0.0, v.co.y - 0.07) and v.co.y < 0.115], context='VERTS')
addh(hair, 'hair', TRS((0, 0.012, -0.004)))
addh(sphere(0.07, 18, 12), 'hair', TRS((0, 0.15, -0.06), scl=(1.0, 0.85, 1.0)))
addh(torus(0.055, 0.012, 18, 6), 'silver', TRS((0, 0.13, -0.06), (0.4, 0, 0)))
addh(cyl(0.004, 0.004, 0.2, 6), 'silver', TRS((0, 0.16, -0.06), (0, 0, PI / 2 - 0.2)))
# the diadem: a silver band with a peak and a violet gem
addh(torus(0.112, 0.008, 36, 5), 'silver', TRS((0, 0.065, -0.005), (0.25, 0, 0), scl=(1, 1, 1.05)))
addh(cyl(0.022, 0.0, 0.07, 4), 'silver', TRS((0, 0.13, 0.095), (0.25, PI / 4, 0)), smooth=False)
addh(sphere(0.017, 10, 8), 'gem', TRS((0, 0.1, 0.112)))
for s in (-1, 1):
    addh(cyl(0.012, 0.0, 0.045, 4), 'silver', TRS((s * 0.06, 0.11, 0.085), (0.25, PI / 4, s * 0.3)), smooth=False)

# ================================================================ eyes (frame: HEAD + (0, 0.0, 0))
for s in (-1, 1):
    add('sac_eyes', sphere(0.014, 12, 8), 'eye', TRS((s * 0.036, 0.018, 0.09), scl=(1.2, 0.6, 0.5)))
    add('sac_eyes', sphere(0.0075, 10, 6), 'iris', TRS((s * 0.036, 0.018, 0.096), scl=(1, 1, 0.5)))

# ================================================================ the throne: a chair-shaped back (a zigzag ring seen side-on), six flame posts
add('sac_throne', box(1.3, 0.45, 0.9), 'stone', TRS((0, 0.225, 0)), [BEVEL(0.03, 2)])
add('sac_throne', box(1.15, 0.12, 0.8), 'stoneLight', TRS((0, 0.5, 0.02)), [BEVEL(0.02, 1)])
for s in (-1, 1):
    add('sac_throne', box(0.18, 0.35, 0.8), 'stone', TRS((s * 0.62, 0.72, 0.0)), [BEVEL(0.02, 1)])
# the back: two offset parallel bars joined by up/down tips, like the chair drawing of §4.5
back = [(-0.55, 1.1), (-0.3, 1.75), (0.2, 1.75), (0.55, 2.35), (0.3, 1.7), (-0.2, 1.7)]
for i in range(6):
    a, b = back[i], back[(i + 1) % 6]
    A, B = Vector((a[0], a[1], -0.38)), Vector((b[0], b[1], -0.38))
    add('sac_throne', tube([tuple(A), tuple(B)], [0.07, 0.07], 8), 'stoneLight')
    add('sac_throne', sphere(0.11, 14, 10), 'armorDark', TRS(tuple(A)))
add('sac_throne', box(1.4, 1.75, 0.12), 'stone', TRS((0, 1.55, -0.47)), [BEVEL(0.03, 2)])  # the slab behind the chair ring
add('sac_throne', cyl(0.0, 0.18, 0.4, 4), 'stone', TRS((0, 2.62, -0.47), (PI, PI / 4, 0)), smooth=False)
for k in range(6):  # flame posts round the seat
    a = k / 6 * 2 * PI
    p = (math.sin(a) * 1.05, 0, math.cos(a) * 0.85 - 0.1)
    add('sac_throne', cyl(0.05, 0.06, 1.3 + 0.25 * (k % 2), 8), 'armorDark', TRS((p[0], (1.3 + 0.25 * (k % 2)) / 2, p[2])))
    add('sac_throne', sphere(0.07, 12, 10), 'flame', TRS((p[0], 1.36 + 0.25 * (k % 2), p[2]), scl=(1, 1.6, 1)))

# ---------------------------------------------------------------- build, bake, export
objs = build_objects(MATS, 'sachse')
bake_ao(objs, distance=0.2, samples=32, floor=0.62)
export_glb(objs, GLB)
if RENDERS:
    pl = [('sac_body', TRS()), ('sac_eyes', TRS(tuple(HEAD))), ('sac_throne', TRS((1.6, 0, -0.6)))]
    preview(objs, pl, [('sachse_front.png', (0.4, 1.3, 3.2), (0.3, 1.0, 0), 38), ('sachse_face.png', (0.15, 1.65, 0.75), (0, 1.6, 0), 50),
                       ('sachse_side.png', (2.8, 1.3, 1.2), (0.4, 1.0, 0), 38)], RENDERS, sky='#3a3848', ground='#3a3a44')
    print('RENDERS', RENDERS)
