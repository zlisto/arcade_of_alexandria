"""World 11's characters for The Legend of Valence, exported to public/models/walden.glb.

Sage Walden (assets/characters/sage-walden.png): a grizzled arena-master with short grey hair, bronze plate armour
over a dark tunic, a long red cape and sash, holding a black umbrella open over his shoulder like a shield.
The Tosylate Ghoul (assets/enemies/tosylate-ghoul.png): a gaunt, pale, bald ghoul in rags with a glowing yellow
sulfonate sigil on its chest; it lurks behind pillars. A good leaving group: struck from behind, it simply leaves.
The Five-Stanced Champion: Malradix's champion, a tall armoured gladiator with a crested helm and a round shield
whose rim carries five coloured gems, one for each mechanism.
The Inversion Umbrella (assets/items/inversion-umbrella.png): a red umbrella blown inside out, wooden crook handle.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/walden_blender.py -- <glb_path> <render_dir>

Parts (feet on y = 0, facing +z unless noted):
  wal_body   Walden: boots, armour, tunic, cape, arms, umbrella, head, hair
  wal_eyes   his eyes (frame: (0, 1.7, 0.05))
  gho_body   a ghoul (own frame, hunched, about 1.8 m)
  chp_body   the Champion (own frame, about 3 m)
  chp_shield its shield (own frame, held at its left; facing +z)
  t11_umb    the Inversion Umbrella (own frame, handle down, about 0.9 m)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'walden.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'bronze': ('#8a6a3a', 0.85, 0.35), 'bronzeDark': ('#5a4220', 0.8, 0.45), 'tunic': ('#2a2224', 0, 0.85), 'cape': ('#8a1e1e', 0, 0.75),
    'capeDark': ('#5a1010', 0, 0.8), 'boots': ('#2a1e18', 0, 0.75), 'skin': ('#d8a88a', 0, 0.6), 'hair': ('#9a9a96', 0, 0.8),
    'eye': ('#f2eee8', 0, 0.3), 'iris': ('#4a5a6a', 0, 0.3), 'dark': ('#141010', 0, 0.8), 'umb': ('#1e1a20', 0, 0.6), 'wood': ('#6a4428', 0, 0.75),
    'ghoul': ('#b8b0a8', 0, 0.7), 'rag': ('#3a3428', 0, 0.95), 'sigil': ('#ffe04a', 0, 0.2, 3.0), 'ghoulEye': ('#e8e0a0', 0, 0.2, 1.5),
    'steel': ('#8a8e98', 0.85, 0.3), 'steelDark': ('#3a3e48', 0.8, 0.4), 'crest': ('#c81e1e', 0, 0.7), 'visor': ('#ff6a3a', 0, 0.2, 2.5),
    'gR': ('#ff4a4a', 0, 0.2, 2.0), 'gG': ('#4aff6a', 0, 0.2, 2.0), 'gB': ('#4a8aff', 0, 0.2, 2.0), 'gW': ('#f0f0f0', 0, 0.2, 2.0), 'gV': ('#b04aff', 0, 0.2, 2.0),
    'umbRed': ('#b82a2a', 0, 0.7),
}
HEAD = Vector((0, 1.7, 0.05))

# ================================================================ Walden
for s in (-1, 1):
    add('wal_body', box(0.15, 0.13, 0.3), 'boots', TRS((s * 0.12, 0.065, 0.04)), [BEVEL(0.04, 2)])
    add('wal_body', lathe([(0.09, 0.1), (0.1, 0.3), (0.105, 0.42)], 14, False, True), 'boots', TRS((s * 0.12, 0, 0)))
    add('wal_body', capsule(0.085, 0.36, 14, 10), 'tunic', TRS((s * 0.12, 0.6, 0)))
    add('wal_body', box(0.14, 0.2, 0.06), 'bronze', TRS((s * 0.12, 0.62, 0.08)), [BEVEL(0.02, 1)])  # knee plates
body = lathe([(0.24, 0.86), (0.26, 1.0), (0.28, 1.2), (0.3, 1.38), (0.25, 1.5), (0.13, 1.56)], 32, False, True)
for v in body.verts:
    v.co.z *= 0.8
add('wal_body', body, 'bronze', None)
for k in range(4):
    add('wal_body', torus(0.255 + 0.01 * k, 0.012, 32, 4), 'bronzeDark', TRS((0, 0.9 + k * 0.1, 0), scl=(1, 1, 0.8)))
add('wal_body', box(0.14, 0.3, 0.02), 'cape', TRS((0, 1.05, 0.215)))  # the red sash front
for s in (-1, 1):  # pauldrons
    add('wal_body', deform(sphere(1.0, 14, 10), lambda v: (v.x * 0.16, max(-0.02, v.y) * 0.12, v.z * 0.15)), 'bronze', TRS((s * 0.29, 1.47, 0)))
cape = lathe([(0.3, 0.15), (0.3, 0.7), (0.29, 1.2), (0.26, 1.48), (0.16, 1.55)], 28, False, False)
bmesh.ops.delete(cape, geom=[v for v in cape.verts if v.co.z > -0.05], context='VERTS')
for v in cape.verts:
    if v.co.y < 0.4:
        v.co.z -= 0.08 * (0.4 - v.co.y) / 0.25
add('wal_body', cape, 'cape', TRS((0, 0, -0.04)), [SOLID(0.02, 0)])
for s in (-1, 1):
    sh = Vector((s * 0.29, 1.42, 0.0))
    el = Vector((s * 0.36, 1.14, 0.08)) if s < 0 else Vector((0.34, 1.18, 0.14))
    hd = Vector((s * 0.3, 0.9, 0.16)) if s < 0 else Vector((0.2, 1.3, 0.3))
    add('wal_body', tube([tuple(sh), tuple(el), tuple(hd)], [0.08, 0.075, 0.06], 12), 'tunic')
    add('wal_body', tube([tuple(el.lerp(hd, 0.2)), tuple(el.lerp(hd, 0.8))], [0.075, 0.068], 12), 'bronze')
    add('wal_body', sphere(0.05, 12, 10), 'skin', TRS(tuple(hd), scl=(1, 1.2, 1)))
# the umbrella, open over his right shoulder like a shield
UH = Vector((0.2, 1.3, 0.3))
add('wal_body', cyl(0.015, 0.015, 1.2, 8), 'wood', TRS(tuple(UH + Vector((-0.1, 0.45, -0.25))), (-0.6, 0, 0.25)))
canopy = lathe([(0.0, 0.25), (0.35, 0.2), (0.62, 0.05), (0.7, -0.05)], 8, False, False)
add('wal_body', canopy, 'umb', TRS(tuple(UH + Vector((-0.28, 1.0, -0.55))), (-0.6, 0, 0.25)), [SOLID(0.012, 0)], smooth=False)
# head
add('wal_body', cyl(0.06, 0.07, 0.1, 12), 'skin', TRS((0, 1.58, 0.03)))
def addh(bm, mat, M=None, mods=(), seg='wal_body', smooth=True):
    add(seg, bm, mat, TRS(tuple(HEAD)) @ (M if M is not None else TRS()), mods, smooth)
face = deform(sphere(1.0, 28, 20), lambda v: head_shape(v, jaw_narrow=0.05, nose=0.13, socket=0.06, brow=0.08, cheek=0.04))
addh(face, 'skin', TRS((0, 0, 0), scl=(0.115, 0.135, 0.12)))
for s in (-1, 1):
    addh(sphere(0.017, 10, 8), 'dark', TRS((s * 0.04, 0.022, 0.095), scl=(1.3, 0.6, 0.4)))
    addh(tube([(s * 0.012, 0.05, 0.108), (s * 0.04, 0.056, 0.106), (s * 0.066, 0.048, 0.092)], [0.008, 0.009, 0.004], 4), 'hair')
addh(tube([(-0.025, -0.07, 0.1), (0.0, -0.072, 0.104), (0.025, -0.07, 0.1)], [0.006, 0.008, 0.006], 6), 'dark')
hair = meta([((0, 0.06, -0.02), (0.12, 0.09, 0.12), (0, 0, 0))], 0.012)
bmesh.ops.delete(hair, geom=[v for v in hair.verts if (v.co.z > 0.03 and v.co.y < 0.08) or v.co.y < 0.0], context='VERTS')
addh(hair, 'hair')
for s in (-1, 1):
    add('wal_eyes', sphere(0.015, 12, 8), 'eye', TRS((s * 0.04, 0.022, 0.095), scl=(1.2, 0.55, 0.5)))
    add('wal_eyes', sphere(0.0075, 10, 6), 'iris', TRS((s * 0.04, 0.022, 0.102), scl=(1, 1, 0.5)))

# ================================================================ a Tosylate Ghoul: gaunt, hunched, rags, a glowing sigil
add('gho_body', deform(sphere(1.0, 16, 12), lambda v: (v.x * 0.2, v.y * 0.35, v.z * 0.14)), 'ghoul', TRS((0, 1.15, 0), (0.35, 0, 0)))
add('gho_body', deform(sphere(1.0, 14, 12), lambda v: (v.x * 0.11, v.y * 0.13, v.z * 0.12)), 'ghoul', TRS((0, 1.52, 0.22)))
for s in (-1, 1):
    add('gho_body', sphere(0.022, 8, 6), 'ghoulEye', TRS((s * 0.04, 1.54, 0.33)))
    add('gho_body', tube([(s * 0.15, 1.35, 0.1), (s * 0.35, 1.05, 0.3), (s * 0.3, 0.75, 0.45)], [0.04, 0.03, 0.025], 8), 'ghoul')
    for c in (-1, 0, 1):
        add('gho_body', tube([(s * 0.3, 0.75, 0.45), (s * (0.3 + 0.04 * c), 0.6, 0.52)], [0.012, 0.003], 4), 'ghoul')
    add('gho_body', tube([(s * 0.1, 0.85, 0), (s * 0.14, 0.45, 0.12), (s * 0.12, 0.05, 0.05)], [0.05, 0.04, 0.03], 8), 'ghoul')
rag = lathe([(0.12, 0.6), (0.22, 0.75), (0.22, 1.05)], 16, False, False)
for v in rag.verts:
    if v.co.y < 0.7:
        v.co.y += 0.08 * math.sin(math.atan2(v.co.z, v.co.x) * 7)
add('gho_body', rag, 'rag', TRS((0, 0, 0.02)), [SOLID(0.02, 0)])
add('gho_body', torus(0.06, 0.012, 16, 4), 'sigil', TRS((0, 1.22, 0.2), (PI / 2 - 0.35, 0, 0)))
add('gho_body', cyl(0.025, 0.025, 0.012, 6), 'sigil', TRS((0, 1.22, 0.2), (PI / 2 - 0.35, 0, 0)))

# ================================================================ the Five-Stanced Champion
for s in (-1, 1):
    add('chp_body', tube([(s * 0.2, 1.2, 0), (s * 0.25, 0.6, 0.08), (s * 0.24, 0.1, 0.05)], [0.15, 0.13, 0.12], 10), 'steelDark')
    add('chp_body', box(0.24, 0.16, 0.42), 'steel', TRS((s * 0.24, 0.08, 0.1)), [BEVEL(0.04, 1)])
    add('chp_body', deform(sphere(1.0, 12, 10), lambda v: (v.x * 0.13, v.y * 0.14, v.z * 0.14)), 'steel', TRS((s * 0.25, 0.62, 0.15)))
add('chp_body', lathe([(0.3, 1.1), (0.4, 1.4), (0.48, 1.8), (0.5, 2.1), (0.36, 2.3), (0.16, 2.38)], 28, False, True), 'steel')
add('chp_body', box(0.5, 0.5, 0.06), 'crest', TRS((0, 1.55, 0.36)))  # a tabard
for s in (-1, 1):
    add('chp_body', deform(sphere(1.0, 14, 10), lambda v: (v.x * 0.24, max(-0.04, v.y) * 0.18, v.z * 0.22)), 'steel', TRS((s * 0.5, 2.25, 0)))
    add('chp_body', tube([(s * 0.5, 2.2, 0), (s * 0.68, 1.7, 0.15), (s * 0.6, 1.3, 0.4)], [0.13, 0.11, 0.1], 10), 'steelDark')
add('chp_body', cyl(0.025, 0.025, 1.4, 8), 'steel', TRS((0.62, 1.6, 0.6), (0.4, 0, 0)))  # a sword
add('chp_body', lathe([(0.0, 0.0), (0.2, 0.05), (0.21, 0.25), (0.18, 0.38), (0.0, 0.42)], 20, False, True), 'steel', TRS((0, 2.36, 0.02)))  # helm
add('chp_body', box(0.22, 0.05, 0.02), 'visor', TRS((0, 2.52, 0.2)))
for k in range(9):  # a crest of red plumes, front to back
    add('chp_body', box(0.04, 0.22 - 0.012 * abs(k - 4), 0.07), 'crest', TRS((0, 2.86, 0.2 - k * 0.06)))
add('chp_shield', cyl(0.55, 0.55, 0.08, 32), 'steel', TRS((0, 0, 0), (PI / 2, 0, 0)), [BEVEL(0.02, 1)])
add('chp_shield', torus(0.55, 0.04, 32, 6), 'bronze', TRS((0, 0, 0.04), (PI / 2, 0, 0)))
for k, m in enumerate(['gR', 'gG', 'gB', 'gW', 'gV']):
    a = k / 5 * 2 * PI
    add('chp_shield', sphere(0.06, 10, 8), m, TRS((math.sin(a) * 0.4, math.cos(a) * 0.4, 0.06)))

# ================================================================ the Inversion Umbrella: blown inside out
add('t11_umb', cyl(0.015, 0.015, 0.8, 8), 'wood', TRS((0, 0.4, 0)))
add('t11_umb', torus(0.05, 0.012, 16, 4, 0, PI), 'wood', TRS((0.05, 0.0, 0), (0, 0, PI)))
inv = lathe([(0.0, 0.62), (0.15, 0.72), (0.3, 0.9), (0.38, 1.02)], 8, False, False)
add('t11_umb', inv, 'umbRed', None, [SOLID(0.012, 0)], smooth=False)
for k in range(8):
    a = k / 8 * 2 * PI
    add('t11_umb', tube([(0, 0.62, 0), (math.sin(a) * 0.38, 1.02, math.cos(a) * 0.38)], [0.006, 0.004], 4), 'wood')
add('t11_umb', cyl(0.012, 0.0, 0.08, 6), 'steel', TRS((0, 0.66, 0), (PI, 0, 0)))

objs = build_objects(MATS, 'walden')
bake_ao(objs, distance=0.3, samples=24, floor=0.6)
export_glb(objs, GLB)
if RENDERS:
    pl = [('wal_body', TRS((-1.8, 0, 0))), ('wal_eyes', TRS(tuple(HEAD + Vector((-1.8, 0, 0))))), ('gho_body', TRS((-0.4, 0, 0.6))), ('chp_body', TRS((1.4, 0, 0))), ('chp_shield', TRS((0.75, 1.6, 0.5))), ('t11_umb', TRS((-0.9, 1.2, 0.8), scl=1.2))]
    preview(objs, pl, [('walden_all.png', (0, 1.8, 8), (0, 1.4, 0), 45), ('walden_face.png', (-1.75, 1.78, 0.9), (-1.8, 1.66, 0), 45)], RENDERS, sky='#6a3a3a', ground='#2a2224')
    print('RENDERS', RENDERS)
