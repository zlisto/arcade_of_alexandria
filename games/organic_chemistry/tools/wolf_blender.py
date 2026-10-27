"""The Radical Wolf for The Legend of Valence: a metaball-sculpted body, legs and tail covered in fur
clumps, exported to public/models/wolf.glb (parts: wolf_body, wolf_tail, wolf_fore, wolf_hind) plus
preview renders.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/wolf_blender.py -- <glb_path> <render_dir>

Frames match src/actors/WolfModel.jsx: the body in the wolf's root frame (feet on y = 0, facing +z);
the tail in its group at (0, 0.78, -0.7); each leg in its pivot at y 0.66 (paw sole at local y -0.66).
Materials are named after the game's (fur, furDark, nose, eye); the game swaps in its own.
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa
from mathutils import Quaternion

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'wolf.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {'fur': ('#2e2242', 0, 0.85), 'furDark': ('#1c1428', 0, 0.9), 'nose': ('#0d0a14', 0, 0.4), 'eye': ('#f0d2ff', 0, 0.3, 4.0)}

_mb_count = [0]
def meta(elements, res=0.035, threshold=0.6):
    """Blend ellipsoids [(center, (rx, ry, rz), (rotx, roty, rotz))] (game coords) into one smooth mesh (bmesh, game coords)."""
    _mb_count[0] += 1
    name = 'mb%dx' % _mb_count[0]  # a unique family name so separate parts never melt together
    mb = bpy.data.metaballs.new(name)
    mb.resolution = res
    mb.render_resolution = res
    mb.threshold = threshold
    ob = bpy.data.objects.new(name, mb)
    bpy.context.scene.collection.objects.link(ob)
    for (c, r, rot) in elements:
        el = mb.elements.new(type='ELLIPSOID')
        el.co = C @ Vector(c)
        el.radius = 1.0
        k = 1.745  # at threshold 0.6 / stiffness 2 a metaball surface sits at 0.573 of its size
        el.size_x, el.size_y, el.size_z = r[0] * k, r[2] * k, r[1] * k  # game (x, y, z) radii -> Blender (x, -z, y)
        q = (C @ R3(*rot) @ Ci).to_quaternion()
        el.rotation = q
        el.stiffness = 2.0
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    bpy.data.metaballs.remove(mb)
    me.transform(Ci)
    bm = bmesh.new()
    bm.from_mesh(me)
    bpy.data.meshes.remove(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.002)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

_r = [12345]
def rnd():
    _r[0] = (_r[0] * 16807) % 2147483647
    return _r[0] / 2147483647

def fur_on(bm_src, seg, mat, every=7, length=(0.1, 0.18), width=(0.028, 0.04), sweep=(0, -0.2, -1.0), region=None, M=None, lift=0.18):
    """Plant tapered fur clumps on the surface of bm_src (game coords), swept toward `sweep`."""
    bm_src.verts.ensure_lookup_table()
    bm_src.normal_update()
    swf = sweep if callable(sweep) else (lambda p, _s=Vector(sweep).normalized(): _s)
    for i, v in enumerate(bm_src.verts):
        if i % every:
            continue
        p, n = v.co.copy(), v.normal.copy()
        if region and not region(p, n):
            continue
        L = length[0] + (length[1] - length[0]) * rnd()
        w = width[0] + (width[1] - width[0]) * rnd()
        d = (n * lift + swf(p) * 0.9 + Vector(((rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.2, 0))).normalized()
        L *= 0.7 + 0.6 * rnd()  # varied lengths
        q1 = p + d * L * 0.35 + n * 0.02
        q2 = p + d * L * 0.7 + n * 0.012 - Vector((0, 0.02 * L, 0))
        tip = p + d * L - n * (0.5 * lift * L + 0.02 * L) + Vector((0, -0.06 * L, 0))  # the lock arcs and curls back toward the body
        cl = tube([tuple(p - n * 0.015), tuple(q1), tuple(q2), tuple(tip)], [w, w * 0.8, w * 0.5, 0.002], 3)
        for cv in cl.verts:  # flatten the clump against the body so it lies like fur
            off = cv.co - p
            cv.co = p + off - n * off.dot(n) * 0.4
        add(seg, cl, mat, M)

# ================================================================ body (root frame)
BODY = [
    ((0, 0.84, 0.3), (0.25, 0.3, 0.3), (0, 0, 0)),        # chest and shoulder hump
    ((0, 0.8, 0.0), (0.23, 0.25, 0.34), (0, 0, 0)),       # ribs and back
    ((0, 0.77, -0.32), (0.15, 0.17, 0.25), (0, 0, 0)),    # waist
    ((0, 0.76, -0.56), (0.22, 0.25, 0.22), (0, 0, 0)),    # haunches
    ((0, 0.6, 0.32), (0.17, 0.16, 0.2), (0, 0, 0)),       # brisket
    ((0, 0.86, 0.56), (0.15, 0.19, 0.18), (-0.9, 0, 0)),  # neck, reaching forward and down
    ((0, 0.9, 0.74), (0.13, 0.12, 0.15), (0, 0, 0)),      # skull
    ((0, 0.86, 0.96), (0.065, 0.058, 0.2), (0.2, 0, 0)),  # long muzzle
    ((0, 0.81, 0.92), (0.055, 0.035, 0.16), (0.18, 0, 0)),  # jaw
    ((0, 0.955, 0.8), (0.11, 0.035, 0.07), (0.15, 0, 0)), # hard brow ridge
]
body = meta(BODY, 0.05)
# keep a copy to plant fur on, then add the smooth body itself
fur_src = body.copy()
add('wolf_body', body, 'fur')
# ruff: big clumps round the neck and shoulders, swept back and out
fur_on(fur_src, 'wolf_body', 'furDark', every=7, length=(0.1, 0.16), width=(0.02, 0.03), sweep=(0, -0.2, -1), lift=0.05,
       region=lambda p, n: -0.7 < p.z < 0.6)  # a dark under-layer so the locks read as depth
fur_on(fur_src, 'wolf_body', 'fur', every=3, length=(0.2, 0.3), width=(0.03, 0.04), sweep=(0, -0.35, -1), lift=0.25,
       region=lambda p, n: 0.3 < p.z < 0.64 and p.y > 0.6)
# back and flanks: shorter clumps, swept back; shaggy belly hangs down
fur_on(fur_src, 'wolf_body', 'fur', every=7, length=(0.15, 0.24), width=(0.026, 0.036), sweep=(0, -0.15, -1), lift=0.1,
       region=lambda p, n: -0.75 < p.z < 0.32 and n.y > -0.3)
fur_on(fur_src, 'wolf_body', 'fur', every=7, length=(0.13, 0.2), width=(0.026, 0.034), sweep=(0, -1, -0.4), lift=0.12,
       region=lambda p, n: -0.6 < p.z < 0.4 and n.y <= -0.3)
# cheek fur
fur_on(fur_src, 'wolf_body', 'fur', every=4, length=(0.1, 0.16), width=(0.016, 0.024), sweep=(0, -0.3, -1), lift=0.3,
       region=lambda p, n: 0.66 < p.z < 0.84 and p.y < 0.92 and abs(n.x) > 0.5)
fur_src.free()
# ears: tall, pointed, with dark insides
for s in (-1, 1):
    ear = cyl(0.08, 0.004, 0.27, 6)
    add('wolf_body', ear, 'fur', TRS((s * 0.085, 1.07, 0.67), (0.35, 0, -s * 0.28), scl=(1, 1, 0.55)))
    add('wolf_body', cyl(0.05, 0.003, 0.2, 6), 'furDark', TRS((s * 0.085, 1.06, 0.69), (0.35, 0, -s * 0.28), scl=(1, 1, 0.3)))
# nose, eye sockets, glowing eyes
add('wolf_body', sphere(0.026, 12, 8), 'nose', TRS((0, 0.865, 1.16), scl=(1.15, 0.8, 0.9)))
for s in (-1, 1):
    add('wolf_body', sphere(0.05, 10, 8), 'furDark', TRS((s * 0.068, 0.915, 0.84), (0, s * 0.45, s * 0.35), scl=(1.1, 0.45, 0.6)))
    add('wolf_body', sphere(0.045, 10, 8), 'eye', TRS((s * 0.07, 0.918, 0.858), (0, s * 0.45, s * 0.35), scl=(1, 0.32, 0.42)))  # angled slits
# a darker belly shadow
add('wolf_body', sphere(1.0, 14, 8), 'furDark', TRS((0, 0.52, -0.02), scl=(0.17, 0.08, 0.42)))

# ================================================================ tail (tail-group frame), bushy and curling up
TP = [(0, 0, 0), (0, 0.08, -0.22), (0, 0.26, -0.42), (0, 0.5, -0.5), (0, 0.66, -0.42)]
tail_el = []
for i in range(len(TP)):
    t = i / (len(TP) - 1)
    r = 0.07 + math.sin(t * PI) * 0.1
    tail_el.append((TP[i], (r, r * 1.3, r * 1.2), (0, 0, 0)))
tail_el.append(((0, 0.38, -0.47), (0.15, 0.18, 0.14), (0, 0, 0)))
tail = meta(tail_el, 0.05)
tsrc = tail.copy()
add('wolf_tail', tail, 'fur')
TIP = Vector((0, 0.86, -0.28))
fur_on(tsrc, 'wolf_tail', 'fur', every=4, length=(0.16, 0.24), width=(0.028, 0.038), sweep=lambda p: (TIP - p).normalized(), lift=0.12)
tsrc.free()
add('wolf_tail', tube([(0, 0.66, -0.42), (0, 0.76, -0.36), (0, 0.82, -0.3)], [0.06, 0.035, 0.002], 6), 'fur')

# ================================================================ legs (pivot frames)
fore = meta([
    ((0, -0.06, 0.0), (0.1, 0.17, 0.11), (0, 0, 0)),
    ((0, -0.36, 0.03), (0.055, 0.2, 0.06), (0, 0, 0)),
    ((0, -0.53, 0.04), (0.05, 0.09, 0.055), (0, 0, 0)),
    ((0, -0.6, 0.06), (0.065, 0.05, 0.1), (0, 0, 0)),
], 0.035)
fsrc = fore.copy()
add('wolf_fore', fore, 'furDark')
fur_on(fsrc, 'wolf_fore', 'furDark', every=5, length=(0.1, 0.16), width=(0.02, 0.028), sweep=(0, -0.8, -0.6), region=lambda p, n: p.y > -0.34, lift=0.15)
fsrc.free()
hind = meta([
    ((0, -0.08, -0.02), (0.1, 0.23, 0.17), (0, 0, 0)),
    ((0, -0.3, -0.12), (0.06, 0.15, 0.07), (-0.5, 0, 0)),
    ((0, -0.5, -0.08), (0.045, 0.14, 0.05), (0.35, 0, 0)),
    ((0, -0.56, -0.02), (0.045, 0.08, 0.05), (0, 0, 0)),
    ((0, -0.61, 0.015), (0.065, 0.05, 0.1), (0, 0, 0)),
], 0.035)
hsrc = hind.copy()
add('wolf_hind', hind, 'furDark')
fur_on(hsrc, 'wolf_hind', 'furDark', every=5, length=(0.12, 0.18), width=(0.02, 0.028), sweep=(0, -0.6, -1), region=lambda p, n: p.y > -0.3, lift=0.15)
hsrc.free()
for part in ('wolf_fore', 'wolf_hind'):  # toes
    for k in (-1, 0, 1):
        add(part, sphere(0.02, 6, 4), 'furDark', TRS((k * 0.032, -0.62, 0.13 if part == 'wolf_fore' else 0.085), scl=(1, 0.7, 1.2)))

# ---------------------------------------------------------------- build, export, preview
objs = build_objects(MATS, 'wolf', smooth_parts=('wolf_body', 'wolf_tail', 'wolf_fore', 'wolf_hind'))
export_glb(objs, GLB)
if RENDERS:
    legs = [((-0.16, 0.66, 0.38), 'wolf_fore', 0.3), ((0.16, 0.66, 0.38), 'wolf_fore', -0.3), ((-0.15, 0.66, -0.48), 'wolf_hind', -0.3), ((0.15, 0.66, -0.48), 'wolf_hind', 0.3)]
    pl = [('wolf_body', TRS()), ('wolf_tail', TRS((0, 0.78, -0.7), (-0.1, 0, 0)))]
    for (p, n, sw) in legs:
        pl.append((n, TRS(p, (sw, 0, 0))))
    preview(objs, pl, [('wolf_three_quarter.png', (2.4, 1.4, 2.6), (0, 0.7, 0), 40), ('wolf_side.png', (3.4, 0.9, 0.1), (0, 0.7, 0), 40),
                       ('wolf_head.png', (0.9, 1.15, 1.9), (0, 0.95, 0.8), 55)], RENDERS, sky='#1a1830', ground='#2a2a3a')
    print('RENDERS', RENDERS)
