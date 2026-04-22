from __future__ import annotations

import threading
from collections import deque

from .config import APP_STORAGE_DIR, LEGACY_LOG_FILE, LOG_FILE


LOG_LINES: deque[str] = deque(maxlen=500)
LOG_LOCK = threading.Lock()


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


def current_logs() -> list[str]:
    with LOG_LOCK:
        return list(LOG_LINES)


def clear_log_history() -> None:
    with LOG_LOCK:
        LOG_LINES.clear()
        try:
            APP_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
            LOG_FILE.write_text("", encoding="utf-8")
        except OSError:
            return
