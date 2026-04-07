from __future__ import annotations

import threading
from collections import deque

from .config import LOG_FILE


LOG_LINES: deque[str] = deque(maxlen=500)
LOG_LOCK = threading.Lock()


def append_log_line(line: str) -> None:
    cleaned = line.rstrip("\r\n")
    with LOG_LOCK:
        LOG_LINES.append(cleaned)
        with LOG_FILE.open("a", encoding="utf-8") as handle:
            handle.write(cleaned + "\n")


def load_log_history() -> None:
    if not LOG_FILE.exists():
        return
    with LOG_LOCK:
        for line in LOG_FILE.read_text(encoding="utf-8").splitlines()[-500:]:
            LOG_LINES.append(line)


def current_logs() -> list[str]:
    with LOG_LOCK:
        return list(LOG_LINES)

