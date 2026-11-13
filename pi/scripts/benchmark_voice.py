"""Synthetic WAV test; no microphone, speaker or cloud AI."""
import json
import sys
import time
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from voice import Voice

root = Path('/home/ari/ary')
voice = Voice(root/'voice-cache', root/'models/es_MX-ald-medium.onnx', root/'models/vosk-model-small-es-0.42')
phrase = 'Hola, soy Ary, la cotorra. Vamos a descubrir la música y la comida de República Dominicana.'
started = time.perf_counter()
data, source = voice.speak(phrase)
elapsed = time.perf_counter() - started
path = root/'piper-test.wav'
path.write_bytes(data)
with wave.open(str(path)) as audio:
    duration = audio.getnframes() / audio.getframerate()
    rate = audio.getframerate()
started = time.perf_counter()
text = voice.transcribe(data)
print(json.dumps(dict(phrase=phrase, source=source, synthesisSeconds=elapsed, audioSeconds=duration, sampleRate=rate, realTimeFactor=elapsed/duration, transcription=text, sttSeconds=time.perf_counter()-started), ensure_ascii=False), flush=True)
