import base64
import contextlib
import hashlib
import hmac
import io
import json
import time
import unittest
import uuid
from pathlib import Path
from ary_robot import OfflineQueue, signed_headers, signing_message, CloudClient
from bridge import BridgeError, Controller, Simulator, SerialHardware, TokenVerifier

SECRET = "test-only-bridge-secret-32-characters"
DEVICE = "11111111-1111-4111-8111-111111111111"
ORIGIN = "https://ary.example.invalid"


def token(now=1000, **overrides):
    data = {"aud": "ary-bridge", "deviceId": DEVICE, "origin": ORIGIN,
            "iat": now, "exp": now + 120, "jti": str(uuid.uuid4()), **overrides}
    encoded = base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip("=")
    signature = base64.urlsafe_b64encode(hmac.new(SECRET.encode(), encoded.encode(), hashlib.sha256).digest()).decode().rstrip("=")
    return encoded + "." + signature


class SigningTests(unittest.TestCase):
    def test_signature_exact_cross_language_message(self):
        body = b'{"state":"idle"}'
        headers = signed_headers(SECRET, "POST", "/api/robot/events", DEVICE, body, 1000, "nonce-test-123456")
        canonical = "\n".join(("POST", "/api/robot/events", DEVICE, "1000", "nonce-test-123456", hashlib.sha256(body).hexdigest()))
        self.assertEqual(signing_message("POST", "/api/robot/events", DEVICE, 1000, "nonce-test-123456", body), canonical.encode())
        self.assertEqual(headers["X-Ary-Signature"], hmac.new(SECRET.encode(), canonical.encode(), hashlib.sha256).hexdigest())

    def test_new_nonce_on_retry(self):
        a = signed_headers(SECRET, "GET", "/api/robot/commands", DEVICE)
        b = signed_headers(SECRET, "GET", "/api/robot/commands", DEVICE)
        self.assertNotEqual(a["X-Ary-Nonce"], b["X-Ary-Nonce"])

    def test_queue_survives_restart_deduplicates_and_acknowledges(self):
        test_root = Path(__file__).resolve().parent.parent / ".cache"
        test_root.mkdir(exist_ok=True)
        path = test_root / ("ary-robot-" + uuid.uuid4().hex + ".sqlite3")
        try:
            event = {"eventId": str(uuid.uuid4()), "state": "idle", "hardware": "simulated"}
            queue = OfflineQueue(path)
            queue.put(event); queue.put(event); queue.close()
            queue = OfflineQueue(path)
            self.assertEqual(queue.pending(), [event])
            queue.acknowledge(event["eventId"])
            self.assertEqual(queue.pending(), [])
            with self.assertRaises(ValueError):
                queue.put({**event, "conversation": "private"})
            queue.close()
        finally:
            path.unlink(missing_ok=True)

    def test_cloud_requires_https_and_never_carries_public_motor_commands(self):
        with self.assertRaises(ValueError):
            CloudClient("http://outside.invalid", DEVICE, SECRET, None, lambda _: None)
        self.assertIsNotNone(CloudClient(ORIGIN, DEVICE, SECRET, None, lambda _: None))


class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.verifier = TokenVerifier(SECRET, ORIGIN, DEVICE)

    def test_valid_token(self):
        self.assertEqual(self.verifier.verify(token(), ORIGIN, 1001)["deviceId"], DEVICE)

    def test_origin_rejected(self):
        for origin in ("null", "https://evil.invalid", ORIGIN + ".evil.invalid", "http://localhost:3000"):
            with self.assertRaises(BridgeError) as error:
                self.verifier.verify(token(), origin, 1001)
            self.assertEqual(error.exception.status, 403)

    def test_invalid_expired_future_wrong_device_token(self):
        cases = [(token() + "x", 1001), (token(), 1200), (token(now=1100), 1000),
                 (token(deviceId=str(uuid.uuid4())), 1001), (token(exp=1400), 1001)]
        for value, now in cases:
            with self.assertRaises(BridgeError):
                self.verifier.verify(value, ORIGIN, now)

    def test_dev_origin_must_also_match_signed_origin(self):
        verifier = TokenVerifier(SECRET, "http://127.0.0.1:3002", DEVICE, True)
        self.assertTrue(verifier.origin_allowed("http://localhost:3000"))
        self.assertFalse(verifier.origin_allowed("http://localhost.evil.invalid:3000"))
        self.assertEqual(verifier.verify(token(origin="http://localhost:3000"), "http://localhost:3000", 1001)["aud"], "ary-bridge")

    def test_gesture_allowlist_and_raw_angles_rejected(self):
        controller = Controller(Simulator())
        for data in ({"type": "gesture", "name": "wave"}, {"type": "gesture", "name": "rest", "angle": 180}, {"type": "angle", "value": 90}):
            with self.assertRaises(BridgeError):
                controller.command(data)
        with contextlib.redirect_stdout(io.StringIO()) as output:
            controller.command({"type": "state", "state": "welcome"})
            controller.command({"type": "gesture", "name": "wave"})
        self.assertIn("Simulador", output.getvalue())
        self.assertEqual(controller.snapshot(), ("welcome", "simulated"))

    def test_rate_limit_is_global_across_tokens(self):
        controller = Controller(Simulator())
        with contextlib.redirect_stdout(io.StringIO()):
            for _ in range(8):
                controller.command({"type": "state", "state": "idle"}, now=10)
            with self.assertRaises(BridgeError) as error:
                controller.command({"type": "state", "state": "idle"}, now=10)
            self.assertEqual(error.exception.status, 429)
            controller.command({"type": "state", "state": "idle"}, now=12)

    def test_presence_is_an_event_without_session_or_recording(self):
        import queue
        controller = Controller(Simulator())
        subscriber = queue.Queue(); controller.subscribers.add(subscriber)
        controller.sensor(True)
        self.assertEqual(subscriber.get_nowait(), {"type": "sensor", "sensor": "presence", "value": True})
        self.assertEqual(controller.state, "idle")

    def test_serial_handshake_ack_and_no_retry_after_fault(self):
        class Port:
            def __init__(self):
                self.lines = [b"SENSOR presence 1\n", b"ACK STATE idle\n"]
                self.writes = []
            def write(self, value): self.writes.append(value)
            def readline(self, size):
                if self.lines: return self.lines.pop(0)
                time.sleep(0.05)
                return b""
        port = Port()
        serial = SerialHardware(port)
        self.assertEqual(serial.sensors, [True])
        with self.assertRaises(BridgeError): serial.send("STATE thinking")
        writes = len(port.writes)
        with self.assertRaises(BridgeError): serial.send("GESTURE ponder")
        self.assertEqual(len(port.writes), writes)
        self.assertEqual(serial.status, "error")


if __name__ == "__main__":
    unittest.main()
