"""Sage Aufbau (the old miner in the Orbital Caverns) for The Legend of Valence, exported to
public/models/aufbau.glb. Modeled on assets/characters/sage-aufbau.png.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/aufbau_blender.py -- <glb_path> <render_dir>

Parts (frames match src/actors/AufbauModel.jsx; feet on y = 0, facing +z):
  auf_body   boots, trousers, coat, belt, straps, arms, hands, pickaxe, head, helmet, headlamp, bulb rack
  auf_beard  the great beard and moustache (frame: head (0, 1.18, 0.02) + (0, -0.095, 0)), so it can sway
  auf_eyes   eyes (frame: head + (0, 0.03, 0)), so they can blink
The five bulbs on the rack stay procedural in the game (they light one by one).
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'aufbau.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'leather': ('#6a4a30', 0, 0.75), 'leatherDark': ('#43301f', 0, 0.8), 'cloth': ('#5f6a44', 0, 0.9), 'trousers': ('#2f3a2c', 0, 0.9),
    'skin': ('#d99a7e', 0, 0.6), 'nose': ('#d4806c', 0, 0.6), 'beard': ('#ece8e2', 0, 0.85), 'steel': ('#4a4e56', 0.85, 0.3),
    'brass': ('#b08a4a', 0.85, 0.3), 'wood': ('#5a3c26', 0, 0.8), 'rope': ('#8a7050', 0, 0.9), 'dark': ('#141010', 0, 0.8),
    'eye': ('#f2eee8', 0, 0.3), 'iris': ('#3a5a7a', 0, 0.3), 'crystal': ('#43d8ee', 0.1, 0.15, 2.2), 'bulb': ('#fff3c8', 0, 0.2, 2.0),
}
HEAD = Vector((0, 1.18, 0.02))

def H(p):  # head-frame point -> root frame
    return tuple(HEAD + Vector(p))

# ================================================================ legs and boots
for s in (-1, 1):
    boot = box(0.17, 0.13, 0.3)
    add('auf_body', boot, 'leatherDark', TRS((s * 0.13, 0.065, 0.045)), [BEVEL(0.045, 3)])
    add('auf_body', box(0.18, 0.03, 0.31), 'dark', TRS((s * 0.13, 0.012, 0.045)), [BEVEL(0.01, 1)])  # sole
    add('auf_body', lathe([(0.095, 0.1), (0.105, 0.2), (0.11, 0.26), (0.118, 0.28)], 16, False, True), 'leatherDark', TRS((s * 0.13, 0, 0)))
    add('auf_body', torus(0.112, 0.012, 16, 5), 'leather', TRS((s * 0.13, 0.27, 0)))  # boot cuff
    add('auf_body', capsule(0.092, 0.14, 14, 10), 'trousers', TRS((s * 0.13, 0.38, 0)))

# ================================================================ coat: a stout leather tunic over an olive shirt
coat = lathe([(0.3, 0.36), (0.33, 0.5), (0.33, 0.62), (0.31, 0.72), (0.3, 0.86), (0.28, 0.96), (0.2, 1.03), (0.09, 1.06)], 32, False, False)
for v in coat.verts:  # deepen the barrel, flatten the back a touch, ragged hem
    v.co.z *= 0.86
    if v.co.y < 0.37:
        a = math.atan2(v.co.x, v.co.z)
        v.co.y += 0.03 * (hash3(round(a * 6), 1, 2) - 0.5)
bmesh.ops.delete(coat, geom=[v for v in coat.verts if v.co.y < 0.55 and v.co.z > 0.2 and abs(v.co.x) < 0.06], context='VERTS')  # split at the front
add('auf_body', coat, 'leather', None, [SOLID(0.02, 1)])
add('auf_body', lathe([(0.25, 0.4), (0.27, 0.6), (0.26, 0.9), (0.15, 1.02)], 24, False, False), 'cloth', TRS(scl=(1, 1, 0.84)))
# collar of the olive shirt
add('auf_body', torus(0.11, 0.035, 20, 6), 'cloth', TRS((0, 1.04, 0.0), scl=(1, 0.8, 0.9)))
# belt, buckle and pouches
add('auf_body', torus(0.31, 0.035, 36, 6), 'leatherDark', TRS((0, 0.64, 0), scl=(1, 0.9, 0.87)))
add('auf_body', box(0.1, 0.08, 0.025), 'brass', TRS((0, 0.64, 0.275)), [BEVEL(0.01, 1)])
add('auf_body', box(0.06, 0.04, 0.03), 'leatherDark', TRS((0, 0.64, 0.28)))
for (x, rz) in ((-0.2, 0.5), (0.22, -0.5)):
    add('auf_body', box(0.12, 0.13, 0.07), 'leatherDark', TRS((x, 0.55, 0.22), (0, rz, 0)), [BEVEL(0.02, 2)])
    add('auf_body', box(0.125, 0.05, 0.075), 'leather', TRS((x, 0.6, 0.225), (0.15, rz, 0)), [BEVEL(0.012, 1)])
    add('auf_body', sphere(0.012, 6, 4), 'brass', TRS((x + 0.03 * math.sin(rz), 0.585, 0.26)))
# a strap across the chest, right shoulder to left hip, with a buckle
strap = [(0.24, 1.0, 0.1), (0.15, 0.88, 0.25), (0.0, 0.78, 0.29), (-0.15, 0.7, 0.28), (-0.27, 0.64, 0.17)]
add('auf_body', tube(strap, [0.026] * 5, 4), 'leatherDark', TRS(scl=(1, 1, 1)))
add('auf_body', box(0.05, 0.05, 0.02), 'brass', TRS((0.13, 0.87, 0.27), (0, 0.3, 0.7)))

# ================================================================ arms: olive sleeves, leather bracers, hands round the haft
PICK = TRS((0.02, 0.62, 0.33), (0.0, 0.25, -1.25))  # held level across the belly, head to his left-front (our right)
def on_haft(y):
    return Vector((PICK @ Vector((0, y, 0, 1)))[:3])
grip = {-1: on_haft(-0.32), 1: on_haft(0.2)}
for s in (-1, 1):
    sh = Vector((s * 0.3, 0.98, 0.0))
    hnd = grip[s]
    elbow = Vector((s * 0.36, 0.72, 0.12)) if s < 0 else Vector((s * 0.34, 0.74, 0.14))
    add('auf_body', sphere(0.11, 16, 10), 'leather', TRS(tuple(sh)))  # shoulder
    add('auf_body', tube([tuple(sh), tuple(sh.lerp(elbow, 0.5) + Vector((s * 0.02, 0, 0))), tuple(elbow)], [0.085, 0.08, 0.07], 10), 'cloth')
    add('auf_body', sphere(0.072, 12, 8), 'cloth', TRS(tuple(elbow)))
    fa = [tuple(elbow), tuple(elbow.lerp(hnd, 0.5)), tuple(hnd - (hnd - elbow).normalized() * 0.05)]
    add('auf_body', tube(fa, [0.07, 0.075, 0.068], 10), 'leatherDark')  # bracer
    add('auf_body', torus(0.074, 0.01, 14, 4), 'brass', Matrix.Translation(elbow.lerp(hnd, 0.35)) @ Vector((0, 1, 0)).rotation_difference((hnd - elbow).normalized()).to_matrix().to_4x4())
    # fist round the haft: a palm plus four curled finger rolls
    d = (hnd - elbow).normalized()
    q = Vector((0, 1, 0)).rotation_difference(d).to_matrix().to_4x4()
    add('auf_body', sphere(1.0, 12, 8), 'skin', Matrix.Translation(hnd) @ q @ TRS(scl=(0.055, 0.06, 0.05)))
    for k in range(4):
        add('auf_body', capsule(0.017, 0.04, 8, 6), 'skin', Matrix.Translation(hnd) @ q @ TRS((0.0, 0.035 - k * 0.022, 0.045), (0, 0, PI / 2)))
# a strap with a buckle round the right upper arm (concept)
add('auf_body', torus(0.088, 0.014, 16, 4), 'leatherDark', TRS((0.32, 0.88, 0.02), (0, 0, 0.25)))
add('auf_body', box(0.04, 0.04, 0.02), 'brass', TRS((0.4, 0.87, 0.04), (0, 0.6, 0.25)))

# ================================================================ the crystal pickaxe (in the haft's frame, then placed)
pk = []
add('auf_body', tube([(0, -0.5, 0), (0.004, -0.2, 0.003), (-0.003, 0.15, 0), (0, 0.48, 0)], [0.026, 0.028, 0.027, 0.03], 8), 'wood', PICK)
for (y, r) in ((-0.42, 0.03), (-0.1, 0.031)):
    add('auf_body', sphere(r, 8, 6), 'wood', PICK @ TRS((0.012, y, 0)))
for k in range(6):  # rope wrap at the end of the haft
    add('auf_body', torus(0.031, 0.006, 12, 4), 'rope', PICK @ TRS((0, -0.47 + k * 0.016, 0), (0.15, 0, 0)))
add('auf_body', tube([(0.0, -0.5, 0.02), (0.03, -0.56, 0.05), (0.01, -0.6, 0.06)], [0.006, 0.006, 0.005], 4), 'rope', PICK)
add('auf_body', cyl(0.042, 0.042, 0.11, 8), 'steel', PICK @ TRS((0, 0.5, 0), (0, 0, PI / 2)), [BEVEL(0.006, 1)])
add('auf_body', box(0.06, 0.12, 0.075), 'steel', PICK @ TRS((0, 0.5, 0)), [BEVEL(0.008, 1)])
# the long curved crystal pick (to +x, curving down) and the short back spike
pts, rr = [], []
for i in range(9):
    t = i / 8
    a = t * 0.9
    pts.append((-0.04 - math.sin(a) * 0.34, 0.5 + (1 - math.cos(a)) * -0.18 + 0.04 * (1 - t), 0))
    rr.append(0.05 * (1 - t) + 0.004)
blade = tube(pts, rr, 6)
for v in blade.verts:
    v.co.z *= 0.55
add('auf_body', blade, 'crystal', PICK, smooth=False)
add('auf_body', cyl(0.045, 0.002, 0.15, 6), 'crystal', PICK @ TRS((0.1, 0.5, 0), (0, 0, -PI / 2), scl=(1, 1, 0.6)), smooth=False)

# ================================================================ head (built in head frame, placed at HEAD)
def addh(bm, mat, M=None, mods=(), seg='auf_body', smooth=True):
    add(seg, bm, mat, TRS(tuple(HEAD)) @ (M if M is not None else TRS()), mods, smooth)
face = deform(sphere(1.0, 30, 22), lambda v: head_shape(v, jaw_narrow=0.06, nose=0.06, socket=0.05, brow=0.08, cheek=0.06))
addh(face, 'skin', TRS((0, 0, 0), scl=(0.15, 0.155, 0.15)))
addh(sphere(0.04, 14, 10), 'nose', TRS((0, -0.012, 0.16), scl=(0.85, 0.95, 0.85)))  # a big ruddy nose
for s in (-1, 1):
    addh(sphere(0.03, 10, 8), 'nose', TRS((s * 0.085, -0.025, 0.12), scl=(1, 0.7, 0.45)))  # rosy cheeks
    addh(sphere(0.034, 10, 8), 'skin', TRS((s * 0.15, 0.0, -0.01), scl=(0.42, 1, 0.7)))  # ears
    addh(sphere(0.022, 10, 8), 'dark', TRS((s * 0.05, 0.03, 0.128), scl=(1.2, 0.7, 0.4)))  # eye sockets (shadow)
# bushy brows: white tufts sweeping out
for s in (-1, 1):
    for k in range(5):
        x0 = s * (0.02 + k * 0.016)
        addh(tube([(x0, 0.066, 0.14), (x0 + s * 0.02, 0.078 + 0.004 * k, 0.142), (x0 + s * 0.035, 0.07, 0.13)], [0.012, 0.011, 0.003], 5), 'beard')
# white hair falling from under the helmet at the sides and back, to the shoulders
for i in range(30):
    a = PI / 2 + 0.25 + (i / 29) * (PI * 2 - 0.5 - PI / 2 - 0.25 + PI / 2 - 0.25)
    a = 0.95 + (i / 29) * (2 * PI - 1.9)
    r0 = 0.16
    st = (math.sin(a) * r0, 0.07, math.cos(a) * r0)
    out = Vector((math.sin(a), 0, math.cos(a)))
    L = 0.22 + 0.08 * hash3(i, 2, 3)
    pts = [st, tuple(Vector(st) + out * 0.04 + Vector((0, -0.08, 0))), tuple(Vector(st) + out * 0.06 + Vector((0, -L * 0.75, 0))), tuple(Vector(st) + out * 0.07 + Vector((0, -L, -0.02)))]
    addh(tube(pts, [0.024, 0.026, 0.018, 0.003], 5), 'beard')
# miner's helmet: dome, brim, a ridge, rivets, and the headlamp
addh(hemi(0.175, 28, 12), 'steel', TRS((0, 0.095, -0.005)))
addh(torus(0.19, 0.016, 36, 6), 'steel', TRS((0, 0.1, -0.005), scl=(1, 1, 1.08)))
addh(lathe([(0.205, 0.0), (0.21, 0.012), (0.18, 0.02)], 36, False, False), 'steel', TRS((0, 0.09, -0.005), scl=(1, 1, 1.08)))
addh(torus(0.15, 0.012, 24, 5, -PI / 2, PI / 2), 'steel', TRS((0, 0.09, -0.005), (0, 0, PI / 2), scl=(1, 1.05, 1)))
for k in range(10):
    a = k / 10 * 2 * PI
    addh(sphere(0.009, 6, 4), 'steel', TRS((math.sin(a) * 0.172, 0.11, math.cos(a) * 0.172 - 0.005)))
LAMP = TRS((0.05, 0.16, 0.165), (0.25, 0.15, 0))
addh(cyl(0.05, 0.056, 0.06, 16), 'brass', LAMP @ TRS(rot=(PI / 2, 0, 0)), [BEVEL(0.006, 1)])
addh(torus(0.05, 0.008, 18, 4), 'brass', LAMP @ TRS((0, 0, 0.03), (PI / 2, 0, 0)))
addh(cyl(0.043, 0.043, 0.004, 16), 'bulb', LAMP @ TRS((0, 0, 0.032), (PI / 2, 0, 0)))
# the bulb rack (brass): a post up from the helmet and a cross bar for the three 2p bulbs
RK = Vector((0, 0.3, -0.01))
addh(cyl(0.012, 0.012, 0.44, 6), 'brass', TRS(tuple(RK + Vector((0, 0.0, 0)))))
addh(cyl(0.01, 0.01, 0.34, 6), 'brass', TRS(tuple(RK + Vector((0, 0.25, 0))), (0, 0, PI / 2)))
addh(cyl(0.035, 0.04, 0.03, 10), 'brass', TRS(tuple(RK + Vector((0, -0.22, 0)))))
for (x, y) in ((0, 0.02), (0, 0.17), (-0.15, 0.32), (0, 0.32), (0.15, 0.32)):
    addh(cyl(0.03, 0.035, 0.04, 10), 'brass', TRS(tuple(RK + Vector((x, y - 0.075, 0)))))
for x in (-0.15, 0.15):
    addh(cyl(0.008, 0.008, 0.07, 6), 'brass', TRS(tuple(RK + Vector((x, 0.27, 0)))))

# ================================================================ eyes (frame: head + (0, 0.03, 0))
for s in (-1, 1):
    add('auf_eyes', sphere(0.022, 12, 8), 'eye', TRS((s * 0.05, 0, 0.138), scl=(1, 0.62, 0.5)))
    add('auf_eyes', sphere(0.011, 10, 6), 'iris', TRS((s * 0.05, 0, 0.146), scl=(1, 1, 0.5)))
    add('auf_eyes', sphere(0.005, 6, 4), 'dark', TRS((s * 0.05, 0, 0.1505)))

# ================================================================ the beard (frame: head + (0, -0.095, 0))
RING_Y = -0.39
for i in range(64):
    a = -1.35 + 2.7 * (i / 63) + (rnd() - 0.5) * 0.05
    edge = abs(a) / 1.35
    sy = 0.07 - 0.11 * (1 - edge) + (rnd() - 0.5) * 0.02  # high at the sideburns, low at the chin
    S = Vector((math.sin(a) * 0.15, sy, math.cos(a) * 0.14 - 0.01))
    M1 = Vector((S.x * 1.2, -0.16 - 0.05 * (1 - edge), 0.19 + 0.03 * (1 - edge) + (rnd() - 0.5) * 0.02))
    M2 = Vector((S.x * 0.55, -0.3, 0.27 + (rnd() - 0.5) * 0.02))
    R = Vector((S.x * 0.18, RING_Y, 0.29))
    T = Vector((S.x * 0.5 + (rnd() - 0.5) * 0.04, RING_Y - 0.18 - 0.06 * rnd(), 0.3 + (rnd() - 0.5) * 0.04))
    w = 0.026 + 0.01 * (1 - edge)
    add('auf_beard', tube([tuple(S), tuple(M1), tuple(M2), tuple(R), tuple(T)], [w * 0.8, w * 1.3, w, 0.012, 0.003], 5), 'beard')
# a soft mass under the strands so no gaps show, and the brass ring that gathers it
add('auf_beard', meta([((0, -0.12, 0.15), (0.13, 0.11, 0.06), (0, 0, 0)), ((0, -0.22, 0.2), (0.12, 0.09, 0.05), (0, 0, 0)), ((0, -0.3, 0.24), (0.08, 0.08, 0.04), (0, 0, 0))], 0.03), 'beard')
add('auf_beard', cyl(0.05, 0.045, 0.06, 14), 'brass', TRS((0, RING_Y, 0.29), (0.1, 0, 0)), [BEVEL(0.006, 1)])
# moustache: two heavy curls from under the nose, out and down
for s in (-1, 1):
    for k in range(4):
        y0 = -0.035 - k * 0.006
        add('auf_beard', tube([(s * 0.008, 0.095 + y0, 0.168), (s * 0.05, 0.085 + y0, 0.165), (s * 0.085, 0.06 + y0 - k * 0.004, 0.14), (s * 0.1, 0.02 + y0 - k * 0.01, 0.12)],
                              [0.02, 0.022, 0.015, 0.004], 5), 'beard')

# ---------------------------------------------------------------- build, bake, export
objs = build_objects(MATS, 'aufbau', smooth_parts=('auf_beard',))
bake_ao(objs, distance=0.2, samples=32, floor=0.62)
export_glb(objs, GLB)
if RENDERS:
    pl = [('auf_body', TRS()), ('auf_beard', TRS(tuple(HEAD + Vector((0, -0.095, 0)))) ), ('auf_eyes', TRS(tuple(HEAD + Vector((0, 0.03, 0)))))]
    preview(objs, pl, [('aufbau_front.png', (0.5, 1.0, 3.0), (0, 0.85, 0), 40), ('aufbau_face.png', (0.2, 1.25, 1.0), (0, 1.15, 0), 50),
                       ('aufbau_side.png', (2.6, 1.1, 0.8), (0, 0.85, 0), 40)], RENDERS, sky='#2a3040', ground='#3a3a44')
    print('RENDERS', RENDERS)
