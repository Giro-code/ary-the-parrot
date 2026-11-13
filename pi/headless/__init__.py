"""Ari sin pantalla: escucha por micrófono, responde con la voz local y mueve pico y alas mientras habla.

Todo corre en la Pi (Raspberry Pi OS Lite). No guarda audio ni conversaciones: el audio del micrófono solo
pasa por memoria hacia Vosk y el texto reconocido se descarta tras responder.
"""
import json
import subprocess
import threading
from collections import deque

# Saludo de Ary (version en espanol de "No plans? I'll guide ya!"), igual que en la web.
GREETING = "¿Sin planes? ¡Yo te guío! Soy Ary, la cotorra de República Dominicana. ¿Qué quieres descubrir?"
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


def bluetooth_reconnect(mac, runner=subprocess.run):
    """Pide a BlueZ reconectar el parlante (ya emparejado y de confianza). No lanza errores."""
    def reconnect():
        try:
            runner(["bluetoothctl", "connect", mac], capture_output=True, timeout=10)
        except (OSError, subprocess.SubprocessError):
            pass
    return reconnect


def resilient_player(players, reconnect=None, log=print):
    """Prueba cada salida en orden (p. ej. parlante Bluetooth y luego el jack). Si el Bluetooth falla, intenta
    reconectarlo una vez antes de pasar a la siguiente. Nunca lanza: si todo falla, Ari sigue sin sonido."""
    def play(wav):
        for index, (name, player) in enumerate(players):
            for attempt in (0, 1):
                try:
                    player(wav)
                    return name
                except (OSError, subprocess.SubprocessError) as error:
                    if attempt == 0 and index == 0 and reconnect:
                        log("audio · %s falló (%s); reconectando" % (name, type(error).__name__))
                        reconnect()
                        continue
                    log("audio · %s no disponible" % name)
                    break
        log("audio · ninguna salida funcionó; sigo sin sonido")
        return None
    return play


class Conversation:
    """Un turno: con internet, la web (Gemini entiende el audio, responde y habla con la voz Sulafat);
    sin internet o si la web falla, Vosk + fichas locales + caché/Piper. Siempre se mueve mientras habla."""
    def __init__(self, voice, robot, play, log=print, verbose=False, cloud=None):
        self.voice, self.robot, self.play, self.log, self.verbose = voice, robot, play, log, verbose
        self.cloud = cloud
        self.speaking = threading.Event()

    def _play(self, wav):
        self.speaking.set()
        self.robot.set_state("speaking")
        try:
            self.play(wav)
        finally:
            self.robot.set_state("idle")
            self.speaking.clear()

    def say(self, text):
        wav, source = self.voice.speak(text)
        self._play(wav)
        return source

    def _cloud_reply(self, reply):
        """Reproduce la respuesta de la web con la voz de Gemini y la guarda para usarla también sin internet."""
        wav = self.cloud.speak(reply["messageId"])
        try:
            self.voice.cache(reply["spokenText"], wav)
        except (ValueError, OSError):
            pass
        self._play(wav)

    def greet(self, fallback_text):
        if self.cloud and self.cloud.available():
            try:
                self._cloud_reply(self.cloud.welcome())
                return "gemini"
            except Exception as error:  # noqa: BLE001 - cualquier fallo de la web cae al modo local
                self.log("web · %s; saludo local" % getattr(error, "code", type(error).__name__))
        return self.say(fallback_text)

    def handle(self, heard, pcm=None):
        heard = " ".join((heard or "").split())
        if len(heard.split()) < MIN_WORDS:
            return None
        self.robot.set_state("thinking")
        if self.cloud and self.cloud.available():
            try:
                reply = self.cloud.ask_audio(pcm) if pcm else self.cloud.ask_text(heard)
                if self.verbose:
                    self.log("oído (Gemini): " + str(reply.get("transcript") or heard))
                    self.log("Ari: " + reply["spokenText"])
                self._cloud_reply(reply)
                self.log("turno · intención=%s voz=gemini" % reply.get("intent"))
                return reply
            except Exception as error:  # noqa: BLE001
                self.log("web · %s; respondo en local" % getattr(error, "code", type(error).__name__))
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
    preroll = deque(maxlen=4)          # ~0,5 s antes de que Vosk note la voz
    utterance = []                     # audio de la frase en curso (para Gemini)
    while not stopped.is_set():
        chunk = microphone.read(CHUNK_BYTES)
        if not chunk:
            log("micrófono · sin datos; termino")
            return
        if conversation.speaking.is_set():
            recognizer = recognizer_factory()
            hearing = False
            preroll.clear(); utterance = []
            continue
        if hearing:
            utterance.append(chunk)
        if recognizer.AcceptWaveform(chunk):
            text = json.loads(recognizer.Result()).get("text", "")
            pcm = b"".join(list(preroll) + utterance + ([] if hearing else [chunk]))[-15 * SAMPLE_RATE * 2:]
            hearing = False
            preroll.clear(); utterance = []
            if text:
                conversation.handle(text, pcm)
                recognizer = recognizer_factory()  # descarta el audio captado durante la respuesta
            continue
        else:
            partial = json.loads(recognizer.PartialResult()).get("partial", "")
            if partial and not hearing:
                hearing = True
                utterance = [chunk]
                conversation.robot.set_state("listening")
            elif not partial and hearing:
                hearing = False
                utterance = []
                conversation.robot.set_state("idle")
            if not hearing:
                preroll.append(chunk)


def arecord(device=None):
    command = ["arecord", "-q", "-f", "S16_LE", "-r", str(SAMPLE_RATE), "-c", "1", "-t", "raw"] + (["-D", device] if device else [])
    return subprocess.Popen(command, stdout=subprocess.PIPE)


def capture_devices():
    try:
        return subprocess.run(["arecord", "-l"], capture_output=True, text=True, timeout=5).stdout
    except (OSError, subprocess.SubprocessError):
        return ""

