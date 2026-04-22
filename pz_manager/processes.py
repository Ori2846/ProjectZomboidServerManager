from __future__ import annotations

import re
import subprocess
import threading
from pathlib import Path

from .config import STEAM_APP_ID
from .logs import append_log_line
from .state import STATE, save_state


def is_server_running() -> bool:
    if STATE.server_process is not None:
        if STATE.server_process.poll() is None:
            return True
        STATE.server_process = None

    if STATE.server_pid is None:
        return False
    try:
        process = subprocess.run(
            ["tasklist", "/FI", f"PID eq {STATE.server_pid}"],
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError:
        return False

    if str(STATE.server_pid) in process.stdout:
        return True

    STATE.server_pid = None
    save_state()
    return False


def start_server() -> tuple[bool, str]:
    if is_server_running():
        return False, f"Server is already running on PID {STATE.server_pid}"
    if not STATE.launch_command.strip():
        return False, "Set a launch command first."
    if not STATE.launch_workdir.exists():
        return False, "Launch working directory does not exist."

    launch_command = build_launch_command()
    process = subprocess.Popen(
        launch_command,
        cwd=str(STATE.launch_workdir),
        shell=True,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    STATE.server_process = process
    STATE.server_pid = process.pid
    append_log_line(f"=== Starting server PID {process.pid}: {launch_command} ===")
    threading.Thread(target=stream_process_output, args=(process,), daemon=True).start()
    save_state()
    return True, f"Started server on PID {process.pid}"


def build_launch_command() -> str:
    command = STATE.launch_command.strip()
    if not command:
        return command
    # Default the launched server profile to the one selected in the UI unless the user already set it.
    if re.search(r"(^|\s)-servername(\s|$)", command, flags=re.IGNORECASE):
        return command
    server_name = STATE.server_name.strip()
    if not server_name:
        return command
    return f'{command} -servername "{server_name}"'


def send_server_command(command: str) -> tuple[bool, str]:
    if not is_server_running() or STATE.server_process is None or STATE.server_process.stdin is None:
        return False, "Server command channel is not available. Start the server from this manager first."
    trimmed = command.strip()
    if not trimmed:
        return False, "Enter a command first."
    try:
        STATE.server_process.stdin.write(trimmed + "\n")
        STATE.server_process.stdin.flush()
    except OSError as error:
        return False, f"Failed to send command: {error}"

    append_log_line(f">>> {trimmed}")
    return True, f"Sent command: {trimmed}"


def command_channel_available() -> bool:
    return bool(is_server_running() and STATE.server_process is not None and STATE.server_process.stdin is not None)


def stop_server() -> tuple[bool, str]:
    if not is_server_running():
        return False, "Server is not running."

    ok, _message = send_server_command("quit")
    if ok and STATE.server_process is not None:
        try:
            STATE.server_process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            append_log_line("=== Quit command timed out, forcing shutdown ===")
        else:
            pid = STATE.server_pid
            STATE.server_process = None
            STATE.server_pid = None
            append_log_line(f"=== Server process {pid} exited after quit command ===")
            save_state()
            return True, f"Stopped server PID {pid} with quit command"

    result = subprocess.run(
        ["taskkill", "/PID", str(STATE.server_pid), "/T", "/F"],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return False, (result.stderr or result.stdout or "Failed to stop server.").strip()

    pid = STATE.server_pid
    STATE.server_process = None
    STATE.server_pid = None
    append_log_line(f"=== Stopped server PID {pid} ===")
    save_state()
    return True, f"Stopped server PID {pid}"


def stream_process_output(process: subprocess.Popen[str]) -> None:
    if process.stdout is None:
        return
    try:
        for line in process.stdout:
            append_log_line(line)
    finally:
        process.wait()
        if STATE.server_pid == process.pid:
            append_log_line(f"=== Server process {process.pid} exited with code {process.returncode} ===")
            STATE.server_process = None
            STATE.server_pid = None
            save_state()


def _appmanifest_path() -> Path:
    return STATE.launch_workdir / "steamapps" / f"appmanifest_{STEAM_APP_ID}.acf"


def _read_acf_value(text: str, key: str) -> str:
    match = re.search(rf'"{re.escape(key)}"\s+"([^"]*)"', text)
    return match.group(1) if match else ""


def _steamcmd_candidates(manifest_text: str) -> list[Path]:
    launcher_path = _read_acf_value(manifest_text, "LauncherPath")
    candidates = []
    if launcher_path:
        candidates.append(Path(launcher_path))
    candidates.extend(
        [
            STATE.launch_workdir / "steamcmd.exe",
            STATE.launch_workdir.parent / "steamcmd.exe",
            Path.home() / "Desktop" / "steamcmd.exe",
        ]
    )
    deduped = []
    seen = set()
    for candidate in candidates:
        normalized = str(candidate)
        if normalized in seen:
            continue
        seen.add(normalized)
        deduped.append(candidate)
    return deduped


def get_server_version_details() -> dict[str, str]:
    manifest_path = _appmanifest_path()
    if not manifest_path.exists():
        return {
            "buildId": "",
            "branch": "",
            "display": "Unavailable",
            "manifestPath": str(manifest_path),
            "steamcmdPath": "",
        }

    manifest_text = manifest_path.read_text(encoding="utf-8", errors="ignore")
    build_id = _read_acf_value(manifest_text, "buildid")
    branch = _read_acf_value(manifest_text, "BetaKey")
    steamcmd_path = next((str(path) for path in _steamcmd_candidates(manifest_text) if path.exists()), "")

    if build_id and branch:
        display = f"Build {build_id} | {branch}"
    elif build_id:
        display = f"Build {build_id}"
    elif branch:
        display = f"Branch {branch}"
    else:
        display = "Unavailable"

    return {
        "buildId": build_id,
        "branch": branch,
        "display": display,
        "manifestPath": str(manifest_path),
        "steamcmdPath": steamcmd_path,
    }


def launch_server_update() -> tuple[bool, str]:
    if is_server_running():
        return False, "Stop the server before running a SteamCMD update."

    install_dir = STATE.launch_workdir
    if not install_dir.exists():
        return False, "Launch working directory does not exist."

    version_details = get_server_version_details()
    steamcmd_path_value = version_details["steamcmdPath"]
    if not steamcmd_path_value:
        return False, f"Could not find steamcmd.exe. Checked {version_details['manifestPath']} and common SteamCMD paths."

    steamcmd_path = Path(steamcmd_path_value)
    command = [
        str(steamcmd_path),
        "+login",
        "anonymous",
        "+force_install_dir",
        str(install_dir),
        "+app_update",
        STEAM_APP_ID,
    ]
    if version_details["branch"]:
        command.extend(["-beta", version_details["branch"]])
    command.append("+quit")

    try:
        subprocess.Popen(
            command,
            cwd=str(steamcmd_path.parent),
            creationflags=getattr(subprocess, "CREATE_NEW_CONSOLE", 0),
        )
    except OSError as error:
        return False, f"Failed to open SteamCMD: {error}"

    append_log_line(f"=== SteamCMD update started for app {STEAM_APP_ID} in {install_dir} ===")
    branch_text = f" on branch {version_details['branch']}" if version_details["branch"] else ""
    return True, f"Opened SteamCMD update for Project Zomboid{branch_text}."
