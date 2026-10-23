"""Generate every image in game_concept.json with Gemini (skips files that already exist).

Order: Kai and Malradix first (they become style references), then everything else.
Aspect: characters/enemies 3:4, items 1:1, cover/locations/dungeons 16:9.

Usage (repo root, agents venv):
  agents/.venv/Scripts/python.exe -I games/organic_chemistry/scripts/gen_art.py [--workers 3] [--only id,id]
"""
import argparse
import base64
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
GAME = REPO / "games" / "organic_chemistry"

STYLE = (
    "Art direction for The Legend of Valence, a heroic fantasy 3D action-adventure about chemistry: painterly high-end "
    "stylized 3D game concept art, warm storybook lighting, rich but controlled color. Palette rules: the hero Kai wears "
    "graphite-black armor with cyan glowing bond-orbs; the villain Malradix and his corruption are crimson and violet; "
    "chemistry is shown with atom colors (carbon black, hydrogen white, oxygen red, nitrogen blue, chlorine green, bromine "
    "red-brown, sulfur yellow). Match the look of any reference images. Absolutely no text, words, letters, numbers or "
    "labels anywhere, no UI, no watermark."
)


def load_env():
    for line in (REPO / ".env").read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def jobs_from(concept):
    jobs = []  # (id, out_path, prompt, aspect, refs)
    kai = REPO / "games/organic_chemistry/assets/characters/kai.png"
    mal = REPO / "games/organic_chemistry/assets/characters/malradix.png"
    for c in concept["characters"]:
        refs = [] if c["id"] in ("kai", "malradix") else [kai]
        jobs.append((c["id"], REPO / c["image_path"], c["image_prompt"], "3:4", refs))
    jobs.append(("cover", REPO / concept["cover"]["image_path"],
                 concept["cover"]["prompt"] + " Wide 16:9 full-bleed scene, edge to edge.", "16:9", [kai, mal]))
    for b in concept["bestiary"]:
        jobs.append((b["id"], REPO / b["image_path"], b["image_prompt"], "3:4", [mal]))
    for a in concept["assets"]:
        jobs.append((a["id"], REPO / a["image_path"], a["image_prompt"], "1:1", []))  # icons: no character ref, or Gemini paints a scene
    for loc in concept["locations"]:
        jobs.append((loc["id"], REPO / loc["image_path"],
                     loc["image_prompt"] + " Wide 16:9 full-bleed scene, edge to edge, no border.", "16:9", [kai]))
    for w in concept["worlds"]:
        jobs.append((w["id"], REPO / w["art"]["image_path"],
                     w["art"]["prompt"] + " Wide 16:9 full-bleed scene, edge to edge, no border.", "16:9", [kai]))
    return jobs


def generate(client, types, model, prompt, refs, aspect, out):
    parts = [types.Part.from_text(text=STYLE + "\n\n" + prompt)]
    parts += [types.Part.from_bytes(data=r.read_bytes(), mime_type="image/png") for r in refs if r.exists()]
    result = client.models.generate_content(
        model=model,
        contents=[types.Content(role="user", parts=parts)],
        config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"],
                                           image_config=types.ImageConfig(aspect_ratio=aspect)),
    )
    for cand in result.candidates or []:
        for part in (cand.content.parts if cand.content else []) or []:
            data = getattr(getattr(part, "inline_data", None), "data", None)
            if data:
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_bytes(base64.b64decode(data) if isinstance(data, str) else bytes(data))
                return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--only", default="")
    ap.add_argument("--no-refs", action="store_true", help="ignore style reference images")
    args = ap.parse_args()
    load_env()
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    model = os.environ.get("ARCADE_GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
    concept = json.loads((GAME / "game_concept.json").read_text(encoding="utf-8"))
    jobs = jobs_from(concept)
    if args.only:
        keep = set(args.only.split(","))
        jobs = [j for j in jobs if j[0] in keep]
    if args.no_refs:
        jobs = [(a, b, c, d, []) for a, b, c, d, _ in jobs]

    def run(job):
        jid, out, prompt, aspect, refs = job
        if out.exists():
            return f"exists {out.name}"
        for attempt in range(3):
            try:
                if generate(client, types, model, prompt, refs, aspect, out):
                    return f"saved {out.relative_to(GAME)}"
            except Exception as exc:  # noqa: BLE001
                err = f"{type(exc).__name__}: {str(exc)[:160]}"
                if attempt == 2:
                    return f"ERROR {jid}: {err}"
        return f"NO IMAGE {jid}"

    # style anchors first, serially
    first = [j for j in jobs if j[0] in ("kai", "malradix")]
    rest = [j for j in jobs if j[0] not in ("kai", "malradix")]
    for j in first:
        print(run(j), flush=True)
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        for msg in ex.map(run, rest):
            print(msg, flush=True)


if __name__ == "__main__":
    sys.exit(main())
