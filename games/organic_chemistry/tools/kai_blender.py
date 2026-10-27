"""Build Kai for The Legend of Valence in Blender, export public/models/kai.glb, and render previews.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/kai_blender.py -- <glb_path> <render_dir>

How it fits the game: Kai is a jointed suit of armour. Each part (torso, head, upper arm, forearm,
thigh, shin, shield, sword ...) is built in the local frame of the matching joint group in
src/actors/KaiModel.jsx, so the game's pose code moves the new parts exactly as it moved the old
ones. Material names (armor, armorDark, edge, glow ...) match the game's material set, so the game
swaps in its own lit materials (hybrid-form colours, rim light) at load time.

All coordinates below are in the GAME's frame (three.js: +y up, Kai faces +z, metres). The script
converts to Blender's frame (z up) at the end of each piece.
"""
import bpy, bmesh, math, sys, os
from mathutils import Matrix, Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'kai.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

PI = math.pi
C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))  # game -> Blender
Ci = C.inverted()

# ---------------------------------------------------------------- transforms (three.js conventions)
def R3(rx=0.0, ry=0.0, rz=0.0):
    # three.js Euler 'XYZ' = Rx * Ry * Rz
    return Matrix.Rotation(rx, 4, 'X') @ Matrix.Rotation(ry, 4, 'Y') @ Matrix.Rotation(rz, 4, 'Z')

def TRS(pos=(0, 0, 0), rot=(0, 0, 0), scl=1.0):
    if isinstance(scl, (int, float)):
        scl = (scl, scl, scl)
    return Matrix.Translation(Vector(pos)) @ R3(*rot) @ Matrix.Diagonal((scl[0], scl[1], scl[2], 1.0))

# ---------------------------------------------------------------- primitives (game coords, axis +y)
def _to_y(bm):
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-PI / 2, 3, 'X'))  # +z -> +y
    return bm

def cyl(r_bot, r_top, h, seg=24, caps=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=caps, cap_tris=False, segments=seg, radius1=r_bot, radius2=r_top, depth=h)
    return _to_y(bm)

def sphere(r, u=24, v=16):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=r)
    return _to_y(bm)

def hemi(r, u=24, v=16):
    bm = sphere(r, u, v)
    bmesh.ops.delete(bm, geom=[x for x in bm.verts if x.co.y < -1e-5], context='VERTS')
    return bm

def box(w, h, d):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(w, h, d), verts=bm.verts)
    return bm

def capsule(r, length, u=16, v=12):
    bm = sphere(r, u, v)
    for x in bm.verts:
        x.co.y += (length / 2) * (1 if x.co.y > 0 else -1)
    return bm

def torus(R, r, n=32, m=8, a0=0.0, a1=2 * PI):
    """Ring around the +y axis (lying in the xz plane)."""
    bm = bmesh.new()
    full = abs(a1 - a0 - 2 * PI) < 1e-6
    count = n if full else n + 1
    rings = []
    for i in range(count):
        a = a0 + (a1 - a0) * i / n
        ring = []
        for j in range(m):
            b = 2 * PI * j / m
            rr = R + r * math.cos(b)
            ring.append(bm.verts.new((rr * math.sin(a), r * math.sin(b), rr * math.cos(a))))
        rings.append(ring)
    for i in range(count if full else count - 1):
        r0, r1 = rings[i], rings[(i + 1) % count]
        for j in range(m):
            bm.faces.new((r0[j], r1[j], r1[(j + 1) % m], r0[(j + 1) % m]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def lathe(profile, seg=28, close_bottom=True, close_top=True):
    """profile: [(radius, y)] bottom to top, revolved around +y."""
    bm = bmesh.new()
    rings = []
    for (r, y) in profile:
        rings.append([bm.verts.new((r * math.sin(2 * PI * k / seg), y, r * math.cos(2 * PI * k / seg))) for k in range(seg)])
    for i in range(len(rings) - 1):
        for k in range(seg):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    if close_bottom:
        bm.faces.new(list(reversed(rings[0])))
    if close_top:
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def arc_sheet(rx, rz, y0, h, a0, a1, n=18, rows=2, taper=0.0):
    """A strip of an elliptical cylinder (angle 0 = front, +z). Thickness comes from a SOLIDIFY modifier."""
    bm = bmesh.new()
    grid = []
    for j in range(rows + 1):
        y = y0 + h * j / rows
        k = 1 - taper * (j / rows)
        grid.append([bm.verts.new((rx * k * math.sin(a0 + (a1 - a0) * i / n), y, rz * k * math.cos(a0 + (a1 - a0) * i / n))) for i in range(n + 1)])
    for j in range(rows):
        for i in range(n):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    return bm

def poly_sheet(poly, cuts=3):
    """A flat polygon (x, y) in the z=0 plane, filled and subdivided so it can be bent."""
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, 0)) for (x, y) in poly]
    bm.faces.new(vs)
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method='BEAUTY', ngon_method='BEAUTY')
    bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=cuts, use_grid_fill=True)
    return bm

def tube(points, radii, m=8, cap=True):
    """A tapered tube through points (game coords) with parallel-transported rings."""
    bm = bmesh.new()
    pts = [Vector(p) for p in points]
    rings = []
    prev_n = None
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        if prev_n is None:
            a = Vector((0, 1, 0)) if abs(t.y) < 0.9 else Vector((1, 0, 0))
            nrm = t.cross(a).normalized()
        else:
            nrm = (prev_n - t * prev_n.dot(t)).normalized()
        prev_n = nrm
        bi = t.cross(nrm).normalized()
        r = radii[i]
        rings.append([bm.verts.new(p + (nrm * math.cos(2 * PI * j / m) + bi * math.sin(2 * PI * j / m)) * r) for j in range(m)])
    for i in range(len(rings) - 1):
        for j in range(m):
            bm.faces.new((rings[i][j], rings[i][(j + 1) % m], rings[i + 1][(j + 1) % m], rings[i + 1][j]))
    if cap:
        bm.faces.new(list(reversed(rings[0])))
        if radii[-1] > 1e-5:
            bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def deform(bm, fn):
    for x in bm.verts:
        x.co = Vector(fn(Vector(x.co)))
    return bm

