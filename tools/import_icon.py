#!/usr/bin/env python3
"""Convert a user-supplied RGBA icon to RepoTicker's cross-platform assets.

Usage:
    python3 tools/import_icon.py ~/Downloads/Icon.png

Requires Pillow (Ubuntu: sudo apt install python3-pil). Nothing is downloaded.
The source must be a square image. Transparent edges are preserved; the source
is never modified. Do not commit an asset before visually reviewing 16x16.png.
"""
import argparse
from pathlib import Path
from PIL import Image

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Path to your original PNG")
    args = parser.parse_args()
    source = args.source.expanduser()
    if not source.is_file():
        parser.error(f"Icon file not found: {source}")
    with Image.open(source) as img:
        base = img.convert("RGBA")
    if base.width != base.height or base.width < 32:
        parser.error("Expected a square PNG, at least 32 × 32 pixels")
    root = Path(__file__).resolve().parent.parent
    dest = root / "apps" / "desktop" / "src-tauri" / "icons"
    dest.mkdir(parents=True, exist_ok=True)
    sizes = (16, 24, 32, 48, 64, 128, 256, 512)
    for size in sizes:
        base.resize((size, size), Image.Resampling.LANCZOS).save(dest / f"icon-{size}.png")
    base.resize((256, 256), Image.Resampling.LANCZOS).save(dest / "icon.png")
    base.resize((256, 256), Image.Resampling.LANCZOS).save(
        dest / "icon.ico", format="ICO", sizes=[(16, 16), (24, 24),
        (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    )
    base.resize((1024, 1024), Image.Resampling.LANCZOS).save(dest / "icon.icns", format="ICNS")
    print(f"Icon assets written to {dest}")
    print("Review icon-16.png; then git add apps/desktop/src-tauri/icons/")

if __name__ == "__main__":
    main()
