"""Loopback bridge. No public listening socket and no raw servo angles."""
import base64
import hashlib
import hmac
import json
import queue
import threading
import time
import uuid
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

GESTURES = {
    "idle": ("rest",), "welcome": ("wave", "rest"), "listening": ("attentive", "rest"),
    "thinking": ("ponder", "rest"), "speaking": ("talk", "rest"), "handoff_qr": ("point", "rest"),
    "offline": ("rest",), "error": ("stop",), "maintenance": ("rest", "stop"),
}


def decode64(value):
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


class BridgeError(RuntimeError):
    def __init__(self, code, status=400):
        self.code, self.status = code, status


class TokenVerifier:
    def __init__(self, secret, origin, device_id, development=False):
        if len(secret) < 32:
            raise ValueError("bridge_secret_required")
        parsed = urlsplit(origin)
        if parsed.scheme not in ("http", "https") or parsed.path not in ("", "/") or parsed.query or parsed.fragment or parsed.username:
            raise ValueError("app_origin_required")
        if parsed.scheme != "https" and not (development and parsed.hostname in ("localhost", "127.0.0.1")):
            raise ValueError("https_origin_required")
        uuid.UUID(device_id)
        self.secret, self.origin, self.device_id = secret, origin.rstrip("/"), device_id
        self.development = development

    def origin_allowed(self, origin):
        if origin == self.origin:
            return True
        parsed = urlsplit(origin or "")
        return self.development and parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1") and parsed.path == "" and not parsed.query and not parsed.fragment and not parsed.username

    def verify(self, token, origin, now=None):
        now = int(time.time()) if now is None else now
        if not self.origin_allowed(origin):
            raise BridgeError("origin_rejected", 403)
        try:
            if len(token) > 2048:
                raise ValueError()
            payload, signature = token.split(".")
            expected = hmac.new(self.secret.encode(), payload.encode(), hashlib.sha256).digest()
            if not hmac.compare_digest(decode64(signature), expected):
                raise ValueError()
            data = json.loads(decode64(payload))
            if data["aud"] != "ary-bridge" or data["deviceId"] != self.device_id or data["origin"] != origin:
                raise ValueError()
            if type(data["iat"]) is not int or type(data["exp"]) is not int or not (data["iat"] <= now + 5 < data["exp"] <= data["iat"] + 120):
                raise ValueError()
            uuid.UUID(data["jti"])
            return data
        except (ValueError, KeyError, TypeError, UnicodeError):
            raise BridgeError("token_rejected", 401) from None


class Simulator:
    status = "simulated"

    def send(self, command):
        print("Simulador · " + command, flush=True)

    def heartbeat(self):
        pass

    def close(self):
        pass


class SerialHardware:
    """ACK-gated transport with a latched fault. No automatic command retries."""
    def __init__(self, serial_port):
        self.port, self.status = serial_port, "error"
        self.lock = threading.Lock()
        self.sensors = []
        self._exchange("STATE idle")
        self.status = "ok"

    def _exchange(self, command):
        with self.lock:
            try:
                self.port.write((command + "\n").encode("ascii"))
                deadline = time.monotonic() + 0.8
                while time.monotonic() < deadline:
                    line = self.port.readline(128).decode("ascii", errors="replace").strip()
                    if line == "ACK " + command:
                        return
                    if line in ("SENSOR presence 1", "SENSOR presence 0"):
                        self.sensors.append(line.endswith("1"))
                raise OSError("ack_timeout")
            except OSError:
                self.status = "error"
                raise BridgeError("serial_ack_failed", 503) from None

    def send(self, command):
        if self.status != "ok":
            raise BridgeError("serial_fault_latched", 503)
        self._exchange(command)

    def heartbeat(self):
        self.send("PING")

    def close(self):
        self.port.close()


