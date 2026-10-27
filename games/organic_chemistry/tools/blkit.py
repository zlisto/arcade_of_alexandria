"""Shared Blender helpers for the Valence model scripts (kai, village, wolf, pi).

Coordinates are in the GAME frame (three.js: +y up, front = +z, metres); add() converts to Blender.
"""
import bpy, bmesh, math, sys, os
from mathutils import Matrix, Vector


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

# ---------------------------------------------------------------- noise (cheap, deterministic) for rocks, thatch, bark
def hash3(x, y, z):
    n = math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
    return n - math.floor(n)

def vnoise(p, f=1.0):
    """Smooth value noise in [-1, 1] at point p (game coords)."""
    x, y, z = p[0] * f, p[1] * f, p[2] * f
    xi, yi, zi = math.floor(x), math.floor(y), math.floor(z)
    xf, yf, zf = x - xi, y - yi, z - zi
    u, v, w = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf), zf * zf * (3 - 2 * zf)
    def h(a, b, c):
        return hash3(xi + a, yi + b, zi + c)
    l = lambda a, b, t: a + (b - a) * t
    x00 = l(h(0, 0, 0), h(1, 0, 0), u); x10 = l(h(0, 1, 0), h(1, 1, 0), u)
    x01 = l(h(0, 0, 1), h(1, 0, 1), u); x11 = l(h(0, 1, 1), h(1, 1, 1), u)
    return l(l(x00, x10, v), l(x01, x11, v), w) * 2 - 1

def fbm(p, f=1.0, oct=3):
    s, a, tot = 0.0, 1.0, 0.0
    for _ in range(oct):
        s += vnoise(p, f) * a
        tot += a
        f *= 2.0
        a *= 0.5
    return s / tot

def ico(r, sub=2):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    return _to_y(bm)

def rock_bm(r=1.0, seed=0.0, sub=2, rough=0.28, flat=0.75):
    b = ico(1.0, sub)
    for v in b.verts:
        p = v.co
        n = fbm((p.x + seed, p.y + seed * 1.7, p.z - seed), 1.6, 3)
        k = 1 + rough * n
        v.co = Vector((p.x * k, p.y * k * flat, p.z * k)) * r
    for v in b.verts:  # flatten the underside so it sits on the ground
        if v.co.y < -0.35 * r * flat:
            v.co.y = -0.35 * r * flat
    return b

# ---------------------------------------------------------------- materials
def lin(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c] + [1.0]

def make_material(name, col, metal=0.0, rough=0.8, emit=None):
    m = bpy.data.materials.get(name)
    if m:
        return m
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

def build_objects(mats, collection_name='parts', sharp_angle=38, smooth_parts=()):
    """Turn SEGS into objects (each at the origin in its own frame). mats: name -> (hex, metal, rough, emit)."""
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    col = bpy.data.collections.new(collection_name)
    bpy.context.scene.collection.children.link(col)
    objs = {}
    total = 0
    for name, S in SEGS.items():
        me = bpy.data.meshes.new(name)
        S['bm'].to_mesh(me)
        S['bm'].free()
        for mn in S['mats']:
            me.materials.append(make_material(mn, *mats[mn]))
        if name not in smooth_parts:
            try:
                me.set_sharp_from_angle(angle=math.radians(sharp_angle))
            except Exception:
                pass
        ob = bpy.data.objects.new(name, me)
        col.objects.link(ob)
        objs[name] = ob
        t = sum(len(p.vertices) - 2 for p in me.polygons)
        total += t
        print('PART', name, t)
    print('TRIANGLES', total)
    return objs

