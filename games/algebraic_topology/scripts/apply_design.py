"""Merge one world's design spec into the game's data files.

Usage (from games/algebraic_topology):  python scripts/apply_design.py design/world-1.json

A spec (design/world-N.json) holds, all optional:
  world        — world number
  world_patch  — fields merged into concept.worlds[N] (e.g. art, map)
  levels       — { "<level id>": { design fields } } → concept level["design"]
  level_art    — { "<level id>": { file, scene } }   → concept level["art"] (image under public/assets/levels/)
  castle       — design fields → concept.worlds[N].castle["design"]
  castle_art   — { file, scene } → castle["art"]
  videos       — video entries, upserted by id into videos.json (both copies)
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = json.loads((ROOT / sys.argv[1]).read_text(encoding="utf-8"))
N = spec.get("world")
GEN = "gemini-2.5-flash-image, 16:9, style refs: cover.png + characters/gyroid.png"


def art_entry(a, folder="levels"):
    return {"image_path": f"games/algebraic_topology/assets/{folder}/{a['file']}", "kind": "concept art", "generator": GEN, "scene": a["scene"]}


for rel in ["game_concept.json", "public/data/game_concept.json"]:
    p = ROOT / rel
    c = json.loads(p.read_text(encoding="utf-8"))
    if N is not None:
        w = c["worlds"][N]
        w.update(spec.get("world_patch", {}))
        levels = {lv["id"]: lv for lv in w["levels"]}
        for lid, d in spec.get("levels", {}).items():
            levels[lid]["design"] = d
            if d.get("status"):
                levels[lid]["status"] = d["status"]
        for lid, a in spec.get("level_art", {}).items():
            levels[lid]["art"] = art_entry(a)
        if "castle" in spec:
            w["castle"]["design"] = spec["castle"]
        if "castle_art" in spec:
            w["castle"]["art"] = art_entry(spec["castle_art"])
    p.write_text(json.dumps(c, ensure_ascii=False, indent=2), encoding="utf-8")
    print("concept ->", rel)

if spec.get("videos"):
    for rel in ["videos.json", "public/data/videos.json"]:
        p = ROOT / rel
        d = json.loads(p.read_text(encoding="utf-8"))
        by_id = {v["id"]: i for i, v in enumerate(d["videos"])}
        for v in spec["videos"]:
            if v["id"] in by_id:
                d["videos"][by_id[v["id"]]] = v
            else:
                d["videos"].append(v)
        p.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
        print("videos ->", rel, len(d["videos"]))
