from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from .config import FRONTEND_APP_DIR, FRONTEND_DIST_DIR


def ensure_frontend_assets() -> None:
    package_json = FRONTEND_APP_DIR / "package.json"
    if not package_json.exists():
        return

    if not _frontend_build_needed():
        return

    npm = shutil.which("npm.cmd") or shutil.which("npm")
    if not npm:
        print("Frontend build skipped: npm was not found on PATH.")
        return

    if not (FRONTEND_APP_DIR / "node_modules").exists():
        print("Frontend dependencies missing. Running npm install...")
        if not _run_npm_command([npm, "install"]):
            return

    print("Frontend build is missing or stale. Running npm run build...")
    _run_npm_command([npm, "run", "build"])


def _frontend_build_needed() -> bool:
    index_file = FRONTEND_DIST_DIR / "index.html"
    if not index_file.exists():
        return True

    built_at = index_file.stat().st_mtime
    for source_path in _frontend_source_paths():
        try:
            if source_path.stat().st_mtime > built_at:
                return True
        except OSError:
            continue
    return False


def _frontend_source_paths() -> list[Path]:
    candidates = [
        FRONTEND_APP_DIR / "index.html",
        FRONTEND_APP_DIR / "package.json",
        FRONTEND_APP_DIR / "package-lock.json",
        FRONTEND_APP_DIR / "vite.config.js",
        FRONTEND_APP_DIR / "eslint.config.js",
    ]
    src_dir = FRONTEND_APP_DIR / "src"
    if src_dir.exists():
        candidates.extend(path for path in src_dir.rglob("*") if path.is_file())
    public_dir = FRONTEND_APP_DIR / "public"
    if public_dir.exists():
        candidates.extend(path for path in public_dir.rglob("*") if path.is_file())
    return candidates


def _run_npm_command(command: list[str]) -> bool:
    try:
        result = subprocess.run(command, cwd=str(FRONTEND_APP_DIR), check=False)
    except OSError as error:
        print(f"Frontend command failed: {error}")
        return False
    if result.returncode != 0:
        print(f"Frontend command exited with code {result.returncode}: {' '.join(command[1:])}")
        return False
    return True
