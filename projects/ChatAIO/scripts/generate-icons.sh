#!/usr/bin/env bash
# generate-icons.sh -- Generate macOS app icon (.icns), Linux icon (.png),
# and macOS tray template images from the 900x900 source icon.
#
# Usage:  bash scripts/generate-icons.sh [--no-clean]
#   --no-clean   Skip cleanup of old/unused icon files
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
STATICS_DIR="$PROJECT_DIR/statics"
SOURCE="$STATICS_DIR/shared/main-icon 900*900.png"
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
	rm -rf "$STATICS_DIR/macos"
	echo "[cleanup] Done."
	echo ""
fi

# ---- Step 1: macOS App Icon (.icns) ----
echo "[1/3] Generating macOS app icon (.icns)..."

rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

# Base (1x) sizes -- physical pixels
sips -z 16   16   "$SOURCE" --out "$ICONSET_DIR/icon_16x16.png"       > /dev/null
sips -z 32   32   "$SOURCE" --out "$ICONSET_DIR/icon_32x32.png"       > /dev/null
sips -z 64   64   "$SOURCE" --out "$ICONSET_DIR/icon_64x64.png"       > /dev/null
sips -z 128  128  "$SOURCE" --out "$ICONSET_DIR/icon_128x128.png"     > /dev/null
sips -z 256  256  "$SOURCE" --out "$ICONSET_DIR/icon_256x256.png"     > /dev/null
sips -z 512  512  "$SOURCE" --out "$ICONSET_DIR/icon_512x512.png"     > /dev/null

# @2x variants (physical pixel dimensions)
sips -z 32   32   "$SOURCE" --out "$ICONSET_DIR/icon_16x16@2x.png"    > /dev/null
sips -z 64   64   "$SOURCE" --out "$ICONSET_DIR/icon_32x32@2x.png"    > /dev/null
sips -z 128  128  "$SOURCE" --out "$ICONSET_DIR/icon_64x64@2x.png"    > /dev/null
sips -z 256  256  "$SOURCE" --out "$ICONSET_DIR/icon_128x128@2x.png"  > /dev/null
sips -z 512  512  "$SOURCE" --out "$ICONSET_DIR/icon_256x256@2x.png"  > /dev/null
sips -z 1024 1024 "$SOURCE" --out "$ICONSET_DIR/icon_512x512@2x.png"  > /dev/null

echo "  Generating .icns via iconutil..."
iconutil -c icns "$ICONSET_DIR" -o "$STATICS_DIR/gpt.icns"
rm -rf "$ICONSET_DIR"
echo "  -> statics/gpt.icns"
echo ""

# ---- Step 2: Linux App Icon (.png) ----
echo "[2/3] Generating Linux app icon (.png)..."
sips -z 512 512 "$SOURCE" --out "$STATICS_DIR/gpt.png" > /dev/null
echo "  -> statics/gpt.png"
echo ""

# ---- Step 3: Tray Template Images ----
echo "[3/3] Generating macOS tray template images..."

TEMP_DIR="$(mktemp -d)"

# First resize to target dimensions (full color)
sips -z 18 18 "$SOURCE" --out "$TEMP_DIR/tray-18.png" > /dev/null
sips -z 36 36 "$SOURCE" --out "$TEMP_DIR/tray-36.png" > /dev/null

# Convert to template images (black + alpha)
python3 "$PY_SCRIPT" "$TEMP_DIR/tray-18.png" "$STATICS_DIR/tray-icon.macos.png"
python3 "$PY_SCRIPT" "$TEMP_DIR/tray-36.png" "$STATICS_DIR/tray-icon.macos@2x.png"

rm -rf "$TEMP_DIR"
echo "  -> statics/tray-icon.macos.png      (18x18 template)"
echo "  -> statics/tray-icon.macos@2x.png   (36x36 template)"
echo ""

echo "=== Done ==="
echo "Generated:"
echo "  statics/gpt.icns                   (macOS app icon)"
echo "  statics/gpt.png                    (Linux app icon)"
echo "  statics/tray-icon.macos.png        (macOS tray, 18x18, template)"
echo "  statics/tray-icon.macos@2x.png     (macOS tray, 36x36, template)"