# ---------------------------------------------------------------- parts
SEGS = {}

def add(seg, bm, mat, M=None, mods=(), smooth=True):
    """Append one piece (bmesh in game coords) to a part, with material and optional modifiers."""
    S = SEGS.setdefault(seg, {'bm': bmesh.new(), 'mats': []})
    if M is not None:
        bm.transform(M)
    me = bpy.data.meshes.new('piece')
    bm.to_mesh(me)
    bm.free()
    me.transform(C)
    if mods:
        ob = bpy.data.objects.new('piece', me)
        bpy.context.scene.collection.objects.link(ob)
        for kind, kw in mods:
            md = ob.modifiers.new(kind, kind)
            for k, v in kw.items():
                setattr(md, k, v)
        dg = bpy.context.evaluated_depsgraph_get()
        me2 = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
        bpy.data.objects.remove(ob)
        bpy.data.meshes.remove(me)
    else:
        me2 = me
    if mat not in S['mats']:
        S['mats'].append(mat)
    idx = S['mats'].index(mat)
    for p in me2.polygons:
        p.material_index = idx
        p.use_smooth = smooth
    S['bm'].from_mesh(me2)
    bpy.data.meshes.remove(me2)

# thin bevels get one segment (they only need to catch light); chunky rounded parts keep theirs
BEVEL = lambda w=0.004, s=2: ('BEVEL', {'width': w, 'segments': s if w >= 0.01 else 1, 'limit_method': 'ANGLE', 'angle_limit': math.radians(35)})
SOLID = lambda t=0.01, off=0.0: ('SOLIDIFY', {'thickness': t, 'offset': off, 'use_even_offset': True})
SUB = lambda n=1: ('SUBSURF', {'levels': n, 'render_levels': n})

# torso radius at height h above its base (the lathe profile the shell is built from)
TORSO = [(0.16, 0), (0.175, 0.06), (0.2, 0.2), (0.235, 0.34), (0.25, 0.44), (0.228, 0.52), (0.155, 0.585), (0.09, 0.61)]
def torso_r(h):
    for (r0, y0), (r1, y1) in zip(TORSO, TORSO[1:]):
        if y0 <= h <= y1:
            return r0 + (r1 - r0) * (h - y0) / (y1 - y0)
    return TORSO[-1][0]
TZ = 0.74  # torso is elliptical: depth / width

# ================================================================ hips, belt, tassets
add('hips', cyl(0.152, 0.168, 0.15, 28), 'under', TRS((0, 0.86, 0), scl=(1, 1, 0.78)), [BEVEL(0.01, 2)])
add('hips', cyl(0.19, 0.19, 0.068, 32), 'leather', TRS((0, 0.94, 0), scl=(1, 1, 0.77)), [BEVEL(0.006, 2)])
for y in (0.906, 0.974):
    add('hips', torus(0.191, 0.0055, 40, 6), 'edge', TRS((0, y, 0), scl=(1, 1, 0.77)))
# buckle: a round boss with a glowing core (concept art)
add('hips', cyl(0.046, 0.046, 0.022, 24), 'edge', TRS((0, 0.94, 0.15), (PI / 2, 0, 0)), [BEVEL(0.005, 2)])
add('hips', torus(0.04, 0.007, 24, 6), 'armorDark', TRS((0, 0.94, 0.163), (PI / 2, 0, 0)))
add('hips', sphere(0.028, 16, 10), 'glow', TRS((0, 0.94, 0.162), scl=(1, 1, 0.55)))
# tassets: two layered plates over each hip
for s in (-1, 1):
    for k, (y0, h, sc) in enumerate(((0.80, 0.11, 1.0), (0.72, 0.1, 1.04))):
        a0, a1 = (0.55, 1.55) if s > 0 else (-1.55, -0.55)
        add('hips', arc_sheet(0.21 * sc, 0.17 * sc, y0, h, a0, a1, 14, 2, taper=-0.06), 'armor' if k == 0 else 'armorDark', None,
            [SOLID(0.012), BEVEL(0.004, 2)])

# coat panels (each in its own frame: hung from the belt, swinging about the top edge)
PANELS = [(-0.085, 0.13, 1), (0.085, 0.13, 1), (-0.09, -0.13, -1), (0.09, -0.13, -1)]
for i, (x, z, f) in enumerate(PANELS):
    seg = 'panel%d' % i
    side = -1 if x < 0 else 1
    bend = lambda v, f=f: (v.x, v.y, v.z - f * 1.6 * v.x * v.x)
    b = box(0.17 if f > 0 else 0.14, 0.42, 0.016)
    deform(b, lambda v: (v.x, v.y, v.z))
    for vv in b.verts:
        vv.co.x *= 1 + 0.18 * max(0, -(vv.co.y + 0.0) / 0.21)  # flares a little toward the hem
    add(seg, deform(b, bend), 'cloth' if f > 0 else 'armorDark', TRS((0, -0.21, 0)), [BEVEL(0.005, 2)])
    add(seg, deform(box(0.014, 0.41, 0.008), bend), 'edge', TRS((side * 0.084, -0.21, f * 0.011)), [BEVEL(0.002, 1)])
    add(seg, deform(box(0.19, 0.016, 0.008), bend), 'edge', TRS((side * 0.006, -0.41, f * 0.011)), [BEVEL(0.002, 1)])

