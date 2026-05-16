from __future__ import annotations

import json
import mimetypes
import re
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .config import ADVANCED_FILES, DEFAULT_SAVES_DIR, DEFAULT_SERVER_DIR, FRONTEND_DIST_DIR
from .files import advanced_path, ini_path, multiplayer_save_path, normalize_server_dir, parse_ini_file, reset_saves_directory, write_ini_file
from .logs import clear_log_history, current_logs, current_steamcmd_logs
from .processes import command_channel_available, get_server_runtime_stats, is_server_running, launch_server_update, send_server_command, set_auto_update_check_enabled, start_server, stop_server, update_status
from .sandbox_vars import coerce_sandbox_value, load_sandbox_vars, save_sandbox_vars, update_sandbox_value
from .state import STATE, delete_profile, load_profile, save_profile, save_state, set_mod_display_names, set_mod_metadata, sync_selected_profile
from .users import set_user_access_level
from .views import build_page_data, render_app_shell
from .workshop import fetch_workshop_mod_details


class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/":
            self.respond_html(render_app_shell())
            return
        if parsed.path == "/api/state":
            self.respond_json(build_page_data())
            return
        if parsed.path == "/logs":
            self.respond_json(
                {
                    "lines": current_logs(),
                    "steamcmdLines": current_steamcmd_logs(),
                    "running": is_server_running(),
                    "pid": STATE.server_pid,
                    "serverStats": get_server_runtime_stats(),
                    "update": update_status(),
                }
            )
            return
        if self.serve_frontend_asset(parsed.path):
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        form = self.parse_form_data()
        wants_json = parsed.path.startswith("/api/")
        action_path = parsed.path.removeprefix("/api")

        if action_path == "/select-server":
            server_dir = normalize_server_dir(form.get("server_dir", [""])[0] or str(DEFAULT_SERVER_DIR))
            server_name = form.get("server_name", ["servertest"])[0].strip() or "servertest"
            STATE.server_dir = server_dir
            STATE.server_name = server_name
            sync_selected_profile()
            save_state()
            if ini_path(server_dir, server_name).exists():
                STATE.status_message = f"Loaded {server_name} from {server_dir}"
                STATE.status_level = "success"
            else:
                STATE.status_message = "Server file not found yet. Saving will create it."
                STATE.status_level = "warning"
            self.respond_action(wants_json)
            return

        if action_path == "/save-profile":
            profile_name = form.get("profile_name", [""])[0].strip() or STATE.selected_profile
            selected_name = save_profile(profile_name)
            save_state()
            STATE.status_message = f"Saved profile {selected_name}"
            STATE.status_level = "success"
            self.respond_action(wants_json)
            return

        if action_path == "/select-profile":
            if is_server_running():
                STATE.status_message = "Stop the running server before switching profiles."
                STATE.status_level = "warning"
                self.respond_action(wants_json)
                return
            profile_name = form.get("profile_name", [""])[0].strip()
            try:
                selected_name = load_profile(profile_name, normalize_server_dir)
            except KeyError:
                STATE.status_message = f"Profile not found: {profile_name}"
                STATE.status_level = "warning"
                self.respond_action(wants_json)
                return
            save_state()
            STATE.status_message = f"Loaded profile {selected_name}"
            STATE.status_level = "success"
            self.respond_action(wants_json)
            return

        if action_path == "/delete-profile":
            if is_server_running():
                STATE.status_message = "Stop the running server before deleting profiles."
                STATE.status_level = "warning"
                self.respond_action(wants_json)
                return
            profile_name = form.get("profile_name", [""])[0].strip()
            try:
                selected_name = delete_profile(profile_name, normalize_server_dir)
            except KeyError:
                STATE.status_message = f"Profile not found: {profile_name}"
                STATE.status_level = "warning"
                self.respond_action(wants_json)
                return
            except ValueError:
                STATE.status_message = "At least one profile must remain."
                STATE.status_level = "warning"
                self.respond_action(wants_json)
                return
            save_state()
            STATE.status_message = f"Deleted profile {profile_name}. Active profile: {selected_name}"
            STATE.status_level = "success"
            self.respond_action(wants_json)
            return

        if action_path == "/save-common":
            server_dir = normalize_server_dir(form.get("server_dir", [""])[0] or str(DEFAULT_SERVER_DIR))
            server_name = form.get("server_name", ["servertest"])[0].strip() or "servertest"
            ini_file = ini_path(server_dir, server_name)
            ini_file.parent.mkdir(parents=True, exist_ok=True)
            ini_file.write_text(form.get("server_config_raw", [""])[0], encoding="utf-8")
            STATE.server_dir = server_dir
            STATE.server_name = server_name
            sync_selected_profile()
            save_state()
            STATE.status_message = f"Saved raw {ini_file.name}"
            STATE.status_level = "success"
            self.respond_action(wants_json)
            return

        if action_path == "/save-mods":
            server_dir = normalize_server_dir(form.get("server_dir", [""])[0] or str(DEFAULT_SERVER_DIR))
            server_name = form.get("server_name", ["servertest"])[0].strip() or "servertest"
            STATE.server_dir = server_dir
            STATE.server_name = server_name
            ini_file = ini_path(server_dir, server_name)
            ini_document = parse_ini_file(ini_file)
            mods_values = [item.strip() for item in form.get("ini_pair_mods", [])]
            display_names = [item.strip() for item in form.get("mod_display_name", [])]
            workshop_values = [item.strip() for item in form.get("ini_pair_workshop", [])]
            image_urls = [item.strip() for item in form.get("mod_image_url", [])]
            enabled_values = form.get("mod_enabled", [])
            filtered_rows = [
                (mod_value, display_name, workshop_value, image_url, enabled_value)
                for mod_value, display_name, workshop_value, image_url, enabled_value in zip(mods_values, display_names, workshop_values, image_urls, enabled_values)
                if mod_value or display_name or workshop_value
            ]
            filtered_mods = []
            normalized_rows = []
            for mod_value, display_name, workshop_value, image_url, enabled_value in filtered_rows:
                row_mod_ids = [
                    item.strip().lstrip("\\/")
                    for item in re.split(r"[,\n;]+", mod_value)
                    if item.strip()
                ]
                normalized_rows.append((row_mod_ids, display_name, workshop_value, image_url, enabled_value))
                if not mod_value or enabled_value != "true":
                    continue
                filtered_mods.extend(row_mod_ids)
            filtered_workshop = [workshop_value for _mod_ids, _display_name, workshop_value, _image_url, enabled_value in normalized_rows if workshop_value and enabled_value == "true"]
            filtered_names = [display_name for _mod_ids, display_name, _workshop_value, _image_url, _enabled_value in normalized_rows]
            filtered_metadata = [
                {"imageUrl": image_url, "enabled": enabled_value == "true", "modIds": row_mod_ids, "workshopId": workshop_value}
                for row_mod_ids, _display_name, workshop_value, image_url, enabled_value in normalized_rows
            ]
            for field in ini_document.fields:
                if field.key == "Mods":
                    field.value = ";".join(f"\\{value}" for value in filtered_mods)
                elif field.key == "WorkshopItems":
                    field.value = ";".join(filtered_workshop)
            write_ini_file(ini_file, ini_document)
            set_mod_display_names(filtered_names)
            set_mod_metadata(filtered_metadata)
            sync_selected_profile()
            save_state()
            STATE.status_message = "Saved Mods, WorkshopItems, and display names"
            STATE.status_level = "success"
            self.respond_action(wants_json)
            return

        if action_path == "/fetch-workshop-mod":
            workshop_id = form.get("workshop_id", [""])[0]
            try:
                self.respond_json({"ok": True, **fetch_workshop_mod_details(workshop_id)})
            except (OSError, ValueError) as error:
                self.respond_json({"ok": False, "message": str(error)})
            return

        if action_path == "/save-launch":
            workdir_value = form.get("launch_workdir", [""])[0] or str(Path.cwd())
            STATE.launch_workdir = normalize_server_dir(workdir_value)
            sync_selected_profile()
            save_state()
            STATE.status_message = "Saved launch working directory"
            STATE.status_level = "success"
            self.respond_action(wants_json)
            return

        if action_path == "/start-server":
            ok, message = start_server()
            STATE.status_message = message
            STATE.status_level = "success" if ok else "warning"
            self.respond_action(wants_json)
            return

        if action_path == "/update-server":
            ok, message = launch_server_update()
            STATE.status_message = message
            STATE.status_level = "success" if ok else "warning"
            self.respond_action(wants_json)
            return

        if action_path == "/toggle-auto-update-check":
            enabled = form.get("enabled", ["false"])[0].strip().lower() == "true"
            ok, message = set_auto_update_check_enabled(enabled)
            STATE.status_message = message
            STATE.status_level = "success" if ok else "warning"
            self.respond_action(wants_json)
            return

        if action_path == "/send-command":
            ok, message = send_server_command(form.get("console_command", [""])[0])
            STATE.status_message = message
            STATE.status_level = "success" if ok else "warning"
            self.respond_action(wants_json)
            return

        if action_path == "/clear-console":
            clear_log_history()
            STATE.status_message = "Cleared console history"
            STATE.status_level = "success"
            self.respond_action(wants_json)
            return

        if action_path == "/set-user-access":
            username = form.get("username", [""])[0]
            access_level = form.get("access_level", [""])[0]
            if is_server_running():
                if not command_channel_available():
                    STATE.status_message = "The server is running, but its command channel is unavailable. Start it from this manager to change access levels live."
                    STATE.status_level = "warning"
                    self.respond_action(wants_json)
                    return
                console_level = "none" if access_level.strip().lower() == "user" else access_level.strip().lower()
                ok, message = send_server_command(f'setaccesslevel "{username.strip()}" "{console_level}"')
            else:
                ok, message = set_user_access_level(STATE.server_name, username, access_level)
            STATE.status_message = message
            STATE.status_level = "success" if ok else "warning"
            self.respond_action(wants_json)
            return

        if action_path == "/player-event":
            event_id = form.get("event_id", [""])[0].strip().lower()
            username = form.get("username", [""])[0].strip()
            radius = form.get("radius", [""])[0].strip() or "4"
            count = form.get("count", [""])[0].strip() or "12"
            if not command_channel_available():
                STATE.status_message = "Player events require a running server started from this manager."
                STATE.status_level = "warning"
                self.respond_action(wants_json)
                return
            if event_id == "lightning":
                if not username:
                    ok, message = False, "Choose a target user for lightning."
                else:
                    ok, message = send_server_command(f'lightning "{username}"')
            elif event_id == "thunder":
                if not username:
                    ok, message = False, "Choose a target user for thunder."
                else:
                    ok, message = send_server_command(f'thunder "{username}"')
            elif event_id == "createhorde":
                if not username:
                    ok, message = False, "Choose a target user for the horde spawn."
                else:
                    ok, message = send_server_command(f'createhorde {count} "{username}"')
            elif event_id == "chopper":
                ok, message = send_server_command("chopper")
            elif event_id == "gunshot":
                ok, message = send_server_command("gunshot")
            else:
                ok, message = False, f"Unknown player event: {event_id}"
            STATE.status_message = message
            STATE.status_level = "success" if ok else "warning"
            self.respond_action(wants_json)
            return

        if action_path == "/reset-map":
            confirmation = form.get("reset_confirmation", [""])[0].strip()
            if confirmation != "RESET":
                STATE.status_message = "Reset cancelled. Type RESET exactly to delete everything in the Saves folder."
                STATE.status_level = "warning"
                self.respond_action(wants_json)
                return
            ok, message = reset_saves_directory(multiplayer_save_path(STATE.server_name, DEFAULT_SAVES_DIR))
            STATE.status_message = message
            STATE.status_level = "success" if ok else "warning"
            self.respond_action(wants_json)
            return

        if action_path == "/stop-server":
            ok, message = stop_server()
            STATE.status_message = message
            STATE.status_level = "success" if ok else "warning"
            self.respond_action(wants_json)
            return

        if action_path == "/save-advanced":
            server_dir = normalize_server_dir(form.get("server_dir", [""])[0] or str(DEFAULT_SERVER_DIR))
            server_name = form.get("server_name", ["servertest"])[0].strip() or "servertest"
            server_dir.mkdir(parents=True, exist_ok=True)
            for label, pattern in ADVANCED_FILES:
                if label == "SandboxVars":
                    continue
                target = advanced_path(server_dir, server_name, pattern)
                target.write_text(form.get(f"raw_{label}", [""])[0], encoding="utf-8")
            STATE.server_dir = server_dir
            STATE.server_name = server_name
            sync_selected_profile()
            save_state()
            STATE.status_message = "Saved advanced server files"
            STATE.status_level = "success"
            self.respond_action(wants_json)
            return

        if action_path == "/save-sandbox":
            server_dir = normalize_server_dir(form.get("server_dir", [""])[0] or str(DEFAULT_SERVER_DIR))
            server_name = form.get("server_name", ["servertest"])[0].strip() or "servertest"
            sandbox_file = advanced_path(server_dir, server_name, "{server}_SandboxVars.lua")
            sandbox_data = load_sandbox_vars(sandbox_file)
            for key, values in form.items():
                if not key.startswith("sandbox__"):
                    continue
                path = key.removeprefix("sandbox__")
                value_type = form.get(f"sandbox_type__{path}", ["str"])[0]
                value = coerce_sandbox_value(values[0], value_type)
                update_sandbox_value(sandbox_data, path, value)
            save_sandbox_vars(sandbox_file, sandbox_data)
            STATE.server_dir = server_dir
            STATE.server_name = server_name
            sync_selected_profile()
            save_state()
            STATE.status_message = f"Saved {sandbox_file.name}"
            STATE.status_level = "success"
            self.respond_action(wants_json)
            return

        if action_path == "/save-sandbox-raw":
            server_dir = normalize_server_dir(form.get("server_dir", [""])[0] or str(DEFAULT_SERVER_DIR))
            server_name = form.get("server_name", ["servertest"])[0].strip() or "servertest"
            sandbox_file = advanced_path(server_dir, server_name, "{server}_SandboxVars.lua")
            sandbox_file.parent.mkdir(parents=True, exist_ok=True)
            sandbox_file.write_text(form.get("sandbox_raw", [""])[0], encoding="utf-8")
            STATE.server_dir = server_dir
            STATE.server_name = server_name
            sync_selected_profile()
            save_state()
            STATE.status_message = f"Saved raw {sandbox_file.name}"
            STATE.status_level = "success"
            self.respond_action(wants_json)
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def parse_form_data(self) -> dict[str, list[str]]:
        content_length = int(self.headers.get("Content-Length", "0"))
        payload = self.rfile.read(content_length).decode("utf-8")
        return parse_qs(payload, keep_blank_values=True)

    def redirect_home(self) -> None:
        self.send_response(HTTPStatus.SEE_OTHER)
        self.send_header("Location", "/")
        self.end_headers()

    def respond_action(self, wants_json: bool) -> None:
        if wants_json:
            self.respond_json(build_page_data())
            return
        self.redirect_home()

    def respond_html(self, body: str) -> None:
        encoded = body.encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def respond_file(self, path: Path, content_type: str) -> None:
        if not path.exists():
            self.send_error(HTTPStatus.NOT_FOUND, "Missing static asset")
            return
        encoded = path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def serve_frontend_asset(self, request_path: str) -> bool:
        dist_dir = FRONTEND_DIST_DIR
        if not dist_dir.exists():
            return False
        relative = request_path.lstrip("/")
        if not relative:
            return False
        candidate = (dist_dir / relative).resolve()
        if dist_dir.resolve() not in candidate.parents and candidate != dist_dir.resolve():
            return False
        if not candidate.exists() or not candidate.is_file():
            return False
        content_type, _encoding = mimetypes.guess_type(candidate.name)
        self.respond_file(candidate, content_type or "application/octet-stream")
        return True

    def respond_json(self, payload: dict[str, object]) -> None:
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format: str, *args) -> None:
        return
