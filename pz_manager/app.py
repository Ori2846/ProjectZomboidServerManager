from __future__ import annotations

from http.server import ThreadingHTTPServer

from .config import DEFAULT_SERVER_DIR, HOST, PORT
from .files import normalize_server_dir
from .http import RequestHandler
from .logs import load_log_history
from .network import get_access_url
from .state import load_state


def run() -> None:
    load_state(normalize_server_dir)
    load_log_history()
    server = ThreadingHTTPServer((HOST, PORT), RequestHandler)
    print(f"PZ Server Manager listening on {HOST}:{PORT}")
    print(f"Local network URL: {get_access_url()}")
    print(f"Default server folder: {DEFAULT_SERVER_DIR}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server manager.")
    finally:
        server.server_close()
