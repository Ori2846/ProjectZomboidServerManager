from __future__ import annotations

import re
import subprocess
import threading
import time
import urllib.request
import zipfile
from pathlib import Path

from .config import STEAM_APP_ID, STEAMCMD_DIR, STEAMCMD_DOWNLOAD_URL, STEAMCMD_EXE
from .logs import append_log_line, append_steamcmd_log_line, clear_steamcmd_log_history
from .state import STATE, save_state

AUTO_UPDATE_CHECK_INTERVAL_SECONDS = 1800
AUTO_UPDATE_THREAD_STARTED = False
STEAMCMD_LOCK = threading.Lock()


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
    if not STATE.launch_workdir.exists():
        return False, "Launch working directory does not exist."
    if not inferred_launch_script().exists():
        return False, f"Launch script does not exist: {inferred_launch_script()}"

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
    command = f'"{inferred_launch_script()}"'
    # Default the launched server profile to the one selected in the UI unless the user already set it.
    server_name = STATE.server_name.strip()
    if not server_name:
        return command
    return f'{command} -servername "{server_name}"'


def inferred_launch_script() -> Path:
    return STATE.launch_workdir / "StartServer64.bat"


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
            "steamcmdPath": str(STEAMCMD_EXE) if STEAMCMD_EXE.exists() else "",
        }

    manifest_text = manifest_path.read_text(encoding="utf-8", errors="ignore")
    build_id = _read_acf_value(manifest_text, "buildid")
    branch = _read_acf_value(manifest_text, "BetaKey")
    steamcmd_path = str(STEAMCMD_EXE) if STEAMCMD_EXE.exists() else next((str(path) for path in _steamcmd_candidates(manifest_text) if path.exists()), "")

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
    if is_update_running():
        return False, "SteamCMD update is already running."

    install_dir = STATE.launch_workdir
    install_dir.mkdir(parents=True, exist_ok=True)
    STATE.update_progress = 0
    STATE.update_message = "Preparing SteamCMD"
    STATE.update_active = True
    clear_steamcmd_log_history()
    append_steamcmd_log_line(f"=== Preparing SteamCMD in {STEAMCMD_DIR} ===")
    threading.Thread(target=run_server_update, args=(install_dir,), daemon=True).start()
    return True, "SteamCMD update started."


