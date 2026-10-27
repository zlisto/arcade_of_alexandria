"""The Orbital Caverns (World 1 dungeon) for The Legend of Valence, exported to public/models/caverns.glb.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/caverns_blender.py -- <glb_path> <render_dir>

A faceted tunnel of teal crystal-rock (assets/locations/world-1-orbital-caverns.png): flat-shaded rock
facets, glowing "shell" rings of lamp dots, crossing crystal beams on the walls, crystal clusters and
stalactites. One part per room (so the game can cull rooms that are off screen), all in the Caverns
scene's world frame (rooms run along -z; walkable floor |x| < 8, collision is separate in Caverns.jsx):
  room_entrance room_1-1 room_1-2 room_1-3 room_1-4 room_1-5 room_boss
plus small props: lectern (decree stand, at its own origin), bridge (one rising bridge stone, centred).
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'caverns.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {
    'rock': ('#5b97a6', 0, 0.8), 'floorRock': ('#4f6670', 0, 0.8), 'rib': ('#4f7484', 0, 0.7), 'pit': ('#2c4650', 0, 0.9),
    'crystal': ('#43e6f5', 0, 0.2, 1.1), 'crystalDeep': ('#2bb5c9', 0, 0.25, 0.7), 'beam': ('#2fbfd2', 0, 0.2, 0.75), 'lamp': ('#ffe6a0', 0, 0.3, 3.0),
    'violet': ('#a06bff', 0, 0.3, 2.0), 'slate': ('#5a7684', 0, 0.75),
}

W = 8.0
ROOMS = [('entrance', 0.5, -14), ('1-1', -14, -32), ('1-2', -32, -50), ('1-3', -50, -76), ('1-4', -76, -112), ('1-5', -112, -126)]
PITS = [(-55, -67), (-94, -100)]
SLOT = (-86, -89.5, 1.6, 1.15)
HALL = [(8.15, -0.3), (8.35, 1.5), (8.5, 3.5), (8.4, 5.5), (7.9, 7.3), (6.8, 8.6), (5.0, 9.5), (2.6, 10.0), (0.0, 10.15)]
ARENA = [(15.4, -0.3), (15.7, 2.0), (15.8, 5.0), (15.3, 8.0), (13.4, 10.6), (9.8, 12.4), (5.0, 13.3), (0.0, 13.6)]
AZ0, AZ1 = -126.0, -158.4

def resample(half, n):
    """Full arch (left floor → apex → right floor) from a half profile, n points evenly by arc length."""
    full = [(-x, y) for (x, y) in half] + [(x, y) for (x, y) in reversed(half[:-1])]
    d = [0.0]
    for i in range(1, len(full)):
        d.append(d[-1] + math.dist(full[i], full[i - 1]))
    out = []
    for k in range(n):
        s = d[-1] * k / (n - 1)
        for i in range(1, len(full)):
            if d[i] >= s - 1e-9:
                u = (s - d[i - 1]) / max(1e-9, d[i] - d[i - 1])
                out.append((full[i - 1][0] + (full[i][0] - full[i - 1][0]) * u, full[i - 1][1] + (full[i][1] - full[i - 1][1]) * u))
                break
    return out

def outward(x, y, cy=3.0):
    v = Vector((x, y - cy))
    if v.length < 1e-6:
        return Vector((0, 1))
    return v.normalized()

def push(x, y, z, amp=0.55, base=0.12):
    """Displace a wall point outward (never inward) by noise: chunky facets."""
    n = outward(x, y)
    k = base + amp * (0.5 + 0.5 * fbm((x * 0.9, y * 0.9, z * 0.9), 0.35, 2))
    return x + n.x * k, y + n.y * k

def zj(i, j, seed=0.0):
    return (hash3(i * 1.7 + seed, j * 2.3, 7.1) - 0.5) * 0.7

def tunnel(seg, z0, z1, half, n=None, dz=1.6, mat='rock', amp=0.55):
    """A faceted arch between z0 and z1 (z0 > z1). Boundary rows are not jittered in z, so rooms meet."""
    if n is None:
        n = max(12, int(sum(math.dist(half[i], half[i + 1]) for i in range(len(half) - 1)) * 2 / 1.3))
    prof = resample(half, n)
    rows = max(2, int(round((z0 - z1) / dz)))
    bm = bmesh.new()
    grid = []
    for r in range(rows + 1):
        z = z0 + (z1 - z0) * r / rows
        row = []
        for j, (x, y) in enumerate(prof):
            zz = z + (zj(j, round(z * 10)) if 0 < r < rows else 0)
            px, py = push(x, y, zz, amp)
            if y < 0:
                py = min(py, -0.3)
            row.append(bm.verts.new((px, py, zz)))
        grid.append(row)
    for r in range(rows):
        for j in range(len(prof) - 1):
            a, b, c, d = grid[r][j], grid[r][j + 1], grid[r + 1][j + 1], grid[r + 1][j]
            if (r + j) % 2:
                bm.faces.new((a, b, c)); bm.faces.new((a, c, d))
            else:
                bm.faces.new((a, b, d)); bm.faces.new((b, c, d))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # normals must face into the tunnel (towards the axis)
    for f in bm.faces:
        c = f.calc_center_median()
        if f.normal.dot(Vector((-c.x, 3.0 - c.y, 0))) < 0:
            f.normal_flip()
    add(seg, bm, mat, smooth=False)
    return prof

def cap(seg, z, half_out, half_in=None, facing=1, mat='rock', n=30, rings=7):
    """A wall across the tunnel at z: between an outer arch and an inner arch (a doorway), or closed
    (a fan to a centre point). It bulges away from the room by up to ~0.8 m (facing=+1: room at -z)."""
    po = resample(half_out, n)
    pi_ = resample(half_in, n) if half_in else None
    bm = bmesh.new()
    grid = []
    centre = None if half_in else bm.verts.new((0.4, 2.6, z + facing * 2.2))
    for r in range(rings + (1 if half_in else 0)):
        u = r / rings
        row = []
        for j in range(n):
            xo, yo = push(po[j][0], po[j][1], z, 0.55)
            if half_in:
                xi, yi = pi_[j]
            else:
                xi, yi = 0.4, 2.6
            x, y = xo + (xi - xo) * u, yo + (yi - yo) * u
            if po[j][1] < 0.05 and (not half_in):
                y = min(y, yo + (yi - yo) * u)
            bump = 0.0 if (r == 0 or (half_in and r == rings)) else (0.3 + (0.6 if half_in else 1.6 * u) + 0.9 * (0.5 + 0.5 * fbm((x * 1.3, y * 1.3, z), 0.6, 2)))
            row.append(bm.verts.new((x, y, z + facing * bump)))
        grid.append(row)
    for r in range(len(grid) - 1):
        for j in range(n - 1):
            a, b, c, d = grid[r][j], grid[r][j + 1], grid[r + 1][j + 1], grid[r + 1][j]
            bm.faces.new((a, b, d)); bm.faces.new((b, c, d))
    if centre is not None:
        last = grid[-1]
        for j in range(n - 1):
            bm.faces.new((last[j], last[j + 1], centre))
        # close the floor line under the fan
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z * facing > 0:
            f.normal_flip()
    add(seg, bm, mat, smooth=False)

def floor_tiles(seg, x0, x1, z0, z1, y=0.0, cell=1.25, mat='floorRock', seed=0.0):
    """Irregular flagstones: jittered cells, each a slightly raised slab with grooves between."""
    nx = max(1, int(round((x1 - x0) / cell)))
    nz = max(1, int(round((z0 - z1) / cell)))
    cx, cz = (x1 - x0) / nx, (z0 - z1) / nz
    def corner(i, j):
        jx = 0 if i in (0, nx) else (hash3(i + seed, j, 1.1) - 0.5) * cx * 0.5
        jz = 0 if j in (0, nz) else (hash3(i, j + seed, 2.3) - 0.5) * cz * 0.5
        return (x0 + i * cx + jx, z0 - j * cz + jz)
    for i in range(nx):
        for j in range(nz):
            cs = [corner(i, j), corner(i + 1, j), corner(i + 1, j + 1), corner(i, j + 1)]
            mx = sum(c[0] for c in cs) / 4
            mz = sum(c[1] for c in cs) / 4
            g = 0.045
            top = y + 0.004 + hash3(i, j, seed + 3) * 0.012
            bm = bmesh.new()
            tv = [bm.verts.new((c[0] + (mx - c[0]) * g * 2 / cell, top, c[1] + (mz - c[1]) * g * 2 / cell)) for c in cs]
            bv = [bm.verts.new((c[0], y - 0.14, c[1])) for c in cs]
            bm.faces.new(tv)
            for k in range(4):
                bm.faces.new((tv[k], bv[k], bv[(k + 1) % 4], tv[(k + 1) % 4]))
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            add(seg, bm, mat, smooth=False)

def crystal_cluster(seg, pos, s=1.0, seed=0.0, tilt_dir=(0, 1, 0), mat='crystal'):
    """A clump of hexagonal crystal prisms with pointed tips, splayed outward from a rocky base."""
    P = Vector(pos)
    up = Vector(tilt_dir).normalized()
    count = 3 + int(hash3(seed, 1, 2) * 4)
    for k in range(count):
        h = (0.45 + 1.0 * hash3(seed, k, 3)) * s
        r = (0.07 + 0.07 * hash3(seed, k, 4)) * s
        ax = (up + Vector(((hash3(seed, k, 5) - 0.5) * 1.2, (hash3(seed, k, 6) - 0.5) * 0.4, (hash3(seed, k, 7) - 0.5) * 1.2))).normalized()
        b = cyl(r, r * 0.95, h, 6, caps=False)
        tip = cyl(r * 0.95, 0.0, r * 2.2, 6, caps=False)
        bmesh.ops.translate(tip, verts=tip.verts, vec=(0, h / 2 + r * 1.1, 0))
        bm = bmesh.new()
        for part in (b, tip):
            me = bpy.data.meshes.new('t'); part.to_mesh(me); part.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
        q = Vector((0, 1, 0)).rotation_difference(ax)
        M = Matrix.Translation(P + ax * (h / 2 - 0.08 * s)) @ q.to_matrix().to_4x4()
        add(seg, bm, mat if k % 3 else 'crystalDeep', M, smooth=False)
    add(seg, rock_bm(0.28 * s, seed, 1, 0.35, 0.6), 'rib', TRS(tuple(P)), smooth=False)

def shell_ring(seg, z, half, inset=0.05, dots=True, spacing=0.85):
    """A rib of dark stone following the arch, set with warm lamp dots: one 'shell' of light."""
    prof = resample(half, 60)
    pts = []
    for (x, y) in prof:
        n = outward(x, y)
        pts.append((x + n.x * inset, max(y, 0.2), z))
    add(seg, tube(pts, [0.17] * len(pts), 5, cap=False), 'rib', TRS(scl=(1, 1, 1)), smooth=False)
    if dots:
        d = [0.0]
        for i in range(1, len(pts)):
            d.append(d[-1] + math.dist(pts[i], pts[i - 1]))
        k = 0
        s = spacing / 2
        while s < d[-1]:
            for i in range(1, len(pts)):
                if d[i] >= s:
                    u = (s - d[i - 1]) / max(1e-9, d[i] - d[i - 1])
                    p = Vector(pts[i - 1]).lerp(Vector(pts[i]), u)
                    n = outward(p.x, p.y)
                    q = p - Vector((n.x, n.y, 0)) * 0.13
                    if q.y > 0.35:
                        add(seg, sphere(0.11, 8, 5), 'lamp', TRS(tuple(q), scl=(1, 1, 0.6)))
                    break
            s += spacing
            k += 1

def beam(seg, a, b, r=0.14, mat='beam'):
    """A long six-sided crystal beam from a to b, half sunk into the wall."""
    A, B = Vector(a), Vector(b)
    L = (B - A).length
    bm = cyl(r, r, L, 6)
    q = Vector((0, 1, 0)).rotation_difference((B - A).normalized())
    add(seg, bm, mat, Matrix.Translation((A + B) / 2) @ q.to_matrix().to_4x4(), smooth=False)

def wall_point(side, y, z, half=HALL, extra=0.0):
    """A point on the (undisplaced) wall at height y: x from the profile."""
    for i in range(len(half) - 1):
        (x0, y0), (x1, y1) = half[i], half[i + 1]
        if y0 <= y <= y1:
            u = (y - y0) / max(1e-9, y1 - y0)
            x = x0 + (x1 - x0) * u
            return (side * (x + extra), y, z)
    return (side * (half[-1][0] + extra), y, z)

def stalactites(seg, z0, z1, count, seed, half=HALL, spread=5.5):
    for k in range(count):
        x = (hash3(seed, k, 1) - 0.5) * 2 * spread
        z = z0 + (z1 - z0) * hash3(seed, k, 2)
        # find roof height at x
        top = None
        for i in range(len(half) - 1):
            if half[i + 1][0] <= abs(x) <= half[i][0]:
                u = (abs(x) - half[i + 1][0]) / max(1e-9, half[i][0] - half[i + 1][0])
                top = half[i + 1][1] + (half[i][1] - half[i + 1][1]) * u
        if top is None or top < 7.5:
            continue
        L = 0.8 + 1.5 * hash3(seed, k, 3)
        r = 0.18 + 0.22 * hash3(seed, k, 4)
        bm = cyl(0.0, r, L, 5, caps=False)
        add(seg, bm, 'rock', TRS((x, top + 0.2 - L / 2, z), (0, hash3(seed, k, 5) * 6, 0)), smooth=False)

def avoid(x, z):
    keep = [(-6.5, -17), (6.5, -35.5), (-5.5, -52.6), (5.5, -52.6), (-6.6, -119), (6.6, -119), (-5, -10), (3, -9), (0, -81)]
    keep += [(sx, tz) for sx in (-6, 6, -6.5, 6.5) for tz in (-4, -12, -18, -79, -103, -114)]
    return any(abs(x - kx) < 1.6 and abs(z - kz) < 1.6 for kx, kz in keep)

# ================================================================ the halls, room by room
for (rid, z0, z1) in ROOMS:
    seg = 'room_' + rid
    tunnel(seg, z0, z1, HALL)
    # floor (skipping the pits); the pit walls and bottoms
    spans = [(z0, z1)]
    for (p0, p1) in PITS:
        new = []
        for (a, b) in spans:
            if a > p0 > b:
                new += [(a, p0), (p1, b)] if p1 > b else [(a, p0)]
            else:
                new.append((a, b))
        spans = [s for s in new if s[0] - s[1] > 0.05]
    for (a, b) in spans:
        floor_tiles(seg, -8.4, 8.4, a, b, 0.0, 1.25, 'floorRock', seed=a)
    for (p0, p1) in PITS:
        if z0 >= p0 and z1 <= p1:
            pit_half = [(8.15, -16.5), (8.4, -12.0), (8.3, -8.0), (8.3, -5.0), (8.35, -2.0), (8.15, -0.3)]
            for sd in (-1, 1):  # pit side walls
                bm = bmesh.new()
                rows = int((p0 - p1) / 1.5)
                g = []
                for r in range(rows + 1):
                    z = p0 + (p1 - p0) * r / rows
                    g.append([bm.verts.new((sd * push(x, y, z, 0.5)[0] if sd > 0 else -push(x, y, z, 0.5)[0], y, z)) for (x, y) in pit_half])
                for r in range(rows):
                    for j in range(len(pit_half) - 1):
                        bm.faces.new((g[r][j], g[r][j + 1], g[r + 1][j + 1], g[r + 1][j]))
                bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
                for f in bm.faces:
                    if f.normal.x * sd > 0:
                        f.normal_flip()
                add(seg, bm, 'pit', smooth=False)
            for (zc, fz) in ((p0, -1), (p1, 1)):  # the cliff faces of the near and far ledges
                bm = bmesh.new()
                cols, rws = 14, 10
                g = []
                for r in range(rws + 1):
                    y = -0.12 - 16.3 * r / rws
                    g.append([bm.verts.new((-8.4 + 16.8 * c / cols, y, zc + (0 if r == 0 else fz * (-0.1 - 0.5 * (0.5 + 0.5 * fbm((c, y, zc), 0.6, 2)))))) for c in range(cols + 1)])
                for r in range(rws):
                    for c in range(cols):
                        bm.faces.new((g[r][c], g[r][c + 1], g[r + 1][c + 1], g[r + 1][c]))
                bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
                for f in bm.faces:
                    if f.normal.z * fz < 0:
                        f.normal_flip()
                add(seg, bm, 'pit', smooth=False)
            floor_tiles(seg, -8.4, 8.4, p0, p1, -16.0, 1.6, 'pit', seed=p0)
            for k in range(9):  # glowing crystals far below
                x = (hash3(p0, k, 1) - 0.5) * 14
                z = p0 + (p1 - p0) * hash3(p0, k, 2)
                crystal_cluster(seg, (x, -16.0, z), 2.6, p0 + k)
    # the crossing crystal beams on both walls (the concept's great X), one pair per ~9 m
    n_x = max(1, int((z0 - z1) / 9))
    for k in range(n_x):
        zc = z0 - (z0 - z1) * (k + 0.5) / n_x
        if any(p0 > zc > p1 for (p0, p1) in PITS):
            continue
        for sd in (-1, 1):
            beam(seg, wall_point(sd, 1.0, zc - 3.2, extra=0.3), wall_point(sd, 7.4, zc + 3.2, extra=0.15))
            beam(seg, wall_point(sd, 1.0, zc + 3.2, extra=0.3), wall_point(sd, 7.4, zc - 3.2, extra=0.15))
            add(seg, ico(0.45, 1), 'crystal', TRS(wall_point(sd, 4.2, zc, extra=0.15), scl=(0.7, 1.0, 0.7)), smooth=False)
    # crystal clusters at the foot of the walls, stalactites overhead
    nc = int((z0 - z1) * 0.9)
    for k in range(nc):
        z = z0 - (z0 - z1) * hash3(z0, k, 9)
        sd = -1 if hash3(z0, k, 8) < 0.5 else 1
        x = sd * (8.25 + 0.4 * hash3(z0, k, 7))  # their bases stay in the wall, out of the walkway
        if avoid(x, z) or any(p0 + 0.5 > z > p1 - 0.5 for (p0, p1) in PITS):
            continue
        crystal_cluster(seg, (x, 0.0, z), 0.7 + 0.9 * hash3(z0, k, 6), z0 * 3 + k, tilt_dir=(-sd * 0.6, 1, 0))
    stalactites(seg, z0, z1, int((z0 - z1) * 0.9), z0)

# shell rings: at every room boundary (just inside, clear of the gates) and halfway down long rooms
for z in (-1.0, -7.0, -14.8, -23.0, -32.8, -41.0, -50.8, -76.8, -82.0, -100.8, -106.0, -112.8, -119.0):
    seg = [s for (rid, a, b) in ROOMS for s in ['room_' + rid] if a >= z > b][0]
    shell_ring(seg, z, HALL)
# the hall begins at a rock wall behind the entrance
cap('room_entrance', 1.3, HALL, None, facing=1)

# the Forge's sp² slot: a wall of dressed stone across the hall with a low opening, an ethylene relief above
sz0, sz1, sx, sh = SLOT
seg = 'room_1-4'
zc = (sz0 + sz1) / 2
for (x0, x1) in ((-8.6, -sx), (sx, 8.6)):
    add(seg, box(x1 - x0, 10.4, sz0 - sz1), 'slate', TRS(((x0 + x1) / 2, 5.0, zc)), [BEVEL(0.06, 1)], smooth=False)
add(seg, box(2 * sx, 10.4 - sh, sz0 - sz1), 'slate', TRS((0, sh + (10.4 - sh) / 2, zc)), [BEVEL(0.06, 1)], smooth=False)
for sd in (-1, 1):  # glowing lips on the opening
    for zz in (sz0 + 0.02, sz1 - 0.02):
        add(seg, box(0.08, sh, 0.07), 'crystal', TRS((sd * (sx + 0.05), sh / 2, zz)))
    add(seg, box(2 * sx + 0.2, 0.08, 0.07), 'crystal', TRS((0, sh + 0.05, sz0 + 0.02 if sd < 0 else sz1 - 0.02)))
# ethylene relief on the near face: H2C=CH2, flat, 120 degrees
E = Vector((0, 4.2, sz0 + 0.06))
for sd in (-1, 1):
    C = E + Vector((sd * 0.75, 0, 0))
    add(seg, sphere(0.32, 14, 10), 'crystal', TRS(tuple(C), scl=(1, 1, 0.4)))
    for a in (PI / 3, -PI / 3):
        H = C + Vector((sd * math.cos(a) * 1.1, math.sin(a) * 1.1, 0))
        add(seg, tube([tuple(C), tuple(H)], [0.06, 0.06], 6), 'crystalDeep')
        add(seg, sphere(0.2, 12, 8), 'crystalDeep', TRS(tuple(H), scl=(1, 1, 0.4)))
for dy in (-0.13, 0.13):
    add(seg, tube([tuple(E + Vector((-0.45, dy, 0))), tuple(E + Vector((0.45, dy, 0)))], [0.06, 0.06], 6), 'crystal')

# ================================================================ the Colossus's chamber
seg = 'room_boss'
tunnel(seg, AZ0, AZ1, ARENA, dz=2.0, amp=0.8)
cap(seg, AZ0, ARENA, HALL, facing=1)    # the front wall round the hall's mouth (the room is at -z)
cap(seg, AZ1, ARENA, None, facing=-1)   # the far wall (the room is at +z)
floor_tiles(seg, -15.6, 15.6, AZ0, AZ1, 0.0, 1.6, 'floorRock', seed=7)
shell_ring(seg, AZ0 - 0.9, ARENA, spacing=1.0)
shell_ring(seg, -143.0, ARENA, spacing=1.1)
shell_ring(seg, AZ1 + 1.2, ARENA, spacing=1.0)
for zc in (-134.0, -151.0):
    for sd in (-1, 1):
        beam(seg, wall_point(sd, 1.0, zc - 4.5, ARENA, 0.25), wall_point(sd, 10.0, zc + 4.5, ARENA, 0.05), 0.3, 'violet')
        beam(seg, wall_point(sd, 1.0, zc + 4.5, ARENA, 0.25), wall_point(sd, 10.0, zc - 4.5, ARENA, 0.05), 0.3, 'violet')
for k in range(46):
    a = k / 46 * 2 * PI
    x, z = math.cos(a) * 16.5, -143 + math.sin(a) * 16.5
    x = max(-15.5, min(15.5, x)) + (0.3 if x > 0 else -0.3)
    z = max(AZ1 + 0.4, min(AZ0 - 0.6, z))
    if abs(x) < 9 and z > -128:
        continue
    crystal_cluster(seg, (x, 0.0, z), 0.9 + 1.0 * hash3(k, 3, 3), 900 + k, tilt_dir=(-x * 0.05, 1, -(z + 143) * 0.05), mat='violet' if k % 4 == 0 else 'crystal')
stalactites(seg, AZ0, AZ1, 40, 77, ARENA, spread=12)

# ================================================================ props
# the decree's stand: a slanted stone lectern (own origin; the game puts it at [-5, 0, -10])
add('lectern', box(1.0, 1.15, 0.6), 'slate', TRS((0, 0.575, 0)), [BEVEL(0.05, 2)], smooth=False)
add('lectern', box(1.3, 0.16, 0.9), 'slate', TRS((0, 0.08, 0)), [BEVEL(0.04, 1)], smooth=False)
add('lectern', box(1.25, 0.14, 0.95), 'slate', TRS((0, 1.28, 0.05), (0.45, 0, 0)), [BEVEL(0.04, 1)], smooth=False)
for sd in (-1, 1):
    crystal_cluster('lectern', (sd * 0.55, 0.0, -0.25), 0.45, 40 + sd, mat='violet')
# a bridge stone (centred; 3.8 wide, 4 long): a dressed slab with glowing inlay, rough rock hanging below
add('bridge', box(3.8, 0.3, 3.9), 'slate', TRS((0, 0.15, 0)), [BEVEL(0.05, 1)], smooth=False)
for sd in (-1, 1):
    add('bridge', box(0.08, 0.04, 3.7), 'crystal', TRS((sd * 1.75, 0.31, 0)))
add('bridge', box(2.6, 0.04, 0.08), 'crystal', TRS((0, 0.31, 0)))
under = rock_bm(1.0, 3.3, 2, 0.3, 1.0)
for v in under.verts:
    if v.co.y > 0:
        v.co.y = 0
add('bridge', under, 'rock', TRS((0, 0.02, 0), scl=(1.8, 1.2, 1.9)), smooth=False)

# ---------------------------------------------------------------- build, shade, export
objs = build_objects(MATS, 'caverns')
for name, ob in objs.items():
    me = ob.data
    for p in me.polygons:
        p.use_smooth = False
# per-facet shading: each facet its own tone (darker low on the walls), stored per face corner
for name, ob in objs.items():
    me = ob.data
    attr = me.color_attributes.new('AO', 'FLOAT_COLOR', 'CORNER')
    me.color_attributes.active_color = attr
    for p in me.polygons:
        c = p.center
        gx, gy, gz = c.x, c.z, -c.y
        a = 0.62 + 0.38 * hash3(round(gx * 3.1), round(gy * 2.7), round(gz * 3.3))
        if gy > 0.1:
            a *= 0.85 + 0.15 * min(1.0, gy / 3.0)
        if gy < -1.0:  # down in the pits: darker with depth
            a *= 0.25 + 0.75 * max(0.0, 1 + gy / 12.0)
        for li in p.loop_indices:
            attr.data[li].color = (a, a, a, 1.0)
export_glb(objs, GLB)

if RENDERS:
    pl = [(n, TRS()) for n in objs if n.startswith('room_')] + [('lectern', TRS((-5, 0, -10))), ('bridge', TRS((0, -0.3, -57)))]
    preview(objs, pl, [('cave_entrance.png', (0, 3.2, 4.5), (0, 3.0, -20), 34), ('cave_slot.png', (0, 2.6, -78), (0, 3.0, -88), 40),
                       ('cave_chasm.png', (4, 3.5, -50), (0, -2.0, -62), 40), ('cave_boss.png', (0, 4.0, -127), (0, 3.5, -150), 30)],
            RENDERS, sky='#0d1820', ground=None)
    print('RENDERS', RENDERS)
