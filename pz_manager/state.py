from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path

from .config import APP_STORAGE_DIR, DEFAULT_LAUNCH_COMMAND, DEFAULT_LAUNCH_DIR, DEFAULT_SERVER_DIR, LEGACY_STATE_FILE, STATE_FILE


@dataclass
class AppState:
    selected_profile: str = "default"
    server_dir: Path = DEFAULT_SERVER_DIR
    server_name: str = "servertest"
    launch_command: str = DEFAULT_LAUNCH_COMMAND
    launch_workdir: Path = DEFAULT_LAUNCH_DIR
    server_pid: int | None = None
    server_started_at: float | None = None
    server_process: subprocess.Popen[str] | None = None
    update_process: subprocess.Popen[str] | None = None
    update_active: bool = False
    update_progress: int = 0
    update_message: str = "Idle"
    auto_update_check_enabled: bool = False
    update_available: bool = False
    latest_build_id: str = ""
    last_update_check_message: str = "Auto-check is off"
    profiles: dict[str, dict[str, str]] | None = None
    mod_display_names: dict[str, list[str]] | None = None
    mod_metadata: dict[str, list[dict[str, object]]] | None = None
    status_message: str = ""
    status_level: str = "info"


STATE = AppState()
STATE.profiles = {}
STATE.mod_display_names = {}
STATE.mod_metadata = {}


def current_server_key() -> str:
    return f"{STATE.server_dir}|{STATE.server_name}"


def _profile_payload() -> dict[str, str]:
    return {
        "server_dir": str(STATE.server_dir),
        "server_name": STATE.server_name,
        "launch_command": STATE.launch_command,
        "launch_workdir": str(STATE.launch_workdir),
    }


def ensure_profiles() -> None:
    if STATE.profiles is None:
        STATE.profiles = {}
    if not STATE.profiles:
        STATE.profiles["default"] = _profile_payload()
    if not STATE.selected_profile.strip():
        STATE.selected_profile = "default"
    if STATE.selected_profile not in STATE.profiles:
        STATE.selected_profile = next(iter(STATE.profiles))
    sync_selected_profile()


def sync_selected_profile() -> None:
    ensure_profiles_base()
    STATE.profiles[STATE.selected_profile] = _profile_payload()


def ensure_profiles_base() -> None:
    if STATE.profiles is None:
        STATE.profiles = {}
    if not STATE.selected_profile.strip():
        STATE.selected_profile = "default"


def save_profile(name: str) -> str:
    normalized = name.strip() or "default"
    ensure_profiles_base()
    STATE.selected_profile = normalized
    STATE.profiles[normalized] = _profile_payload()
    return normalized


def load_profile(name: str, normalize_path) -> str:
    ensure_profiles()
    normalized = name.strip()
    if normalized not in STATE.profiles:
        raise KeyError(normalized)
    profile = STATE.profiles[normalized]
    STATE.selected_profile = normalized
    STATE.server_dir = normalize_path(profile.get("server_dir", str(DEFAULT_SERVER_DIR)))
    STATE.server_name = profile.get("server_name", "servertest").strip() or "servertest"
    STATE.launch_command = profile.get("launch_command", DEFAULT_LAUNCH_COMMAND)
    STATE.launch_workdir = normalize_path(profile.get("launch_workdir", str(DEFAULT_LAUNCH_DIR)))
    sync_selected_profile()
    return normalized


def delete_profile(name: str, normalize_path) -> str:
    ensure_profiles()
    normalized = name.strip()
    if normalized not in STATE.profiles:
        raise KeyError(normalized)
    if len(STATE.profiles) <= 1:
        raise ValueError("last-profile")
    del STATE.profiles[normalized]
    if STATE.selected_profile == normalized:
        next_name = next(iter(STATE.profiles))
        load_profile(next_name, normalize_path)
        return next_name
    return STATE.selected_profile


def get_mod_display_names() -> list[str]:
    return list((STATE.mod_display_names or {}).get(current_server_key(), []))


def set_mod_display_names(names: list[str]) -> None:
    if STATE.mod_display_names is None:
        STATE.mod_display_names = {}
    STATE.mod_display_names[current_server_key()] = names


