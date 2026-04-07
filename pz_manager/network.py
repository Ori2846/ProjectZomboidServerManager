from __future__ import annotations

import socket

from .config import PORT


def get_primary_local_ip() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


def get_access_url() -> str:
    return f"http://{get_primary_local_ip()}:{PORT}"
