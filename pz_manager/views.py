from __future__ import annotations

import html
import re
from pathlib import Path

from .config import ADVANCED_FILES, DEFAULT_SAVES_DIR, FRONTEND_DIST_DIR
from .files import advanced_path, ini_path, load_advanced_contents, multiplayer_save_path, parse_ini_file
from .logs import current_logs
from .network import get_access_url
from .processes import get_server_version_details, is_server_running
from .sandbox_vars import flatten_sandbox_fields, load_sandbox_document_safe
from .state import STATE, get_mod_display_names
from .users import load_user_directory


def setting_id(prefix: str, key: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", key).strip("-").lower()
    return f"{prefix}-{slug}"


def format_comments(comments: list[str]) -> str:
    return "\n".join(line.lstrip("#; ").removeprefix("--").strip() for line in comments if line.strip())


def build_page_data() -> dict[str, object]:
    server_dir = STATE.server_dir
    server_name = STATE.server_name.strip() or "servertest"
    running = is_server_running()
    ini_document = parse_ini_file(ini_path(server_dir, server_name))
    advanced_contents = load_advanced_contents(server_dir, server_name)
    sandbox_path = advanced_path(server_dir, server_name, "{server}_SandboxVars.lua")
    sandbox_document = load_sandbox_document_safe(sandbox_path)
    version_details = get_server_version_details()
    sandbox_fields = (
        flatten_sandbox_fields(sandbox_document.data, sandbox_document.comments)
        if sandbox_document.data and not sandbox_document.parse_error
        else []
    )

    ini_lookup = {field.key: field for field in ini_document.fields}
    mods_field = ini_lookup.get("Mods")
    workshop_field = ini_lookup.get("WorkshopItems")

    mod_values = [item.strip().lstrip("\\") for item in (mods_field.value if mods_field else "").split(";") if item.strip()]
    workshop_values = [item.strip() for item in (workshop_field.value if workshop_field else "").split(";") if item.strip()]
    display_names = get_mod_display_names()
    mod_row_count = max(len(workshop_values), len(display_names), 1)
    grouped_mods = ["" for _ in range(mod_row_count)]
    for index, mod_value in enumerate(mod_values):
        target_index = index if index < mod_row_count else mod_row_count - 1
        grouped_mods[target_index] = f"{grouped_mods[target_index]}, {mod_value}".strip(", ")
    mod_rows = []
    for index in range(mod_row_count):
        workshop_id = workshop_values[index] if index < len(workshop_values) else ""
        mod_rows.append(
            {
                "mod": grouped_mods[index] if index < len(grouped_mods) else "",
                "displayName": display_names[index] if index < len(display_names) else "",
                "workshopId": workshop_id,
                "workshopUrl": (
                    f"https://steamcommunity.com/sharedfiles/filedetails/?id={html.escape(workshop_id)}"
                    if workshop_id
                    else ""
                ),
            }
        )

    common_fields = []
    for field in ini_document.fields:
        if field.key in {"Mods", "WorkshopItems"}:
            continue
        common_fields.append(
            {
                "id": setting_id("ini", field.key),
                "key": field.key,
                "value": field.value,
                "valueType": field.value_type,
                "comments": format_comments(field.comments),
            }
        )

    sandbox_items = []
    for field in sandbox_fields:
        sandbox_items.append(
            {
                "id": setting_id("sandbox", field.path),
                "path": field.path,
                "label": field.label,
                "value": field.value,
                "valueType": field.value_type,
                "depth": field.depth,
                "comments": format_comments(field.comments),
            }
        )

    advanced_files = []
    for label, pattern in ADVANCED_FILES:
        if label == "SandboxVars":
            continue
        file_path = advanced_path(server_dir, server_name, pattern)
        advanced_files.append(
            {
                "label": label,
                "path": str(file_path),
                "content": advanced_contents[label],
            }
        )

    user_directory = load_user_directory(server_name)
    profile_save_dir = multiplayer_save_path(server_name, DEFAULT_SAVES_DIR)

    return {
        "selectedProfile": STATE.selected_profile,
        "profiles": sorted((STATE.profiles or {}).keys()),
        "serverDir": str(server_dir),
        "serverName": server_name,
        "running": running,
        "serverPid": STATE.server_pid,
        "serverVersion": version_details,
        "status": {
            "message": STATE.status_message,
            "level": STATE.status_level,
        },
        "accessUrl": get_access_url(),
        "launchCommand": STATE.launch_command,
        "launchWorkdir": str(STATE.launch_workdir),
        "logs": current_logs(),
        "paths": {
            "ini": str(ini_path(server_dir, server_name)),
            "sandbox": str(sandbox_path),
            "saves": str(profile_save_dir),
        },
        "commonSettings": common_fields,
        "mods": {
            "available": mods_field is not None or workshop_field is not None,
            "modsHelp": format_comments(mods_field.comments) if mods_field else "",
            "workshopHelp": format_comments(workshop_field.comments) if workshop_field else "",
            "rows": mod_rows,
        },
        "sandbox": {
            "parseError": sandbox_document.parse_error,
            "rawText": sandbox_document.raw_text,
            "fields": sandbox_items,
        },
        "advancedFiles": advanced_files,
        "users": user_directory,
        "playerEvents": [
            {
                "id": "lightning",
                "label": "Lightning",
                "description": "Strike lightning at the selected player.",
                "targeted": True,
                "onlineOnly": True,
            },
            {
                "id": "thunder",
                "label": "Thunder",
                "description": "Play thunder for the selected player.",
                "targeted": True,
                "onlineOnly": True,
            },
            {
                "id": "createhorde",
                "label": "Spawn Horde",
                "description": "Spawn zombies near the selected player.",
                "targeted": True,
                "onlineOnly": True,
            },
            {
                "id": "chopper",
                "label": "Helicopter Event",
                "description": "Global helicopter event. Project Zomboid does not expose a per-player target for this command.",
                "targeted": False,
                "onlineOnly": True,
            },
            {
                "id": "gunshot",
                "label": "Gunshot Event",
                "description": "Global gunshot sound event.",
                "targeted": False,
                "onlineOnly": True,
            },
        ],
    }


def render_app_shell() -> str:
    index_file = FRONTEND_DIST_DIR / "index.html"
    if not index_file.exists():
        return """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PZ Server Manager</title>
</head>
<body>
  <main style="font-family: Segoe UI, sans-serif; max-width: 720px; margin: 40px auto; line-height: 1.5;">
    <h1>PZ Server Manager</h1>
    <p>The React frontend has not been built yet.</p>
    <p>Run <code>npm run build</code> inside <code>site/my-app</code>, then refresh.</p>
  </main>
</body>
</html>
"""
    return index_file.read_text(encoding="utf-8")
