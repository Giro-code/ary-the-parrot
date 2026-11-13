import contextlib
import http.client
import io
import json
import threading
import time
import unittest
from http.server import ThreadingHTTPServer
from bridge import BridgeHandler, Controller, Simulator, TokenVerifier
from test_robot import SECRET, DEVICE, ORIGIN, token


class BridgeHttpTests(unittest.TestCase):
    def setUp(self):
        # Ephemeral port for isolated handler tests. Production BridgeServer binds only 8765.
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), BridgeHandler)
        self.server.daemon_threads = True
        self.server.verifier = TokenVerifier(SECRET, ORIGIN, DEVICE)
        self.server.controller = Controller(Simulator())
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join(timeout=2)

    def request(self, method, path, payload=None, origin=ORIGIN, authenticated=True):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        headers = {"Host": "127.0.0.1:8765", "Origin": origin, "Content-Type": "application/json"}
        if authenticated:
            headers["Authorization"] = "Bearer " + token(now=int(time.time()))
        connection.request(method, path, json.dumps(payload) if payload is not None else None, headers)
        return connection, connection.getresponse()

    def test_origin_and_missing_token_rejected_over_http(self):
        for origin, authenticated, expected in (("https://evil.invalid", True, 403), (ORIGIN, False, 401)):
            connection, response = self.request("POST", "/command", {"type": "state", "state": "welcome"}, origin, authenticated)
            try:
                self.assertEqual(response.status, expected)
                if origin != ORIGIN:
                    self.assertIsNone(response.getheader("Access-Control-Allow-Origin"))
                response.read()
            finally: connection.close()

    def test_local_state_only_when_enabled(self):
        connection, response = self.request("POST", "/command", {"type": "state", "state": "speaking"}, authenticated=False)
        try: self.assertEqual(response.status, 401)
        finally: connection.close()
        self.server.allow_local_state = True
        for payload, origin, expected in (({"type": "state", "state": "speaking"}, ORIGIN, 200),
                                          ({"type": "gesture", "name": "talk"}, ORIGIN, 401),
                                          ({"type": "state", "state": "speaking"}, "https://evil.invalid", 403)):
            connection, response = self.request("POST", "/command", payload, origin, authenticated=False)
            try: self.assertEqual(response.status, expected)
            finally: connection.close()
        self.assertTrue(self.server.controller.local_active())
        self.assertEqual(self.server.controller.state, "speaking")

    def test_preflight_and_invalid_motor_commands(self):
        connection, response = self.request("OPTIONS", "/command", authenticated=False)
        self.assertEqual(response.status, 204); self.assertEqual(response.getheader("Access-Control-Allow-Origin"), ORIGIN)
        response.read(); connection.close()
        connection, response = self.request("POST", "/command", {"type": "gesture", "name": "wave", "angle": 180})
        self.assertEqual(response.status, 400); response.read(); connection.close()

    def test_simulator_stream_and_presence(self):
        connection, response = self.request("GET", "/events")
        try:
            self.assertEqual(response.status, 200)
            self.assertIn(b'"status": "simulated"', response.readline())
            response.readline()
            self.server.controller.sensor(True)
            self.assertIn(b'"sensor": "presence"', response.readline())
        finally: connection.close()
        with contextlib.redirect_stdout(io.StringIO()):
            connection, response = self.request("POST", "/command", {"type": "state", "state": "thinking"})
            self.assertEqual(response.status, 200); response.read(); connection.close()
        self.assertEqual(self.server.controller.snapshot(), ("thinking", "simulated"))


if __name__ == "__main__":
    unittest.main()
