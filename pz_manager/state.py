from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path

from .config import DEFAULT_LAUNCH_COMMAND, DEFAULT_LAUNCH_DIR, DEFAULT_SERVER_DIR, STATE_FILE


@dataclass
class AppState:
    server_dir: Path = DEFAULT_SERVER_DIR
    server_name: str = "servertest"
    launch_command: str = DEFAULT_LAUNCH_COMMAND
    launch_workdir: Path = DEFAULT_LAUNCH_DIR
    server_pid: int | None = None
    server_process: subprocess.Popen[str] | None = None
    mod_display_names: dict[str, list[str]] | None = None
    status_message: str = ""
    status_level: str = "info"


STATE = AppState()
STATE.mod_display_names = {}


def current_server_key() -> str:
    return f"{STATE.server_dir}|{STATE.server_name}"


def get_mod_display_names() -> list[str]:
    return list((STATE.mod_display_names or {}).get(current_server_key(), []))


def set_mod_display_names(names: list[str]) -> None:
    if STATE.mod_display_names is None:
        STATE.mod_display_names = {}
    STATE.mod_display_names[current_server_key()] = names


def load_state(normalize_path) -> None:
    if not STATE_FILE.exists():
        return
    data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    STATE.server_dir = normalize_path(data.get("server_dir", str(DEFAULT_SERVER_DIR)))
    STATE.server_name = data.get("server_name", "servertest").strip() or "servertest"
    STATE.launch_command = data.get("launch_command", DEFAULT_LAUNCH_COMMAND)
    STATE.launch_workdir = normalize_path(data.get("launch_workdir", str(DEFAULT_LAUNCH_DIR)))
    server_pid = data.get("server_pid")
    STATE.server_pid = server_pid if isinstance(server_pid, int) else None
    mod_display_names = data.get("mod_display_names", {})
    STATE.mod_display_names = mod_display_names if isinstance(mod_display_names, dict) else {}


def save_state() -> None:
    STATE_FILE.write_text(
        json.dumps(
            {
                "server_dir": str(STATE.server_dir),
                "server_name": STATE.server_name,
                "launch_command": STATE.launch_command,
                "launch_workdir": str(STATE.launch_workdir),
                "server_pid": STATE.server_pid,
                "mod_display_names": STATE.mod_display_names or {},
            },
            indent=2,
        ),
        encoding="utf-8",
    )
