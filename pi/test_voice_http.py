import http.client
import importlib
import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from voice import Voice
from test_voice import wav


class VoiceHttpTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), importlib.import_module('voice.__main__').Handler)
        self.server.voice = Voice(self.temp.name, 'missing', 'missing', synthesizer=lambda _: wav())
        self.server.origin = 'https://ary.example.invalid'
        self.server.busy = threading.Semaphore(1)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, method, path, data=None, origin='https://ary.example.invalid', host='127.0.0.1:8766'):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port)
        conn.request(method, path, json.dumps(data) if data is not None else None, {'Host': host, 'Origin': origin, 'Content-Type': 'application/json'})
        response = conn.getresponse()
        status, body, headers = response.status, response.read(), dict(response.getheaders())
        conn.close()
        return status, body, headers

    def test_origin_host_and_preflight(self):
        self.assertEqual(self.request('GET', '/health', origin='https://evil.invalid')[0], 403)
        self.assertEqual(self.request('GET', '/health', host='evil.invalid')[0], 403)
        self.assertEqual(self.request('OPTIONS', '/speak')[2]['Access-Control-Allow-Private-Network'], 'true')

    def test_speak_health_no_hardware_routes_and_busy(self):
        self.assertEqual(self.request('GET', '/health')[0], 200)
        result = self.request('POST', '/speak', {'text': 'Hola'})
        self.assertEqual(result[0], 200)
        self.assertEqual(result[1][:4], b'RIFF')
        self.assertEqual(self.request('POST', '/command', {'type': 'state', 'state': 'speaking'})[0], 404)
        self.server.busy.acquire()
        try:
            self.assertEqual(self.request('POST', '/speak', {'text': 'Hola'})[0], 429)
        finally:
            self.server.busy.release()

    def test_malformed_body_and_fields(self):
        for data in ([], None, {'text': ''}, {'text': 'Hola', 'path': '/tmp/anything'}):
            self.assertIn(self.request('POST', '/speak', data)[0], (400, 404))
