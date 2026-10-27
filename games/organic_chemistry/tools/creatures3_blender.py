"""World 3 creatures for The Legend of Valence, exported to public/models/creatures3.glb.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/creatures3_blender.py -- <glb_path> <render_dir>

Eclipsed Bat (assets/enemies/eclipsed-bat.png): a maroon fruit bat hanging by its feet, great torn wings
wrapped down round it, violet eyes. Frames match src/actors/EclipsedBats.jsx (hang point at y = 0):
  bat_body    feet, legs and furry body (bat group frame)
  bat_head    the head (its "head" group at (0, -0.78, 0.02)), upside down: ears and chin point down
  bat_wingL / bat_wingR   in the wingL / wingR groups at the bat's origin (the game flaps them)
The Gauche Serpent (butane): four scaled carbon segments, pink CH3 head and tail, joined by sinew bonds.
Frames match src/actors/Serpent.jsx:
  srp_head    the head segment (CH3, r 0.62) with its face, facing +z
  srp_mid     a CH2 segment (r 0.55)
  srp_tail    the tail CH3 segment (r 0.55)
  srp_bond    a bond of unit length along +y, centred (the game stretches it between segments)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'creatures3.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'fur': ('#6a2a3a', 0, 0.85), 'furDark': ('#4a1c2a', 0, 0.9), 'wing': ('#7a3448', 0, 0.6), 'wingSolid': ('#5e2636', 0, 0.6),
    'claw': ('#2a1a1a', 0, 0.5), 'eye': ('#d070ff', 0, 0.3, 3.0), 'hole': ('#140a10', 0, 0.9), 'fang': ('#f2efe6', 0, 0.4),
    'carbon': ('#3e5446', 0.15, 0.45), 'methyl': ('#d0508e', 0.1, 0.4), 'methylDark': ('#a8386e', 0.1, 0.45), 'scale': ('#5a8a64', 0, 0.5), 'h': ('#eef2ee', 0, 0.35),
    'mouth': ('#2a0a12', 0, 0.8), 'bond': ('#cfd8d0', 0.2, 0.45), 'serpEye': ('#ffe060', 0, 0.3, 3.0),
}

def fur_on(bm_src, seg, mat, every=5, length=(0.06, 0.1), width=(0.012, 0.018), sweep=(0, 1, 0), region=None, lift=0.15, seed=0):
    """Tapered fur clumps lying on bm_src's surface, swept toward `sweep`."""
    bm_src.verts.ensure_lookup_table()
    bm_src.normal_update()
    sw = Vector(sweep).normalized()
    for i, v in enumerate(bm_src.verts):
        if i % every:
            continue
        p, n = v.co.copy(), v.normal.copy()
        if region and not region(p, n):
            continue
        L = length[0] + (length[1] - length[0]) * hash3(i, seed, 1)
        w = width[0] + (width[1] - width[0]) * hash3(i, seed, 2)
        d = (n * lift + sw + Vector(((hash3(i, 3, seed) - 0.5) * 0.4, 0, (hash3(i, 4, seed) - 0.5) * 0.4))).normalized()
        tip = p + d * L - n * 0.3 * L
        cl = tube([tuple(p - n * 0.01), tuple(p + d * L * 0.5 + n * 0.006), tuple(tip)], [w, w * 0.7, 0.001], 3)
        for cv in cl.verts:  # flatten each clump against the body
            off = cv.co - p
            cv.co = p + off - n * off.dot(n) * 0.5
        add(seg, cl, mat)

# ================================================================ Eclipsed Bat
body = meta([
    ((0, -0.4, 0.0), (0.17, 0.27, 0.15), (0, 0, 0)),     # body, hanging
    ((0, -0.2, -0.01), (0.12, 0.1, 0.1), (0, 0, 0)),      # hips
    ((0, -0.6, 0.02), (0.15, 0.1, 0.13), (0, 0, 0)),      # chest and shoulders (lowest: it hangs upside down)
], 0.025)
src = body.copy()
add('bat_body', body, 'fur')
src.free()
for s in (-1, 1):  # thin legs up to clawed feet gripping the rod
    add('bat_body', tube([(s * 0.05, -0.18, -0.02), (s * 0.05, -0.08, -0.01), (s * 0.04, -0.02, 0.0)], [0.025, 0.018, 0.015], 6), 'furDark')
    for k in (-1, 0, 1):
        add('bat_body', tube([(s * 0.04 + k * 0.012, -0.02, 0.0), (s * 0.04 + k * 0.012, 0.03, 0.03), (s * 0.04 + k * 0.012, 0.045, 0.0)], [0.007, 0.006, 0.002], 4), 'claw')

