"""World 8's characters for The Legend of Valence, exported to public/models/borana.glb.

Alchemist Borana (assets/characters/alchemist-borana.png): a sharp-eyed woman with wild silver curls, brass goggles
pushed up on her head, a long brown leather coat with a bandolier of coloured vials across it and more on her belt,
a grey waistcoat, dark trousers and boots, a brass three-pronged stirring tool in her hand.
The Bromonium Wraith (assets/enemies/bromonium-wraith.png): a lean rust-red wraith with a glowing three-ring sigil
in its chest and a golden shield held on one side: the Br⁺ bridge across one face. Strike it from the other side.
The Polymer Leviathan (assets/enemies/polymer-centipede.png): a violet centipede of ribbed segments with spiny legs;
its head crackles with a radical's single electron.
The Reagent Satchel (assets/items/reagent-satchel.png): a black leather bag stuffed with stoppered vials.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/borana_blender.py -- <glb_path> <render_dir>

Parts (feet on y = 0, facing +z unless noted):
  bor_body    Borana: boots, trousers, coat, waistcoat, bandolier and vials, arms, the stirring tool, head, hair, goggles
  bor_eyes    her eyes (frame: (0, 1.64, 0.05))
  wrt_body    a wraith (own frame, floats; shield on its +x side, facing +x)
  lev_head    the Leviathan's head (own frame: neck at origin, jaws toward +z, about 1.6 m wide)
  lev_seg     one segment (own frame: centre at origin, length 1.4 along z, legs both sides)
  t8_satchel  the Satchel (own frame, base at y = 0)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'borana.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'coat': ('#6a4028', 0, 0.7), 'coatDark': ('#4a2a18', 0, 0.75), 'vest': ('#5a5a62', 0, 0.8), 'trousers': ('#2a2428', 0, 0.85),
    'boots': ('#2a1e18', 0, 0.75), 'brass': ('#c8a050', 0.85, 0.3), 'leather': ('#3a2418', 0, 0.7), 'skin': ('#e8c0a8', 0, 0.55),
    'hair': ('#d8d8e0', 0, 0.7), 'lens': ('#5ae8e0', 0.2, 0.15, 1.2), 'eye': ('#f2eee8', 0, 0.3), 'iris': ('#3a8a7a', 0, 0.3),
    'dark': ('#141010', 0, 0.8), 'lip': ('#b86a6a', 0, 0.5),
    'vialR': ('#e84a4a', 0, 0.15, 0.8), 'vialB': ('#4ac8e8', 0, 0.15, 0.8), 'vialP': ('#a04ae8', 0, 0.15, 0.8), 'vialG': ('#6ae86a', 0, 0.15, 0.8),
    'glass': ('#d8f0f0', 0, 0.1), 'cork': ('#a87a4a', 0, 0.9),
    'wraith': ('#8a3a2a', 0, 0.6), 'wraithDark': ('#4a1a14', 0, 0.7), 'sigil': ('#ff6a6a', 0, 0.2, 2.5), 'shield': ('#d8b050', 0.7, 0.3),
    'shieldGlow': ('#ffd080', 0, 0.2, 1.4), 'eyeR': ('#ff4a4a', 0, 0.2, 3.0),
    'lev': ('#7a3aa0', 0.1, 0.45), 'levDark': ('#4a1e68', 0.1, 0.55), 'levSpine': ('#2a1440', 0, 0.6), 'spark': ('#e8a0ff', 0, 0.2, 3.5),
    'bag': ('#1e1a20', 0, 0.6),
}
HEAD = Vector((0, 1.64, 0.05))

# ================================================================ Borana
for s in (-1, 1):
    add('bor_body', box(0.13, 0.12, 0.28), 'boots', TRS((s * 0.1, 0.06, 0.04)), [BEVEL(0.04, 2)])
    add('bor_body', lathe([(0.075, 0.1), (0.085, 0.3), (0.09, 0.36)], 14, False, True), 'boots', TRS((s * 0.1, 0, 0)))
    add('bor_body', capsule(0.075, 0.42, 14, 10), 'trousers', TRS((s * 0.1, 0.6, 0)))
# the long coat, open at the front over the waistcoat, flaring to the knee
coat = lathe([(0.26, 0.45), (0.25, 0.7), (0.22, 0.95), (0.21, 1.15), (0.24, 1.32), (0.21, 1.44), (0.12, 1.5)], 36, False, False)
for v in coat.verts:
    v.co.z *= 0.8
bmesh.ops.delete(coat, geom=[v for v in coat.verts if v.co.z > 0.12 and abs(v.co.x) < 0.07 + 0.08 * max(0.0, 1.0 - v.co.y)], context='VERTS')
add('bor_body', coat, 'coat', None, [SOLID(0.02, 1)])
vest = lathe([(0.2, 0.9), (0.2, 1.15), (0.22, 1.32), (0.19, 1.44), (0.1, 1.5)], 30, False, True)
for v in vest.verts:
    v.co.z *= 0.78
add('bor_body', vest, 'vest', None)
for s in (-1, 1):  # lapels
    add('bor_body', box(0.08, 0.3, 0.02), 'coatDark', TRS((s * 0.1, 1.32, 0.17), (0, 0, s * 0.25)))
add('bor_body', torus(0.215, 0.025, 32, 6), 'leather', TRS((0, 0.92, 0), scl=(1, 1, 0.8)))  # belt
add('bor_body', box(0.06, 0.05, 0.02), 'brass', TRS((0, 0.92, 0.18)), [BEVEL(0.008, 1)])
# the bandolier across her chest, vials in its loops; more vials at her belt
VC = ['vialR', 'vialB', 'vialP', 'vialG']
for k in range(6):
    t = k / 5
    p = Vector((-0.17 + 0.32 * t, 1.38 - 0.42 * t, 0.2 - 0.02 * abs(t - 0.5)))
    add('bor_body', box(0.06, 0.03, 0.03), 'leather', TRS(tuple(p), (0, 0, -0.9)))
    add('bor_body', cyl(0.02, 0.02, 0.08, 10), 'glass', TRS(tuple(p + Vector((0, 0.03, 0.02)))))
    add('bor_body', cyl(0.017, 0.017, 0.05, 8), VC[k % 4], TRS(tuple(p + Vector((0, 0.02, 0.02)))))
    add('bor_body', cyl(0.012, 0.012, 0.02, 8), 'cork', TRS(tuple(p + Vector((0, 0.075, 0.02)))))
add('bor_body', tube([(-0.2, 1.42, 0.12), (0.0, 1.2, 0.2), (0.18, 0.95, 0.16)], [0.02, 0.02, 0.02], 6), 'leather')
for k in range(5):
    a = -0.9 + k * 0.45
    p = Vector((math.sin(a) * 0.23, 0.82, math.cos(a) * 0.19))
    add('bor_body', cyl(0.022, 0.022, 0.1, 10), 'glass', TRS(tuple(p)))
    add('bor_body', cyl(0.019, 0.019, 0.07, 8), VC[(k + 1) % 4], TRS(tuple(p + Vector((0, -0.01, 0)))))
    add('bor_body', cyl(0.013, 0.013, 0.02, 8), 'cork', TRS(tuple(p + Vector((0, 0.06, 0)))))
# arms: left at her side, right raised holding the brass tool
for s in (-1, 1):
    sh = Vector((s * 0.24, 1.42, 0.0))
    el = Vector((s * 0.3, 1.14, 0.04)) if s < 0 else Vector((0.34, 1.2, 0.14))
    hd = Vector((s * 0.29, 0.88, 0.08)) if s < 0 else Vector((0.3, 1.42, 0.24))
    add('bor_body', sphere(0.08, 12, 10), 'coat', TRS(tuple(sh)))
    add('bor_body', tube([tuple(sh), tuple(el), tuple(hd)], [0.07, 0.065, 0.06], 12), 'coat')
    add('bor_body', torus(0.06, 0.02, 14, 6), 'coatDark', Matrix.Translation(hd.lerp(el, 0.15)) @ Vector((0, 1, 0)).rotation_difference((hd - el).normalized()).to_matrix().to_4x4())
    add('bor_body', sphere(0.045, 12, 10), 'skin', TRS(tuple(hd), scl=(1, 1.2, 1)))
TOOL = Vector((0.3, 1.42, 0.24))
add('bor_body', cyl(0.015, 0.015, 0.7, 8), 'brass', TRS(tuple(TOOL + Vector((0, 0.05, 0)))))
for k in (-1, 0, 1):  # three prongs
    add('bor_body', tube([tuple(TOOL + Vector((0, 0.38, 0))), tuple(TOOL + Vector((k * 0.05, 0.46, 0))), tuple(TOOL + Vector((k * 0.06, 0.58, 0)))], [0.01, 0.009, 0.004], 6), 'brass')
add('bor_body', sphere(0.03, 10, 8), 'vialG', TRS(tuple(TOOL + Vector((0, 0.38, 0)))))
# head: a narrow, sharp face; wild silver curls; goggles pushed up
add('bor_body', cyl(0.05, 0.06, 0.1, 12), 'skin', TRS((0, 1.52, 0.03)))
def addh(bm, mat, M=None, mods=(), seg='bor_body', smooth=True):
    add(seg, bm, mat, TRS(tuple(HEAD)) @ (M if M is not None else TRS()), mods, smooth)
face = deform(sphere(1.0, 28, 20), lambda v: head_shape(v, jaw_narrow=0.22, nose=0.1, socket=0.05, brow=0.05, cheek=0.05))
addh(face, 'skin', TRS((0, 0, 0), scl=(0.105, 0.125, 0.11)))
for s in (-1, 1):
    addh(sphere(0.016, 10, 8), 'dark', TRS((s * 0.037, 0.02, 0.088), scl=(1.3, 0.7, 0.4)))
    addh(tube([(s * 0.015, 0.047, 0.1), (s * 0.04, 0.054, 0.098), (s * 0.06, 0.045, 0.086)], [0.005, 0.006, 0.003], 4), 'hair')
addh(tube([(-0.022, -0.065, 0.095), (0.0, -0.068, 0.1), (0.022, -0.065, 0.095)], [0.007, 0.009, 0.007], 6), 'lip')
blobs = [((0, 0.06, -0.03), (0.12, 0.1, 0.12), (0, 0, 0))]
for k in range(16):  # curls round the head and down past the shoulders
    a = (k / 16) * 2 * PI
    y = 0.05 - 0.12 * hash3(k, 1, 1) - (0.12 if abs(math.sin(a)) > 0.5 else 0.0)
    r = 0.12 + 0.03 * hash3(k, 2, 2)
    if math.cos(a) > 0.55 and y > -0.02:
        continue  # leave the face clear
    blobs.append(((math.sin(a) * r, y, math.cos(a) * r * 0.9 - 0.02), (0.05, 0.06, 0.05), (0, 0, 0)))
hair = meta(blobs, 0.012)
bmesh.ops.delete(hair, geom=[v for v in hair.verts if v.co.z > -0.01 and v.co.y < 0.085 and abs(v.co.x) < 0.1], context='VERTS')
addh(hair, 'hair')
addh(torus(0.115, 0.012, 32, 6), 'leather', TRS((0, 0.1, -0.01), (0.35, 0, 0)))  # goggle strap
for s in (-1, 1):
    addh(cyl(0.032, 0.032, 0.04, 16), 'brass', TRS((s * 0.04, 0.13, 0.08), (PI / 2 - 0.5, 0, 0)))
    addh(cyl(0.025, 0.025, 0.005, 16), 'lens', TRS((s * 0.04, 0.135, 0.1), (PI / 2 - 0.5, 0, 0)))
for s in (-1, 1):
    add('bor_eyes', sphere(0.014, 12, 8), 'eye', TRS((s * 0.037, 0.02, 0.088), scl=(1.2, 0.65, 0.5)))
    add('bor_eyes', sphere(0.007, 10, 6), 'iris', TRS((s * 0.037, 0.02, 0.095), scl=(1, 1, 0.5)))

# ================================================================ a Bromonium Wraith: lean, hunched, a glowing ring sigil, a shield on its +x side
torso = lathe([(0.12, 0.9), (0.22, 1.1), (0.26, 1.4), (0.22, 1.7), (0.1, 1.85)], 20, False, True)
add('wrt_body', torso, 'wraith')
add('wrt_body', deform(sphere(1.0, 16, 12), lambda v: (v.x * 0.14, v.y * 0.16, v.z * 0.15 + 0.04)), 'wraith', TRS((0, 2.0, 0.06)))
for s in (-1, 1):
    add('wrt_body', sphere(0.025, 8, 6), 'eyeR', TRS((s * 0.055, 2.03, 0.19)))
for k in range(3):  # the sigil: three linked rings
    a = k / 3 * 2 * PI
    add('wrt_body', torus(0.06, 0.012, 16, 4), 'sigil', TRS((math.sin(a) * 0.06, 1.42 + math.cos(a) * 0.06, 0.25), (PI / 2, 0, 0)))
for s in (-1, 1):
    sh = Vector((s * 0.25, 1.68, 0)); el = Vector((s * 0.45, 1.4, 0.15)); hd = Vector((s * 0.5, 1.1, 0.2))
    add('wrt_body', tube([tuple(sh), tuple(el), tuple(hd)], [0.07, 0.055, 0.045], 8), 'wraith')
    for c in (-1, 0, 1):
        add('wrt_body', tube([tuple(hd), tuple(hd + Vector((c * 0.04, -0.14, 0.05)))], [0.018, 0.004], 4), 'wraithDark')
for k in range(5):  # a ragged tail of smoke instead of legs
    a = k / 5 * 2 * PI
    pts = [(math.sin(a) * 0.12, 0.95, math.cos(a) * 0.12), (math.sin(a) * 0.2, 0.55, math.cos(a) * 0.2), (math.sin(a + 0.6) * 0.1, 0.15, math.cos(a + 0.6) * 0.1)]
    add('wrt_body', tube(pts, [0.09, 0.05, 0.005], 6), 'wraithDark')
# the shield: a tall golden kite on its +x side, facing +x; a Br⁺ sigil
sh = poly_sheet([(0, 0.55), (0.32, 0.35), (0.3, -0.25), (0, -0.6), (-0.3, -0.25), (-0.32, 0.35)], 3)
add('wrt_body', sh, 'shield', TRS((0.62, 1.35, 0.1), (0, PI / 2, 0)), [SOLID(0.04, 0)], smooth=False)
add('wrt_body', torus(0.14, 0.02, 20, 4), 'shieldGlow', TRS((0.66, 1.35, 0.1), (0, 0, PI / 2)))

# ================================================================ the Polymer Leviathan: a head and a segment
add('lev_head', deform(sphere(1.0, 24, 16), lambda v: (v.x * 0.75, v.y * 0.5, v.z * 0.7 + 0.2)), 'lev')
for s in (-1, 1):
    add('lev_head', sphere(0.1, 10, 8), 'spark', TRS((s * 0.3, 0.25, 0.75)))
    for k in range(3):  # mandibles
        add('lev_head', tube([(s * 0.3, -0.15, 0.7), (s * (0.45 - 0.1 * k), -0.3, 1.0 + 0.1 * k), (s * (0.2 - 0.05 * k), -0.35, 1.25 + 0.05 * k)], [0.06, 0.04, 0.005], 6), 'levSpine')
    add('lev_head', tube([(s * 0.25, 0.4, 0.4), (s * 0.5, 0.9, 0.6), (s * 0.6, 1.2, 0.9)], [0.04, 0.03, 0.005], 6), 'levSpine')  # feelers
add('lev_head', sphere(0.28, 16, 12), 'spark', TRS((0, 0.75, 0.2)))  # the radical's crackling electron
seg = deform(cyl(0.55, 0.55, 1.3, 20), lambda v: (v.x, v.y, v.z))
add('lev_seg', seg, 'lev', TRS((0, 0, 0), (PI / 2, 0, 0)), [BEVEL(0.15, 2)])
add('lev_seg', torus(0.56, 0.06, 24, 6), 'levDark', TRS((0, 0, 0.6), (PI / 2, 0, 0)))
add('lev_seg', torus(0.56, 0.06, 24, 6), 'levDark', TRS((0, 0, -0.6), (PI / 2, 0, 0)))
for s in (-1, 1):
    for k in (-1, 1):
        add('lev_seg', tube([(s * 0.5, -0.1, k * 0.35), (s * 0.95, 0.15, k * 0.4), (s * 1.15, -0.5, k * 0.45)], [0.05, 0.04, 0.005], 6), 'levSpine')
for k in range(3):
    add('lev_seg', cyl(0.06, 0.0, 0.35, 5), 'levSpine', TRS((0, 0.55, -0.4 + k * 0.4)), smooth=False)

# ================================================================ the Reagent Satchel
add('t8_satchel', box(0.36, 0.3, 0.2), 'bag', TRS((0, 0.15, 0)), [BEVEL(0.05, 2)])
add('t8_satchel', box(0.37, 0.14, 0.22), 'bag', TRS((0, 0.26, 0.02), (0.25, 0, 0)), [BEVEL(0.03, 1)])
add('t8_satchel', box(0.05, 0.06, 0.02), 'brass', TRS((0, 0.2, 0.12)), [BEVEL(0.008, 1)])
for k in range(6):
    x = -0.13 + k * 0.052
    add('t8_satchel', cyl(0.022, 0.022, 0.18, 10), 'glass', TRS((x, 0.33, -0.03 + 0.03 * (k % 2))))
    add('t8_satchel', cyl(0.019, 0.019, 0.12, 8), VC[k % 4], TRS((x, 0.31, -0.03 + 0.03 * (k % 2))))
    add('t8_satchel', cyl(0.014, 0.014, 0.03, 8), 'cork', TRS((x, 0.43, -0.03 + 0.03 * (k % 2))))
add('t8_satchel', tube([(-0.18, 0.25, 0), (-0.15, 0.6, 0), (0.15, 0.6, 0), (0.18, 0.25, 0)], [0.015] * 4, 6), 'leather')

objs = build_objects(MATS, 'borana')
bake_ao(objs, distance=0.3, samples=24, floor=0.6)
export_glb(objs, GLB)
if RENDERS:
    pl = [('bor_body', TRS((-1.6, 0, 0))), ('bor_eyes', TRS(tuple(HEAD + Vector((-1.6, 0, 0))))), ('wrt_body', TRS((0, 0, 0))), ('lev_head', TRS((2.2, 0.8, 0))),
          ('lev_seg', TRS((2.2, 0.8, -1.4))), ('lev_seg', TRS((2.2, 0.8, -2.8))), ('t8_satchel', TRS((-0.6, 0, 1), scl=2))]
    preview(objs, pl, [('borana_all.png', (0, 1.8, 7), (0.2, 1.1, 0), 45), ('borana_face.png', (-1.55, 1.72, 0.9), (-1.6, 1.62, 0), 45)], RENDERS, sky='#6a8a5a', ground='#5a6a3a')
    print('RENDERS', RENDERS)
