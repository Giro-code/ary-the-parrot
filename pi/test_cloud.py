import io
import json
import tempfile
import unittest
import urllib.error
from email.message import Message
from pathlib import Path
from headless import Conversation, NullRobot
from headless.cloud import CloudAry, CloudError


class FakeResponse(io.BytesIO):
    def __init__(self, body, cookies=()):
        super().__init__(body)
        self.headers = Message()
        for cookie in cookies:
            self.headers["Set-Cookie"] = cookie

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


class FakeSite:
    """Imita las rutas de la web que usa la Pi."""
    def __init__(self, fail_first_session=False, down=False):
        self.calls, self.down, self.fail_session = [], down, fail_first_session

    def open(self, request, timeout):
        path, headers = request.full_url.split("arytheparrot.app", 1)[1], dict(request.header_items())
        self.calls.append((request.get_method(), path, headers))
        if self.down:
            raise urllib.error.URLError("sin red")
        assert headers["Origin"] == "https://arytheparrot.app" and headers["X-ary-request"] == "1"
        if path == "/api/kiosk/activate":
            return FakeResponse(b'{"activated":true}', ["ary_kiosk=DEVICE123; Path=/; HttpOnly"])
        if path == "/api/visitor/session":
            assert "ary_kiosk=DEVICE123" in headers["Cookie"]
            return FakeResponse(b'{"session":{}}', ["ary_sid=SESSION%d; Path=/" % len(self.calls)])
        if path == "/api/voice/ask":
            if self.fail_session:
                self.fail_session = False
                raise urllib.error.HTTPError(request.full_url, 401, "x", {}, io.BytesIO(b'{"error":"session_required"}'))
            assert headers["Content-type"] == "audio/wav" and int(headers["X-ary-audio-duration"]) >= 300
            return FakeResponse(json.dumps({"messageId": "m1", "spokenText": "¡El merengue!", "intent": "culture", "transcript": "merengue"}).encode())
        if path == "/api/voice/speak":
            return FakeResponse(b"RIFF-gemini")
        if path == "/api/visitor/session/end":
            return FakeResponse(b'{"ended":true}', ["ary_sid=; Max-Age=0"])
        raise AssertionError(path)


class FakeVoice:
    def __init__(self):
        self.cached, self.spoken = {}, []

    def cache(self, text, wav):
        self.cached[text] = wav

    def speak(self, text):
        self.spoken.append(text)
        return b"RIFF-piper", "piper"

    def reply(self, text):
        return {"spokenText": "Respuesta local", "intent": "culture"}


class CloudTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.credential = Path(self.dir.name) / "kiosk-device.json"

    def tearDown(self):
        self.dir.cleanup()

    def cloud(self, site, now=[0.0]):
        return CloudAry(credential_path=self.credential, opener=site, clock=lambda: now[0])

    def test_activation_stores_private_credential(self):
        cloud = self.cloud(FakeSite())
        cloud.activate("CODE")
        self.assertEqual(json.loads(self.credential.read_text())["ary_kiosk"], "DEVICE123")
        self.assertEqual(CloudAry(credential_path=self.credential).device_token, "DEVICE123")

    def test_gemini_turn_plays_gemini_voice_caches_it_and_moves(self):
        site = FakeSite(fail_first_session=True)
        cloud = self.cloud(site); cloud.activate("CODE")
        voice, robot, played = FakeVoice(), NullRobot(log=lambda *_: None), []
        conversation = Conversation(voice, robot, lambda wav: played.append((wav, robot.state)), log=lambda *_: None, cloud=cloud)
        reply = conversation.handle("háblame del merengue", b"\x00\x00" * 16000)
        self.assertEqual(reply["messageId"], "m1")
        self.assertEqual(played, [(b"RIFF-gemini", "speaking")])
        self.assertEqual(voice.cached, {"¡El merengue!": b"RIFF-gemini"})  # luego sirve sin internet
        self.assertEqual(voice.spoken, [])
        sessions = [call for call in site.calls if call[1] == "/api/visitor/session"]
        self.assertEqual(len(sessions), 2)  # la sesión caducada se reabrió una vez
        self.assertEqual(robot.state, "idle")

    def test_network_failure_falls_back_to_local_and_backs_off(self):
        now = [0.0]
        site = FakeSite(); cloud = self.cloud(site, now); cloud.activate("CODE")
        site.down = True
        voice, played = FakeVoice(), []
        conversation = Conversation(voice, NullRobot(log=lambda *_: None), played.append, log=lambda *_: None, cloud=cloud)
        conversation.handle("háblame del merengue", b"\x00\x00" * 16000)
        self.assertEqual(played, [b"RIFF-piper"])
        self.assertFalse(cloud.available())
        now[0] = 61.0
        self.assertTrue(cloud.available())

    def test_without_activation_stays_local(self):
        cloud = self.cloud(FakeSite())
        voice, played = FakeVoice(), []
        Conversation(voice, NullRobot(log=lambda *_: None), played.append, log=lambda *_: None, cloud=cloud).handle("hola qué tal")
        self.assertEqual(played, [b"RIFF-piper"])

    def test_audio_length_is_checked_before_upload(self):
        cloud = self.cloud(FakeSite()); cloud.activate("CODE")
        with self.assertRaises(CloudError):
            cloud.ask_audio(b"\x00\x00" * 100)


if __name__ == "__main__":
    unittest.main()
