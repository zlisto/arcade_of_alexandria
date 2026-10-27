"""The Resonance Hydra (World 2 boss, carbonate CO3 2-) for The Legend of Valence, exported to
public/models/hydra.glb.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/hydra_blender.py -- <glb_path> <render_dir>

A teal sea-dragon with violet frills. Each of its three heads wears a glowing red oxygen on its brow
(that head's double-bonded O: one resonance form each). Parts, in the frames of src/actors/Hydra.jsx:
  hyd_trunk   the body group (the central carbon rising from the pool), origin at the pool surface
  hyd_skull   a head's "skull" group (facing +z)
  hyd_jaw     the "jaw" group at (0, -0.12, 0.2) inside the skull
  hyd_bead    one neck segment at unit radius (the game places and scales 7 per neck)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'hydra.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {'skin': ('#2f8a9a', 0.1, 0.35), 'skinDark': ('#1f5a6a', 0, 0.45), 'belly': ('#9ad8c8', 0, 0.5), 'fin': ('#7a3ab8', 0, 0.4),
        'eye': ('#fff3a0', 0, 0.3, 3.0), 'tooth': ('#f2efe6', 0, 0.4), 'oxy': ('#ff5050', 0, 0.2, 1.8), 'neck': ('#2a7a8a', 0, 0.4), 'gold': ('#c9a24a', 0.9, 0.3)}

def scales(p, f=7.0):
    """A scale pattern for vertex shading: rows of overlapping scales (light centres, dark rims)."""
    x, y, z = p
    u, v = x * f + (math.floor(y * f) % 2) * 0.5, y * f
    du, dv = u - math.floor(u) - 0.5, v - math.floor(v) - 0.3
    d = math.sqrt(du * du + dv * dv * 1.5)
    return 0.62 + 0.38 * max(0.0, 1 - d * 1.4)

def fin_fan(seg, base, tip_dirs, length, mat='fin', w=0.012):
    """A frill: spines from base along tip_dirs, a membrane between neighbours."""
    B = Vector(base)
    tips = [B + Vector(d).normalized() * length * (0.75 + 0.25 * math.sin(i * 1.7)) for i, d in enumerate(tip_dirs)]
    for t in tips:
        add(seg, tube([tuple(B), tuple(t)], [w * 1.6, w * 0.3], 5), 'skinDark')
    bm = bmesh.new()
    vb = bm.verts.new(tuple(B))
    vt = [bm.verts.new(tuple(t)) for t in tips]
    for i in range(len(vt) - 1):
        mid = bm.verts.new(tuple(B.lerp((tips[i] + tips[i + 1]) / 2, 0.82)))
        bm.faces.new((vb, vt[i], mid)); bm.faces.new((vb, mid, vt[i + 1]))
    add(seg, bm, mat, None, [SOLID(0.01, 0)])

# ================================================================ trunk (body group; the pool surface is about y 0)
trunk = lathe([(2.25, -0.2), (2.2, 0.15), (1.85, 0.45), (1.6, 0.9), (1.35, 1.4), (1.0, 1.8), (0.55, 2.05), (0.05, 2.12)], 48, False, True)
for v in trunk.verts:
    n = fbm((v.co.x, v.co.y, v.co.z), 1.2, 2)
    k = 1 + 0.05 * n
    v.co.x *= k; v.co.z *= k
add('hyd_trunk', trunk, 'skin')
# a pale ventral band and dark ridged plates down the back of the dome
for k in range(8):
    a = (k / 8) * PI * 2
    add('hyd_trunk', cyl(0.2, 0.0, 0.85, 6), 'fin', TRS((math.sin(a) * 1.38, 1.35, math.cos(a) * 1.38), (math.cos(a) * 0.5, 0, -math.sin(a) * 0.5)), smooth=False)
    add('hyd_trunk', sphere(0.32, 12, 8), 'skinDark', TRS((math.sin(a) * 1.9, 0.35, math.cos(a) * 1.9), scl=(1, 0.5, 1)))
# three neck roots at 120 degrees (the C's three bonds), scaled collars
for k in range(3):
    a = (k / 3) * PI * 2
    add('hyd_trunk', torus(0.5, 0.12, 24, 8), 'skinDark', TRS((math.sin(a) * 0.8, 1.45, math.cos(a) * 0.8), (math.cos(a) * 0.6, 0, -math.sin(a) * 0.6)))
# the central carbon: a dark gem crowning the dome
add('hyd_trunk', ico(0.35, 1), 'skinDark', TRS((0, 2.15, 0)), smooth=False)

# ================================================================ a head (skull frame, facing +z)
def skull_shape(v):
    x, y, z = v.x, v.y, v.z
    if z > 0:  # draw the snout forward and taper it
        t = z
        x *= 1 - 0.38 * t
        y *= 1 - 0.3 * t
        z *= 1.45
        y -= 0.1 * t
    if y > 0.3 and z < 0.2:  # a high back of the skull
        y *= 1.1
    return (x * 0.46, y * 0.4 + 0.02, z * 0.55)
sk = deform(sphere(1.0, 32, 22), skull_shape)
add('hyd_skull', sk, 'skin')
for s in (-1, 1):
    add('hyd_skull', capsule(0.07, 0.35, 12, 8), 'skinDark', TRS((s * 0.22, 0.27, 0.32), (1.45, 0, s * 0.25)))  # brow ridge
    add('hyd_skull', sphere(0.11, 12, 10), 'skinDark', TRS((s * 0.27, 0.2, 0.4), scl=(1, 0.8, 0.9)))  # eye socket
    add('hyd_skull', sphere(0.085, 14, 10), 'eye', TRS((s * 0.285, 0.205, 0.445), scl=(0.8, 0.75, 0.6)))
    add('hyd_skull', sphere(0.03, 8, 6), 'skinDark', TRS((s * 0.09, 0.02, 0.8), scl=(1, 0.6, 1)))  # nostril
    # frills behind the jaw: a fan of spines with violet membrane
    fin_fan('hyd_skull', (s * 0.33, 0.12, -0.1), [(s * 1, 0.6, -0.6), (s * 1, 0.2, -0.8), (s * 1, -0.2, -0.7), (s * 0.9, -0.5, -0.4)], 0.6)
    # the two back horns
    add('hyd_skull', tube([(s * 0.25, 0.32, -0.15), (s * 0.34, 0.48, -0.38), (s * 0.38, 0.55, -0.62)], [0.07, 0.045, 0.005], 8), 'skinDark')
# crest fin down the middle of the skull
fin_fan('hyd_skull', (0, 0.36, 0.0), [(0, 1, 0.3), (0, 1, -0.2), (0, 0.8, -0.7), (0, 0.4, -1)], 0.5)
# the oxygen on the brow, in a gold setting
add('hyd_skull', torus(0.15, 0.03, 20, 6), 'gold', TRS((0, 0.47, 0.24), (0.6, 0, 0)))
add('hyd_skull', ico(0.15, 2), 'oxy', TRS((0, 0.5, 0.25)), smooth=False)
# upper teeth along the snout
for s in (-1, 1):
    for t in range(5):
        add('hyd_skull', cyl(0.03, 0.0, 0.12, 5), 'tooth', TRS((s * (0.2 - t * 0.025), -0.08, 0.38 + t * 0.12), (PI, 0, 0)))

# lower jaw (jaw frame)
jaw = deform(sphere(1.0, 22, 12), lambda v: (v.x * 0.33 * (1 - 0.3 * max(0, v.z)), v.y * 0.12 - 0.05, v.z * 0.5 + 0.3))
add('hyd_jaw', jaw, 'skinDark')
add('hyd_jaw', deform(sphere(1.0, 16, 8), lambda v: (v.x * 0.26, v.y * 0.06 - 0.12, v.z * 0.4 + 0.28)), 'belly')
for s in (-1, 1):
    for t in range(4):
        add('hyd_jaw', cyl(0.028, 0.0, 0.11, 5), 'tooth', TRS((s * (0.18 - t * 0.025), 0.06, 0.25 + t * 0.14)))

# ================================================================ a neck segment (unit radius)
bd = deform(sphere(1.0, 20, 14), lambda v: (v.x, v.y * 0.95, v.z))
add('hyd_bead', bd, 'neck')
add('hyd_bead', deform(sphere(1.0, 16, 8), lambda v: (v.x * 0.75, v.y * 0.75 - 0.25, v.z * 0.75 + 0.3)), 'belly')
fin_fan('hyd_bead', (0, 0.85, 0), [(0, 1, 0.5), (0, 1, 0), (0, 1, -0.5)], 0.45, w=0.03)

# ---------------------------------------------------------------- build, shade, export
objs = build_objects(MATS, 'hydra', smooth_parts=('hyd_trunk', 'hyd_skull', 'hyd_jaw', 'hyd_bead'))
bake_ao(objs, distance=0.4, samples=24, floor=0.55)
# multiply a scale pattern into the occlusion on the skin
for name in ('hyd_trunk', 'hyd_skull', 'hyd_bead'):
    me = objs[name].data
    attr = me.color_attributes.get('AO')
    for i, v in enumerate(me.vertices):
        a = attr.data[i].color[0] * scales((v.co.x, v.co.z, -v.co.y), 9.0 if name != 'hyd_trunk' else 3.2)
        attr.data[i].color = (a, a, a, 1.0)
export_glb(objs, GLB)
if RENDERS:
    H = TRS((0, 3.2, 2.4), (0, 0, 0))
    pl = [('hyd_trunk', TRS()), ('hyd_skull', H), ('hyd_jaw', H @ TRS((0, -0.12, 0.2), (0.3, 0, 0)))]
    for b in range(7):
        u = (b + 1) / 8
        pl.append(('hyd_bead', TRS((0, 1.5 + 1.8 * math.sin(u * PI * 0.6), 0.6 + u * 1.7), scl=0.42 - b * 0.025)))
    preview(objs, pl, [('hydra.png', (4.5, 3.5, 7), (0, 2.2, 0.8), 38), ('hydra_head.png', (1.5, 3.6, 4.6), (0, 3.2, 2.4), 40)], RENDERS, sky='#14304a', ground='#1f4a5a')
    print('RENDERS', RENDERS)
