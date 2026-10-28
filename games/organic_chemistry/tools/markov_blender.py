"""World 7's characters for The Legend of Valence, exported to public/models/markov.glb.

Farmer Markov (assets/characters/farmer-markov.png): a broad, cheerful farmer with a big brown handlebar
moustache, a frayed straw hat, a plaid shirt with rolled sleeves, blue denim overalls, brown boots, a sheaf of
golden wheat in his arms whose heads glow like protons, and a leather sling at his belt.
The Carbocation Phantom (World 7's boss): a hooded wraith of violet light whose chest holds a glowing empty
p orbital and a "+" sigil; three wispy tails below, two clawed hands. It lives on carbons and shifts between them.
The Proton Sling: a Y-shaped wooden sling with a leather pouch holding a glowing H⁺ bead.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/markov_blender.py -- <glb_path> <render_dir>

Parts (feet on y = 0, facing +z unless noted):
  mkv_body   Markov: boots, trousers, overalls, shirt, arms, wheat sheaf, sling, head, moustache, hat
  mkv_eyes   his eyes (frame: (0, 1.62, 0.05))
  phn_body   the Phantom (own frame: floats, base at y = 0.4, top of the hood about y = 3.2)
  phn_core   its chest core: the empty p orbital lobes and the + sigil (frame: centre at origin)
  t7_sling   the Proton Sling (own frame, about 0.5 m long, handle down)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'markov.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'denim': ('#3a5272', 0, 0.85), 'denimDark': ('#2a3a54', 0, 0.9), 'plaid': ('#b85a40', 0, 0.85), 'plaidLine': ('#5a2418', 0, 0.85),
    'boots': ('#4a3020', 0, 0.8), 'leather': ('#6a3e22', 0, 0.7), 'brass': ('#c8a050', 0.8, 0.35), 'skin': ('#e0a080', 0, 0.6),
    'hair': ('#4a2a18', 0, 0.8), 'straw': ('#c8a460', 0, 0.85), 'strawDark': ('#9a7a3a', 0, 0.9), 'wheat': ('#e8c050', 0, 0.6),
    'wheatGlow': ('#ffe080', 0, 0.3, 1.6), 'eye': ('#f2eee8', 0, 0.3), 'iris': ('#4a6a8a', 0, 0.3), 'dark': ('#141010', 0, 0.8),
    'lip': ('#b86a5a', 0, 0.5), 'wood': ('#7a5030', 0, 0.75),
    'phantom': ('#7a4ab8', 0, 0.4, 0.5), 'phantomDark': ('#3a1e60', 0, 0.6), 'phantomGlow': ('#d8a0ff', 0, 0.2, 2.5), 'plus': ('#ffe0ff', 0, 0.2, 3.5),
    'proton': ('#ff8aa0', 0, 0.2, 2.5),
}
HEAD = Vector((0, 1.62, 0.05))

# ================================================================ Markov: boots, legs (denim), a sturdy build
for s in (-1, 1):
    add('mkv_body', box(0.16, 0.14, 0.32), 'boots', TRS((s * 0.13, 0.07, 0.05)), [BEVEL(0.05, 2)])
    add('mkv_body', lathe([(0.095, 0.1), (0.105, 0.22), (0.11, 0.28)], 14, False, True), 'boots', TRS((s * 0.13, 0, 0)))
    add('mkv_body', capsule(0.1, 0.44, 14, 10), 'denim', TRS((s * 0.13, 0.55, 0)))
    add('mkv_body', torus(0.105, 0.03, 16, 6), 'denimDark', TRS((s * 0.13, 0.3, 0)))  # rolled cuffs
# overalls: the bib and trousers top as one barrel, with straps and brass buttons; the shirt shows above and round
body = lathe([(0.27, 0.78), (0.3, 0.9), (0.31, 1.05), (0.3, 1.2), (0.27, 1.32)], 36, False, False)
for v in body.verts:
    v.co.z *= 0.82
add('mkv_body', body, 'denim', None, [SOLID(0.02, 1)])
chest = lathe([(0.28, 1.2), (0.3, 1.32), (0.29, 1.42), (0.22, 1.5), (0.1, 1.54)], 32, False, True)
for v in chest.verts:
    v.co.z *= 0.82
add('mkv_body', chest, 'plaid', None)
for k in range(5):  # plaid checks across the chest and back
    add('mkv_body', torus(0.29 - 0.01 * k, 0.008, 32, 4), 'plaidLine', TRS((0, 1.26 + k * 0.055, 0), scl=(1, 1, 0.82)))
add('mkv_body', box(0.3, 0.3, 0.03), 'denim', TRS((0, 1.22, 0.235)), [BEVEL(0.02, 1)])  # the bib
add('mkv_body', box(0.14, 0.08, 0.02), 'denimDark', TRS((0, 1.24, 0.252)), [BEVEL(0.01, 1)])  # bib pocket
for s in (-1, 1):
    add('mkv_body', tube([(s * 0.12, 1.36, 0.24), (s * 0.17, 1.5, 0.12), (s * 0.15, 1.5, -0.12), (s * 0.1, 1.2, -0.24)], [0.03, 0.03, 0.03, 0.03], 6), 'denim')
    add('mkv_body', cyl(0.025, 0.025, 0.012, 12), 'brass', TRS((s * 0.12, 1.35, 0.25), (PI / 2, 0, 0)))
add('mkv_body', torus(0.28, 0.025, 36, 6), 'leather', TRS((0, 0.86, 0), scl=(1, 1, 0.82)))  # belt
add('mkv_body', box(0.07, 0.05, 0.02), 'brass', TRS((0, 0.86, 0.235)), [BEVEL(0.008, 1)])
# the sling hanging at his right hip: a leather loop and the forked handle
add('mkv_body', tube([(0.27, 0.86, 0.06), (0.32, 0.7, 0.1), (0.3, 0.6, 0.08), (0.26, 0.72, 0.03)], [0.015, 0.02, 0.02, 0.015], 6), 'leather')
add('mkv_body', cyl(0.018, 0.018, 0.22, 8), 'wood', TRS((0.3, 0.74, 0.12)))
# arms: rolled plaid sleeves, bare forearms, both hugging the wheat sheaf across the chest
for s in (-1, 1):
    sh = Vector((s * 0.31, 1.42, 0.0))
    el = Vector((s * 0.36, 1.14, 0.1))
    hd = Vector((-0.2 + s * 0.06, 1.0 + (0.12 if s < 0 else 0), 0.3))
    add('mkv_body', sphere(0.105, 14, 10), 'plaid', TRS(tuple(sh)))
    add('mkv_body', tube([tuple(sh), tuple(el)], [0.095, 0.085], 12), 'plaid')
    add('mkv_body', torus(0.085, 0.03, 16, 6), 'plaidLine', Matrix.Translation(sh.lerp(el, 0.85)) @ Vector((0, 1, 0)).rotation_difference((el - sh).normalized()).to_matrix().to_4x4())
    add('mkv_body', tube([tuple(el), tuple(hd)], [0.07, 0.06], 12), 'skin')
    add('mkv_body', sphere(0.06, 12, 10), 'skin', TRS(tuple(hd), scl=(1, 0.8, 1.1)))
# the wheat sheaf: stalks fanning up and out from his hands, glowing grain heads
for k in range(26):
    a = (k / 26) * 2 * PI
    r0 = 0.04 + 0.02 * hash3(k, 1, 1)
    base = Vector((-0.12 + math.cos(a) * r0 * 0.6, 0.62, 0.3 + math.sin(a) * r0 * 0.6))
    top = Vector((-0.42 + math.cos(a) * 0.14 * (0.6 + 0.6 * hash3(k, 2, 2)), 1.5 + 0.22 * hash3(k, 3, 3), 0.34 + math.sin(a) * 0.12))
    add('mkv_body', tube([tuple(base), tuple(base.lerp(top, 0.5) + Vector((0.02, 0, 0))), tuple(top)], [0.006, 0.006, 0.005], 4), 'wheat')
    add('mkv_body', capsule(0.018, 0.08, 6, 4), 'wheatGlow' if k % 3 == 0 else 'wheat', Matrix.Translation(top + (top - base).normalized() * 0.05) @ Vector((0, 1, 0)).rotation_difference((top - base).normalized()).to_matrix().to_4x4())
add('mkv_body', torus(0.06, 0.015, 16, 4), 'strawDark', TRS((-0.2, 1.0, 0.31), (0, 0, 0.35)))  # the twine round the sheaf
# head: ruddy cheeks, a big handlebar moustache, short brown hair under a frayed straw hat
add('mkv_body', cyl(0.065, 0.075, 0.1, 12), 'skin', TRS((0, 1.5, 0.03)))
def addh(bm, mat, M=None, mods=(), seg='mkv_body', smooth=True):
    add(seg, bm, mat, TRS(tuple(HEAD)) @ (M if M is not None else TRS()), mods, smooth)
face = deform(sphere(1.0, 28, 20), lambda v: head_shape(v, jaw_narrow=0.05, nose=0.14, socket=0.05, brow=0.07, cheek=0.07))
addh(face, 'skin', TRS((0, 0, 0), scl=(0.125, 0.135, 0.125)))
addh(sphere(0.03, 12, 8), 'skin', TRS((0, -0.01, 0.13), scl=(1.0, 0.9, 0.9)))  # a round nose
for s in (-1, 1):
    addh(sphere(0.018, 10, 8), 'dark', TRS((s * 0.043, 0.022, 0.1), scl=(1.3, 0.7, 0.4)))
    addh(tube([(s * 0.015, 0.05, 0.115), (s * 0.045, 0.058, 0.112), (s * 0.072, 0.05, 0.098)], [0.009, 0.01, 0.005], 4), 'hair')  # bushy brows
    addh(sphere(0.03, 10, 8), 'lip', TRS((s * 0.07, -0.03, 0.09), scl=(1, 0.7, 0.4)))  # ruddy cheeks
    # the handlebar moustache: thick under the nose, sweeping out and curling up at the tips
    addh(tube([(s * 0.005, -0.045, 0.13), (s * 0.05, -0.055, 0.12), (s * 0.095, -0.04, 0.09), (s * 0.115, -0.005, 0.07)], [0.022, 0.02, 0.012, 0.004], 8), 'hair')
addh(tube([(-0.03, -0.085, 0.115), (0.0, -0.09, 0.12), (0.03, -0.085, 0.115)], [0.008, 0.01, 0.008], 6), 'lip')  # a smile
hair = meta([((0, 0.04, -0.03), (0.125, 0.11, 0.12), (0, 0, 0))], 0.012)
bmesh.ops.delete(hair, geom=[v for v in hair.verts if v.co.z > 0.0 or v.co.y < -0.06], context='VERTS')
addh(hair, 'hair')
# the straw hat: a wide wavy brim with frayed edge, a dented crown, a band
brim = lathe([(0.0, 0.0), (0.2, 0.0), (0.3, -0.015)], 40, False, False)
for v in brim.verts:
    a = math.atan2(v.co.z, v.co.x)
    v.co.y += 0.02 * math.sin(a * 3) * (v.co.length / 0.3)
addh(brim, 'straw', TRS((0, 0.1, -0.01), (-0.12, 0, 0)), [SOLID(0.012, 0)])
for k in range(28):  # frayed straw ends round the brim
    a = k / 28 * 2 * PI + 0.1 * hash3(k, 4, 4)
    addh(cyl(0.005, 0.0, 0.05, 3), 'strawDark', TRS((math.cos(a) * 0.3, 0.1 - 0.015, math.sin(a) * 0.3 - 0.01), (0, -a, PI / 2 + 0.2)), smooth=False)
addh(lathe([(0.13, 0.0), (0.13, 0.08), (0.11, 0.13), (0.03, 0.15)], 32, False, True), 'straw', TRS((0, 0.11, -0.02), (-0.12, 0, 0)))
addh(torus(0.132, 0.015, 32, 4), 'strawDark', TRS((0, 0.13, -0.02), (-0.12, 0, 0)))

for s in (-1, 1):
    add('mkv_eyes', sphere(0.016, 12, 8), 'eye', TRS((s * 0.043, 0.022, 0.1), scl=(1.2, 0.65, 0.5)))
    add('mkv_eyes', sphere(0.008, 10, 6), 'iris', TRS((s * 0.043, 0.022, 0.108), scl=(1, 1, 0.5)))

# ================================================================ the Carbocation Phantom
robe = lathe([(0.05, 0.4), (0.55, 0.6), (0.7, 1.2), (0.62, 1.9), (0.5, 2.4), (0.42, 2.7)], 32, False, False)
for v in robe.verts:  # ragged hem
    if v.co.y < 0.7:
        a = math.atan2(v.co.z, v.co.x)
        v.co.y += 0.18 * math.sin(a * 7) + 0.08 * math.sin(a * 13)
add('phn_body', robe, 'phantom', None, [SOLID(0.03, 0)])
hood = lathe([(0.42, 2.6), (0.5, 2.8), (0.46, 3.0), (0.32, 3.15), (0.12, 3.25), (0.0, 3.3)], 32, False, True)
bmesh.ops.delete(hood, geom=[v for v in hood.verts if v.co.z > 0.15 and 2.7 < v.co.y < 3.1 and abs(v.co.x) < 0.3], context='VERTS')
add('phn_body', hood, 'phantom', None, [SOLID(0.03, 0)])
add('phn_body', sphere(0.32, 20, 14), 'phantomDark', TRS((0, 2.85, 0.02)))  # the dark inside of the hood
for s in (-1, 1):
    add('phn_body', sphere(0.05, 10, 8), 'phantomGlow', TRS((s * 0.1, 2.88, 0.3), scl=(1.3, 0.6, 0.5)))
    # arms: long sleeves ending in three-clawed hands
    sh = Vector((s * 0.55, 2.3, 0.05)); el = Vector((s * 0.95, 1.9, 0.35)); hd = Vector((s * 1.1, 1.6, 0.6))
    add('phn_body', tube([tuple(sh), tuple(el), tuple(hd)], [0.17, 0.14, 0.12], 12), 'phantom')
    for c in (-1, 0, 1):
        tip = hd + Vector((s * 0.08 * c, -0.22, 0.12 + 0.04 * c))
        add('phn_body', tube([tuple(hd), tuple(hd.lerp(tip, 0.5) + Vector((0, 0.03, 0.03))), tuple(tip)], [0.035, 0.025, 0.004], 6), 'phantomDark')
for k in range(3):  # three wisp tails under the hem
    a = k / 3 * 2 * PI + 0.4
    pts = [(math.cos(a) * 0.35, 0.55, math.sin(a) * 0.35), (math.cos(a) * 0.45, 0.25, math.sin(a) * 0.45), (math.cos(a + 0.4) * 0.3, 0.05, math.sin(a + 0.4) * 0.3)]
    add('phn_body', tube(pts, [0.15, 0.08, 0.01], 8), 'phantom')
# the core: an empty p orbital (two lobes) and a + sigil
for s in (-1, 1):
    add('phn_core', deform(sphere(1.0, 16, 12), lambda v, s=s: (v.x * 0.11, v.y * 0.2 + s * 0.2, v.z * 0.11)), 'phantomGlow')
add('phn_core', box(0.26, 0.06, 0.06), 'plus', TRS((0, 0, 0.14)))
add('phn_core', box(0.06, 0.26, 0.06), 'plus', TRS((0, 0, 0.14)))
add('phn_core', torus(0.18, 0.02, 24, 4), 'plus', TRS((0, 0, 0.0), (PI / 2, 0, 0)))

# ================================================================ the Proton Sling
add('t7_sling', cyl(0.025, 0.03, 0.22, 10), 'wood', TRS((0, 0.11, 0)))
for s in (-1, 1):
    add('t7_sling', tube([(0, 0.21, 0), (s * 0.05, 0.28, 0), (s * 0.09, 0.38, 0)], [0.022, 0.02, 0.018], 8), 'wood')
    add('t7_sling', tube([(s * 0.09, 0.38, 0), (s * 0.05, 0.33, 0.07), (0, 0.32, 0.12)], [0.006, 0.006, 0.006], 4), 'leather')
add('t7_sling', deform(sphere(1.0, 12, 8), lambda v: (v.x * 0.05, v.y * 0.03, v.z * 0.04)), 'leather', TRS((0, 0.32, 0.13)))
add('t7_sling', sphere(0.028, 12, 8), 'proton', TRS((0, 0.345, 0.13)))
add('t7_sling', torus(0.028, 0.006, 12, 4), 'brass', TRS((0, 0.04, 0)))

objs = build_objects(MATS, 'markov')
bake_ao(objs, distance=0.3, samples=24, floor=0.6)
export_glb(objs, GLB)
if RENDERS:
    pl = [('mkv_body', TRS((-1.2, 0, 0))), ('mkv_eyes', TRS(tuple(HEAD + Vector((-1.2, 0, 0))))), ('phn_body', TRS((1.4, 0, 0))), ('phn_core', TRS((1.4, 1.9, 0.6))), ('t7_sling', TRS((0.2, 0.6, 0.5), scl=2))]
    preview(objs, pl, [('markov_all.png', (0, 2.0, 7.5), (0, 1.5, 0), 40), ('markov_face.png', (-1.15, 1.7, 1.0), (-1.2, 1.6, 0), 45)], RENDERS, sky='#e8c890', ground='#c8a460')
    print('RENDERS', RENDERS)