def get_mod_metadata() -> list[dict[str, object]]:
    return list((STATE.mod_metadata or {}).get(current_server_key(), []))


def set_mod_metadata(rows: list[dict[str, object]]) -> None:
    if STATE.mod_metadata is None:
        STATE.mod_metadata = {}
    STATE.mod_metadata[current_server_key()] = rows


def load_state(normalize_path) -> None:
    state_path = STATE_FILE if STATE_FILE.exists() else LEGACY_STATE_FILE
    if not state_path.exists():
        ensure_profiles()
        return
    try:
        raw_state = state_path.read_text(encoding="utf-8").strip()
    except OSError:
        ensure_profiles()
        STATE.status_message = f"Could not read state file: {state_path}"
        STATE.status_level = "warning"
        return
    if not raw_state:
        ensure_profiles()
        STATE.status_message = f"State file was empty, defaults loaded from {state_path}"
        STATE.status_level = "warning"
        return
    try:
        data = json.loads(raw_state)
    except json.JSONDecodeError:
        ensure_profiles()
        STATE.status_message = f"State file was invalid JSON, defaults loaded from {state_path}"
        STATE.status_level = "warning"
        return
    STATE.selected_profile = data.get("selected_profile", "default").strip() or "default"
    STATE.server_dir = normalize_path(data.get("server_dir", str(DEFAULT_SERVER_DIR)))
    STATE.server_name = data.get("server_name", "servertest").strip() or "servertest"
    STATE.launch_command = data.get("launch_command", DEFAULT_LAUNCH_COMMAND)
    STATE.launch_workdir = normalize_path(data.get("launch_workdir", str(DEFAULT_LAUNCH_DIR)))
    STATE.auto_update_check_enabled = bool(data.get("auto_update_check_enabled", False))
    STATE.latest_build_id = str(data.get("latest_build_id", ""))
    STATE.update_available = bool(data.get("update_available", False))
    STATE.last_update_check_message = str(data.get("last_update_check_message", "Auto-check is off"))
    server_pid = data.get("server_pid")
    STATE.server_pid = server_pid if isinstance(server_pid, int) else None
    raw_profiles = data.get("profiles", {})
    profiles = raw_profiles if isinstance(raw_profiles, dict) else {}
    STATE.profiles = {
        str(name): {
            "server_dir": str(profile.get("server_dir", str(DEFAULT_SERVER_DIR))),
            "server_name": str(profile.get("server_name", "servertest")),
            "launch_command": str(profile.get("launch_command", DEFAULT_LAUNCH_COMMAND)),
            "launch_workdir": str(profile.get("launch_workdir", str(DEFAULT_LAUNCH_DIR))),
        }
        for name, profile in profiles.items()
        if isinstance(profile, dict)
    }
    mod_display_names = data.get("mod_display_names", {})
    STATE.mod_display_names = mod_display_names if isinstance(mod_display_names, dict) else {}
    mod_metadata = data.get("mod_metadata", {})
    STATE.mod_metadata = mod_metadata if isinstance(mod_metadata, dict) else {}
    if STATE.profiles:
        load_profile(STATE.selected_profile, normalize_path)
    else:
        ensure_profiles()


def save_state() -> None:
    sync_selected_profile()
    APP_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(
        json.dumps(
            {
                "selected_profile": STATE.selected_profile,
                "server_dir": str(STATE.server_dir),
                "server_name": STATE.server_name,
                "launch_command": STATE.launch_command,
                "launch_workdir": str(STATE.launch_workdir),
                "auto_update_check_enabled": STATE.auto_update_check_enabled,
                "latest_build_id": STATE.latest_build_id,
                "update_available": STATE.update_available,
                "last_update_check_message": STATE.last_update_check_message,
                "server_pid": STATE.server_pid,
                "profiles": STATE.profiles or {},
                "mod_display_names": STATE.mod_display_names or {},
                "mod_metadata": STATE.mod_metadata or {},
            },
            indent=2,
        ),
        encoding="utf-8",
    )