# head (head frame; upside down: the crown is at +y toward the body, the chin and ears hang down)
hd = deform(sphere(1.0, 22, 16), lambda v: (v.x * 0.14, v.y * 0.13, v.z * 0.13 + (0.05 * max(0, v.z) * max(0, -v.y))))
add('bat_head', hd, 'fur')
add('bat_head', deform(sphere(1.0, 14, 10), lambda v: (v.x * 0.06, v.y * 0.05, v.z * 0.07)), 'furDark', TRS((0, -0.06, 0.12)))  # snout
add('bat_head', sphere(0.018, 8, 6), 'claw', TRS((0, -0.08, 0.185), scl=(1.4, 0.8, 0.8)))  # nose
for s in (-1, 1):
    ear = cyl(0.06, 0.004, 0.17, 8)
    for v in ear.verts:
        v.co.z *= 0.45
    add('bat_head', ear, 'wingSolid', TRS((s * 0.09, -0.15, 0.0), (0.0, 0, PI + s * 0.35)))
    add('bat_head', sphere(0.028, 10, 8), 'eye', TRS((s * 0.06, -0.01, 0.115), (0, s * 0.3, 0), scl=(1, 0.75, 0.6)))
    add('bat_head', cyl(0.012, 0.0, 0.04, 5), 'fang', TRS((s * 0.03, -0.075, 0.17)))  # fangs (pointing up: it hangs)
add('bat_head', tube([(-0.04, -0.09, 0.165), (0, -0.075, 0.18), (0.04, -0.09, 0.165)], [0.008, 0.01, 0.008], 5), 'mouth')

# wings (wing-group frames at the bat's origin): an arm up past the shoulder to a wrist near the rod,
# long fingers down to the hem; the membrane wraps forward round the body, torn with holes
for seg, s in (('bat_wingL', -1), ('bat_wingR', 1)):
    sh = Vector((s * 0.12, -0.5, -0.02))
    wrist = Vector((s * 0.24, 0.02, -0.05))
    tips = [Vector((s * 0.12, -1.4, 0.16)), Vector((s * 0.3, -1.48, 0.08)), Vector((s * 0.48, -1.22, -0.02)), Vector((s * 0.52, -0.78, -0.08))]
    add(seg, tube([tuple(sh), tuple(sh.lerp(wrist, 0.5) + Vector((s * 0.06, 0, 0))), tuple(wrist)], [0.035, 0.03, 0.025], 6), 'wingSolid')
    add(seg, cyl(0.016, 0.0, 0.09, 5), 'claw', TRS(tuple(wrist + Vector((0, 0.05, 0)))))  # thumb claw
    for t in tips:
        add(seg, tube([tuple(wrist), tuple(wrist.lerp(t, 0.5)), tuple(t)], [0.011, 0.008, 0.003], 5), 'wingSolid')
    # membrane: a fan from the wrist over the fingers, with scalloped hems, plus a panel down to the body
    bm = bmesh.new()
    W = bm.verts.new(tuple(wrist))
    rim = [sh + Vector((0, -0.4, 0.12))]
    for i, t in enumerate(tips):
        rim.append(t)
        if i < len(tips) - 1:
            rim.append(wrist.lerp((t + tips[i + 1]) / 2, 0.82))
    rim.append(wrist + Vector((s * 0.15, -0.3, -0.06)))
    rv = [bm.verts.new(tuple(p)) for p in rim]
    S0 = bm.verts.new(tuple(sh))
    bm.faces.new((W, S0, rv[0]))
    for i in range(len(rv) - 1):
        bm.faces.new((W, rv[i], rv[i + 1]))
    bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=3, use_grid_fill=True)
    for v in bm.verts:  # wrap the membrane forward round the body, more toward the hem
        dy = max(0.0, -(v.co.y - wrist.y))
        v.co.z += 0.18 * dy * (0.5 + abs(v.co.x))
    add(seg, bm, 'wing', None, [SOLID(0.008, 0)])
    for k in range(4):  # holes
        p = wrist.lerp(tips[k % 4], 0.35 + 0.15 * k) + Vector((0, 0, 0.012))
        dy = max(0.0, -(p.y - wrist.y))
        p.z += 0.18 * dy * (0.5 + abs(p.x)) + 0.01
        add(seg, sphere(0.03 + 0.01 * (k % 2), 8, 6), 'hole', TRS(tuple(p), scl=(1, 1.3, 0.25)))

