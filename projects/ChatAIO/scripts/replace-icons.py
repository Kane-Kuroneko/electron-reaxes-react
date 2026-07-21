#!/usr/bin/env python3
"""
replace-icons.py
Replace all ChatAIO app/tray icons with the provided source image.
Does NOT modify the original source file.

Usage:
    python scripts/replace-icons.py <source_image_path>
"""

import sys
import os
import struct
import zlib
from pathlib import Path
from PIL import Image

def to_rgba(img: Image.Image) -> Image.Image:
    return img.convert("RGBA")

def resize(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.LANCZOS)

def save_png(img: Image.Image, path: Path, size: int):
    out = resize(img, size)
    out.save(str(path), format="PNG")
    print(f"  -> {path.relative_to(PROJECT_DIR)} ({size}x{size})")

def make_template_png(img: Image.Image, path: Path, size: int):
    """Convert to macOS template image: black pixels + original alpha."""
    out = resize(img, size)
    r, g, b, a = out.split()
    black_r = Image.new("L", out.size, 0)
    black_g = Image.new("L", out.size, 0)
    black_b = Image.new("L", out.size, 0)
    template = Image.merge("RGBA", (black_r, black_g, black_b, a))
    template.save(str(path), format="PNG")
    print(f"  -> {path.relative_to(PROJECT_DIR)} ({size}x{size} template)")

def make_ico(img: Image.Image, path: Path):
    """Build a multi-size .ico file with sizes recommended by Microsoft / electron-builder.

    Pillow scales from the source image; any size larger than the source (or >256)
    is ignored. So we must pass a >=256px image as the save target, NOT a 16px frame.
    """
    # electron-builder requires at least a 256x256 layer in the ICO
    sizes = [(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (128, 128), (256, 256)]
    # Ensure source is at least 256 so Pillow won't drop the 256 layer
    base = img if min(img.size) >= 256 else resize(img, 256)
    base = base.convert("RGBA")
    base.save(str(path), format="ICO", sizes=sizes)
    print(f"  -> {path.relative_to(PROJECT_DIR)} ({', '.join(f'{w}x{h}' for w, h in sizes)})")

def make_icns(img: Image.Image, path: Path):
    """
    Build a minimal .icns file manually.
    Supported OSType codes used here (all PNG-based):
    ic04=16, ic05=32, ic07=128, ic08=256, ic09=512, ic10=1024,
    ic11=32(@2x of 16), ic12=64(@2x of 32), ic13=256(@2x of 128), ic14=512(@2x of 256)
    """
    # Map ostype -> pixel size
    entries = [
        (b"ic04", 16),
        (b"ic05", 32),
        (b"ic07", 128),
        (b"ic08", 256),
        (b"ic09", 512),
        (b"ic10", 1024),
        (b"ic11", 32),   # @2x of 16
        (b"ic12", 64),   # @2x of 32
        (b"ic13", 256),  # @2x of 128
        (b"ic14", 512),  # @2x of 256
    ]

    import io
    chunks = []
    for ostype, size in entries:
        buf = io.BytesIO()
        resized = resize(img, size).convert("RGBA")
        resized.save(buf, format="PNG")
        png_data = buf.getvalue()
        # chunk = ostype(4) + length(4, includes 8-byte header) + data
        chunk_len = 8 + len(png_data)
        chunks.append(ostype + struct.pack(">I", chunk_len) + png_data)

    body = b"".join(chunks)
    total_len = 8 + len(body)
    icns_data = b"icns" + struct.pack(">I", total_len) + body

    path.write_bytes(icns_data)
    sizes_str = ", ".join(str(e[1]) for e in entries)
    print(f"  -> {path.relative_to(PROJECT_DIR)} ({sizes_str}px)")

# ──────────────────────────────────────────────
def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/replace-icons.py <source_image_path>")
        sys.exit(1)

    global PROJECT_DIR
    source_path = Path(sys.argv[1])
    SCRIPT_DIR = Path(__file__).parent
    PROJECT_DIR = SCRIPT_DIR.parent
    STATICS_DIR = PROJECT_DIR / "statics"

    if not source_path.exists():
        print(f"ERROR: source image not found: {source_path}")
        sys.exit(1)

    print(f"=== ChatAIO Icon Replacement ===")
    print(f"Source: {source_path}")
    print()

    img = to_rgba(Image.open(source_path))

    # 1. Windows app + tray icon
    print("[1/5] Generating Windows ICO (app + tray icon)...")
    make_ico(img, STATICS_DIR / "gpt.ico")
    print()

    # 2. macOS app icon (.icns)
    print("[2/5] Generating macOS app icon (.icns)...")
    make_icns(img, STATICS_DIR / "gpt.icns")
    print()

    # 3. Linux app icon
    print("[3/5] Generating Linux app icon (512x512 PNG)...")
    save_png(img, STATICS_DIR / "gpt.png", 512)
    print()

    # 4. macOS tray template images
    print("[4/5] Generating macOS tray template images...")
    make_template_png(img, STATICS_DIR / "tray-icon.macos.png", 18)
    make_template_png(img, STATICS_DIR / "tray-icon.macos@2x.png", 36)
    print()

    # 5. Update the shared source reference (copy, not overwrite original)
    print("[5/5] Updating shared source reference (1024x1024)...")
    save_png(img, STATICS_DIR / "shared" / "main-icon-900x900.png", 1024)
    print()

    print("=== Done ===")

if __name__ == "__main__":
    main()
