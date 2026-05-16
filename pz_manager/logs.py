from __future__ import annotations

import threading
from collections import deque

from .config import APP_STORAGE_DIR, LEGACY_LOG_FILE, LOG_FILE


LOG_LINES: deque[str] = deque(maxlen=500)
STEAMCMD_LOG_LINES: deque[str] = deque(maxlen=500)
LOG_LOCK = threading.Lock()
STEAMCMD_LOG_LOCK = threading.Lock()
STEAMCMD_LOG_FILE = APP_STORAGE_DIR / ".pz_manager_steamcmd.log"


def append_log_line(line: str) -> None:
    cleaned = line.rstrip("\r\n")
    with LOG_LOCK:
        LOG_LINES.append(cleaned)
        try:
            APP_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
            with LOG_FILE.open("a", encoding="utf-8") as handle:
                handle.write(cleaned + "\n")
        except OSError:
            # Keep the manager responsive even if the log file is temporarily unwritable.
            return


def append_steamcmd_log_line(line: str) -> None:
    cleaned = line.rstrip("\r\n")
    with STEAMCMD_LOG_LOCK:
        STEAMCMD_LOG_LINES.append(cleaned)
        try:
            APP_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
            with STEAMCMD_LOG_FILE.open("a", encoding="utf-8") as handle:
                handle.write(cleaned + "\n")
        except OSError:
            return


def load_log_history() -> None:
    source = LOG_FILE if LOG_FILE.exists() else LEGACY_LOG_FILE
    if not source.exists():
        return
    with LOG_LOCK:
        try:
            for line in source.read_text(encoding="utf-8").splitlines()[-500:]:
                LOG_LINES.append(line)
        except OSError:
            return
    if STEAMCMD_LOG_FILE.exists():
        with STEAMCMD_LOG_LOCK:
            try:
                for line in STEAMCMD_LOG_FILE.read_text(encoding="utf-8").splitlines()[-500:]:
                    STEAMCMD_LOG_LINES.append(line)
            except OSError:
                return


def current_logs() -> list[str]:
    with LOG_LOCK:
        return list(LOG_LINES)


def current_steamcmd_logs() -> list[str]:
    with STEAMCMD_LOG_LOCK:
        return list(STEAMCMD_LOG_LINES)


def clear_steamcmd_log_history() -> None:
    with STEAMCMD_LOG_LOCK:
        STEAMCMD_LOG_LINES.clear()
        try:
            APP_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
            STEAMCMD_LOG_FILE.write_text("", encoding="utf-8")
        except OSError:
            return


def clear_log_history() -> None:
    with LOG_LOCK:
        LOG_LINES.clear()
        try:
            APP_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
            LOG_FILE.write_text("", encoding="utf-8")
        except OSError:
            return
