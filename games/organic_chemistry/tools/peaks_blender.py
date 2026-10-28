"""World 6's landscape and dungeon pieces for The Legend of Valence, exported to public/models/peaks.glb.
Modeled on assets/locations/world-6-activation-peaks.png: snowy mountains whose skyline is an energy diagram —
two sharp peaks with a deep valley between and lower ground beyond — a winding trail, dusk light.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/peaks_blender.py -- <glb_path> <render_dir>

Parts (world frame unless noted):
  pk_ground   the walkable snowfield (y = 0), x −50…50, z −50…50, with rock outcrops near the edges
  pk_range    the mountains round it, and the two-peak skyline to the north (the energy diagram)
  pk_trail    the trail from the west gate to the cave mouth (north)
  pk_hut      Hammond's hut (own frame, door facing +z)
  pk_mouth    the cave mouth in the north cliff (own frame, opening facing +z, 6 m wide)
  c6_wall     a cave wall run 4 m along z, inner face at x = 0 facing +x: icy rock, frost
  c6_spike    an ice stalagmite (own frame)
  c6_boots    the Activation Boots (own frame, a pair, soles at y = 0)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'peaks.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'snow': ('#e8eef6', 0, 0.85), 'snowShade': ('#c0cce0', 0, 0.9), 'rock': ('#6a5a62', 0, 0.9), 'rockDark': ('#4a3e48', 0, 0.9),
    'ice': ('#a8d8f0', 0.1, 0.2), 'trail': ('#9a8a80', 0, 1.0), 'wood': ('#5a3e2a', 0, 0.85), 'woodDark': ('#3a2a1e', 0, 0.9),
    'roof': ('#4a3a40', 0, 0.8), 'window': ('#ffcf7a', 0, 0.3, 2.0), 'leather': ('#c8622a', 0, 0.7), 'sole': ('#2a2a30', 0, 0.8),
    'spring': ('#9aa0b0', 0.85, 0.3), 'glow': ('#ffb04a', 0, 0.2, 2.5),
}

# ================================================================ the snowfield
g = bmesh.new()
bmesh.ops.create_grid(g, x_segments=50, y_segments=50, size=50)
bmesh.ops.rotate(g, verts=g.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-PI / 2, 3, 'X'))
add('pk_ground', g, 'snow', smooth=False)
for i in range(34):
    a = i / 34 * 2 * PI
    r = 40 + 7 * hash3(i, 1, 1)
    x, z = math.sin(a) * r, math.cos(a) * r
    if z < -36 and abs(x) < 10:
        continue
    add('pk_ground', rock_bm(1.0 + 1.6 * hash3(i, 2, 2), i, 2, 0.3, 0.75), 'rock', TRS((x, 0.2, z)), smooth=False)
    add('pk_ground', rock_bm(0.9 + 0.9 * hash3(i, 3, 3), i + 50, 2, 0.25, 0.6), 'snowShade', TRS((x + 0.3, 0.9, z + 0.2), scl=(1, 0.5, 1)), smooth=False)

# ================================================================ the range: rugged walls round the field; to the north, two peaks and a valley
def mountain(x, z, r, h, seed, snowline=0.55, mat='rock'):
    """A rugged peak: a lathe profile, its rings pushed in and out by noise; a snow cap from the snowline up."""
    prof = [(1.0, 0.0), (0.82, 0.18), (0.62, 0.38), (0.45, 0.55), (0.3, 0.7), (0.16, 0.85), (0.0, 1.0)]
    def rough(k):
        def f(v):
            a = math.atan2(v.x, v.z)
            n = 1 + 0.22 * fbm((math.cos(a) * 2 + seed, v.y * 3, math.sin(a) * 2), 1.0, 3) - 0.11
            return (v.x * n * k, v.y, v.z * n * k)
        return f
    add('pk_range', deform(lathe(prof, 18, False, False), rough(1.0)), mat, TRS((x, -1, z), (0, seed, 0), scl=(r, h, r)), smooth=False)
    cap = [(rr, yy) for (rr, yy) in prof if yy >= snowline - 0.05]
    cap = [(prof[[p[1] for p in prof].index(cap[0][1])][0] * 1.0, cap[0][1])] + cap[1:]
    add('pk_range', deform(lathe([(rr * 1.06, yy + 0.01) for rr, yy in cap], 18, False, False), rough(1.0)), 'snow', TRS((x, -1, z), (0, seed, 0), scl=(r, h, r)), smooth=False)
for i in range(22):
    a = i / 22 * 2 * PI
    if math.cos(a) > 0.82:
        continue  # the north is the energy diagram
    r = 70 + 12 * hash3(i, 4, 4)
    mountain(math.sin(a) * r, math.cos(a) * r * -1 if False else -math.cos(a) * r * -1, 18 + 8 * hash3(i, 5, 5), 26 + 22 * hash3(i, 6, 6), i * 0.7)
# the energy-diagram skyline (north): reactants' plateau (west), the first peak (TS1), the valley (intermediate),
# the second, taller peak (TS2), then lower ground (products) to the east
for (x, h, r) in ((-60, 18, 16), (-30, 58, 16), (0, 26, 14), (28, 72, 17), (58, 12, 18)):
    mountain(x, -95, r, h, x * 0.1, 0.5)
# a north cliff behind the cave mouth
add('pk_range', box(46, 16, 6), 'rockDark', TRS((0, 7, -53)), [BEVEL(0.4, 1)], smooth=False)
for k in range(12):
    add('pk_range', rock_bm(2.4 + 1.2 * hash3(k, 7, 7), k + 90, 2, 0.3, 0.8), 'rock', TRS((-22 + k * 4, 2 + 9 * hash3(k, 8, 8), -50.5)), smooth=False)

# ================================================================ the trail: from the west gate to the cave mouth (north)
road, edge = ribbon([(-49, 8), (-30, 12), (-14, 4), (-4, -14), (0, -30), (0, -46)], 1.7, 0.5, 0.02, 7)
add('pk_trail', road, 'trail', smooth=False)
add('pk_trail', edge, 'snowShade', smooth=False)

# ================================================================ Hammond's hut
add('pk_hut', box(4.4, 2.6, 3.6), 'wood', TRS((0, 1.3, 0)), [BEVEL(0.05, 1)])
for k in range(6):
    add('pk_hut', box(4.5, 0.08, 3.7), 'woodDark', TRS((0, 0.3 + k * 0.42, 0)))
roof = bmesh.new()
pts = [(-2.6, 2.6, -2.1), (2.6, 2.6, -2.1), (2.6, 2.6, 2.1), (-2.6, 2.6, 2.1), (0, 4.4, -2.1), (0, 4.4, 2.1)]
vs = [roof.verts.new(p) for p in pts]
for f in ((0, 4, 5, 3), (1, 2, 5, 4), (0, 1, 4), (3, 5, 2)):
    roof.faces.new([vs[i] for i in f])
bmesh.ops.recalc_face_normals(roof, faces=roof.faces)
add('pk_hut', roof, 'roof', None, [SOLID(0.15, 0)], smooth=False)
add('pk_hut', box(5.4, 0.3, 4.4), 'snow', TRS((0, 3.55, 0), (0, 0, 0), scl=(1, 1, 1)), smooth=False)
add('pk_hut', box(1.1, 1.9, 0.12), 'woodDark', TRS((0.6, 0.95, 1.82)), [BEVEL(0.03, 1)])
for x in (-1.3,):
    add('pk_hut', box(0.8, 0.7, 0.1), 'window', TRS((x, 1.5, 1.82)))
add('pk_hut', box(0.7, 2.2, 0.7), 'rockDark', TRS((1.6, 3.6, -0.8)), [BEVEL(0.05, 1)])  # chimney

# ================================================================ the cave mouth
for s in (-1, 1):
    add('pk_mouth', rock_bm(2.4, 30 + s, 2, 0.25, 0.8), 'rock', TRS((s * 4.2, 3.0, 0), scl=(1, 1.5, 1)), smooth=False)
add('pk_mouth', rock_bm(3.6, 33, 2, 0.25, 0.8), 'rock', TRS((0, 7.2, -0.5), scl=(1.6, 0.6, 1)), smooth=False)
for k in range(9):
    add('pk_mouth', cyl(0.18, 0.0, 0.9 + 0.6 * hash3(k, 9, 9), 6), 'ice', TRS((-3 + k * 0.75, 5.6, 1.0), (PI, 0, 0)), smooth=False)

# ================================================================ the cave: an icy rock wall run
add('c6_wall', box(2.0, 8.0, 4.0), 'rockDark', TRS((-1.0, 4.0, 0)))
for k in range(5):
    y = 0.8 + k * 1.5
    add('c6_wall', rock_bm(0.9 + 0.4 * hash3(k, 1, 2), k + 200, 2, 0.3, 0.55), 'rock', TRS((0.1, y, -1.2 + 2.4 * hash3(k, 3, 4)), scl=(0.6, 1, 1.2)), smooth=False)
for k in range(4):
    add('c6_wall', cyl(0.12, 0.0, 0.9 + 0.5 * hash3(k, 5, 6), 6), 'ice', TRS((0.2, 7.4, -1.5 + k), (PI, 0, 0.15)), smooth=False)
add('c6_wall', box(0.3, 0.4, 4.0), 'snow', TRS((0.05, 0.2, 0)))
add('c6_spike', cyl(0.5, 0.0, 2.6, 7), 'ice', TRS((0, 1.3, 0)), smooth=False)
add('c6_spike', cyl(0.3, 0.0, 1.5, 6), 'ice', TRS((0.5, 0.75, 0.2), (0, 0, -0.25)), smooth=False)

# ================================================================ the Activation Boots: orange mountain boots, spring coils in the soles,
# an energy-diagram stitch (a peak and a valley) along each side
for s in (-1, 1):
    add('c6_boots', box(0.16, 0.12, 0.32), 'leather', TRS((s * 0.14, 0.14, 0.05)), [BEVEL(0.04, 2)])
    add('c6_boots', lathe([(0.09, 0.14), (0.1, 0.3), (0.105, 0.36)], 14, False, True), 'leather', TRS((s * 0.14, 0, 0)))
    add('c6_boots', box(0.18, 0.04, 0.34), 'sole', TRS((s * 0.14, 0.06, 0.05)), [BEVEL(0.01, 1)])
    for k in range(3):
        add('c6_boots', torus(0.045, 0.01, 12, 4), 'spring', TRS((s * 0.14, 0.02 + k * 0.012, -0.06 + k * 0.1)))
    stitch = [(0, 0.2), (0.06, 0.28), (0.11, 0.19), (0.17, 0.32), (0.24, 0.18)]
    for i in range(len(stitch) - 1):
        a, b = stitch[i], stitch[i + 1]
        add('c6_boots', tube([(s * 0.222, a[1], -0.09 + a[0]), (s * 0.222, b[1], -0.09 + b[0])], [0.006, 0.006], 4), 'glow')

objs = build_objects(MATS, 'peaks')
BIG = ('pk_ground', 'pk_range', 'pk_trail')
bake_ao({k: v for k, v in objs.items() if k not in BIG}, distance=0.4, samples=24, floor=0.6)
colour_pass(objs['pk_ground'], lambda p: 0.85 + 0.15 * fbm((p[0], 0, p[2]), 0.07, 3))
colour_pass(objs['pk_range'], lambda p: 0.7 + 0.3 * min(1.0, max(0.0, p[1] / 40.0)))
colour_pass(objs['pk_trail'], lambda p: 0.85 + 0.15 * fbm((p[0], 0, p[2]), 0.4, 2))
export_glb(objs, GLB)
if RENDERS:
    pl = [('pk_ground', TRS()), ('pk_range', TRS()), ('pk_trail', TRS()), ('pk_hut', TRS((-14, 0, 14))), ('pk_mouth', TRS((0, 0, -50)))]
    preview(objs, pl, [('peaks_view.png', (0, 6, 40), (0, 14, -60), 38)], RENDERS, sky='#8a90b8', ground=None)
    print('RENDERS', RENDERS)
