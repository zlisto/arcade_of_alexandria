"""Pi, the living p orbital, for The Legend of Valence. His two lobes are true 2p orbital shapes: the
surface where |psi| = c for psi ~ r cos(theta) exp(-r / 2) (hydrogen-like 2p, Bohr units), so each lobe
is a rounded teardrop that pinches in to the nucleus at the node between them.

Run (from games/organic_chemistry):
  blender --background --factory-startup --python tools/pi_blender.py -- <glb_path> <render_dir>

Parts (Pi's own frame, nucleus at the origin, lobes along y): pi_upper, pi_lower (the lobes),
pi_core (inner glow), pi_haze (a soft outer shell). The game supplies the glowing materials.
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blkit import *  # noqa

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ARGS[0] if len(ARGS) > 0 else 'pi.glb'
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

MATS = {'lobeA': ('#d8f6ff', 0, 0.3, 2.0), 'lobeB': ('#d0f0ff', 0, 0.3, 2.0), 'core': ('#ffffff', 0, 0.3, 3.0), 'haze': ('#9fe3ff', 0, 0.3, 1.0)}

def roots(k):
    """Solve r * exp(-r/2) = k for its two roots (inner < 2 < outer); None if k exceeds the maximum 2/e."""
    if k >= 2 / math.e:
        return None
    f = lambda r: r * math.exp(-r / 2) - k
    def bisect(a, b):
        for _ in range(60):
            m = (a + b) / 2
            if (f(a) < 0) == (f(m) < 0):
                a = m
            else:
                b = m
        return (a + b) / 2
    return bisect(1e-6, 2.0), bisect(2.0, 60.0)

def lobe_profile(c, n=30):
    """(rho, y) profile of one lobe, from the tip on the axis round the rim and back in to the node."""
    th_max = math.acos(min(1.0, c / (2 / math.e)))
    outer, inner = [], []
    for i in range(n + 1):
        th = th_max * (1 - (1 - i / n) ** 2.2)  # dense near the rim, where the surface turns
        rr = roots(c / max(1e-9, math.cos(th)))
        if rr is None:
            continue
        ri, ro = rr
        outer.append((ro * math.sin(th), ro * math.cos(th)))
        inner.append((ri * math.sin(th), ri * math.cos(th)))
    return outer + list(reversed(inner))

def revolve(profile, seg=28):
    bm = bmesh.new()
    rings = []
    for (rho, y) in profile:
        rho = max(rho, 1e-4)
        rings.append([bm.verts.new((rho * math.sin(2 * PI * k / seg), y, rho * math.cos(2 * PI * k / seg))) for k in range(seg)])
    for i in range(len(rings) - 1):
        for k in range(seg):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

C_ISO = 0.5  # true 2p lobes are a little wider than tall (w/h 1.13 here), with a small gap at the node
prof = lobe_profile(C_ISO)
tip = max(y for _, y in prof)
S = 0.285 / tip  # scale so each lobe reaches 0.285 from the nucleus (Pi's old lobes reached ~0.28)
BASE = min(y for _, y in prof) * S * 0.35  # close most of the gap at the node so the lobes meet at the nucleus
prof = [(r * S, y * S - BASE) for r, y in prof]
print('LOBE tip', round(tip, 3), 'width', round(2 * max(r for r, _ in prof), 3))
add('pi_upper', revolve(prof), 'lobeA')
add('pi_lower', revolve([(r, -y) for r, y in prof]), 'lobeB')
# inner glow: a smaller iso-surface (higher |psi|), nested inside each lobe
cprof = [(r * S, y * S - BASE) for r, y in lobe_profile(0.62, 14)]
add('pi_core', revolve(cprof, 18), 'core')
add('pi_core', revolve([(r, -y) for r, y in cprof], 18), 'core')
# haze: a lower iso-surface round both lobes, a faint halo
hprof = [(r * S, y * S - BASE) for r, y in lobe_profile(0.43, 16)]
add('pi_haze', revolve(hprof, 20), 'haze')
add('pi_haze', revolve([(r, -y) for r, y in hprof], 20), 'haze')

objs = build_objects(MATS, 'pi', smooth_parts=tuple(SEGS.keys()))
export_glb(objs, GLB)
if RENDERS:
    preview(objs, [('pi_upper', TRS((0, 1, 0))), ('pi_lower', TRS((0, 1, 0)))], [('pi.png', (0.6, 1.1, 1.6), (0, 1, 0), 50)], RENDERS, sky='#141a2a', ground=None)
    print('RENDERS', RENDERS)
