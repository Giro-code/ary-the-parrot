import json
import threading
import unittest
from headless import Conversation, NullRobot, SerialRobot, listen_forever


class FakeVoice:
    def __init__(self):
        self.spoken = []

    def reply(self, text):
        return {"spokenText": "El merengue es el ritmo nacional.", "intent": "culture"}

    def speak(self, text):
        self.spoken.append(text)
        return b"RIFF-fake", "piper"


class RecordingRobot(NullRobot):
    def __init__(self):
        super().__init__(log=lambda *_: None)
        self.history = []

    def set_state(self, state):
        if state != self.state:
            self.history.append(state)
        super().set_state(state)


class FakeHardware:
    status = "ok"

    def __init__(self):
        self.sent = []

    def send(self, command):
        self.sent.append(command)

    def heartbeat(self):
        self.sent.append("PING")

    def close(self):
        self.sent.append("CLOSE")


class FakeRecognizer:
    """Da un resultado final si el fragmento esta en el guion; el resto no produce texto."""
    def __init__(self, script):
        self.script, self.last = script, ""

    def AcceptWaveform(self, chunk):
        self.last = self.script.get(chunk, "")
        return chunk in self.script

    def Result(self):
        return json.dumps({"text": self.last})

    def PartialResult(self):
        return json.dumps({"partial": ""})


class Microphone:
    def __init__(self, chunks):
        self.chunks = list(chunks)

    def read(self, _size):
        return self.chunks.pop(0) if self.chunks else b""


class HeadlessTests(unittest.TestCase):
    def test_turn_moves_while_speaking_and_returns_to_idle(self):
        robot, played = RecordingRobot(), []
        conversation = Conversation(FakeVoice(), robot, lambda wav: played.append((wav, robot.state)), log=lambda *_: None)
        reply = conversation.handle("háblame del merengue")
        self.assertEqual(reply["intent"], "culture")
        self.assertEqual(played, [(b"RIFF-fake", "speaking")])  # suena mientras el estado es speaking
        self.assertEqual(robot.history, ["thinking", "speaking", "idle"])
        self.assertFalse(conversation.speaking.is_set())

    def test_short_noise_is_ignored(self):
        robot = RecordingRobot()
        conversation = Conversation(FakeVoice(), robot, lambda wav: None, log=lambda *_: None)
        self.assertIsNone(conversation.handle("eh"))
        self.assertEqual(robot.history, [])

    def test_playback_failure_still_returns_to_idle(self):
        robot = RecordingRobot()
        def broken(_wav):
            raise OSError("no speaker")
        conversation = Conversation(FakeVoice(), robot, broken, log=lambda *_: None)
        with self.assertRaises(OSError):
            conversation.handle("háblame del merengue")
        self.assertEqual(robot.state, "idle")

    def test_serial_robot_sends_states_and_keepalive(self):
        hardware = FakeHardware()
        robot = SerialRobot(hardware, log=lambda *_: None)
        robot.set_state("speaking"); robot.set_state("speaking")
        threading.Event().wait(1.3)
        robot.set_state("idle")
        robot.close()
        self.assertEqual(hardware.sent[0], "STATE speaking")
        self.assertIn("PING", hardware.sent)
        self.assertEqual(hardware.sent.count("STATE speaking"), 1)
        self.assertEqual(hardware.sent[-1], "CLOSE")

    def test_listen_loop_answers_and_ignores_audio_while_speaking(self):
        robot = RecordingRobot()
        voice = FakeVoice()
        conversation = Conversation(voice, robot, lambda wav: None, log=lambda *_: None)
        script = {b"Q": "háblame del merengue"}
        listen_forever(conversation, lambda: FakeRecognizer(script), Microphone([b"a", b"Q", b"b"]), threading.Event(), log=lambda *_: None)
        self.assertEqual(voice.spoken, ["El merengue es el ritmo nacional."])
        self.assertEqual(robot.state, "idle")


class ResilientAudioTests(unittest.TestCase):
    def test_bluetooth_failure_reconnects_then_falls_back_to_jack(self):
        import subprocess
        from headless import resilient_player
        calls, reconnects = [], []
        def bluetooth(wav):
            calls.append("bt")
            raise subprocess.CalledProcessError(1, "aplay")
        def jack(wav):
            calls.append("jack")
        play = resilient_player([("bluetooth", bluetooth), ("jack", jack)], lambda: reconnects.append(1), log=lambda *_: None)
        self.assertEqual(play(b"RIFF"), "jack")
        self.assertEqual(calls, ["bt", "bt", "jack"])
        self.assertEqual(reconnects, [1])

    def test_all_outputs_failing_never_raises(self):
        from headless import resilient_player
        def broken(wav):
            raise OSError("sin audio")
        play = resilient_player([("bluetooth", broken), ("jack", broken)], log=lambda *_: None)
        self.assertIsNone(play(b"RIFF"))


if __name__ == "__main__":
    unittest.main()