class Controller:
    def __init__(self, hardware):
        self.hardware, self.state = hardware, "idle"
        self.lock = threading.RLock()
        self.commands = deque()
        self.subscribers = set()

    def snapshot(self):
        with self.lock:
            return self.state, self.hardware.status

    def publish(self, event):
        for subscriber in tuple(self.subscribers):
            try:
                subscriber.put_nowait(event)
            except queue.Full:
                # Keep the most recent state, including a latched hardware fault.
                subscriber.get_nowait()
                subscriber.put_nowait(event)

    def sensor(self, value):
        with self.lock:
            self.publish({"type": "sensor", "sensor": "presence", "value": bool(value)})

    def command(self, data, now=None):
        now = time.monotonic() if now is None else now
        with self.lock:
            while self.commands and self.commands[0] <= now - 1:
                self.commands.popleft()
            if len(self.commands) >= 8:
                raise BridgeError("rate_limited", 429)
            self.commands.append(now)
            if not isinstance(data, dict):
                raise BridgeError("invalid_command")
            if set(data) == {"type", "state"} and data["type"] == "state" and isinstance(data["state"], str) and data["state"] in GESTURES:
                command = "STATE " + data["state"]
            elif set(data) == {"type", "name"} and data["type"] == "gesture" and data["name"] in GESTURES[self.state]:
                command = "GESTURE " + data["name"]
            else:
                raise BridgeError("command_not_allowed")
            try:
                self.hardware.send(command)
            except BridgeError:
                self.publish({"type": "hardware", "status": "error"})
                raise
            if data["type"] == "state":
                self.state = data["state"]

    def maintenance(self, gesture):
        self.command({"type": "state", "state": "maintenance"})
        self.command({"type": "gesture", "name": gesture})


class BridgeServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, verifier, controller):
        self.verifier, self.controller = verifier, controller
        # Deliberately fixed. Never bind this service to a public/network interface.
        super().__init__(("127.0.0.1", 8765), BridgeHandler)


class BridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Tokens and headers must never enter access logs.

    def origin(self):
        origin = self.headers.get("Origin", "")
        if self.headers.get("Host") != "127.0.0.1:8765" or not self.server.verifier.origin_allowed(origin):
            raise BridgeError("origin_rejected", 403)
        return origin

    def authorize(self):
        origin = self.origin()
        authorization = self.headers.get("Authorization", "")
        if not authorization.startswith("Bearer "):
            raise BridgeError("token_required", 401)
        return self.server.verifier.verify(authorization[7:], origin)

    def headers_for(self, status, content_type="application/json"):
        self.send_response(status)
        origin = self.headers.get("Origin", "")
        if self.server.verifier.origin_allowed(origin):
            self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Vary", "Origin")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Type", content_type)

    def respond(self, status, data):
        payload = json.dumps(data).encode()
        self.headers_for(status)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        try:
            self.origin()
            if self.path not in ("/events", "/command"):
                raise BridgeError("not_found", 404)
            self.headers_for(204)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.end_headers()
        except BridgeError as error:
            self.respond(error.status, {"error": error.code})

    def do_POST(self):
        self.connection.settimeout(3)
        try:
            self.authorize()
            if self.path != "/command":
                raise BridgeError("not_found", 404)
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 1024 or self.headers.get("Transfer-Encoding"):
                raise BridgeError("invalid_body")
            data = json.loads(self.rfile.read(length))
            self.server.controller.command(data)
            self.respond(200, {"accepted": True})
        except BridgeError as error:
            self.respond(error.status, {"error": error.code})
        except (ValueError, TypeError):
            self.respond(400, {"error": "invalid_body"})

    def do_GET(self):
        subscriber = queue.Queue(maxsize=32)
        registered = False
        try:
            claims = self.authorize()
            if self.path != "/events":
                raise BridgeError("not_found", 404)
            controller = self.server.controller
            with controller.lock:
                if len(controller.subscribers) >= 4:
                    raise BridgeError("too_many_clients", 429)
                controller.subscribers.add(subscriber)
                registered = True
                subscriber.put({"type": "hardware", "status": controller.hardware.status})
            self.connection.settimeout(3)
            self.headers_for(200, "text/event-stream")
            self.end_headers()
            while time.time() < claims["exp"]:
                try:
                    event = subscriber.get(timeout=1)
                    self.wfile.write(("data: " + json.dumps(event) + "\n\n").encode())
                except queue.Empty:
                    self.wfile.write(b": heartbeat\n\n")
                self.wfile.flush()
        except BridgeError as error:
            self.respond(error.status, {"error": error.code})
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass
        finally:
            if registered:
                with self.server.controller.lock:
                    self.server.controller.subscribers.discard(subscriber)