# ================================================================ torso
add('torso', lathe(TORSO, 32), 'armorDark', TRS((0, 0.95, 0), scl=(1, 1, TZ)))
# chest plate: the V chevron of the concept art, curved round the chest
CHEV = [(-0.19, 0.42), (0.19, 0.42), (0.226, 0.22), (0.13, 0.03), (0, -0.055), (-0.13, 0.03), (-0.226, 0.22)]
plate = poly_sheet(CHEV, 3)
deform(plate, lambda v: (v.x, v.y, -1.25 * v.x * v.x - 0.07 * v.y))
add('torso', plate, 'armor', TRS((0, 1.02, 0.163)), [SOLID(0.026, 1.0), BEVEL(0.006, 2)])
# raised collarbone ridge and a centre keel down the chevron
RIDGE = [(-0.165, 0.405), (0.165, 0.405), (0.06, 0.3), (0, 0.27), (-0.06, 0.3)]
r = poly_sheet(RIDGE, 2)
deform(r, lambda v: (v.x, v.y, -1.25 * v.x * v.x - 0.07 * v.y))
add('torso', r, 'edge', TRS((0, 1.02, 0.19)), [SOLID(0.012, 1.0), BEVEL(0.003, 1)])
keel = tube([(0, 0.99, 0.19), (0, 1.1, 0.19), (0, 1.2, 0.183)], [0.009, 0.011, 0.007], 6)
add('torso', keel, 'edge')
# ab bands beneath the chevron, following the torso
for k, (h, w) in enumerate(((0.02, 0.05), (0.075, 0.05))):
    rr = torso_r(h + w / 2) + 0.012
    add('torso', arc_sheet(rr, rr * TZ + 0.004, 0.95 + h, w, -1.05, 1.05, 22, 1), 'armor' if k else 'armorDark', None, [SOLID(0.014), BEVEL(0.004, 2)])
# side plates under the arms
for s in (-1, 1):
    a0, a1 = (1.0, 1.75) if s > 0 else (-1.75, -1.0)
    rr = torso_r(0.3) + 0.01
    add('torso', arc_sheet(rr, rr * TZ, 1.13, 0.2, a0, a1, 10, 2), 'armor', None, [SOLID(0.012), BEVEL(0.004, 2)])
# back: shoulder-blade plates, a lower plate, a spine keel and a glowing node
for k, (y0, h) in enumerate(((1.17, 0.1), (1.26, 0.1), (1.35, 0.11))):  # three stepped lames
    rr = torso_r(y0 - 0.95 + h / 2) + 0.014 + 0.006 * (2 - k)
    add('torso', arc_sheet(rr, rr * TZ + 0.004, y0, h, PI - 1.15, PI + 1.15, 22, 2, taper=0.04), 'armor' if k != 1 else 'armorDark', None, [SOLID(0.016), BEVEL(0.005, 2)])
    add('torso', torus(rr, 0.005, 24, 4, PI - 1.15, PI + 1.15), 'edge', TRS((0, y0 + 0.004, 0), scl=(1, 1, (rr * TZ + 0.004) / rr)))
rr = torso_r(0.15) + 0.012
add('torso', arc_sheet(rr, rr * TZ + 0.004, 1.03, 0.14, PI - 1.0, PI + 1.0, 20, 2), 'armorDark', None, [SOLID(0.014), BEVEL(0.004, 2)])
for s in (-1, 1):  # V keel across the shoulder blades
    add('torso', tube([(s * 0.13, 1.47, -0.155), (s * 0.06, 1.38, -0.196), (0, 1.3, -0.205)], [0.008, 0.01, 0.011], 6), 'edge')
add('torso', sphere(0.017, 12, 8), 'glow', TRS((0, 1.3, -0.215)))
# high collar: a flared ring, open at the front like the concept
col = lathe([(0.118, 0), (0.1, 0.07), (0.108, 0.14)], 28, False, False)
add('torso', col, 'armorDark', TRS((0, 1.52, 0), scl=(1, 1, 0.9)), [SOLID(0.012), BEVEL(0.003, 1)])
add('torso', torus(0.108, 0.007, 32, 6), 'edge', TRS((0, 1.66, 0), scl=(1, 1, 0.9)))
add('torso', cyl(0.1, 0.07, 0.15, 24, False), 'under', TRS((0, 1.59, 0), scl=(0.95, 1, 0.9)))
# shoulder yoke plates bridging collar and pauldrons
for s in (-1, 1):
    y = hemi(0.11, 16, 8)
    add('torso', y, 'armorDark', TRS((s * 0.15, 1.5, 0), (0, 0, -s * 0.5), scl=(1.25, 0.45, 0.85)), [SOLID(0.01), BEVEL(0.003, 1)])
