"""Uso (en la Pi, desde /home/ari/ary/pi con el venv):

  python -m headless --text "háblame del merengue"            # un turno sin micrófono
  python -m headless --wav pregunta.wav                       # transcribe un WAV y responde
  python -m headless                                          # escucha el micrófono para siempre
  añade --serial /dev/serial/by-id/usb-Silicon_Labs_CP2102_...  para mover a Ari (firmware ari_control)

No ejecutar a la vez que el puente (bridge) con --serial: ambos usarían el mismo puerto.
"""
import argparse
import json
import signal
import sys
import threading
from pathlib import Path

from headless import Conversation, NullRobot, SerialRobot, aplay_player, arecord, capture_devices, listen_forever


def main():
    parser = argparse.ArgumentParser(description="Ari sin pantalla: micrófono → Vosk → fichas locales → Piper/caché + movimiento")
    parser.add_argument("--root", default="/home/ari/ary")
    parser.add_argument("--serial", help="Puerto del Arduino con firmware ari_control (sin él, no hay movimiento)")
    parser.add_argument("--mic", help="Dispositivo ALSA de captura, p. ej. plughw:1,0")
    parser.add_argument("--speaker", help="Dispositivo ALSA de salida (por defecto el jack)")
    parser.add_argument("--text", help="Responde a este texto una vez y termina")
    parser.add_argument("--wav", help="Transcribe este WAV (mono 16 bits) una vez, responde y termina")
    parser.add_argument("--greet", action="store_true", help="Saluda al arrancar")
    parser.add_argument("--silent", action="store_true", help="No reproducir audio (pruebas sin parlante)")
    parser.add_argument("--verbose", action="store_true", help="Mostrar lo oído y la respuesta (no se guarda en disco)")
    args = parser.parse_args()

    from voice import Voice
    root = Path(args.root)
    catalog = root / "catalog.json"
    voice = Voice(root / "voice-cache", root / "models/es_MX-ald-medium.onnx", root / "models/vosk-model-small-es-0.42",
                  json.loads(catalog.read_text()) if catalog.exists() else [])

    if args.serial:
        import serial
        from bridge import SerialHardware
        port = serial.Serial(args.serial, baudrate=115200, timeout=0.1, write_timeout=0.5)
        robot = SerialRobot(SerialHardware(port, boot_wait=4.0))
        print("robot · Arduino listo", flush=True)
    else:
        robot = NullRobot()

    play = (lambda wav: None) if args.silent else aplay_player(args.speaker)
    conversation = Conversation(voice, robot, play, verbose=args.verbose)
    stopped = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: stopped.set())

    try:
        if args.greet:
            conversation.say("¡Hola, hola! Soy Ary, la cotorra de República Dominicana. ¿Qué quieres descubrir?")
        if args.text or args.wav:
            heard = args.text if args.text else voice.transcribe(Path(args.wav).read_bytes())
            if args.wav:
                print("transcripción · %d palabras" % len(heard.split()) + (": " + heard if args.verbose else ""), flush=True)
            if conversation.handle(heard) is None:
                print("nada que responder (texto vacío o muy corto)", flush=True)
            return
        if "card" not in capture_devices() and not args.mic:
            print("No hay micrófono: conecta uno USB (arecord -l debe listarlo) o usa --text / --wav.", file=sys.stderr)
            sys.exit(2)
        from vosk import KaldiRecognizer, Model, SetLogLevel
        SetLogLevel(-1)
        model = Model(str(voice.vosk_model))
        microphone = arecord(args.mic)
        print("Ari escuchando… (Ctrl+C para salir)", flush=True)
        try:
            listen_forever(conversation, lambda: KaldiRecognizer(model, 16000), microphone.stdout, stopped)
        finally:
            microphone.terminate()
    except KeyboardInterrupt:
        pass
    finally:
        robot.close()


if __name__ == "__main__":
    main()