def run_server_update(install_dir: Path) -> None:
    should_check_after_update = False
    if not STEAMCMD_LOCK.acquire(blocking=False):
        STATE.update_message = "SteamCMD is busy. Try again after the current check finishes."
        append_steamcmd_log_line("=== SteamCMD is busy with another operation ===")
        STATE.update_active = False
        return
    try:
        ensure_steamcmd_installed()
        command = [
            str(STEAMCMD_EXE),
            "+force_install_dir",
            str(install_dir),
            "+login",
            "anonymous",
            "+app_update",
            STEAM_APP_ID,
            "validate",
            "+quit",
        ]

        process = subprocess.Popen(
            command,
            cwd=str(STEAMCMD_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        STATE.update_process = process
        STATE.update_message = "SteamCMD update running"
        append_steamcmd_log_line(f"=== SteamCMD update started for Project Zomboid app {STEAM_APP_ID} in {install_dir} ===")
        stream_update_output(process)
        should_check_after_update = process.returncode == 0 and STATE.auto_update_check_enabled
    except OSError as error:
        STATE.update_message = f"SteamCMD update failed: {error}"
        append_steamcmd_log_line(f"=== SteamCMD update failed: {error} ===")
    finally:
        STATE.update_active = False
        STEAMCMD_LOCK.release()
    if should_check_after_update:
        threading.Thread(target=check_for_available_update, daemon=True).start()


def is_update_running() -> bool:
    if STATE.update_active:
        return True
    if STATE.update_process is None:
        return False
    if STATE.update_process.poll() is None:
        return True
    STATE.update_process = None
    return False


def update_status() -> dict[str, object]:
    local_build_id = get_server_version_details()["buildId"]
    return {
        "running": is_update_running(),
        "progress": STATE.update_progress,
        "message": STATE.update_message,
        "steamcmdPath": str(STEAMCMD_EXE),
        "autoCheckEnabled": STATE.auto_update_check_enabled,
        "updateAvailable": STATE.update_available,
        "localBuildId": local_build_id,
        "latestBuildId": STATE.latest_build_id,
        "checkMessage": STATE.last_update_check_message,
    }


def ensure_steamcmd_installed() -> None:
    if STEAMCMD_EXE.exists():
        STATE.update_progress = max(STATE.update_progress, 10)
        STATE.update_message = "SteamCMD is installed"
        return

    STEAMCMD_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = STEAMCMD_DIR / "steamcmd.zip"
    STATE.update_message = "Downloading SteamCMD"
    STATE.update_progress = 2
    append_steamcmd_log_line(f"=== Downloading SteamCMD from {STEAMCMD_DOWNLOAD_URL} ===")
    urllib.request.urlretrieve(STEAMCMD_DOWNLOAD_URL, zip_path, reporthook=steamcmd_download_progress)

    STATE.update_message = "Extracting SteamCMD"
    STATE.update_progress = 8
    append_steamcmd_log_line(f"=== Extracting SteamCMD to {STEAMCMD_DIR} ===")
    with zipfile.ZipFile(zip_path) as archive:
        archive.extractall(STEAMCMD_DIR)
    try:
        zip_path.unlink()
    except OSError:
        pass
    if not STEAMCMD_EXE.exists():
        raise OSError(f"steamcmd.exe was not found after extracting {zip_path}")
    STATE.update_progress = 12


def steamcmd_download_progress(block_count: int, block_size: int, total_size: int) -> None:
    if total_size <= 0:
        STATE.update_progress = max(STATE.update_progress, 4)
        return
    downloaded = min(block_count * block_size, total_size)
    percent = downloaded / total_size
    STATE.update_progress = max(2, min(8, int(percent * 8)))
    STATE.update_message = f"Downloading SteamCMD: {int(percent * 100)}%"


def stream_update_output(process: subprocess.Popen[str]) -> None:
    if process.stdout is None:
        return
    try:
        for line in process.stdout:
            append_steamcmd_log_line(line)
            update_progress_from_line(line)
    finally:
        process.wait()
        if STATE.update_process == process:
            STATE.update_process = None
        if process.returncode == 0:
            STATE.update_progress = 100
            STATE.update_message = "SteamCMD update complete"
            append_steamcmd_log_line("=== SteamCMD update completed successfully ===")
        else:
            STATE.update_message = f"SteamCMD update exited with code {process.returncode}"
            append_steamcmd_log_line(f"=== SteamCMD update exited with code {process.returncode} ===")


def update_progress_from_line(line: str) -> None:
    lowered = line.lower()
    match = re.search(r"(\d{1,3}(?:\.\d+)?)\s*%", line)
    if match:
        percent = min(99, max(STATE.update_progress, int(float(match.group(1)))))
        STATE.update_progress = percent
        STATE.update_message = f"Updating Project Zomboid: {percent}%"
        return
    if "downloading" in lowered:
        STATE.update_progress = max(STATE.update_progress, 18)
        STATE.update_message = "Downloading Project Zomboid server files"
    elif "verifying" in lowered or "verification" in lowered or "validating" in lowered:
        STATE.update_progress = max(STATE.update_progress, 82)
        STATE.update_message = "Validating Project Zomboid server files"
    elif "success!" in lowered or "fully installed" in lowered:
        STATE.update_progress = 100
        STATE.update_message = "SteamCMD update complete"


def set_auto_update_check_enabled(enabled: bool) -> tuple[bool, str]:
    STATE.auto_update_check_enabled = enabled
    if enabled:
        STATE.last_update_check_message = "Auto-check enabled. Checking Steam for updates."
        save_state()
        start_auto_update_checker()
        threading.Thread(target=check_for_available_update, daemon=True).start()
        return True, "Auto-update check enabled."
    STATE.update_available = False
    STATE.last_update_check_message = "Auto-check is off"
    save_state()
    return True, "Auto-update check disabled."


def start_auto_update_checker() -> None:
    global AUTO_UPDATE_THREAD_STARTED
    if AUTO_UPDATE_THREAD_STARTED:
        return
    AUTO_UPDATE_THREAD_STARTED = True
    threading.Thread(target=auto_update_check_loop, daemon=True).start()


def auto_update_check_loop() -> None:
    while True:
        if STATE.auto_update_check_enabled:
            check_for_available_update()
        time.sleep(AUTO_UPDATE_CHECK_INTERVAL_SECONDS)


def check_for_available_update() -> None:
    if is_update_running():
        STATE.last_update_check_message = "Update check skipped while SteamCMD update is running."
        save_state()
        return
    local_build_id = get_server_version_details()["buildId"]
    if not local_build_id:
        STATE.update_available = False
        STATE.last_update_check_message = "Install or update once before checking for newer builds."
        save_state()
        return
    if not STEAMCMD_LOCK.acquire(blocking=False):
        STATE.last_update_check_message = "Update check skipped because SteamCMD is busy."
        save_state()
        return
    try:
        ensure_steamcmd_installed()
        latest_build_id = fetch_latest_steam_build_id()
    except OSError as error:
        STATE.last_update_check_message = f"Update check failed: {error}"
        append_steamcmd_log_line(f"=== Update check failed: {error} ===")
        save_state()
        return
    finally:
        STEAMCMD_LOCK.release()

    STATE.latest_build_id = latest_build_id
    STATE.update_available = bool(latest_build_id and latest_build_id != local_build_id)
    if STATE.update_available:
        STATE.last_update_check_message = f"Update available: local build {local_build_id}, latest build {latest_build_id}."
    elif latest_build_id:
        STATE.last_update_check_message = f"Server is current at build {local_build_id}."
    else:
        STATE.last_update_check_message = "Could not read latest build from Steam app info."
    save_state()


def fetch_latest_steam_build_id() -> str:
    command = [
        str(STEAMCMD_EXE),
        "+login",
        "anonymous",
        "+app_info_update",
        "1",
        "+app_info_print",
        STEAM_APP_ID,
        "+quit",
    ]
    append_steamcmd_log_line(f"=== Checking Steam app info for Project Zomboid app {STEAM_APP_ID} ===")
    process = subprocess.run(
        command,
        cwd=str(STEAMCMD_DIR),
        capture_output=True,
        text=True,
        check=False,
    )
    output = "\n".join(part for part in [process.stdout, process.stderr] if part)
    if process.returncode != 0:
        raise OSError(f"SteamCMD app info check exited with code {process.returncode}")
    latest_build_id = parse_public_build_id(output)
    if latest_build_id:
        append_steamcmd_log_line(f"=== Latest public Steam build: {latest_build_id} ===")
    else:
        append_steamcmd_log_line("=== Steam app info did not include a public build ID ===")
    return latest_build_id


def parse_public_build_id(output: str) -> str:
    path: list[str] = []
    pending_key = ""
    tokens = re.findall(r'"([^"]+)"|([{}])', output)
    for quoted, brace in tokens:
        if quoted:
            if path[-2:] == ["branches", "public"] and pending_key == "buildid":
                return quoted
            pending_key = quoted
            continue
        if brace == "{":
            if pending_key:
                path.append(pending_key)
                pending_key = ""
            continue
        if brace == "}":
            if path:
                path.pop()
            pending_key = ""
    return ""
