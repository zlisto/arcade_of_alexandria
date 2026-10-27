"""The Unbonded Colossus (World 1 boss) for The Legend of Valence, exported to public/models/colossus.glb.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/colossus_blender.py -- <glb_path> <render_dir>

A ball-and-stick giant that has dragged itself out of the cave: glossy atoms in model-kit colours
(C charcoal, O red, N blue, H white) on collared metal bonds, half-encased in shards of the cavern's
faceted crystal-rock. The atom layout is the same as src/actors/ColossusModel.jsx (so the game's sockets,
arms and hit points line up). Parts: col_body (root frame), col_armL / col_armR (shoulder pivot frames
at (-2.1, 5.6, 0) / (2.1, 5.6, 0)). The sockets, loose orbiting atoms, eyes and lightning stay in the game.
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'colossus.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {'C': ('#2b2b31', 0.05, 0.28), 'O': ('#d8403a', 0.05, 0.28), 'N': ('#3f70e2', 0.05, 0.28), 'H': ('#eeeeee', 0.05, 0.28),
        'bond': ('#a7afba', 0.85, 0.28), 'rock': ('#4a6e7a', 0, 0.85), 'rockDark': ('#2c3e48', 0, 0.9), 'vein': ('#a06bff', 0, 0.3, 2.0)}
R = {'C': 0.41, 'O': 0.39, 'N': 0.35, 'H': 0.22}

def cluster(seg, atoms, bonds, sockets, crust=True, seed=0):
    for k, (el, p, sc) in enumerate(atoms):
        r = R[el] * sc
        add(seg, sphere(r, 28, 18), el, TRS(p))
        if crust and el != 'H':
            # shards of cave rock clinging to the atom (never covering more than its back and sides)
            n = 2 + int(hash3(seed, k, 1) * 3)
            for j in range(n):
                a = hash3(seed, k, 10 + j) * 2 * PI
                e = (hash3(seed, k, 20 + j) - 0.3) * 1.2
                d = Vector((math.cos(a) * math.cos(e), math.sin(e), math.sin(a) * math.cos(e) - 0.55)).normalized()
                q = Vector(p) + d * r * 0.82
                add(seg, rock_bm(r * (0.42 + 0.25 * hash3(seed, k, 30 + j)), seed + k * 7 + j, 1, 0.35, 0.8), 'rock' if j % 2 else 'rockDark',
                    Matrix.Translation(q) @ Vector((0, 1, 0)).rotation_difference(d).to_matrix().to_4x4(), smooth=False)
    for (i, j) in bonds:
        a, b = Vector(atoms[i][1]), Vector(atoms[j][1])
        L = (b - a).length
        q = Vector((0, 1, 0)).rotation_difference((b - a).normalized()).to_matrix().to_4x4()
        add(seg, cyl(0.13, 0.13, L, 12, caps=False), 'bond', Matrix.Translation((a + b) / 2) @ q)
        for u in (0.5,):  # a collar at the middle of each bond
            add(seg, torus(0.155, 0.03, 16, 5), 'bond', Matrix.Translation(a.lerp(b, u)) @ q)
    for (i, d) in sockets:  # the stub of each dangling bond (the ring at its end is the game's)
        a = Vector(atoms[i][1])
        dv = Vector(d).normalized()
        r = R[atoms[i][0]] * atoms[i][2]
        end = a + dv * (r + 0.5)
        L = (end - a).length
        q = Vector((0, 1, 0)).rotation_difference(dv).to_matrix().to_4x4()
        add(seg, cyl(0.1, 0.1, L, 10, caps=False), 'bond', Matrix.Translation((a + end) / 2) @ q)
        add(seg, torus(0.12, 0.025, 14, 4), 'vein', Matrix.Translation(a.lerp(end, 0.7)) @ q)  # a violet band: Malradix's mark on every unpaired bond

# ---------------------------------------------------------------- body (same layout as ColossusModel.jsx)
A, B, S = [], [], []
def ad(el, p, sc=1.0):
    A.append([el, p, sc]); return len(A) - 1
hips = []
for sd in (-1, 1):
    foot = ad('C', (sd * 1.15, 0.5, 0.2), 1.15)
    t1 = ad('H', (sd * 0.85, 0.3, 0.85)); t2 = ad('H', (sd * 1.45, 0.3, 0.8))
    ankle = ad('N', (sd * 1.12, 1.25, 0.0))
    knee = ad('O', (sd * 1.15, 2.05, 0.18), 1.1)
    thigh = ad('C', (sd * 1.05, 2.85, -0.05), 1.15)
    B += [(foot, t1), (foot, t2), (foot, ankle), (ankle, knee), (knee, thigh)]
    hips.append(thigh)
    S.append((knee, (sd * 0.6, 0, 1)))
ring = []
for k in range(6):
    a = (k / 6) * PI * 2 + PI / 6
    ring.append(ad('C', (math.cos(a) * 0.95, 3.55 + (0.18 if k % 2 else -0.18), math.sin(a) * 0.75 - 0.05), 0.85))
for k in range(6):
    B.append((ring[k], ring[(k + 1) % 6]))
for h in hips:
    B.append((h, ring[3] if A[h][1][0] < 0 else ring[0]))
sp = [ad('C', (0, 4.3, -0.55)), ad('N', (0, 5.05, -0.6)), ad('C', (0, 5.8, -0.5))]
B += [(ring[4], sp[0]), (sp[0], sp[1]), (sp[1], sp[2])]
for k in range(3):
    for sd in (-1, 1):
        y = 4.35 + k * 0.72
        a = ad('O' if k == 1 else 'C', (sd * 1.2, y, -0.05), 0.75)
        b = ad('C', (sd * 0.95, y - 0.12, 0.62), 0.62)
        B += [(sp[k], a), (a, b)]
        S.append((b, (sd * -0.7, -0.1, 0.8)))
sh = [ad('O', (sd * 1.85, 5.85, -0.05), 1.3) for sd in (-1, 1)]
for s_ in sh:
    B.append((sp[2], s_))
for k, s_ in enumerate(sh):
    S.append((s_, (0.5 if k else -0.5, 1, 0.3)))
neck = ad('N', (0, 6.45, -0.25), 0.9)
head = ad('C', (0, 7.15, 0.05), 1.55)
B += [(sp[2], neck), (neck, head)]
for d in ((-0.5, 0.86, -0.1), (0.5, 0.86, -0.1), (0, 0.6, -0.8)):
    h = ad('H', (d[0] * 1.25, 7.15 + d[1] * 1.25, 0.05 + d[2] * 1.25), 1.0)
    B.append((head, h))
S.append((head, (0, 0.35, 1)))
cluster('col_body', A, B, S, seed=1)
# a heavy rock brow and jaw on the carbon head, leaving the face (and its eyes) open
HP = Vector((0, 7.15, 0.05))
for (off, sc, rot) in (((0, 0.42, 0.38), (0.62, 0.2, 0.32), (-0.3, 0, 0)), ((-0.42, -0.25, 0.4), (0.25, 0.3, 0.25), (0, 0, 0.4)), ((0.42, -0.25, 0.4), (0.25, 0.3, 0.25), (0, 0, -0.4))):
    add('col_body', rock_bm(1.0, sum(off) * 9, 1, 0.3, 1.0), 'rockDark', TRS(tuple(HP + Vector(off)), rot, sc), smooth=False)
# boulder feet round the carbon feet
for sd in (-1, 1):
    add('col_body', rock_bm(0.75, sd * 3.3, 2, 0.3, 0.55), 'rock', TRS((sd * 1.15, 0.28, 0.25), scl=(1.0, 1.0, 1.25)), smooth=False)

# ---------------------------------------------------------------- arms (pivot frames)
for sd, seg in ((-1, 'col_armL'), (1, 'col_armR')):
    a = []
    def aa(el, p, sc=1.0):
        a.append([el, p, sc]); return len(a) - 1
    upper = aa('C', (0, -0.55, 0.1), 1.0)
    elbow = aa('N', (sd * 0.18, -1.45, 0.32), 1.0)
    fore = aa('O', (sd * 0.28, -2.35, 0.58), 1.05)
    fist = aa('C', (sd * 0.35, -3.2, 0.82), 1.3)
    k1 = aa('H', (sd * 0.05, -3.5, 1.2), 1.2); k2 = aa('H', (sd * 0.7, -3.45, 1.15), 1.2); k3 = aa('H', (sd * 0.35, -3.75, 0.5), 1.2)
    cluster(seg, a, [(upper, elbow), (elbow, fore), (fore, fist), (fist, k1), (fist, k2), (fist, k3)], [(fore, (sd, -0.2, 0.3))], seed=sd + 5)
    # a rock gauntlet: boulders round the fist's back
    for j in range(4):
        ang = j / 4 * 2 * PI
        p = Vector((sd * 0.35 + math.cos(ang) * 0.42, -3.2 + math.sin(ang) * 0.42, 0.55))
        add(seg, rock_bm(0.3, sd * 11 + j, 1, 0.35, 0.9), 'rock', TRS(tuple(p)), smooth=False)

# ---------------------------------------------------------------- build, bake, export
objs = build_objects(MATS, 'colossus', smooth_parts=())
for ob in objs.values():  # atoms and bonds smooth, rock faceted
    me = ob.data
    for p in me.polygons:
        p.use_smooth = me.materials[p.material_index].name not in ('rock', 'rockDark')
bake_ao(objs, distance=0.8, samples=32, floor=0.5)
export_glb(objs, GLB)
if RENDERS:
    pl = [('col_body', TRS()), ('col_armL', TRS((-2.1, 5.6, 0), (-0.3, 0, 0))), ('col_armR', TRS((2.1, 5.6, 0), (-0.3, 0, 0)))]
    preview(objs, pl, [('colossus_front.png', (3, 5, 13), (0, 4.2, 0), 38), ('colossus_head.png', (1.5, 7.5, 4.5), (0, 7.0, 0), 40)], RENDERS, sky='#1a2a34', ground='#3a4a52')
    print('RENDERS', RENDERS)
