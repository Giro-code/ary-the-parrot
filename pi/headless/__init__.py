"""Ari sin pantalla: escucha por micrófono, responde con la voz local y mueve pico y alas mientras habla.

Todo corre en la Pi (Raspberry Pi OS Lite). No guarda audio ni conversaciones: el audio del micrófono solo
pasa por memoria hacia Vosk y el texto reconocido se descarta tras responder.
"""
import json
import subprocess
import threading

MIN_WORDS = 2            # ignora ruidos de una sola palabra ("eh", "ah")
SAMPLE_RATE = 16000
CHUNK_BYTES = 4000       # 125 ms de audio PCM16 mono a 16 kHz


class NullRobot:
    """Sin Arduino: solo informa los estados (útil para probar voz sola)."""
    def __init__(self, log=print):
        self.log, self.state = log, "idle"

    def set_state(self, state):
        if state != self.state:
            self.state = state
            self.log("robot · " + state)

    def close(self):
        pass


class SerialRobot:
    """Habla con el firmware ari_control usando el mismo transporte con ACK del puente.

    Un hilo envía PING cada segundo para que el watchdog del firmware no devuelva a Ari al reposo
    mientras habla. Si el Arduino falla, Ari sigue conversando sin moverse (fallo enclavado, sin reintentos).
    """
    def __init__(self, hardware, log=print):
        self.hardware, self.log = hardware, log
        self.state = "idle"
        self.stopped = threading.Event()
        self.thread = threading.Thread(target=self._keepalive, daemon=True)
        self.thread.start()

    def _keepalive(self):
        while not self.stopped.wait(1):
            if self.hardware.status == "ok" and self.state != "idle":
                try:
                    self.hardware.heartbeat()
                except Exception:
                    self.log("robot · sin respuesta del Arduino; sigo sin movimiento")

    def set_state(self, state):
        if state == self.state:
            return
        self.state = state
        if self.hardware.status != "ok":
            return
        try:
            self.hardware.send("STATE " + state)
        except Exception:
            self.log("robot · sin respuesta del Arduino; sigo sin movimiento")

    def close(self):
        self.stopped.set()
        try:
            if self.hardware.status == "ok":
                self.hardware.send("STATE idle")
        except Exception:
            pass
        self.hardware.close()


def aplay_player(device=None):
    """Reproduce WAV por ALSA (jack de 3,5 mm por defecto). Bloquea hasta terminar."""
    def play(wav):
        command = ["aplay", "-q"] + (["-D", device] if device else []) + ["-"]
        subprocess.run(command, input=wav, check=True, timeout=120)
    return play


class Conversation:
    """Un turno: texto oído → respuesta local → voz (caché de Gemini o Piper) mientras se mueve."""
    def __init__(self, voice, robot, play, log=print, verbose=False):
        self.voice, self.robot, self.play, self.log, self.verbose = voice, robot, play, log, verbose
        self.speaking = threading.Event()

    def say(self, text):
        wav, source = self.voice.speak(text)
        self.speaking.set()
        self.robot.set_state("speaking")
        try:
            self.play(wav)
        finally:
            self.robot.set_state("idle")
            self.speaking.clear()
        return source

    def handle(self, heard):
        heard = " ".join((heard or "").split())
        if len(heard.split()) < MIN_WORDS:
            return None
        self.robot.set_state("thinking")
        try:
            reply = self.voice.reply(heard)
        except ValueError:
            self.robot.set_state("idle")
            return None
        if self.verbose:
            self.log("oído: " + heard)
            self.log("Ari: " + reply["spokenText"])
        source = self.say(reply["spokenText"])
        self.log("turno · intención=%s voz=%s" % (reply["intent"], source))
        return reply


def listen_forever(conversation, recognizer_factory, microphone, stopped, log=print):
    """Bucle del micrófono. Mientras Ari habla se descarta lo que entra para que no se escuche a sí mismo."""
    recognizer = recognizer_factory()
    hearing = False
    while not stopped.is_set():
        chunk = microphone.read(CHUNK_BYTES)
        if not chunk:
            log("micrófono · sin datos; termino")
            return
        if conversation.speaking.is_set():
            recognizer = recognizer_factory()
            hearing = False
            continue
        if recognizer.AcceptWaveform(chunk):
            text = json.loads(recognizer.Result()).get("text", "")
            hearing = False
            if text:
                conversation.handle(text)
                recognizer = recognizer_factory()  # descarta el audio captado durante la respuesta
        else:
            partial = json.loads(recognizer.PartialResult()).get("partial", "")
            if partial and not hearing:
                hearing = True
                conversation.robot.set_state("listening")
            elif not partial and hearing:
                hearing = False
                conversation.robot.set_state("idle")


def arecord(device=None):
    command = ["arecord", "-q", "-f", "S16_LE", "-r", str(SAMPLE_RATE), "-c", "1", "-t", "raw"] + (["-D", device] if device else [])
    return subprocess.Popen(command, stdout=subprocess.PIPE)


def capture_devices():
    try:
        return subprocess.run(["arecord", "-l"], capture_output=True, text=True, timeout=5).stdout
    except (OSError, subprocess.SubprocessError):
        return ""

