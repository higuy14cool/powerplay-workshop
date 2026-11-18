#!/usr/bin/env python3
"""Start POWERPLAY Workshop locally and open it in your browser.

Double-click "Start POWERPLAY.command" (mac/Linux) or
"Start POWERPLAY.bat" (Windows) to run this.
"""
import argparse
import contextlib
import functools
import http.server
import os
import socket
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, *args):
        pass


def free_port(start):
    for port in range(start, start + 40):
        with contextlib.closing(socket.socket()) as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
    raise SystemExit("No free port found near %d." % start)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--no-open", action="store_true")
    args = ap.parse_args()

    port = free_port(args.port)
    url = "http://localhost:%d/app.html" % port
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", port), functools.partial(Handler, directory=ROOT)
    )

    print("POWERPLAY Workshop is running.")
    print("App:   %s" % url)
    print("Site:  http://localhost:%d/" % port)
    print("Keep this window open. Press Ctrl+C to stop.")
    if not args.no_open:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
