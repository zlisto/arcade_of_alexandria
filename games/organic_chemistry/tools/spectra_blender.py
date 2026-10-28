"""World 12's characters, landscape and dungeon pieces for The Legend of Valence, exported to public/models/spectra.glb.

Astronomer Spectra (assets/characters/astronomer-spectra.png): a serene woman with long brown hair in a flowing deep-
blue robe spangled with stars, holding a glowing crystal prism in one hand and a brass telescope in the other.
The Fragment Phantom (assets/enemies/fragment-phantom.png): a figure made of shards of magenta glass, coming apart.
The Spectra Lens (assets/items/spectra-lens.png): a cyan glass prism set beside a red lens in a brass ring.
The Summit (assets/locations/world-12-observatory.png): a snowy peak above a sea of cloud, an observatory dome and
a great crystal on the summit splitting starlight into a rainbow.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/spectra_blender.py -- <glb_path> <render_dir>

Parts (feet on y = 0, facing +z unless noted; landscape parts in the world frame):
  spc_body   Spectra: robe, sleeves, hands, prism, telescope, head, hair
  spc_eyes   her eyes (frame: (0, 1.66, 0.05))
  frg_body   a Fragment Phantom (own frame, about 2 m, a cloud of shards)
  t12_lens   the Spectra Lens (own frame, about 0.4 m)
  sm_ground  the summit (y = 0), x −50…50, z −50…50, snow and rock, cloud sea below the edges
  sm_obs     the observatory: a domed drum with a slit, a door facing +z (own frame)
  sm_crystal the great crystal on its plinth (own frame)
  o12_wall   an inner wall run 4 m along z, inner face at x = 0 facing +x: pale stone with brass ribs and star windows
  o12_bell   a bell molecule: a bronze bell hung in a frame (own frame)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'spectra.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'robe': ('#1e2a6a', 0, 0.7), 'robeDark': ('#141c48', 0, 0.75), 'star': ('#e8f0ff', 0, 0.2, 2.0), 'skin': ('#e8c4aa', 0, 0.55),
    'hair': ('#5a3a24', 0, 0.7), 'eye': ('#f2eee8', 0, 0.3), 'iris': ('#4a5a8a', 0, 0.3), 'dark': ('#141010', 0, 0.8), 'lip': ('#b8686a', 0, 0.5),
    'brass': ('#c8a050', 0.85, 0.3), 'prism': ('#d8f8ff', 0.1, 0.05, 1.2), 'red': ('#c82a2a', 0.2, 0.2, 0.6),
    'shard': ('#d04a9a', 0.2, 0.2, 1.2), 'shardDark': ('#6a1a5a', 0.2, 0.3, 0.6),
    'snow': ('#e8eef6', 0, 0.85), 'rock': ('#5a5a66', 0, 0.9), 'cloud': ('#d8d0e8', 0, 1.0), 'dome': ('#dcdce8', 0.4, 0.4), 'stone': ('#c8c4d0', 0, 0.8),
    'slit': ('#1a1a2a', 0, 0.8), 'window': ('#ffe0a0', 0, 0.3, 2.0), 'bronze': ('#a8784a', 0.8, 0.35), 'wood': ('#5a3e2a', 0, 0.8),
}
HEAD = Vector((0, 1.66, 0.05))

# ================================================================ Spectra
robe = lathe([(0.36, 0.0), (0.3, 0.4), (0.24, 0.9), (0.21, 1.2), (0.23, 1.38), (0.17, 1.5), (0.09, 1.55)], 36, False, True)
for v in robe.verts:
    v.co.z *= 0.85
    a = math.atan2(v.co.z, v.co.x)
    if v.co.y < 0.3:
        v.co.x *= 1 + 0.08 * math.sin(a * 5); v.co.z *= 1 + 0.08 * math.sin(a * 5)
add('spc_body', robe, 'robe')
for k in range(60):
    a = hash3(k, 1, 1) * 2 * PI; y = 0.1 + 1.3 * hash3(k, 2, 2)
    r = (0.36 - 0.12 * (y / 1.4)) * 0.98
    add('spc_body', sphere(0.008, 6, 4), 'star', TRS((math.cos(a) * r, y, math.sin(a) * r * 0.85)), smooth=False)
add('spc_body', torus(0.21, 0.02, 32, 4), 'brass', TRS((0, 1.0, 0), scl=(1, 1, 0.85)))
add('spc_body', box(0.06, 0.2, 0.02), 'robeDark', TRS((0, 1.38, 0.2)))
for s in (-1, 1):
    sh = Vector((s * 0.22, 1.43, 0.0))
    el = Vector((s * 0.32, 1.18, 0.12))
    hd = Vector((s * 0.24, 1.3, 0.32)) if s < 0 else Vector((0.3, 1.2, 0.3))
    add('spc_body', sphere(0.075, 12, 10), 'robe', TRS(tuple(sh)))
    add('spc_body', tube([tuple(sh), tuple(el)], [0.07, 0.075], 12), 'robe')
    add('spc_body', lathe([(0.075, 0.0), (0.13, 0.15), (0.16, 0.26)], 16, False, False), 'robe', Matrix.Translation(el) @ Vector((0, 1, 0)).rotation_difference((hd - el).normalized()).to_matrix().to_4x4(), [SOLID(0.01, 0)])
    add('spc_body', tube([tuple(el.lerp(hd, 0.4)), tuple(hd)], [0.035, 0.03], 10), 'skin')
    add('spc_body', sphere(0.04, 12, 10), 'skin', TRS(tuple(hd), scl=(1, 1.2, 1)))
add('spc_body', cyl(0.06, 0.0, 0.14, 3), 'prism', TRS((-0.24, 1.44, 0.34)), smooth=False)  # the prism, held up
add('spc_body', cyl(0.06, 0.0, 0.14, 3), 'prism', TRS((-0.24, 1.44, 0.34), (PI, 0, 0)), smooth=False)
add('spc_body', cyl(0.03, 0.045, 0.5, 14), 'brass', TRS((0.38, 1.3, 0.3), (0.4, 0, -0.9)))  # the telescope
add('spc_body', cyl(0.05, 0.05, 0.04, 14), 'brass', TRS((0.58, 1.42, 0.38), (0.4, 0, -0.9)))
add('spc_body', cyl(0.05, 0.06, 0.1, 12), 'skin', TRS((0, 1.55, 0.03)))
def addh(bm, mat, M=None, mods=(), seg='spc_body', smooth=True):
    add(seg, bm, mat, TRS(tuple(HEAD)) @ (M if M is not None else TRS()), mods, smooth)
face = deform(sphere(1.0, 28, 20), lambda v: head_shape(v, jaw_narrow=0.2, nose=0.1, socket=0.05, brow=0.05, cheek=0.05))
addh(face, 'skin', TRS((0, 0, 0), scl=(0.105, 0.125, 0.11)))
for s in (-1, 1):
    addh(sphere(0.016, 10, 8), 'dark', TRS((s * 0.037, 0.02, 0.088), scl=(1.3, 0.7, 0.4)))
    addh(tube([(s * 0.015, 0.047, 0.1), (s * 0.04, 0.054, 0.098), (s * 0.06, 0.045, 0.086)], [0.005, 0.006, 0.003], 4), 'hair')
addh(tube([(-0.02, -0.065, 0.095), (0.0, -0.068, 0.1), (0.02, -0.065, 0.095)], [0.007, 0.009, 0.007], 6), 'lip')
hair = meta([((0, 0.05, -0.03), (0.12, 0.1, 0.12), (0, 0, 0)), ((0, -0.2, -0.08), (0.13, 0.22, 0.07), (0, 0, 0))], 0.012)
bmesh.ops.delete(hair, geom=[v for v in hair.verts if v.co.z > -0.01 and v.co.y < 0.085 and abs(v.co.x) < 0.1], context='VERTS')
addh(hair, 'hair')
for s in (-1, 1):
    add('spc_eyes', sphere(0.014, 12, 8), 'eye', TRS((s * 0.037, 0.02, 0.088), scl=(1.2, 0.65, 0.5)))
    add('spc_eyes', sphere(0.007, 10, 6), 'iris', TRS((s * 0.037, 0.02, 0.095), scl=(1, 1, 0.5)))

# ================================================================ a Fragment Phantom: a human-ish cloud of glass shards
for k in range(140):
    t = hash3(k, 3, 3)
    y = 0.2 + 1.8 * t
    r = 0.12 + 0.25 * (1 - abs(t - 0.55) * 1.6) * hash3(k, 4, 4) + (0.25 * hash3(k, 5, 5) if 0.55 < t < 0.8 else 0)
    a = hash3(k, 6, 6) * 2 * PI
    s_ = 0.04 + 0.07 * hash3(k, 7, 7)
    add('frg_body', cyl(s_, 0.0, s_ * 2.5, 3), 'shard' if k % 3 else 'shardDark', TRS((math.cos(a) * r, y, math.sin(a) * r), (hash3(k, 8, 8) * 3, hash3(k, 9, 9) * 3, 0)), smooth=False)

# ================================================================ the Spectra Lens
add('t12_lens', cyl(0.12, 0.0, 0.28, 3), 'prism', TRS((-0.06, 0.14, 0)), smooth=False)
add('t12_lens', torus(0.08, 0.015, 24, 6), 'brass', TRS((0.12, 0.1, 0.02), (PI / 2, 0, 0)))
add('t12_lens', cyl(0.07, 0.07, 0.02, 20), 'red', TRS((0.12, 0.1, 0.02), (PI / 2, 0, 0)))

# ================================================================ the summit
g = bmesh.new()
bmesh.ops.create_grid(g, x_segments=50, y_segments=50, size=50)
bmesh.ops.rotate(g, verts=g.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-PI / 2, 3, 'X'))
add('sm_ground', g, 'snow', smooth=False)
for i in range(26):
    a = i / 26 * 2 * PI
    r = 48 + 4 * hash3(i, 1, 1)
    add('sm_ground', rock_bm(2 + 2 * hash3(i, 2, 2), i, 2, 0.3, 0.7), 'rock', TRS((math.sin(a) * r, -1 - 3 * hash3(i, 3, 3), math.cos(a) * r)), smooth=False)
for i in range(40):  # the cloud sea round the peak
    a = i / 40 * 2 * PI
    r = 80 + 40 * hash3(i, 4, 4)
    add('sm_ground', sphere(1.0, 10, 6), 'cloud', TRS((math.sin(a) * r, -18, math.cos(a) * r), scl=(22, 5, 18)), smooth=False)
for i in range(8):  # far peaks above the clouds
    a = i / 8 * 2 * PI + 0.3
    add('sm_ground', cyl(1.0, 0.0, 1.0, 6), 'rock', TRS((math.sin(a) * 160, -20, math.cos(a) * 160), scl=(30, 40 + 20 * hash3(i, 5, 5), 30)), smooth=False)
# the observatory
add('sm_obs', cyl(7, 7, 8, 32), 'stone', TRS((0, 4, 0)))
add('sm_obs', deform(sphere(1.0, 32, 16), lambda v: (v.x, max(0.0, v.y), v.z)), 'dome', TRS((0, 8, 0), scl=(7.2, 6, 7.2)))
add('sm_obs', box(1.6, 6.5, 7.6), 'slit', TRS((0, 11, 0), (0.0, 0, 0)))
add('sm_obs', box(2.4, 3.4, 0.4), 'wood', TRS((0, 1.7, 6.95)))
for k in range(8):
    a = k / 8 * 2 * PI + 0.2
    add('sm_obs', box(0.8, 1.2, 0.2), 'window', TRS((math.sin(a) * 7.02, 5.2, math.cos(a) * 7.02), (0, a, 0)))
add('sm_crystal', cyl(1.2, 1.4, 1.5, 8), 'stone', TRS((0, 0.75, 0)))
add('sm_crystal', cyl(0.9, 0.0, 2.2, 6), 'prism', TRS((0, 3.5, 0)), smooth=False)
add('sm_crystal', cyl(0.9, 0.9, 2.0, 6), 'prism', TRS((0, 2.4, 0)), smooth=False)
add('sm_crystal', cyl(0.9, 0.0, 0.8, 6), 'prism', TRS((0, 1.0, 0), (PI, 0, 0)), smooth=False)
# inside
add('o12_wall', box(2.0, 8.0, 4.0), 'stone', TRS((-1.0, 4.0, 0)))
for z in (-1.9, 1.9):
    add('o12_wall', box(0.2, 8.0, 0.2), 'brass', TRS((0.1, 4.0, z)))
add('o12_wall', box(0.1, 1.4, 1.4), 'robeDark', TRS((0.02, 5.0, 0)))
for k in range(6):
    add('o12_wall', sphere(0.04, 6, 4), 'star', TRS((0.06, 4.5 + 0.9 * hash3(k, 1, 1), -0.6 + 1.2 * hash3(k, 2, 2))), smooth=False)
add('o12_wall', box(0.4, 0.4, 4.0), 'brass', TRS((0.15, 7.8, 0)))
add('o12_bell', box(0.15, 2.6, 0.15), 'wood', TRS((-0.8, 1.3, 0)))
add('o12_bell', box(0.15, 2.6, 0.15), 'wood', TRS((0.8, 1.3, 0)))
add('o12_bell', box(1.8, 0.15, 0.15), 'wood', TRS((0, 2.6, 0)))
add('o12_bell', lathe([(0.0, 0.0), (0.18, 0.0), (0.22, -0.3), (0.38, -0.7), (0.42, -0.8)], 24, False, True), 'bronze', TRS((0, 2.5, 0)), [SOLID(0.03, 0)])

objs = build_objects(MATS, 'spectra')
BIG = ('sm_ground',)
bake_ao({k: v for k, v in objs.items() if k not in BIG}, distance=0.3, samples=24, floor=0.6)
export_glb(objs, GLB)
if RENDERS:
    pl = [('spc_body', TRS((-1.6, 0, 0))), ('spc_eyes', TRS(tuple(HEAD + Vector((-1.6, 0, 0))))), ('frg_body', TRS((0, 0, 0))), ('t12_lens', TRS((1.0, 1.2, 0.6), scl=3)), ('o12_bell', TRS((2.2, 0, -0.5)))]
    preview(objs, pl, [('spectra_all.png', (0.2, 1.6, 7), (0.2, 1.2, 0), 45), ('spectra_face.png', (-1.55, 1.72, 0.9), (-1.6, 1.62, 0), 45)], RENDERS, sky='#2a3058', ground='#3a3a4a')
    pl2 = [('sm_ground', TRS()), ('sm_obs', TRS((0, 0, -30))), ('sm_crystal', TRS((12, 0, -24)))]
    preview(objs, pl2, [('summit_view.png', (0, 5, 26), (0, 8, -40), 50)], RENDERS, sky='#2a3058', ground=None)
    print('RENDERS', RENDERS)