# node network base: the carbon core and four bond-socket rings, wired together (the glows of the
# four sockets stay in the game code because they change with what Kai carries)
CORE = (0, 1.3, 0.2)
NODES = [(-0.115, 1.42, 0.168), (0.115, 1.42, 0.168), (-0.1, 1.2, 0.18), (0.1, 1.2, 0.18)]
add('torso', cyl(0.044, 0.044, 0.02, 24), 'edge', TRS(CORE, (PI / 2, 0, 0)), [BEVEL(0.004, 2)])
add('torso', torus(0.038, 0.005, 24, 6), 'armorDark', TRS((CORE[0], CORE[1], CORE[2] + 0.011), (PI / 2, 0, 0)))
add('torso', sphere(0.03, 18, 12), 'glow', TRS((CORE[0], CORE[1], CORE[2] + 0.012), scl=(1, 1, 0.7)))
for n in NODES:
    add('torso', cyl(0.029, 0.029, 0.016, 20), 'edge', TRS(n, (PI / 2, 0, 0)), [BEVEL(0.003, 1)])
    a = Vector(CORE) + (Vector(n) - Vector(CORE)).normalized() * 0.045
    b = Vector(n) + (Vector(CORE) - Vector(n)).normalized() * 0.03
    a.z += 0.006; b.z += 0.006
    add('torso', tube([tuple(a), tuple(b)], [0.0035, 0.0035], 6), 'wire')

# ================================================================ head (frame: neck base, y 1.63)
add('head', cyl(0.056, 0.048, 0.15, 16), 'skin', TRS((0, 0.0, -0.005)))
def skull(v):
    # a unit sphere shaped into a head: narrower jaw and chin, flatter face and sides, brow,
    # cheekbones, eye sockets and a nose ridge
    x, y, z = v.x, v.y, v.z
    jaw = max(0.0, -y)
    x *= 0.9 * (1 - 0.18 * jaw ** 1.4)
    z *= 0.97 * (1 - 0.1 * jaw)
    if z > 0.68:
        z = 0.68 + (z - 0.68) * 0.72
    if y < -0.45 and z > 0:
        z += 0.015 * (-y - 0.45)
    if y < -0.82:
        y = -0.82 + (y + 0.82) * 0.5  # a flatter chin
    if z > 0.2:
        for sx in (-0.37, 0.37):  # eye sockets
            d2 = (x - sx) ** 2 / 0.022 + (y - 0.02) ** 2 / 0.012
            z -= 0.055 * math.exp(-d2)
        z += 0.05 * math.exp(-((y - 0.17) ** 2) / 0.006) * (1 - min(1, abs(x) / 0.6))  # brow
        z += 0.16 * math.exp(-(x / 0.06) ** 2 - ((y + 0.12) / 0.2) ** 2)  # nose ridge
        z += 0.05 * math.exp(-(x / 0.09) ** 2 - ((y + 0.3) / 0.06) ** 2)  # nose tip and nostrils
        z += 0.03 * math.exp(-((abs(x) - 0.48) ** 2) / 0.01 - ((y + 0.12) ** 2) / 0.02)  # cheekbones
    return (x, y * 1.1, z)
head = deform(sphere(1.0, 34, 26), skull)
add('head', head, 'skin', TRS((0, 0.152, 0.004), scl=0.139))
for s in (-1, 1):
    ear = deform(sphere(0.034, 12, 10), lambda v: (v.x * 0.42, v.y, v.z * 0.75))
    add('head', ear, 'skin', TRS((s * 0.123, 0.143, -0.01), (0, s * 0.25, 0)))
add('head', box(0.032, 0.0045, 0.006), 'lip', TRS((0, 0.072, 0.121)), [BEVEL(0.002, 1)])
for s in (-1, 1):  # tapered brows, heavier at the inner end
    add('head', tube([(s * 0.02, 0.186, 0.131), (s * 0.048, 0.193, 0.129), (s * 0.077, 0.186, 0.117)], [0.0062, 0.0055, 0.0025], 6), 'brow')

# eyes (frame: y 1.63 + 0.152) — their own part so the game can blink them
for s in (-1, 1):
    add('eyes', sphere(0.02, 16, 10), 'eyeWhite', TRS((s * 0.047, 0, 0.112), scl=(1.25, 0.6, 0.5)))
    add('eyes', sphere(0.009, 14, 10), 'iris', TRS((s * 0.049, 0, 0.1185), scl=(1, 1, 0.4)))
    add('eyes', sphere(0.0045, 10, 6), 'pupil', TRS((s * 0.049, 0, 0.1222)))

# hair (frame: y 1.63 + 0.15): a cap plus clumps that lie along the skull, tapering to points.
# Short and dark, a fringe swept to one side, the crown swept back (concept art).
add('hair', hemi(0.153, 26, 12), 'hair', TRS((0, 0.022, -0.02), (-0.5, 0, 0), scl=(0.97, 1, 1.03)))
back = sphere(0.152, 26, 16)
bmesh.ops.delete(back, geom=[v for v in back.verts if v.co.z > 0.02 or v.co.y < -0.14], context='VERTS')
add('hair', back, 'hair', TRS((0, 0.0, -0.012), scl=(0.98, 1.05, 1.03)))
seed = [11]
def rnd():
    seed[0] = (seed[0] * 16807) % 2147483647
    return seed[0] / 2147483647
def clump(az, el, length, width, sweep, lift=0.012, R=0.152, squash=0.45):
    n0 = Vector((math.sin(az) * math.cos(el), math.sin(el), math.cos(az) * math.cos(el)))
    d = Vector(sweep).normalized()
    d = (d - n0 * d.dot(n0)).normalized()
    axis = n0.cross(d).normalized()
    pts, rad = [], []
    steps = 5
    for i in range(steps + 1):
        t = i / steps
        ang = t * length / R
        nrm = (Matrix.Rotation(ang, 3, axis) @ n0)
        pts.append(tuple(nrm * (R + lift * math.sin(PI * t) + 0.004)))
        rad.append(width * (1 - t) ** 0.8 + 0.0008)
    b = tube(pts, rad, 6)
    rc = R + 0.004
    for v in b.verts:  # squash each clump's thickness against the skull so it lies like hair
        d = v.co.length
        v.co = v.co.normalized() * (rc + (d - rc) * squash + lift * 0.3)
    return b
