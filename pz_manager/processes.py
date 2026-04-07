from __future__ import annotations

import subprocess
import threading

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

    process = subprocess.Popen(
        STATE.launch_command,
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
    append_log_line(f"=== Starting server PID {process.pid} ===")
    threading.Thread(target=stream_process_output, args=(process,), daemon=True).start()
    save_state()
    return True, f"Started server on PID {process.pid}"


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
