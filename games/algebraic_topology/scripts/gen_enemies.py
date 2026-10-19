"""Generate concept art for Count Null's spawn (character-sheet style, like the hero sheets).

Usage (from the repo root, with the agents venv):
  agents/.venv/Scripts/python.exe -I games/algebraic_topology/scripts/gen_enemies.py [--force]

Writes games/algebraic_topology/public/assets/characters/enemies/<id>.png. Reads GEMINI_API_KEY from .env.
"""
import base64
import os
import sys
from pathlib import Path

STYLE = (
    "Full-body character concept sheet for a stylized 3D action-adventure video game enemy, matching the painterly look of the "
    "reference images (the game's cover and Count Null, the villain whose violet corruption these creatures are made of). "
    "One creature, centered, three-quarter view, on a plain dark navy background, dramatic rim light, crisp silhouette. "
    "Palette: obsidian black body with glowing violet (#8a3cff / #a259ff) cracks, rims and energy; small pale lavender eyes. "
    "Menacing, a little creepy, readable at small size. Absolutely no text, letters, numbers, labels or watermark."
)

ENEMIES = {
    "sphere-spawn": (
        "A 'sphere spawn': a floating orb-creature about knee height. A smooth obsidian sphere split by a jagged glowing violet seam "
        "like a mouth full of small crystal teeth, four slit-shaped pale lavender eyes in a cluster, a thin violet halo-ring floating "
        "above it, wisps of violet smoke trailing beneath, tiny shard fragments orbiting it. It hovers. Hungry and twitchy."
    ),
    "torus-spawn": (
        "A 'torus spawn': a larger floating creature shaped like a thick doughnut (a torus) standing on edge like a wheel, its body "
        "made of armored obsidian plates with glowing violet joints, a single large vertical slit eye in the hole of the doughnut "
        "glaring out, spikes along its outer rim, two glowing violet loops of energy wrapping it (one around the tube, one through the hole). "
        "It spins slowly as it floats. Tough, heavy, sinister."
    ),
    "snapper": (
        "A 'snapper': a low, wide crab-like creature of the tidal flats with a flat obsidian carapace etched with glowing violet cracks, "
        "two oversized scissor-like claws edged in glowing violet (built for snipping threads), six spindly jointed legs, "
        "a cluster of small pale lavender eyes on short stalks, wet sheen, a few strands of cut golden thread caught in its claws. Scuttling, sneaky."
    ),
}


def load_env(path):
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def main():
    force = "--force" in sys.argv
    game = Path(__file__).resolve().parent.parent
    assets = game / "public" / "assets"
    out_dir = assets / "characters" / "enemies"
    out_dir.mkdir(parents=True, exist_ok=True)
    load_env(".env")
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    model = os.environ.get("ARCADE_GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
    refs = [assets / "cover.png", assets / "characters" / "count-null.png"]
    for eid, desc in ENEMIES.items():
        out = out_dir / f"{eid}.png"
        if out.exists() and not force:
            print("exists", out.name, flush=True)
            continue
        parts = [types.Part.from_text(text=STYLE + "\n\n" + desc)] + [types.Part.from_bytes(data=r.read_bytes(), mime_type="image/png") for r in refs]
        try:
            res = client.models.generate_content(
                model=model,
                contents=[types.Content(role="user", parts=parts)],
                config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"], image_config=types.ImageConfig(aspect_ratio="1:1")),
            )
            saved = False
            for cand in res.candidates or []:
                for part in (cand.content.parts if cand.content else []) or []:
                    data = getattr(getattr(part, "inline_data", None), "data", None)
                    if data and not saved:
                        out.write_bytes(base64.b64decode(data) if isinstance(data, str) else bytes(data))
                        saved = True
            print(("saved " if saved else "NO IMAGE ") + out.name, flush=True)
        except Exception as exc:  # noqa: BLE001
            print("ERROR", out.name, exc, flush=True)


if __name__ == "__main__":
    main()