for i in range(10):  # fringe: from the hairline, swept across to one side
    az = -0.8 + i / 9 * 1.6 + (rnd() - 0.5) * 0.08
    add('hair', clump(az, 0.8 + rnd() * 0.08, 0.07 + rnd() * 0.02, 0.028 + rnd() * 0.006, (1, -0.45, 0.25)), 'hair')
for i in range(22):  # crown, swept back
    az = -2.2 + rnd() * 4.4
    add('hair', clump(az, 0.5 + rnd() * 0.9, 0.12 + rnd() * 0.06, 0.03 + rnd() * 0.008, (0.25 * (rnd() - 0.5), 0.15, -1), squash=0.7), 'hair')
for i in range(12):  # sides and back, lying down
    az = PI + (rnd() - 0.5) * 3.4
    add('hair', clump(az, 0.15 + rnd() * 0.35, 0.06 + rnd() * 0.03, 0.03, (0.3 * (rnd() - 0.5), -1, -0.2), lift=0.004), 'hair')
for i in range(26):  # back of the head: layered clumps so it never reads as a helmet from the game camera
    az = PI + (rnd() - 0.5) * 2.6
    add('hair', clump(az, -0.05 + rnd() * 0.6, 0.07 + rnd() * 0.04, 0.034, (0.2 * (rnd() - 0.5), -1, -0.3), lift=0.01, squash=0.7), 'hair')
for i in range(8):  # nape: short and tidy
    az = PI + (i / 7 - 0.5) * 2.0
    add('hair', clump(az, -0.12 + rnd() * 0.08, 0.05, 0.03, (0, -1, -0.1), lift=0.003), 'hair')
for s in (-1, 1):  # sideburns
    add('hair', clump(s * 1.35, 0.1, 0.04, 0.018, (0, -1, 0.1)), 'hair')

# ================================================================ arms
for s in (-1, 1):
    up = 'upperArm' + ('L' if s < 0 else 'R')
    fo = 'forearm' + ('L' if s < 0 else 'R')
    # pauldron: three layered plates stepping down the arm, a trim on the top plate and a glowing rivet
    P = TRS((s * 0.035, 0.015, 0), (0, 0, -s * 0.45))
    PT = TRS((s * 0.285, 1.46, 0)) @ P  # the same plate frame, seen from the torso
    for i, (rr, mat) in enumerate(((0.138, 'armor'), (0.124, 'armorDark'), (0.11, 'armor'))):
        cap = hemi(rr, 20, 8)
        where, M0 = ('torso', PT) if i == 0 else (up, P)  # the top plate rides on the torso so it never swings off
        add(where, cap, mat, M0 @ TRS((s * i * 0.014, -i * 0.052, 0), scl=(1, 0.8, 0.92)), [SOLID(0.012, -1), BEVEL(0.004, 2)])
    add('torso', torus(0.136, 0.007, 36, 6), 'edge', PT @ TRS((0, 0.002, 0), scl=(1, 1, 0.92)))
    add('torso', sphere(0.019, 12, 10), 'glow', PT @ TRS((s * 0.02, 0.092, 0.06)))
    add('torso', cyl(0.025, 0.025, 0.01, 16), 'edge', PT @ TRS((s * 0.02, 0.09, 0.053), (1.0, 0, 0)))
    # sleeve and rerebrace
    add(up, capsule(0.062, 0.17), 'under', TRS((0, -0.13, 0)))
    add(up, cyl(0.07, 0.075, 0.075, 20), 'armor', TRS((0, -0.15, 0)), [BEVEL(0.005, 2)])
    add(up, cyl(0.064, 0.069, 0.052, 20), 'armorDark', TRS((0, -0.215, 0)), [BEVEL(0.004, 2)])
    # couter (elbow cop) with a fan plate
    add(fo, sphere(0.063, 18, 12), 'armor', TRS((0, 0, -0.02), scl=(1, 0.75, 0.55)))
    add(fo, deform(sphere(0.05, 14, 8), lambda v: (v.x, v.y, v.z * 0.4)), 'edge', TRS((0, 0.0, -0.06), (0.3, 0, 0)), [BEVEL(0.002, 1)])
    # vambrace: tapered, ridged, with a glowing seam
    add(fo, cyl(0.06, 0.074, 0.2, 22), 'armor', TRS((0, -0.13, 0)), [BEVEL(0.005, 2)])
    add(fo, torus(0.074, 0.007, 28, 6), 'edge', TRS((0, -0.045, 0)))
    add(fo, torus(0.062, 0.007, 28, 6), 'edge', TRS((0, -0.215, 0)))
    add(fo, box(0.007, 0.15, 0.014), 'glow', TRS((s * 0.07, -0.13, 0), (0, 0, s * 0.06)))
    # gauntlet: flared cuff, back-of-hand plate, a fist with knuckle plates and a thumb
    add(fo, cyl(0.058, 0.066, 0.04, 20), 'armorDark', TRS((0, -0.245, 0)), [BEVEL(0.004, 2)])
    add(fo, box(0.084, 0.085, 0.09), 'armorDark', TRS((0, -0.305, 0.006)), [BEVEL(0.02, 3)])
    for k in range(4):
        add(fo, box(0.019, 0.03, 0.03), 'edge', TRS((-0.03 + k * 0.02, -0.345, 0.04), (0.3, 0, 0)), [BEVEL(0.006, 2)])
    add(fo, capsule(0.014, 0.03), 'armorDark', TRS((-s * 0.045, -0.31, 0.04), (0.6, 0, -s * 0.5)))
    add(fo, box(0.088, 0.02, 0.06), 'edge', TRS((0, -0.265, 0.035)), [BEVEL(0.006, 2)])

