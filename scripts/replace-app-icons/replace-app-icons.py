#!/usr/bin/env python3
"""
replace-app-icons.py — Generate Electron app/tray icons for a monorepo sub-project.

Reads a source PNG (absolute path), NEVER modifies it, and overwrites the
project's packaged icon assets (Windows .ico / macOS .icns / Linux .png /
macOS tray Template images / shared master PNG).

See AGENTS.md in this directory for agent-oriented usage instructions.
"""

from __future__ import annotations

import argparse
import io
import struct
import sys
from dataclasses import dataclass, field
from pathlib import Path

try:
	from PIL import Image
except ImportError:
	print(
		"ERROR: Pillow is required. Install with:\n"
		"  python -m pip install pillow",
		file=sys.stderr,
	)
	sys.exit(1)

# ── Monorepo layout ──────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
MONOREPO_ROOT = SCRIPT_DIR.parent.parent  # scripts/replace-app-icons → scripts → root
PROJECTS_DIR = MONOREPO_ROOT / "projects"

MIN_SOURCE_PX = 256
RECOMMENDED_SOURCE_PX = 1024

# electron-builder / Microsoft recommended ICO layers (must include 256)
ICO_SIZES = [
	(16, 16),
	(20, 20),
	(24, 24),
	(32, 32),
	(40, 40),
	(48, 48),
	(64, 64),
	(128, 128),
	(256, 256),
]

# PNG-based ICNS ostypes (Apple icon resource)
ICNS_ENTRIES = [
	(b"ic04", 16),
	(b"ic05", 32),
	(b"ic07", 128),
	(b"ic08", 256),
	(b"ic09", 512),
	(b"ic10", 1024),
	(b"ic11", 32),   # 16@2x
	(b"ic12", 64),   # 32@2x
	(b"ic13", 256),  # 128@2x
	(b"ic14", 512),  # 256@2x
]


@dataclass(frozen=True)
class ProjectIconLayout:
	"""Where a sub-project stores electron-builder + runtime tray icons."""

	name: str
	# Basename without extension; electron-builder resolves .ico/.icns/.png
	app_icon_stem: str
	statics_dir: str = "statics"
	# Relative to project root
	shared_master: str = "statics/shared/main-icon-900x900.png"
	# macOS tray Template images (black + alpha). Sizes match ChatAIO runtime.
	tray_macos: str = "statics/tray-icon.macos.png"
	tray_macos_2x: str = "statics/tray-icon.macos@2x.png"
	tray_macos_px: int = 18
	tray_macos_2x_px: int = 36
	linux_png_px: int = 512
	shared_master_px: int = 1024
	# Extra notes for agents printed after generation
	notes: tuple[str, ...] = field(default_factory=tuple)


# Known layouts. Add new projects here when they adopt the same convention.
PROJECT_LAYOUTS: dict[str, ProjectIconLayout] = {
	"ChatAIO": ProjectIconLayout(
		name="ChatAIO",
		app_icon_stem="statics/gpt",
		notes=(
			"electron-builder.yml → icon: \"statics/gpt\" (no extension).",
			"Windows tray reuses gpt.ico; macOS tray uses tray-icon.macos(.@2x).png + setTemplateImage(true).",
			"After Windows rebuild, Explorer may show a cached old icon — refresh icon cache / rename path.",
		),
	),
}


# ── Image helpers ────────────────────────────────────────────────────────────

def to_rgba(img: Image.Image) -> Image.Image:
	return img.convert("RGBA")


def resize(img: Image.Image, size: int) -> Image.Image:
	return img.resize((size, size), Image.LANCZOS)


def save_png(img: Image.Image, path: Path, size: int) -> None:
	path.parent.mkdir(parents=True, exist_ok=True)
	resize(img, size).save(str(path), format="PNG")


def make_template_png(img: Image.Image, path: Path, size: int) -> None:
	"""macOS Template Image: RGB=black, alpha preserved."""
	path.parent.mkdir(parents=True, exist_ok=True)
	out = resize(img, size)
	_r, _g, _b, a = out.split()
	black = Image.new("L", out.size, 0)
	Image.merge("RGBA", (black, black, black, a)).save(str(path), format="PNG")


