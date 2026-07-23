#!/usr/bin/env python3
"""Thin wrapper — forwards to monorepo scripts/replace-app-icons.

Prefer calling the monorepo script directly:
  python scripts/replace-app-icons/replace-app-icons.py "<abs.png>" --project ChatAIO

See: scripts/replace-app-icons/AGENTS.md
"""

from __future__ import annotations

import runpy
import sys
from pathlib import Path

MONOREPO_SCRIPT = (
	Path(__file__).resolve().parents[3]
	/ "scripts"
	/ "replace-app-icons"
	/ "replace-app-icons.py"
)

if not MONOREPO_SCRIPT.is_file():
	sys.stderr.write(f"ERROR: monorepo icon script not found: {MONOREPO_SCRIPT}\n")
	sys.exit(1)

# Preserve argv; inject --project ChatAIO if missing so old call sites keep working.
argv = sys.argv[1:]
if argv and "--project" not in argv and "--list-projects" not in argv:
	argv = [*argv, "--project", "ChatAIO"]

sys.argv = [str(MONOREPO_SCRIPT), *argv]
runpy.run_path(str(MONOREPO_SCRIPT), run_name="__main__")