# ================================================================ Gauche Serpent segments
def segment(seg, r, mat, nH, head=False, tail=False, plate_mat='scale'):
    core = deform(sphere(1.0, 30, 20), lambda v: (v.x, v.y * 0.92, v.z * (1.15 if head and v.z > 0 else 1.0)))
    add(seg, core, mat, TRS(scl=r))
    # overlapping scale plates over the back, in rows
    for row in range(5):
        for k in range(16):
            a = (k + 0.5 * (row % 2)) / 16 * 2 * PI
            el = -0.05 + row * 0.27
            n = Vector((math.cos(a) * math.cos(el), math.sin(el), math.sin(a) * math.cos(el)))
            if head and n.z > 0.45 and n.y < 0.7:
                continue  # keep the face clear
            plate = deform(sphere(1.0, 8, 5), lambda v: (v.x, v.y * 0.18, v.z * 0.85))
            q = Vector((0, 1, 0)).rotation_difference(n).to_matrix().to_4x4()
            add(seg, plate, plate_mat, Matrix.Translation(n * r * 0.97) @ q @ TRS(scl=r * 0.16))
    # a dorsal ridge of spines
    for k in range(5):
        a = -0.6 + k * 0.3
        add(seg, cyl(r * 0.12, 0.0, r * 0.5, 5), plate_mat, TRS((0, r * 0.92 * math.cos(a), r * 0.92 * math.sin(a)), (a, 0, 0)), smooth=False)
    # hydrogens on the belly (the white H's of the CH3/CH2), on short stalks
    for k in range(nH):
        a = (k / nH) * PI * 2 + 0.6
        p = Vector((math.cos(a) * r * 0.8, -r * 0.65, math.sin(a) * r * 0.8))
        add(seg, cyl(0.04, 0.04, 0.25, 8), 'bond', Matrix.Translation(p * 0.8) @ Vector((0, 1, 0)).rotation_difference(p.normalized()).to_matrix().to_4x4())
        add(seg, sphere(0.17, 14, 10), 'h', TRS(tuple(p)))
    if head:  # the face: snout, brow plates, slit eyes, fangs, a dark mouth
        add(seg, deform(sphere(1.0, 20, 14), lambda v: (v.x * 0.38, v.y * 0.24 - 0.08, v.z * 0.36 + 0.42)), mat)
        for s in (-1, 1):
            add(seg, capsule(0.055, 0.14, 10, 8), plate_mat, TRS((s * 0.24, 0.33, 0.58), (0, s * -0.55, PI / 2 + s * 0.25)))  # brow ridge
            add(seg, sphere(0.1, 14, 10), 'mouth', TRS((s * 0.25, 0.2, 0.59), (0, s * 0.5, 0), scl=(1.0, 0.7, 0.5)))  # socket
            add(seg, sphere(0.09, 14, 10), 'serpEye', TRS((s * 0.255, 0.2, 0.63), (0, s * 0.5, s * 0.2), scl=(1.0, 0.5, 0.45)))
            add(seg, cyl(0.05, 0.0, 0.24, 6), 'fang', TRS((s * 0.16, -0.3, 0.6), (0.3, 0, PI)))
            add(seg, sphere(0.025, 8, 6), 'mouth', TRS((s * 0.08, -0.02, 0.8)))  # nostrils
        add(seg, deform(sphere(1.0, 16, 10), lambda v: (v.x * 0.26, v.y * 0.06 - 0.16, v.z * 0.25 + 0.6)), 'mouth')
    if tail:  # a spiked rattle at the end
        for k in range(3):
            add(seg, cyl(0.12 - k * 0.03, 0.0, 0.35, 6), 'scale', TRS((0, 0.1 - k * 0.05, -r - 0.1 - k * 0.14), (-PI / 2 + 0.3, 0, 0)), smooth=False)

segment('srp_head', 0.62, 'methyl', 3, head=True, plate_mat='methylDark')
segment('srp_mid', 0.55, 'carbon', 2)
segment('srp_tail', 0.55, 'methyl', 3, tail=True, plate_mat='methylDark')
# the bond: a sinew of unit length along y, ribbed (the game stretches it between segments)
add('srp_bond', cyl(0.3, 0.3, 1.0, 16, caps=False), 'bond')
for k in range(5):
    add('srp_bond', torus(0.3, 0.035, 20, 5), 'scale', TRS((0, -0.4 + k * 0.2, 0)))

# ---------------------------------------------------------------- build, bake, export
objs = build_objects(MATS, 'creatures3', smooth_parts=('bat_body', 'bat_head', 'srp_bond'))
bake_ao(objs, distance=0.3, samples=24, floor=0.55)
export_glb(objs, GLB)
if RENDERS:
    pl = []
    for (x, ry) in ((-0.3, PI / 2), (0.3, -PI / 2)):
        B = TRS((x, 2.8, 0), (0, ry, 0))
        pl += [('bat_body', B), ('bat_head', B @ TRS((0, -0.78, 0.02))), ('bat_wingL', B), ('bat_wingR', B)]
    S = [(-3, 0.75, 1.5), (-1.6, 0.7, 1.0), (-0.2, 0.7, 0.6), (1.2, 0.7, 0.2)]
    pl += [('srp_head', TRS(S[0], (0, -1.2, 0))), ('srp_mid', TRS(S[1])), ('srp_mid', TRS(S[2])), ('srp_tail', TRS(S[3], (0, -1.6, 0)))]
    for k in range(3):
        a, b = Vector(S[k]), Vector(S[k + 1])
        q = Vector((0, 1, 0)).rotation_difference((b - a).normalized()).to_matrix().to_4x4()
        pl.append(('srp_bond', Matrix.Translation((a + b) / 2) @ q @ TRS(scl=(1, (b - a).length, 1))))
    preview(objs, pl, [('bats.png', (3.6, 2.0, 1.6), (0, 1.9, 0), 35), ('serpent.png', (-0.5, 2.2, 5.5), (-0.8, 0.7, 0.8), 40), ('serpent_head.png', (-4.6, 1.3, 2.4), (-3, 0.8, 1.5), 40)],
            RENDERS, sky='#1c2a22', ground='#2e3a30')
    print('RENDERS', RENDERS)
