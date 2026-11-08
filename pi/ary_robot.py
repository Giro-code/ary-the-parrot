"""Outbound-only telemetry and secondary maintenance channel. Python 3.11+."""
import argparse
import hashlib
import hmac
import json
import os
import sqlite3
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid


def signing_message(method, path, device_id, timestamp, nonce, body=b""):
    return "\n".join((method, path, device_id, str(timestamp), nonce,
                      hashlib.sha256(body).hexdigest())).encode()


def signed_headers(secret, method, path, device_id, body=b"", timestamp=None, nonce=None):
    timestamp = int(time.time()) if timestamp is None else timestamp
    nonce = nonce or uuid.uuid4().hex
    signature = hmac.new(secret.encode(), signing_message(
        method, path, device_id, timestamp, nonce, body), hashlib.sha256).hexdigest()
    return {"X-Ary-Device": device_id, "X-Ary-Timestamp": str(timestamp),
            "X-Ary-Nonce": nonce, "X-Ary-Signature": signature,
            "Content-Type": "application/json"}


class OfflineQueue:
    """SQLite commits survive process restarts. Retry keeps the same eventId."""
    def __init__(self, path):
        self.path = path
        self.lock = threading.Lock()
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, payload TEXT NOT NULL, created REAL NOT NULL)")
        self.db.commit()

    def put(self, event):
        if set(event) != {"eventId", "state", "hardware"}:
            raise ValueError("invalid_telemetry")
        with self.lock, self.db:
            self.db.execute("INSERT OR IGNORE INTO events VALUES (?, ?, ?)",
                            (event["eventId"], json.dumps(event, separators=(",", ":")), time.time()))
            # Bounded health-only queue. Remove oldest events after prolonged outages.
            self.db.execute("DELETE FROM events WHERE id IN (SELECT id FROM events ORDER BY created DESC LIMIT -1 OFFSET 1000)")

    def pending(self, limit=20):
        with self.lock:
            return [json.loads(row[0]) for row in self.db.execute(
                "SELECT payload FROM events ORDER BY created, id LIMIT ?", (limit,))]

    def acknowledge(self, event_id):
        with self.lock, self.db:
            self.db.execute("DELETE FROM events WHERE id = ?", (event_id,))

    def close(self):
        with self.lock:
            self.db.close()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward device signatures/secrets to another origin.
        return None


class CloudClient:
    def __init__(self, base_url, device_id, secret, queue, maintenance, development=False):
        url = urllib.parse.urlsplit(base_url)
        local = development and url.scheme == "http" and url.hostname in ("127.0.0.1", "localhost")
        if not (url.scheme == "https" or local) or url.path not in ("", "/") or url.query or url.fragment or url.username:
            raise ValueError("https_origin_required")
        uuid.UUID(device_id)
        if len(secret) < 32:
            raise ValueError("device_secret_required")
        self.base_url = base_url.rstrip("/")
        self.device_id, self.secret, self.queue = device_id, secret, queue
        self.maintenance = maintenance
        self.opener = urllib.request.build_opener(NoRedirect())

    def request(self, method, path, payload=None):
        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode() if payload else b""
        request = urllib.request.Request(self.base_url + path, data=body if method == "POST" else None,
                                         headers=signed_headers(self.secret, method, path, self.device_id, body), method=method)
        with self.opener.open(request, timeout=5) as response:
            return json.loads(response.read(8192))

    def flush(self):
        for event in self.queue.pending():
            result = self.request("POST", "/api/robot/events", event)
            if not result.get("accepted"):
                break
            self.queue.acknowledge(event["eventId"])

    def poll(self):
        command = self.request("GET", "/api/robot/commands").get("command")
        if command and command.get("state") == "maintenance" and command.get("gesture") in ("rest", "stop"):
            self.maintenance(command["gesture"])

    def run(self, stopped, snapshot):
        while not stopped.is_set():
            state, hardware = snapshot()
            self.queue.put({"eventId": str(uuid.uuid4()), "state": state, "hardware": hardware})
            try:
                self.flush()
                self.poll()
            except (OSError, ValueError, urllib.error.URLError, RuntimeError):
                print("cloud_unavailable; health queued", flush=True)
            stopped.wait(15)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--simulate", action="store_true", required=True)
    parser.add_argument("--queue", default="events.sqlite3")
    parser.add_argument("--dev", action="store_true")
    args = parser.parse_args()
    queue = OfflineQueue(args.queue)
    stopped = threading.Event()
    client = CloudClient(os.environ["APP_BASE_URL"], os.environ["ROBOT_DEVICE_ID"],
                         os.environ["ROBOT_DEVICE_AUTH_SECRET"], queue,
                         lambda gesture: print("Simulador · GESTURE " + gesture, flush=True), args.dev)
    try:
        client.run(stopped, lambda: ("idle", "simulated"))
    except KeyboardInterrupt:
        stopped.set()
    finally:
        queue.close()


if __name__ == "__main__":
    main()
