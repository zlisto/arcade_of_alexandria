"""Generate a world spec's missing concept art with Gemini (16:9, style refs: the cover and Gyroid).

Usage (from the repo root, with the agents venv):
  agents/.venv/Scripts/python.exe -I games/algebraic_topology/scripts/gen_art.py games/algebraic_topology/design/world-1.json

Reads GEMINI_API_KEY from the repo's .env. Skips images that already exist.
"""
import base64
import json
import os
import sys
from pathlib import Path

STYLE = (
    "Wide cinematic full-bleed 16:9 painterly stylized 3D video-game concept art, matching the look of the reference images "
    "(the game's cover, and the hero Gyroid: teal perforated armor, amber visor, coral scarf). Palette rules: land and structures "
    "are neutral blue-gray stone unless the scene says otherwise; teal appears only on Gyroid; violet only on Count Null, his spawn "
    "and his corruption; glowing amber-gold for anything Gyroid builds or uses. The scene fills the frame edge to edge (no floating "
    "diorama, no white background, no border). Absolutely no text, words, letters, numbers or labels anywhere — no UI, no watermark."
)


def load_env(path):
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def generate(client, types, model, prompt, refs, out):
    parts = [types.Part.from_text(text=prompt)] + [types.Part.from_bytes(data=Path(r).read_bytes(), mime_type="image/png") for r in refs]
    result = client.models.generate_content(
        model=model,
        contents=[types.Content(role="user", parts=parts)],
        config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"], image_config=types.ImageConfig(aspect_ratio="16:9")),
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
    spec_path = Path(sys.argv[1])
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    game = spec_path.resolve().parent.parent
    assets = game / "public" / "assets"
    load_env(".env")
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    model = os.environ.get("ARCADE_GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
    base_refs = [assets / "cover.png", assets / "characters" / "gyroid.png"]

    jobs = []
    wa = spec.get("world_art_prompt")
    if wa:
        jobs.append((assets / "locations" / wa["file"], wa["scene"]))
    for lid, a in spec.get("level_art", {}).items():
        jobs.append((assets / "levels" / a["file"], a["scene"]))
    if spec.get("castle_art"):
        jobs.append((assets / "levels" / spec["castle_art"]["file"], spec["castle_art"]["scene"]))

    for out, scene in jobs:
        if out.exists():
            print("exists", out.name, flush=True)
            continue
        refs = list(base_refs)
        if "Emmy" in scene:
            refs.append(assets / "characters" / "emmy-boundary.png")
        if "Count Null" in scene:
            refs.append(assets / "characters" / "count-null.png")
        if "Commutator" in scene:
            refs.append(assets / "characters" / "commutator.png")
        try:
            ok = generate(client, types, model, STYLE + "\n\n" + scene, refs, out)
            print(("saved " if ok else "NO IMAGE ") + out.name, flush=True)
        except Exception as exc:  # noqa: BLE001
            print("ERROR", out.name, exc, flush=True)


if __name__ == "__main__":
    main()
