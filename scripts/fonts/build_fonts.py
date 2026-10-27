"""
Builds the self-hosted web fonts in src/styles/fonts/ from the @fontsource packages.

Fontsource ships each script (Hebrew, Latin, ...) as a separate file. next/font/local
needs one file per weight, so this merges the Hebrew + Latin subsets of each weight
into a single WOFF2. Run after upgrading a font package:

    pip install fonttools brotli
    python3 scripts/fonts/build_fonts.py
"""
from pathlib import Path

from fontTools.merge import Merger
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src" / "styles" / "fonts"
FONTS = {
    "ibm-plex-sans-hebrew": ("ibm-plex-sans-hebrew", [400, 500, 600]),
    "karantina": ("karantina", [400, 700]),
}

OUT.mkdir(parents=True, exist_ok=True)
tmp = OUT / ".tmp"
tmp.mkdir(exist_ok=True)
for package, (prefix, weights) in FONTS.items():
    files = ROOT / "node_modules" / "@fontsource" / package / "files"
    for weight in weights:
        parts = []
        for subset in ("hebrew", "latin"):
            font = TTFont(files / f"{prefix}-{subset}-{weight}-normal.woff2")
            font.flavor = None
            path = tmp / f"{subset}.ttf"
            font.save(path)
            parts.append(str(path))
        merged = Merger().merge(parts)
        merged.flavor = "woff2"
        target = OUT / f"{package}-{weight}.woff2"
        merged.save(target)
        print(f"{target.relative_to(ROOT)}  {target.stat().st_size // 1024} KB")
for f in tmp.iterdir():
    f.unlink()
tmp.rmdir()
