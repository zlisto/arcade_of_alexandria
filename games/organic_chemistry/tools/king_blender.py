"""The Racemic King (World 5's boss) for The Legend of Valence, exported to public/models/king.glb.

A towering king made of two mirror-image halves joined down the middle: the left half gold (R), the right half
silver (S). Each half is the exact reflection of the other: half a crown, half a mask with one eye, one arm with
half a sceptre whose head is a tetrahedral chirality centre. Together they cancel, like a racemate.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/king_blender.py -- <glb_path> <render_dir>

Parts (feet on y = 0, facing +z; each half in the King's frame, so they fit together at x = 0):
  kng_gold    the left half (x < 0)
  kng_silver  the right half (x > 0), the gold half mirrored
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'king.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'gold': ('#d8a840', 0.9, 0.28), 'goldDark': ('#8a6420', 0.9, 0.35), 'goldRobe': ('#a07020', 0.3, 0.6),
    'silver': ('#d8dce8', 0.95, 0.2), 'silverDark': ('#7a8090', 0.9, 0.3), 'silverRobe': ('#9aa4b8', 0.3, 0.6),
    'void': ('#0e0a18', 0, 0.6), 'eyeG': ('#ffcf6a', 0, 0.3, 2.5), 'eyeS': ('#bfe8ff', 0, 0.3, 2.5), 'gemG': ('#ff6a3a', 0.1, 0.2, 1.5), 'gemS': ('#5ab0ff', 0.1, 0.2, 1.5),
}

def half(seg, s, M):
    """Build one half; s = -1 for the left (gold), +1 for the right (silver). M: material names for this half."""
    keep = lambda bm: (bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.x * s < -0.002], context='VERTS'), bm)[1]
    # robe: a long flared gown, cut down the middle
    robe = lathe([(0.5, 2.0), (0.62, 1.6), (0.75, 1.1), (0.95, 0.5), (1.15, 0.02), (1.16, 0.0)], 48, False, False)
    add(seg, keep(robe), M['robe'], None, [SOLID(0.03, 1)])
    for k in range(5):  # gilded hem bands
        y = 0.05 + k * 0.38
        r = 1.15 - k * 0.12
        add(seg, keep(torus(r, 0.025, 48, 6)), M['dark'], TRS((0, y, 0)))
    # breastplate and pauldron
    chest = lathe([(0.5, 1.95), (0.58, 2.2), (0.6, 2.5), (0.5, 2.78), (0.25, 2.9)], 32, False, True)
    for v in chest.verts:
        v.co.z *= 0.75
    add(seg, keep(chest), M['metal'], None)
    add(seg, hemi(0.32, 20, 10), M['metal'], TRS((s * 0.62, 2.72, 0), (0, 0, -s * 0.5), scl=(1.2, 0.8, 1.0)))
    for k in range(3):
        add(seg, cyl(0.06, 0.0, 0.28, 6), M['metal'], TRS((s * (0.6 + k * 0.12), 2.95 - k * 0.07, -0.05 + k * 0.05), (0, 0, -s * (0.5 + k * 0.2))), smooth=False)
    # the arm: down and forward, holding half the sceptre upright
    sh = Vector((s * 0.66, 2.62, 0.0)); el = Vector((s * 0.85, 2.0, 0.25)); hd = Vector((s * 0.7, 1.55, 0.55))
    add(seg, tube([tuple(sh), tuple(sh.lerp(el, 0.5)), tuple(el)], [0.16, 0.15, 0.14], 14), M['robe'])
    add(seg, tube([tuple(el), tuple(el.lerp(hd, 0.5)), tuple(hd)], [0.14, 0.13, 0.12], 14), M['metal'])
    add(seg, sphere(0.15, 14, 10), M['metal'], TRS(tuple(hd)))
    # the sceptre: a shaft with a tetrahedral head (a carbon and four different gems)
    base = hd + Vector((0, -1.2, 0.05)); top = hd + Vector((0, 1.3, 0.05))
    add(seg, tube([tuple(base), tuple(top)], [0.05, 0.05], 10), M['dark'])
    C0 = top + Vector((0, 0.2, 0))
    add(seg, sphere(0.16, 16, 12), M['metal'], TRS(tuple(C0)))
    dirs = [Vector((0, 1, 0)), Vector((0.94, -0.33, 0)), Vector((-0.47, -0.33, 0.82)), Vector((-0.47, -0.33, -0.82))]
    gems = [(M['gem'], 0.11), (M['dark'], 0.09), (M['eye'], 0.08), (M['metal'], 0.07)]
    for d, (mat, r) in zip(dirs, gems):
        d = Vector((d.x * s, d.y, d.z))  # mirrored on the silver side: the other hand
        add(seg, tube([tuple(C0), tuple(C0 + d * 0.32)], [0.025, 0.025], 6), M['dark'])
        add(seg, sphere(r, 12, 10), mat, TRS(tuple(C0 + d * 0.36)))
    # head: half a mask, one eye, half a crown with three points
    head = deform(sphere(1.0, 28, 20), lambda v: (v.x * 0.3, v.y * 0.36, v.z * 0.32))
    add(seg, keep(head), M['metal'], TRS((0, 3.25, 0.05)))
    add(seg, sphere(0.06, 12, 8), M['eye'], TRS((s * 0.12, 3.3, 0.33), scl=(1.4, 0.6, 0.5)))
    add(seg, keep(box(0.6, 0.05, 0.1)), 'void', TRS((0, 3.08, 0.33)))
    add(seg, keep(cyl(0.34, 0.36, 0.2, 32, False)), M['metal'], TRS((0, 3.55, 0.03)), [SOLID(0.03, 0)])
    for k, x in enumerate((0.08, 0.2, 0.31)):
        h = (0.42, 0.32, 0.24)[k]
        add(seg, cyl(0.07, 0.0, h, 4), M['metal'], TRS((s * x, 3.65 + h / 2, 0.03 + 0.31 - x * 0.4)), smooth=False)
        add(seg, sphere(0.05, 10, 8), M['gem'], TRS((s * x, 3.65 + h + 0.03, 0.03 + 0.31 - x * 0.4)))
    # the seam: a dark groove down the middle where the halves meet
    add(seg, keep(box(0.02, 3.9, 0.02)), 'void', TRS((0, 1.95, 0.0)))

half('kng_gold', -1, {'robe': 'goldRobe', 'metal': 'gold', 'dark': 'goldDark', 'eye': 'eyeG', 'gem': 'gemG'})
half('kng_silver', 1, {'robe': 'silverRobe', 'metal': 'silver', 'dark': 'silverDark', 'eye': 'eyeS', 'gem': 'gemS'})

objs = build_objects(MATS, 'king')
bake_ao(objs, distance=0.4, samples=32, floor=0.6)
export_glb(objs, GLB)
if RENDERS:
    pl = [('kng_gold', TRS()), ('kng_silver', TRS()), ('kng_gold', TRS((-3.2, 0, 0))), ('kng_silver', TRS((3.2, 0, 0)))]
    preview(objs, pl, [('king_front.png', (0, 2.6, 9), (0, 2.2, 0), 38), ('king_face.png', (0.6, 3.4, 2.6), (0, 3.3, 0), 45)], RENDERS, sky='#8aa0c0', ground='#4a5060')
    print('RENDERS', RENDERS)