# ================================================================ legs
for s in (-1, 1):
    th = 'thigh' + ('L' if s < 0 else 'R')
    sh = 'shin' + ('L' if s < 0 else 'R')
    add(th, capsule(0.083, 0.24), 'under', TRS((0, -0.18, 0)))
    cuisse = arc_sheet(0.1, 0.1, -0.36, 0.3, -1.7, 1.7, 16, 3, taper=0.1)
    add(th, cuisse, 'armor', TRS((0, 0, 0.004)), [SOLID(0.012), BEVEL(0.004, 2)])
    add(th, torus(0.094, 0.006, 28, 6, -1.7, 1.7), 'edge', TRS((0, -0.07, 0.004)))
    # poleyn (knee cop) with a side fan
    add(sh, sphere(0.058, 18, 12), 'armor', TRS((0, 0, 0.05), scl=(1, 0.6, 0.45)))
    add(sh, deform(sphere(0.06, 12, 8), lambda v: (v.x * 0.3, v.y, v.z)), 'edge', TRS((s * 0.06, 0, 0.018)), [BEVEL(0.002, 1)])
    add(sh, capsule(0.066, 0.22), 'under', TRS((0, -0.17, 0)))
    # greave with a glowing seam and a trim ring
    add(sh, cyl(0.074, 0.082, 0.27, 22), 'armor', TRS((0, -0.19, 0.008)), [BEVEL(0.005, 2)])
    add(sh, box(0.012, 0.2, 0.007), 'glow', TRS((0, -0.19, 0.086), (-0.05, 0, 0)))
    add(sh, torus(0.082, 0.007, 28, 6), 'edge', TRS((0, -0.065, 0.008)))
    add(sh, cyl(0.086, 0.08, 0.07, 22), 'armorDark', TRS((0, -0.34, 0.01)), [BEVEL(0.004, 2)])
    # sabaton: shaped boot with a toe cap, plates over the instep and a leather sole
    boot = box(0.13, 0.1, 0.25)
    deform(boot, lambda v: (v.x * (1 - 0.15 * max(0, v.z / 0.125)), v.y - 0.25 * max(0, v.z) * max(0, v.y + 0.05), v.z))
    add(sh, boot, 'armorDark', TRS((0, -0.41, 0.045)), [BEVEL(0.025, 3)])
    add(sh, box(0.14, 0.028, 0.27), 'leather', TRS((0, -0.461, 0.045)), [BEVEL(0.008, 2)])
    for k in range(2):
        add(sh, arc_sheet(0.07, 0.07, -0.43 + k * 0.03, 0.035, -1.1, 1.1, 10, 1), 'armor', TRS((0, 0, 0.09 + k * 0.035), (0.35, 0, 0)), [SOLID(0.008), BEVEL(0.003, 1)])
    add(sh, deform(sphere(0.06, 16, 10), lambda v: (v.x, v.y * 0.6, v.z)), 'armor', TRS((0, -0.43, 0.155)))

# ================================================================ shield (frame: inside the shield wrapper; face normal +y)
SR = 0.3
lens = deform(sphere(SR, 32, 12), lambda v: (v.x, v.y * (0.13 if v.y > 0 else 0.05), v.z))
add('shield', lens, 'armorDark', None, [BEVEL(0.004, 1)])
add('shield', torus(SR - 0.004, 0.019, 40, 8), 'edge', TRS((0, 0.002, 0)))
add('shield', torus(SR - 0.035, 0.006, 40, 5), 'armor', TRS((0, 0.014, 0)))
add('shield', torus(0.18, 0.008, 36, 5), 'glow', TRS((0, 0.031, 0)))
add('shield', deform(hemi(0.072, 22, 8), lambda v: (v.x, v.y * 0.8, v.z)), 'edge', TRS((0, 0.032, 0)), [SOLID(0.006, -1)])
add('shield', sphere(0.026, 14, 10), 'glow', TRS((0, 0.083, 0), scl=(1, 0.6, 1)))
for k in range(4):  # the tetrahedral motif: four bond studs wired to the central boss
    a = k / 4 * 2 * PI + PI / 4
    p = (math.cos(a) * 0.18, 0.03, math.sin(a) * 0.18)
    add('shield', sphere(0.022, 12, 8), 'glow', TRS((p[0], 0.036, p[2]), scl=(1, 0.6, 1)))
    add('shield', cyl(0.03, 0.03, 0.012, 16), 'edge', TRS(p), [BEVEL(0.003, 1)])
    q0 = (math.cos(a) * 0.075, 0.05, math.sin(a) * 0.075)
    q1 = (math.cos(a) * 0.15, 0.04, math.sin(a) * 0.15)
    add('shield', tube([q0, q1], [0.006, 0.006], 6), 'wire')
for k in (-1, 1):  # straps on the back
    add('shield', box(0.05, 0.012, 0.36), 'leather', TRS((k * 0.08, -0.03, 0)), [BEVEL(0.003, 1)])

# ================================================================ sword (hilt in the grip frame, blade along +y)
add('hilt', deform(sphere(0.027, 8, 6), lambda v: (v.x, v.y * 1.2, v.z)), 'edge', TRS((0, -0.135, 0)), smooth=False)
add('hilt', cyl(0.016, 0.021, 0.02, 12), 'armorDark', TRS((0, -0.112, 0)), [BEVEL(0.003, 1)])
add('hilt', cyl(0.018, 0.016, 0.14, 12), 'leather', TRS((0, -0.04, 0)))
for k in range(6):
    add('hilt', torus(0.0175, 0.004, 12, 5), 'under', TRS((0, -0.098 + k * 0.022, 0), (0.25, 0, 0)))