def make_ico(img: Image.Image, path: Path) -> None:
	"""Multi-size ICO. Source must be >=256 so Pillow keeps the 256 layer."""
	path.parent.mkdir(parents=True, exist_ok=True)
	base = img if min(img.size) >= 256 else resize(img, 256)
	base = base.convert("RGBA")
	# IMPORTANT: pass the large image as the save target — saving from a 16px
	# frame causes Pillow to drop every larger size (electron-builder then fails
	# with "Icon must be at least 256x256 pixels, provided: 16x16").
	base.save(str(path), format="ICO", sizes=ICO_SIZES)


def make_icns(img: Image.Image, path: Path) -> None:
	"""Write a PNG-payload .icns (works cross-platform without iconutil)."""
	path.parent.mkdir(parents=True, exist_ok=True)
	chunks: list[bytes] = []
	for ostype, size in ICNS_ENTRIES:
		buf = io.BytesIO()
		resize(img, size).convert("RGBA").save(buf, format="PNG")
		png_data = buf.getvalue()
		chunk_len = 8 + len(png_data)
		chunks.append(ostype + struct.pack(">I", chunk_len) + png_data)
	body = b"".join(chunks)
	path.write_bytes(b"icns" + struct.pack(">I", 8 + len(body)) + body)


def verify_ico_has_256(path: Path) -> None:
	data = path.read_bytes()
	if len(data) < 6 or data[0:4] != b"\x00\x00\x01\x00":
		raise SystemExit(f"ERROR: invalid ICO header: {path}")
	count = struct.unpack_from("<H", data, 4)[0]
	sizes = []
	for i in range(count):
		off = 6 + i * 16
		w, h = struct.unpack_from("<BB", data, off)
		sizes.append((256 if w == 0 else w, 256 if h == 0 else h))
	if (256, 256) not in sizes:
		raise SystemExit(
			f"ERROR: ICO missing 256x256 layer (found {sizes}): {path}\n"
			"electron-builder will reject this file."
		)


# ── Core ─────────────────────────────────────────────────────────────────────

def resolve_layout(project: str) -> ProjectIconLayout:
	if project not in PROJECT_LAYOUTS:
		known = ", ".join(sorted(PROJECT_LAYOUTS))
		raise SystemExit(
			f"ERROR: unknown project '{project}'. Known: {known}\n"
			f"Add a ProjectIconLayout entry in {Path(__file__).name} if needed."
		)
	return PROJECT_LAYOUTS[project]


def load_source(source: Path) -> Image.Image:
	if not source.is_absolute():
		raise SystemExit(
			f"ERROR: source path must be absolute, got: {source}\n"
			"Example: python scripts/replace-app-icons/replace-app-icons.py "
			"\"C:/Users/me/Desktop/icon.png\" --project ChatAIO"
		)
	if not source.exists():
		raise SystemExit(f"ERROR: source image not found: {source}")
	if source.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
		raise SystemExit(
			f"ERROR: expected a raster image (.png recommended), got: {source.suffix}"
		)

	img = to_rgba(Image.open(source))
	w, h = img.size
	if w != h:
		print(f"WARNING: source is not square ({w}x{h}); will center-crop to square.")
		side = min(w, h)
		left = (w - side) // 2
		top = (h - side) // 2
		img = img.crop((left, top, left + side, top + side))
		w = h = side

	if w < MIN_SOURCE_PX:
		raise SystemExit(
			f"ERROR: source must be at least {MIN_SOURCE_PX}x{MIN_SOURCE_PX} "
			f"(got {w}x{h}). Preferred: {RECOMMENDED_SOURCE_PX}x{RECOMMENDED_SOURCE_PX}."
		)
	if w < RECOMMENDED_SOURCE_PX:
		print(
			f"WARNING: source is {w}x{h}; recommended "
			f"{RECOMMENDED_SOURCE_PX}x{RECOMMENDED_SOURCE_PX} for sharp Dock/Retina icons."
		)
	return img


