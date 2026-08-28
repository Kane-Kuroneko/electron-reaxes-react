#!/usr/bin/env bash
# generate-icons.sh -- Generate macOS app icon (.icns), Linux icon (.png),
# and macOS tray template images from the 900x900 source icon.
#
# 跨平台换图请用仓库根 scripts/replace-app-icons/（本脚本仅 macOS sips/iconutil）。
# 布局见 docs/architecture/app-icons.md
#
# Usage:  bash scripts/generate-icons.sh [--no-clean]
#   --no-clean   Skip cleanup of old/unused icon files
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
STATICS_DIR="$PROJECT_DIR/statics"
ICONS_DIR="$STATICS_DIR/icons"
SOURCE="$ICONS_DIR/main-icon-900x900.png"
PY_SCRIPT="$SCRIPT_DIR/png-to-template.py"
ICONSET_DIR="$STATICS_DIR/macos/icon/iconset.iconset"

CLEANUP=true
if [[ "${1:-}" == "--no-clean" ]]; then
	CLEANUP=false
fi

echo "=== ChatAIO Icon Generation ==="
echo "Source: $SOURCE"
echo ""

# ---- Cleanup old files ----
if $CLEANUP; then
	echo "[cleanup] Removing old/unused icon files..."
	rm -f "$STATICS_DIR/tray-icon.png"
	rm -f "$STATICS_DIR"/gpt.{ico,icns,png} "$STATICS_DIR"/gpt-dev.{ico,icns,png}
	rm -f "$STATICS_DIR"/tray-icon.macos.png "$STATICS_DIR"/tray-icon.macos@2x.png
	rm -f "$STATICS_DIR"/tray-icon-dev.macos.png "$STATICS_DIR"/tray-icon-dev.macos@2x.png
	rm -rf "$STATICS_DIR/macos" "$STATICS_DIR/shared"
	echo "[cleanup] Done."
	echo ""
fi

mkdir -p "$ICONS_DIR"

# ---- Step 1: macOS App Icon (.icns) ----
echo "[1/3] Generating macOS app icon (.icns)..."

rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

# Apple HIG: artwork = 13/16 of canvas (832/1024), transparent gutter for Dock.
PADDED_SOURCE="$(mktemp -t chataio-icon-padded).png"
python3 - "$SOURCE" "$PADDED_SOURCE" <<'PY'
import sys
from pathlib import Path
from PIL import Image

src_path, out_path = Path(sys.argv[1]), Path(sys.argv[2])
ratio = 13 / 16
recommended = 1024
src = Image.open(src_path).convert("RGBA")
side = max(max(src.size), recommended)
content = int(round(side * ratio))
if content % 2:
	content -= 1
scaled = src.resize((content, content), Image.LANCZOS)
canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
offset = (side - content) // 2
canvas.paste(scaled, (offset, offset), scaled)
canvas.save(out_path, format="PNG")
print(f"  padded : {content}x{content} artwork on {side}x{side} canvas")
PY

# Base (1x) sizes -- physical pixels
sips -z 16   16   "$PADDED_SOURCE" --out "$ICONSET_DIR/icon_16x16.png"       > /dev/null
sips -z 32   32   "$PADDED_SOURCE" --out "$ICONSET_DIR/icon_32x32.png"       > /dev/null
sips -z 64   64   "$PADDED_SOURCE" --out "$ICONSET_DIR/icon_64x64.png"       > /dev/null
sips -z 128  128  "$PADDED_SOURCE" --out "$ICONSET_DIR/icon_128x128.png"     > /dev/null
sips -z 256  256  "$PADDED_SOURCE" --out "$ICONSET_DIR/icon_256x256.png"     > /dev/null
sips -z 512  512  "$PADDED_SOURCE" --out "$ICONSET_DIR/icon_512x512.png"     > /dev/null

# @2x variants (physical pixel dimensions)
sips -z 32   32   "$PADDED_SOURCE" --out "$ICONSET_DIR/icon_16x16@2x.png"    > /dev/null
sips -z 64   64   "$PADDED_SOURCE" --out "$ICONSET_DIR/icon_32x32@2x.png"    > /dev/null
sips -z 128  128  "$PADDED_SOURCE" --out "$ICONSET_DIR/icon_64x64@2x.png"    > /dev/null
sips -z 256  256  "$PADDED_SOURCE" --out "$ICONSET_DIR/icon_128x128@2x.png"  > /dev/null
sips -z 512  512  "$PADDED_SOURCE" --out "$ICONSET_DIR/icon_256x256@2x.png"  > /dev/null
sips -z 1024 1024 "$PADDED_SOURCE" --out "$ICONSET_DIR/icon_512x512@2x.png"  > /dev/null

echo "  Generating .icns via iconutil..."
iconutil -c icns "$ICONSET_DIR" -o "$ICONS_DIR/app-icon.icns"
rm -rf "$ICONSET_DIR"
rm -f "$PADDED_SOURCE"
echo "  -> statics/icons/app-icon.icns"
echo ""

# ---- Step 2: Linux App Icon (.png) ----
echo "[2/3] Generating Linux app icon (.png)..."
sips -z 512 512 "$SOURCE" --out "$ICONS_DIR/app-icon.png" > /dev/null
echo "  -> statics/icons/app-icon.png"
echo ""

# ---- Step 3: Tray Template Images ----
echo "[3/3] Generating macOS tray template images..."

TEMP_DIR="$(mktemp -d)"

# First resize to target dimensions (full color)
sips -z 18 18 "$SOURCE" --out "$TEMP_DIR/tray-18.png" > /dev/null
sips -z 36 36 "$SOURCE" --out "$TEMP_DIR/tray-36.png" > /dev/null

# Convert to template images (black + alpha)
python3 "$PY_SCRIPT" "$TEMP_DIR/tray-18.png" "$ICONS_DIR/tray-icon.macos.png"
python3 "$PY_SCRIPT" "$TEMP_DIR/tray-36.png" "$ICONS_DIR/tray-icon.macos@2x.png"

rm -rf "$TEMP_DIR"
echo "  -> statics/icons/tray-icon.macos.png      (18x18 template)"
echo "  -> statics/icons/tray-icon.macos@2x.png   (36x36 template)"
echo ""

echo "=== Done ==="
echo "Generated:"
echo "  statics/icons/app-icon.icns                   (macOS app icon)"
echo "  statics/icons/app-icon.png                    (Linux app icon)"
echo "  statics/icons/tray-icon.macos.png        (macOS tray, 18x18, template)"
echo "  statics/icons/tray-icon.macos@2x.png   (macOS tray, 36x36, template)"
