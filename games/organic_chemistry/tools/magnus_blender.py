"""World 10's characters for The Legend of Valence, exported to public/models/magnus.glb.

Old Magnus (assets/characters/old-magnus.png): a tall old marsh-warden with a long grey beard and long grey hair, a
shaggy moss-green cloak hung with weed, a dark tunic and belt, a green-glowing lantern raised in his left hand and
a silver ring on his right hand.
The Grignard Golem (assets/enemies/grignard-golem.png): a hulking dark-stone golem with silver shoulder and chest
plates, green halide crystals growing from its shoulders and a glowing red core.
The Allylic Hydra: a marsh serpent with two heads on one bowed neck-body (an allyl chain: three carbons), one
unpaired electron glowing shared between both heads, and a brominated tail.
The Magnesium Ring (assets/items/magnesium-ring.png): a broad silver ring set with a green gem and a red flame.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/magnus_blender.py -- <glb_path> <render_dir>

Parts (feet on y = 0, facing +z unless noted):
  mag_body   Magnus: boots, robe, mossy cloak, arms, lantern, ring, head, hair, beard
  mag_eyes   his eyes (frame: (0, 1.72, 0.05))
  gol_body   a golem (own frame, about 2.6 m)
  hyd_body   the Hydra's body: an arched neck-body between two neck bases, and the tail (own frame)
  hyd_head   one head (own frame: neck at origin, snout +z)
  t10_ring   the Magnesium Ring (own frame, about 0.3 m across, facing +z)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'magnus.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'moss': ('#4a5a2a', 0, 0.95), 'mossDark': ('#2e3a1a', 0, 0.95), 'tunic': ('#3a3428', 0, 0.85), 'boots': ('#2a2018', 0, 0.8),
    'belt': ('#3a2a1a', 0.2, 0.6), 'skin': ('#d8b098', 0, 0.6), 'beard': ('#b8b8b0', 0, 0.85), 'eye': ('#f2eee8', 0, 0.3),
    'iris': ('#4a5a4a', 0, 0.3), 'dark': ('#141010', 0, 0.8), 'iron': ('#3a3a40', 0.7, 0.4), 'lampGlow': ('#7aff8a', 0, 0.2, 3.0),
    'silver': ('#dcdce8', 0.95, 0.15), 'gemG': ('#3aff8a', 0.1, 0.1, 1.6), 'flame': ('#ff5a2a', 0, 0.2, 3.0),
    'golem': ('#2e2a34', 0.1, 0.75), 'plate': ('#b8bcc8', 0.8, 0.3), 'crystal': ('#7aff9a', 0.1, 0.15, 1.2), 'core': ('#ff3a3a', 0, 0.2, 3.0),
    'hydra': ('#3a5a3a', 0.1, 0.5), 'hydraBelly': ('#8a9a5a', 0, 0.6), 'hydraEye': ('#ffe04a', 0, 0.2, 2.5), 'spark': ('#ffe8a0', 0, 0.2, 3.5), 'bromine': ('#a04a2a', 0.1, 0.4, 0.6),
}
HEAD = Vector((0, 1.72, 0.05))

# ================================================================ Magnus
for s in (-1, 1):
    add('mag_body', box(0.14, 0.12, 0.3), 'boots', TRS((s * 0.11, 0.06, 0.05)), [BEVEL(0.04, 2)])
robe = lathe([(0.27, 0.05), (0.25, 0.5), (0.22, 1.0), (0.22, 1.3), (0.24, 1.45), (0.15, 1.56)], 32, False, True)
for v in robe.verts:
    v.co.z *= 0.8
add('mag_body', robe, 'tunic')
add('mag_body', torus(0.225, 0.03, 32, 6), 'belt', TRS((0, 1.0, 0), scl=(1, 1, 0.8)))
# the shaggy cloak: an open shell over the shoulders and back, ragged at the hem, tufts of weed
cloak = lathe([(0.36, 0.1), (0.33, 0.6), (0.3, 1.1), (0.31, 1.42), (0.24, 1.56), (0.12, 1.62)], 32, False, False)
for v in cloak.verts:
    a = math.atan2(v.co.z, v.co.x)
    v.co.z *= 0.85
    if v.co.y < 0.2:
        v.co.y += 0.12 * math.sin(a * 9) + 0.06 * math.sin(a * 17)
bmesh.ops.delete(cloak, geom=[v for v in cloak.verts if v.co.z > 0.1 and abs(v.co.x) < 0.17 and v.co.y < 1.45], context='VERTS')
add('mag_body', cloak, 'moss', None, [SOLID(0.03, 0)])
for k in range(30):
    a = k / 30 * 2 * PI
    if math.cos(a) > 0.6:
        continue
    y = 0.3 + 1.2 * hash3(k, 1, 1)
    r = 0.33 - 0.05 * (y - 0.3)
    add('mag_body', tube([(math.sin(a) * r, y, math.cos(a) * r * 0.85), (math.sin(a) * (r + 0.03), y - 0.18, math.cos(a) * (r + 0.03) * 0.85)], [0.025, 0.005], 4), 'mossDark')
add('mag_body', torus(0.22, 0.06, 24, 8), 'moss', TRS((0, 1.52, -0.02), scl=(1, 0.8, 0.9)))  # a mossy collar
# arms: left raised with the lantern, right low with the ring
for s in (-1, 1):
    sh = Vector((s * 0.27, 1.44, 0.0))
    el = Vector((-0.38, 1.3, 0.18)) if s < 0 else Vector((0.34, 1.12, 0.08))
    hd = Vector((-0.33, 1.52, 0.32)) if s < 0 else Vector((0.3, 0.86, 0.14))
    add('mag_body', sphere(0.09, 12, 10), 'moss', TRS(tuple(sh)))
    add('mag_body', tube([tuple(sh), tuple(el), tuple(hd)], [0.08, 0.075, 0.065], 12), 'moss')
    add('mag_body', sphere(0.05, 12, 10), 'skin', TRS(tuple(hd), scl=(1, 1.2, 1)))
LH = Vector((-0.33, 1.52, 0.32))
add('mag_body', torus(0.04, 0.008, 12, 4), 'iron', TRS(tuple(LH + Vector((0, 0.07, 0)))))
add('mag_body', cyl(0.07, 0.08, 0.04, 8), 'iron', TRS(tuple(LH + Vector((0, -0.02, 0)))))
add('mag_body', cyl(0.06, 0.06, 0.16, 8), 'lampGlow', TRS(tuple(LH + Vector((0, -0.12, 0)))))
for k in range(4):
    a = k / 4 * 2 * PI + PI / 4
    add('mag_body', box(0.012, 0.2, 0.012), 'iron', TRS(tuple(LH + Vector((math.sin(a) * 0.07, -0.12, math.cos(a) * 0.07)))))
add('mag_body', cyl(0.08, 0.06, 0.04, 8), 'iron', TRS(tuple(LH + Vector((0, -0.22, 0)))))
RH = Vector((0.3, 0.86, 0.14))
add('mag_body', torus(0.022, 0.008, 12, 4), 'silver', TRS(tuple(RH + Vector((0, -0.03, 0.02))), (PI / 2, 0, 0)))
# head: an old face, a long grey beard to the belt, long grey hair
add('mag_body', cyl(0.055, 0.065, 0.1, 12), 'skin', TRS((0, 1.6, 0.03)))
def addh(bm, mat, M=None, mods=(), seg='mag_body', smooth=True):
    add(seg, bm, mat, TRS(tuple(HEAD)) @ (M if M is not None else TRS()), mods, smooth)
face = deform(sphere(1.0, 28, 20), lambda v: head_shape(v, jaw_narrow=0.12, nose=0.14, socket=0.06, brow=0.08, cheek=0.04))
addh(face, 'skin', TRS((0, 0, 0), scl=(0.112, 0.135, 0.118)))
for s in (-1, 1):
    addh(sphere(0.017, 10, 8), 'dark', TRS((s * 0.04, 0.022, 0.094), scl=(1.3, 0.6, 0.4)))
    addh(tube([(s * 0.012, 0.05, 0.106), (s * 0.04, 0.06, 0.104), (s * 0.066, 0.05, 0.09)], [0.009, 0.01, 0.005], 4), 'beard')
addh(meta([((0, -0.07, 0.08), (0.1, 0.07, 0.06), (0, 0, 0)), ((0, -0.18, 0.1), (0.09, 0.12, 0.06), (0, 0, 0)), ((0, -0.34, 0.12), (0.07, 0.12, 0.05), (0, 0, 0)), ((0, -0.48, 0.13), (0.045, 0.08, 0.04), (0, 0, 0))], 0.014), 'beard')
hair = meta([((0, 0.05, -0.03), (0.12, 0.11, 0.12), (0, 0, 0)), ((0, -0.12, -0.08), (0.12, 0.16, 0.07), (0, 0, 0))], 0.014)
bmesh.ops.delete(hair, geom=[v for v in hair.verts if v.co.z > 0.02 and v.co.y < 0.07], context='VERTS')
addh(hair, 'beard')
for s in (-1, 1):
    add('mag_eyes', sphere(0.015, 12, 8), 'eye', TRS((s * 0.04, 0.022, 0.094), scl=(1.2, 0.55, 0.5)))
    add('mag_eyes', sphere(0.0075, 10, 6), 'iris', TRS((s * 0.04, 0.022, 0.101), scl=(1, 1, 0.5)))

# ================================================================ a Grignard Golem
add('gol_body', deform(sphere(1.0, 18, 14), lambda v: (v.x * 0.62, v.y * 0.7, v.z * 0.45)), 'golem', TRS((0, 1.55, 0)))
add('gol_body', box(0.9, 0.5, 0.12), 'plate', TRS((0, 1.75, 0.38)), [BEVEL(0.06, 2)])
add('gol_body', sphere(0.16, 14, 10), 'core', TRS((0, 1.42, 0.4)))
add('gol_body', deform(sphere(1.0, 14, 10), lambda v: (v.x * 0.24, v.y * 0.2, v.z * 0.22)), 'golem', TRS((0, 2.3, 0.08)))
for s in (-1, 1):
    add('gol_body', sphere(0.035, 8, 6), 'core', TRS((s * 0.08, 2.32, 0.27)))
    add('gol_body', deform(sphere(1.0, 14, 10), lambda v: (v.x * 0.32, v.y * 0.24, v.z * 0.32)), 'plate', TRS((s * 0.66, 2.0, 0)))
    for k in range(3):
        add('gol_body', cyl(0.07, 0.0, 0.35 + 0.12 * k, 5), 'crystal', TRS((s * (0.62 + 0.08 * k), 2.2 + 0.05 * k, -0.1 + 0.1 * k), (0.3 - 0.2 * k, 0, s * (0.4 + 0.1 * k))), smooth=False)
    add('gol_body', tube([(s * 0.66, 1.9, 0), (s * 0.85, 1.35, 0.1), (s * 0.82, 0.85, 0.2)], [0.18, 0.16, 0.14], 10), 'golem')
    add('gol_body', deform(sphere(1.0, 12, 10), lambda v: (v.x * 0.24, v.y * 0.22, v.z * 0.24)), 'golem', TRS((s * 0.82, 0.7, 0.22)))
    add('gol_body', tube([(s * 0.25, 1.0, 0), (s * 0.3, 0.5, 0.05), (s * 0.3, 0.12, 0.05)], [0.2, 0.18, 0.17], 10), 'golem')
    add('gol_body', box(0.4, 0.2, 0.5), 'golem', TRS((s * 0.3, 0.1, 0.1)), [BEVEL(0.05, 1)])

# ================================================================ the Allylic Hydra
pts = []
for k in range(40):  # an arched body between the two neck bases (an allyl chain: C1 … C3)
    t = k / 39
    pts.append((-1.6 + 3.2 * t, 0.6 + 1.6 * math.sin(t * PI), 0))
add('hyd_body', tube(pts, [0.42 - 0.08 * abs(t - 0.5) for t in [k / 39 for k in range(40)]], 14), 'hydra')
for k in range(0, 40, 4):
    add('hyd_body', sphere(0.12, 8, 6), 'hydraBelly', TRS((pts[k][0], pts[k][1] - 0.35, 0.18)))
tail = [(0, 1.2, -0.2), (0.2, 0.6, -1.2), (-0.3, 0.3, -2.4), (0.1, 0.15, -3.4)]
add('hyd_body', tube(tail, [0.35, 0.25, 0.15, 0.04], 12), 'hydra')
add('hyd_body', sphere(0.2, 12, 10), 'bromine', TRS((0.1, 0.25, -3.3)))  # the tail's bromine
add('hyd_body', deform(sphere(1.0, 16, 12), lambda v: (v.x * 0.38, v.y * 0.25, v.z * 0.25)), 'spark', TRS((0, 2.25, 0)))  # the shared electron, mid-arch
add('hyd_head', deform(sphere(1.0, 20, 14), lambda v: (v.x * 0.32, v.y * 0.26, v.z * 0.55 + 0.3)), 'hydra')
add('hyd_head', deform(sphere(1.0, 14, 10), lambda v: (v.x * 0.24, v.y * 0.08 - 0.16, v.z * 0.42 + 0.38)), 'hydraBelly')
for s in (-1, 1):
    add('hyd_head', sphere(0.06, 10, 8), 'hydraEye', TRS((s * 0.18, 0.12, 0.55), scl=(1, 0.7, 0.8)))
    add('hyd_head', cyl(0.05, 0.0, 0.35, 5), 'mossDark', TRS((s * 0.15, 0.25, 0.1), (-0.8, 0, s * 0.3)), smooth=False)

# ================================================================ the Magnesium Ring
add('t10_ring', torus(0.12, 0.035, 40, 12), 'silver', TRS((0, 0, 0), (PI / 2, 0, 0), scl=(1, 1, 1.4)))
add('t10_ring', cyl(0.03, 0.0, 0.06, 4), 'gemG', TRS((-0.1, 0.08, 0.02), (0, 0, 0.8)), smooth=False)
add('t10_ring', cyl(0.03, 0.0, 0.06, 4), 'gemG', TRS((-0.1, 0.08, 0.02), (PI, 0, 0.8)), smooth=False)
add('t10_ring', deform(sphere(1.0, 10, 8), lambda v: (v.x * 0.02, v.y * 0.04 + max(0.0, v.y) * 0.03, v.z * 0.02)), 'flame', TRS((0.12, -0.02, 0.03)))

objs = build_objects(MATS, 'magnus')
bake_ao(objs, distance=0.3, samples=24, floor=0.6)
export_glb(objs, GLB)
if RENDERS:
    pl = [('mag_body', TRS((-1.8, 0, 0))), ('mag_eyes', TRS(tuple(HEAD + Vector((-1.8, 0, 0))))), ('gol_body', TRS((0, 0, 0))), ('hyd_body', TRS((3.0, 0, -1))),
          ('hyd_head', TRS((1.4, 0.6, -0.6), (0, 0.4, 0))), ('hyd_head', TRS((4.6, 0.6, -0.6), (0, -0.4, 0))), ('t10_ring', TRS((-0.9, 1.6, 0.8), scl=2))]
    preview(objs, pl, [('magnus_all.png', (1, 2.0, 8.5), (1, 1.2, 0), 45), ('magnus_face.png', (-1.75, 1.78, 0.9), (-1.8, 1.65, 0), 45)], RENDERS, sky='#5a6a5a', ground='#3a4a2a')
    print('RENDERS', RENDERS)
