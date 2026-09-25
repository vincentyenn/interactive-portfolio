"""Download the small CC0 Poly Haven source set used by the Blender scene.

Run once before scripts/build_loft.py. The website never calls this API.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "source"
API = "https://api.polyhaven.com/files/"
USER_AGENT = "VincentYenLoftPortfolio/1.0 (asset build; https://github.com/vincentyenn/interactive-portfolio)"

TEXTURES = (
    "concrete_floor_worn_001",
    "painted_plaster_wall",
    "oak_wood_planks",
    "oak_veneer_01",
    "brick_wall_10",
)
MODELS = (
    "american_football",
    "desk_lamp_arm_01",
    "modern_arm_chair_01",
)


def read_url(url: str) -> bytes:
    return subprocess.run(
        ["curl", "-fLsS", "-H", f"User-Agent: {USER_AGENT}", url],
        check=True,
        capture_output=True,
    ).stdout


def save(url: str, destination: Path, expected_md5: str | None = None) -> None:
    if destination.exists():
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    content = read_url(url)
    if expected_md5 and hashlib.md5(content).hexdigest() != expected_md5:
        raise ValueError(f"Checksum mismatch: {url}")
    destination.write_bytes(content)
    print(f"saved {destination.relative_to(ROOT)} ({len(content):,} bytes)")


for slug in TEXTURES:
    data = json.loads(read_url(API + slug))
    for channel in ("Diffuse", "Rough", "nor_gl"):
        entry = data[channel]["1k"]["jpg"]
        filename = Path(entry["url"]).name
        save(entry["url"], SOURCE / "textures" / slug / filename, entry.get("md5"))

for slug in MODELS:
    data = json.loads(read_url(API + slug))
    entry = data["gltf"]["1k"]["gltf"]
    folder = SOURCE / "models" / slug
    save(entry["url"], folder / Path(entry["url"]).name, entry.get("md5"))
    for relative, dependency in entry["include"].items():
        save(dependency["url"], folder / relative, dependency.get("md5"))