def generate(layout: ProjectIconLayout, img: Image.Image, *, dry_run: bool) -> list[Path]:
	project_root = PROJECTS_DIR / layout.name
	if not project_root.is_dir():
		raise SystemExit(f"ERROR: project directory not found: {project_root}")

	stem = project_root / layout.app_icon_stem
	outputs = [
		("Windows app+tray ICO", stem.with_suffix(".ico"), lambda p: make_ico(img, p)),
		("macOS app ICNS", stem.with_suffix(".icns"), lambda p: make_icns(img, p)),
		(
			f"Linux app PNG ({layout.linux_png_px})",
			stem.with_suffix(".png"),
			lambda p: save_png(img, p, layout.linux_png_px),
		),
		(
			f"macOS tray template ({layout.tray_macos_px})",
			project_root / layout.tray_macos,
			lambda p: make_template_png(img, p, layout.tray_macos_px),
		),
		(
			f"macOS tray template @2x ({layout.tray_macos_2x_px})",
			project_root / layout.tray_macos_2x,
			lambda p: make_template_png(img, p, layout.tray_macos_2x_px),
		),
		(
			f"shared master PNG ({layout.shared_master_px})",
			project_root / layout.shared_master,
			lambda p: save_png(img, p, layout.shared_master_px),
		),
	]

	written: list[Path] = []
	total = len(outputs)
	for i, (label, path, writer) in enumerate(outputs, start=1):
		rel = path.relative_to(MONOREPO_ROOT)
		print(f"[{i}/{total}] {label}")
		print(f"  -> {rel}")
		if dry_run:
			continue
		writer(path)
		written.append(path)

	if not dry_run:
		ico = stem.with_suffix(".ico")
		verify_ico_has_256(ico)
		print(f"  verified: {ico.relative_to(MONOREPO_ROOT)} contains 256x256 layer")

	return written


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
	parser = argparse.ArgumentParser(
		prog="replace-app-icons",
		description=(
			"Generate complete Electron app/tray icons from a source PNG and "
			"overwrite a monorepo sub-project's icon assets. "
			"Never modifies the source file."
		),
	)
	parser.add_argument(
		"source",
		type=Path,
		nargs="?",
		default=None,
		help="Absolute path to the source PNG (recommended 1024x1024+).",
	)
	parser.add_argument(
		"--project",
		default="ChatAIO",
		help="Sub-project name under projects/ (default: ChatAIO).",
	)
	parser.add_argument(
		"--dry-run",
		action="store_true",
		help="Print target paths without writing files.",
	)
	parser.add_argument(
		"--list-projects",
		action="store_true",
		help="List known project layouts and exit.",
	)
	return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
	args = parse_args(argv)

	if args.list_projects:
		for name, layout in sorted(PROJECT_LAYOUTS.items()):
			print(f"{name}:")
			print(f"  app_icon_stem : {layout.app_icon_stem}.{{ico,icns,png}}")
			print(f"  tray_macos    : {layout.tray_macos} / {layout.tray_macos_2x}")
			print(f"  shared_master : {layout.shared_master}")
		return 0

	if args.source is None:
		print(
			"ERROR: source PNG absolute path is required.\n"
			"Usage: python scripts/replace-app-icons/replace-app-icons.py "
			"\"<abs.png>\" --project ChatAIO\n"
			"Docs: scripts/replace-app-icons/AGENTS.md",
			file=sys.stderr,
		)
		return 2

	layout = resolve_layout(args.project)
	source = args.source.expanduser()
	# Normalize Windows path quoting edge cases
	source = Path(str(source).strip().strip('"'))

	print("=== replace-app-icons ===")
	print(f"monorepo : {MONOREPO_ROOT}")
	print(f"project  : {layout.name}")
	print(f"source   : {source}")
	print(f"dry_run  : {args.dry_run}")
	print()

	img = load_source(source)
	# Never write back to source — only read.
	print(f"loaded   : {img.size[0]}x{img.size[1]} RGBA (source untouched)")
	print()

	generate(layout, img, dry_run=args.dry_run)

	print()
	print("=== Done ===")
	if args.dry_run:
		print("(dry-run: no files written)")
	else:
		print("Source PNG was NOT modified.")
		for note in layout.notes:
			print(f"NOTE: {note}")
	return 0


if __name__ == "__main__":
	sys.exit(main())