def bake_ao(objs, distance=1.2, samples=48, floor=0.42, ground=True, skip=()):
    """Bake ambient occlusion into a vertex colour attribute on each object, one at a time (the others
    hidden), over a ground plane; then lift the darks so nothing goes black (floor..1)."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    if not sc.world:
        sc.world = bpy.data.worlds.new('w')
    sc.world.light_settings.distance = distance
    gp = None
    if ground:
        gm = bpy.data.meshes.new('ground')
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=60)
        bm.to_mesh(gm)
        bm.free()
        gp = bpy.data.objects.new('ground', gm)
        sc.collection.objects.link(gp)
    for name, ob in objs.items():
        if name in skip:
            continue
        for o2 in objs.values():
            o2.hide_render = (o2 is not ob)
        me = ob.data
        attr = me.color_attributes.get('AO') or me.color_attributes.new('AO', 'FLOAT_COLOR', 'POINT')
        me.color_attributes.active_color = attr
        bpy.ops.object.select_all(action='DESELECT')
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        try:
            bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
        except Exception as e:
            print('BAKE FAILED', name, e)
            continue
        for d in attr.data:
            a = floor + (1 - floor) * d.color[0]
            d.color = (a, a, a, 1.0)
        print('BAKED', name)
    for o2 in objs.values():
        o2.hide_render = False
    if gp:
        bpy.data.objects.remove(gp)

def export_glb(objs, path):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objs.values():
        ob.select_set(True)
    bpy.context.view_layer.objects.active = next(iter(objs.values()))
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    kw = dict(filepath=os.path.abspath(path), export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
              export_texcoords=False, export_normals=True, export_materials='EXPORT', export_cameras=False, export_lights=False,
              export_vertex_color='ACTIVE')
    for attempt in range(5):
        try:
            bpy.ops.export_scene.gltf(**kw)
            break
        except TypeError as e:
            msg = str(e)
            dropped = False
            for k in list(kw):
                if k != 'filepath' and k in msg:
                    kw.pop(k)
                    dropped = True
            if not dropped:
                raise
    print('EXPORTED', path, os.path.getsize(path))

def preview(objs, placements, shots, out_dir, sky='#9ec3e6', sun=(30, 40, 20), ground='#6f9a4e'):
    """Render a small scene: placements = [(part, game matrix)], shots = [(file, cam pos, look, lens)]."""
    os.makedirs(out_dir, exist_ok=True)
    sc = bpy.context.scene
    prev = bpy.data.collections.new('preview')
    sc.collection.children.link(prev)
    for ob in objs.values():
        ob.hide_render = True
    for i, (name, M) in enumerate(placements):
        inst = bpy.data.objects.new('p%d_%s' % (i, name), objs[name].data)
        prev.objects.link(inst)
        inst.matrix_world = C @ M @ Ci
    for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
        try:
            sc.render.engine = eng
            break
        except Exception:
            pass
    sc.render.resolution_x, sc.render.resolution_y = 960, 600
    w = sc.world or bpy.data.worlds.new('w')
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = lin(sky)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
    sd = bpy.data.lights.new('sun', 'SUN')
    sd.energy = 3.5
    so = bpy.data.objects.new('sun', sd)
    prev.objects.link(so)
    so.rotation_euler = (Vector((0, 0, 0)) - C @ Vector(sun)).to_track_quat('-Z', 'Y').to_euler()
    if ground:
        gm = bpy.data.meshes.new('pground')
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=80)
        bm.to_mesh(gm)
        bm.free()
        gm.materials.append(make_material('pground', ground, 0, 0.95))
        go = bpy.data.objects.new('pground', gm)
        prev.objects.link(go)
    cd = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', cd)
    prev.objects.link(cam)
    sc.camera = cam
    for (f, pos, look, lens) in shots:
        cd.lens = lens
        cam.location = C @ Vector(pos)
        cam.rotation_euler = ((C @ Vector(look)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(out_dir, f)
        bpy.ops.render.render(write_still=True)

# ---------------------------------------------------------------- metaballs (organic bodies) and colour passes
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
        el.size_x, el.size_y, el.size_z = r[0] * k, r[2] * k, r[1] * k
        el.rotation = (C @ R3(*rot) @ Ci).to_quaternion()
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

def colour_pass(ob, fn):
    """Write a grey shade fn(game_xyz) -> a into the 'AO' vertex colour (used instead of a bake on big surfaces)."""
    me = ob.data
    attr = me.color_attributes.get('AO') or me.color_attributes.new('AO', 'FLOAT_COLOR', 'POINT')
    me.color_attributes.active_color = attr
    for i, v in enumerate(me.vertices):
        a = fn((v.co.x, v.co.z, -v.co.y))
        attr.data[i].color = (a, a, a, 1.0)

def head_shape(v, jaw_narrow=0.18, nose=0.16, socket=0.055, brow=0.05, cheek=0.03, gaunt=0.0, chin=0.0):
    """Shape a unit sphere into a face (front +z). gaunt hollows the cheeks; chin points it."""
    x, y, z = v.x, v.y, v.z
    jaw = max(0.0, -y)
    x *= 0.9 * (1 - jaw_narrow * jaw ** 1.4)
    z *= 0.97 * (1 - 0.1 * jaw)
    if z > 0.68:
        z = 0.68 + (z - 0.68) * 0.72
    if y < -0.82:
        y = -0.82 + (y + 0.82) * (0.5 + chin)
    if z > 0.2:
        for sx in (-0.37, 0.37):
            d2 = (x - sx) ** 2 / 0.022 + (y - 0.02) ** 2 / 0.012
            z -= socket * math.exp(-d2)
        z += brow * math.exp(-((y - 0.17) ** 2) / 0.006) * (1 - min(1, abs(x) / 0.6))
        z += nose * math.exp(-(x / 0.06) ** 2 - ((y + 0.12) / 0.2) ** 2)
        z += 0.05 * math.exp(-(x / 0.09) ** 2 - ((y + 0.3) / 0.06) ** 2)
        z += cheek * math.exp(-((abs(x) - 0.48) ** 2) / 0.01 - ((y + 0.12) ** 2) / 0.02)
    if gaunt and abs(x) > 0.3 and -0.6 < y < -0.1:
        k = math.exp(-((y + 0.33) / 0.15) ** 2)
        x *= 1 - gaunt * k
    return (x, y * 1.1, z)


# ---------------------------------------------------------------- road ribbons (from the village script)
def catmull(pts, step=0.6):
    out = []
    P = [Vector((p[0], 0, p[1])) for p in pts]
    P = [P[0]] + P + [P[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        n = max(2, int((p2 - p1).length / step))
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2])
    return out
def ribbon(pts, half=1.4, rim=0.32, y=0.018, seed=0):
    c = catmull(pts)
    road, edge = bmesh.new(), bmesh.new()
    L, Rr, LR, RR = [], [], [], []
    for i, p in enumerate(c):
        t = (c[min(i + 1, len(c) - 1)] - c[max(i - 1, 0)]).normalized()
        n = Vector((-t.z, 0, t.x))
        w = half * (1 + 0.12 * vnoise((p.x + seed, 0, p.z), 0.7)) * min(1.0, 0.35 + i / 8.0) * min(1.0, 0.35 + (len(c) - 1 - i) / 8.0)
        L.append(road.verts.new(p + n * w + Vector((0, y, 0))))
        Rr.append(road.verts.new(p - n * w + Vector((0, y, 0))))
        LR.append((edge.verts.new(p + n * w + Vector((0, y - 0.001, 0))), edge.verts.new(p + n * (w + rim * (0.7 + 0.6 * vnoise((p.z, 0, p.x + seed), 1.3))) + Vector((0, y - 0.004, 0)))))
        RR.append((edge.verts.new(p - n * w + Vector((0, y - 0.001, 0))), edge.verts.new(p - n * (w + rim * (0.7 + 0.6 * vnoise((p.x, 0, p.z - seed), 1.3))) + Vector((0, y - 0.004, 0)))))
    for i in range(len(c) - 1):
        road.faces.new((L[i], Rr[i], Rr[i + 1], L[i + 1]))
        edge.faces.new((LR[i][1], LR[i][0], LR[i + 1][0], LR[i + 1][1]))
        edge.faces.new((RR[i][0], RR[i][1], RR[i + 1][1], RR[i + 1][0]))
    for b in (road, edge):
        for f in b.faces:
            if f.normal.y < 0:
                f.normal_flip()
    return road, edge