add('hilt', cyl(0.021, 0.025, 0.022, 12), 'armorDark', TRS((0, 0.032, 0)), [BEVEL(0.003, 1)])
quil = [(-0.15, 0.05 + 0.045, 0), (-0.1, 0.05, 0), (0, 0.05 - 0.012, 0), (0.1, 0.05, 0), (0.15, 0.05 + 0.045, 0)]
add('hilt', tube([(-0.11, 0.044, 0), (-0.06, 0.041, 0), (0, 0.04, 0)], [0.011, 0.014, 0.016], 8), 'edge')
add('hilt', tube([(0.11, 0.044, 0), (0.06, 0.041, 0), (0, 0.04, 0)], [0.011, 0.014, 0.016], 8), 'edge')
for k in (-1, 1):
    add('hilt', sphere(0.015, 12, 8), 'edge', TRS((k * 0.113, 0.044, 0)))
add('hilt', box(0.06, 0.042, 0.034), 'armor', TRS((0, 0.05, 0)), [BEVEL(0.01, 2)])
for k in (-1, 1):
    add('hilt', deform(sphere(0.012, 4, 4), lambda v: v), 'glow', TRS((0, 0.05, k * 0.019)), smooth=False)

def blade_mesh():
    L, tipL, w0, w1, t = 0.98, 0.17, 0.037, 0.028, 0.0095
    bm = bmesh.new()
    def ring(y, w, th):
        return [bm.verts.new(c) for c in ((w, y, 0), (w * 0.35, y, th), (0, y, th * 1.05), (-w * 0.35, y, th), (-w, y, 0), (-w * 0.35, y, -th), (0, y, -th * 1.05), (w * 0.35, y, -th))]
    rings = [ring(0, w0, t), ring(0.45, (w0 + w1) / 2, t * 0.95), ring(L - tipL, w1, t * 0.9)]
    tip = bm.verts.new((0, L, 0))
    for a, b in zip(rings, rings[1:]):
        for k in range(8):
            bm.faces.new((a[k], a[(k + 1) % 8], b[(k + 1) % 8], b[k]))
    for k in range(8):
        bm.faces.new((rings[-1][k], rings[-1][(k + 1) % 8], tip))
    bm.faces.new(list(reversed(rings[0])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm
add('blade', blade_mesh(), 'blade', smooth=False)
for k in (-1, 1):  # the fuller: a groove down each face
    add('blade', box(0.009, 0.62, 0.0012), 'fuller', TRS((0, 0.36, k * 0.0094)))

# ---------------------------------------------------------------- materials (for Blender renders; the game swaps in its own)
def lin(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c] + [1.0]
MATS = {
    'armor': ('#56606e', 0.7, 0.32, None), 'armorDark': ('#353b46', 0.6, 0.4, None), 'edge': ('#8a93a2', 0.8, 0.26, None),
    'under': ('#262933', 0.0, 0.85, None), 'cloth': ('#23262e', 0.0, 0.9, None), 'leather': ('#3a3029', 0.0, 0.65, None),
    'skin': ('#e2b597', 0.0, 0.55, None), 'hair': ('#1a1a20', 0.15, 0.45, None), 'eyeWhite': ('#f3f1ec', 0.0, 0.3, None),
    'iris': ('#4c7486', 0.0, 0.25, None), 'pupil': ('#0b0f12', 0.0, 0.3, None), 'brow': ('#16151a', 0.0, 0.8, None),
    'lip': ('#9a5a50', 0.0, 0.6, None), 'glow': ('#43e6f5', 0.0, 0.4, 6.0), 'wire': ('#2fc6d6', 0.0, 0.5, 3.0),
    'blade': ('#c9d6e2', 1.0, 0.18, None), 'fuller': ('#7d8a98', 1.0, 0.3, None),
}
def material(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    col, metal, rough, emit = MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = lin(col)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = lin(col)
        b.inputs['Emission Strength'].default_value = emit
    return m

# ---------------------------------------------------------------- build part objects (each at the origin, in its joint frame)
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
parts = bpy.data.collections.new('kai_parts')
bpy.context.scene.collection.children.link(parts)
OBJ = {}
tris = 0
for name, S in SEGS.items():
    me = bpy.data.meshes.new(name)
    S['bm'].to_mesh(me)
    S['bm'].free()
    for mname in S['mats']:
        me.materials.append(material(mname))
    if name not in ('head', 'hair', 'eyes'):  # organic parts stay fully smooth
        try:
            me.set_sharp_from_angle(angle=math.radians(38))
        except Exception:
            pass
    ob = bpy.data.objects.new('kai_' + name, me)
    parts.objects.link(ob)
    OBJ[name] = ob
    pt = sum(len(p.vertices) - 2 for p in me.polygons)
    tris += pt
    print('KAI part', name, pt)
print('KAI parts:', len(OBJ), 'triangles:', tris)

# ---------------------------------------------------------------- export
bpy.ops.object.select_all(action='DESELECT')
for ob in OBJ.values():
    ob.select_set(True)
bpy.context.view_layer.objects.active = next(iter(OBJ.values()))
os.makedirs(os.path.dirname(os.path.abspath(GLB)), exist_ok=True)
kw = dict(filepath=os.path.abspath(GLB), export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
          export_texcoords=False, export_normals=True, export_materials='EXPORT', export_cameras=False, export_lights=False)
try:
    bpy.ops.export_scene.gltf(**kw)
except TypeError:
    for k in ('export_cameras', 'export_lights', 'export_texcoords'):
        kw.pop(k, None)
    bpy.ops.export_scene.gltf(**kw)
print('KAI exported', GLB, os.path.getsize(GLB), 'bytes')

# ---------------------------------------------------------------- preview renders (an assembled, posed copy)
if RENDERS:
    os.makedirs(RENDERS, exist_ok=True)
    prev = bpy.data.collections.new('kai_preview')
    bpy.context.scene.collection.children.link(prev)
    parts.hide_render = True

    def W(pose):
        """World matrix (game frame) of every part for a pose dict."""
        g = {}
        T = lambda *a, **k: TRS(*a, **k)
        g['hips'] = Matrix.Identity(4)
        g['torso'] = T((0, 0.95, 0), (pose.get('lean', 0), 0, 0)) @ T((0, -0.95, 0))
        for i, (x, z, f) in enumerate(PANELS):
            g['panel%d' % i] = T((x, 0.92, z), (0, (0.12 * f if x < 0 else -0.12 * f), 0))
        g['head'] = g['torso'] @ T((0, 1.63, 0))
        g['eyes'] = g['head'] @ T((0, 0.152, 0))
        g['hair'] = g['head'] @ T((0, 0.15, 0))
        for s, k in ((-1, 'L'), (1, 'R')):
            arm = g['torso'] @ T((s * 0.285, 1.46, 0), pose['arm' + k])
            g['upperArm' + k] = arm
            g['forearm' + k] = arm @ T((0, -0.27, 0), (pose['elbow' + k], 0, 0))
            th = T((s * 0.11, 0.86, 0), (pose.get('leg' + k, 0), 0, 0))
            g['thigh' + k] = th
            g['shin' + k] = th @ T((0, -0.4, 0), (pose.get('knee' + k, 0.06), 0, 0))
        g['shield'] = g['forearmL'] @ T((0, 0, 0), (0, pose.get('twist', 0), 0)) @ T((-0.12, -0.22, 0.03), (0, 0, PI / 2))
        g['hilt'] = g['forearmR'] @ T((0, -0.29, 0.03)) @ T((0, 0, 0), (PI / 2, 0, 0))
        g['blade'] = g['hilt'] @ T((0, 0.07, 0))
        return g

    IDLE = {'armL': (-0.12, 0, 0.12), 'armR': (-0.12, 0, -0.12), 'elbowL': -0.3, 'elbowR': -0.3}
    BLOCK = {'armL': (-0.8, PI / 2, 0), 'armR': (-0.12, 0, -0.12), 'elbowL': -1.6, 'elbowR': -0.3, 'twist': -0.8}
    insts = []
    def assemble(pose, offset_x):
        g = W(pose)
        for name, ob in OBJ.items():
            inst = bpy.data.objects.new('prev_' + name, ob.data)
            prev.objects.link(inst)
            inst.matrix_world = C @ TRS((offset_x, 0, 0)) @ g[name] @ Ci
            insts.append(inst)
    assemble(IDLE, 0)

    sc = bpy.context.scene
    for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT', 'CYCLES'):
        try:
            sc.render.engine = eng
            break
        except Exception:
            continue
    if sc.render.engine == 'CYCLES':
        sc.cycles.samples = 48
    sc.render.resolution_x, sc.render.resolution_y = 720, 900
    sc.view_settings.view_transform = 'AgX' if 'AgX' in [i.identifier for i in sc.view_settings.bl_rna.properties['view_transform'].enum_items] else 'Filmic'
    world = bpy.data.worlds.new('w')
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = lin('#141a2a')
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    def light(name, kind, pos, energy, color, size=1.0):
        ld = bpy.data.lights.new(name, kind)
        ld.energy = energy
        ld.color = lin(color)[:3]
        if kind == 'AREA':
            ld.size = size
        lo = bpy.data.objects.new(name, ld)
        prev.objects.link(lo)
        lo.location = C @ Vector(pos)
        lo.rotation_euler = (Vector((0, 0, 1.1)) - lo.location).to_track_quat('-Z', 'Y').to_euler()
        return lo
    light('key', 'AREA', (1.8, 2.8, 2.6), 260, '#fff1e0', 2.0)
    light('fill', 'AREA', (-2.4, 1.6, 1.8), 90, '#9fb8ff', 2.5)
    light('rim', 'AREA', (0.5, 2.4, -2.6), 220, '#7fd8ff', 1.5)
    cam_d = bpy.data.cameras.new('cam')
    cam_d.lens = 60
    cam = bpy.data.objects.new('cam', cam_d)
    prev.objects.link(cam)
    sc.camera = cam
    def shot(fname, pos, look, lens=60):
        cam_d.lens = lens
        cam.location = C @ Vector(pos)
        cam.rotation_euler = ((C @ Vector(look)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(RENDERS, fname)
        bpy.ops.render.render(write_still=True)
    shot('front.png', (0, 1.05, 4.6), (0, 1.0, 0))
    shot('three_quarter.png', (3.1, 1.5, 3.3), (0, 1.0, 0))
    shot('side.png', (4.6, 1.1, 0), (0, 1.0, 0))
    shot('back.png', (-1.6, 1.3, -4.3), (0, 1.0, 0))
    shot('face.png', (0.35, 1.82, 1.05), (0, 1.79, 0), 70)
    for i in insts:
        bpy.data.objects.remove(i)
    insts.clear()
    assemble(BLOCK, 0)
    shot('block.png', (1.6, 1.4, 3.6), (0, 1.15, 0))
    print('KAI renders in', RENDERS, 'engine', sc.render.engine)
