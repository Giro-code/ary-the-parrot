"""Offline audio only. No serial imports, cloud AI, microphones or playback."""
import hashlib
import io
import json
import socket
import threading
import time
import unicodedata
import uuid
import wave
from pathlib import Path

MAX_WAV = 3 * 1024**2


def normalized(text):
    return ' '.join(text.strip().split())


def cache_key(text):
    return hashlib.sha256(normalized(text).encode()).hexdigest()


def validate_wav(data, max_seconds=90):
    if len(data) > MAX_WAV:
        raise ValueError('audio_too_large')
    with wave.open(io.BytesIO(data), 'rb') as source:
        if source.getnchannels() != 1 or source.getsampwidth() != 2 or source.getcomptype() != 'NONE':
            raise ValueError('mono_pcm16_required')
        if not 8000 <= source.getframerate() <= 48000 or not 0 < source.getnframes() / source.getframerate() <= max_seconds:
            raise ValueError('invalid_duration')
        frames = source.readframes(source.getnframes())
        if len(frames) != source.getnframes() * 2:
            raise ValueError('truncated_wav')
    return data


class Voice:
    def __init__(self, root, piper_model, vosk_model, catalog=(), synthesizer=None, recognizer=None):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.piper_model, self.vosk_model = Path(piper_model), Path(vosk_model)
        self.catalog = list(catalog)
        self.synthesizer, self.recognizer = synthesizer, recognizer
        self.piper = self.vosk = None
        self.lock = threading.Lock()
        self.mode, self.checked_at = 'unknown', None

    def _prune(self):
        files = sorted(self.root.glob('*.wav'), key=lambda path: path.stat().st_mtime, reverse=True)
        total = 0
        for path in files:
            total += path.stat().st_size
            if total > 64 * 1024**2 or time.time() - path.stat().st_mtime > 7 * 86400:
                path.unlink(missing_ok=True)

    def cache(self, text, data):
        self._text(text)
        validate_wav(data)
        with self.lock:
            path = self.root / (cache_key(text) + '.wav')
            temporary = path.with_suffix('.tmp')
            temporary.write_bytes(data)
            temporary.chmod(0o600)
            temporary.replace(path)
            self._prune()

    def _text(self, text):
        if not isinstance(text, str) or not 1 <= len(normalized(text)) <= 700 or not any(c.isalnum() for c in text):
            raise ValueError('invalid_text')

    def speak(self, text):
        self._text(text)
        with self.lock:
            self._prune()
            path = self.root / (cache_key(text) + '.wav')
            if path.exists():
                try:
                    return validate_wav(path.read_bytes()), 'cache'
                except (ValueError, wave.Error, EOFError):
                    path.unlink()
            if self.synthesizer:
                data = self.synthesizer(normalized(text))
            else:
                from piper import PiperVoice
                if self.piper is None:
                    self.piper = PiperVoice.load(str(self.piper_model))
                output = io.BytesIO()
                with wave.open(output, 'wb') as wav:
                    self.piper.synthesize_wav(normalized(text), wav)
                data = output.getvalue()
            # Piper is deliberately not stored here: a subsequent Gemini import wins.
            return validate_wav(data), 'piper'

    def transcribe(self, data):
        validate_wav(data, 15)
        with self.lock:
            if self.recognizer:
                return self.recognizer(data)
            from vosk import Model, KaldiRecognizer, SetLogLevel
            SetLogLevel(-1)
            if self.vosk is None:
                self.vosk = Model(str(self.vosk_model))
            with wave.open(io.BytesIO(data), 'rb') as source:
                recognizer = KaldiRecognizer(self.vosk, source.getframerate())
                parts = []
                while chunk := source.readframes(4000):
                    if recognizer.AcceptWaveform(chunk):
                        parts.append(json.loads(recognizer.Result()).get('text', ''))
                parts.append(json.loads(recognizer.FinalResult()).get('text', ''))
            return ' '.join(part for part in parts if part)[:500]

    def reply(self, text):
        self._text(text)
        fold = lambda value: ''.join(c for c in unicodedata.normalize('NFD', value.lower()) if not unicodedata.combining(c))
        import re
        # Palabras que no distinguen una ficha de otra (casi todas mencionan RD).
        stop = {'de', 'la', 'el', 'los', 'las', 'lo', 'un', 'una', 'y', 'o', 'a', 'en', 'es', 'que', 'del', 'al', 'me', 'mi', 'tu', 'te',
                'por', 'para', 'con', 'se', 'su', 'hablame', 'cuentame', 'dime', 'sobre', 'quiero', 'saber', 'conocer', 'descubrir',
                'vamos', 'soy', 'eres', 'hola', 'ary', 'ari', 'gracias', 'como', 'cual', 'donde', 'mas', 'muy', 'republica',
                'dominicana', 'dominicano', 'dominicanos', 'rd', 'pais'}
        words = set(re.findall(r'\w+', fold(text))) - stop
        hits = []
        # No offline advice about live operational or sensitive matters.
        sensitive = {'vuelo', 'vuelos', 'puerta', 'emergencia', 'salud', 'medicina', 'migracion', 'aduana', 'seguridad', 'ley', 'visa'}
        if words & sensitive:
            spoken = 'Consulta al personal del aeropuerto o a la autoridad oficial. Yo puedo acompañarte con las fichas culturales.'
            intent = 'sensitive'
        else:
            for item in self.catalog:
                score = len(words & set(re.findall(r'\w+', fold(item['title'] + ' ' + ' '.join(item.get('aliases', []))))))
                if score:
                    hits.append((score, item))
            hits.sort(key=lambda pair: pair[0], reverse=True)
            hits = [pair[1] for pair in hits[:1]]
            spoken = hits[0]['summary'][:600] if hits else '¡Hola, hola! Soy Ary, la cotorra de República Dominicana. Sin internet podemos descubrir música, comida e historia en mis fichas locales.'
            intent = 'culture' if hits else 'preferences'
        sources = [{key: item[key] for key in ('id', 'title', 'summary', 'url', 'editor')} for item in hits] if intent == 'culture' else []
        return dict(messageId=str(uuid.uuid4()), detectedLanguage='es', displayText=spoken, spokenText=spoken, answer=spoken, intent=intent, citedItemIds=[item['id'] for item in sources], followUps=['Merengue', 'Mangú', 'Bachata'], confidence=1 if sources else 0, mode='demo', sources=sources, handoff=intent == 'sensitive')

    def health(self):
        return dict(mode=self.mode, checkedAt=self.checked_at, piper=self.piper_model.is_file(), vosk=self.vosk_model.is_dir(), catalogItems=len(self.catalog))

    def connectivity(self, stopped):
        # Reachability only, no conversation data; independent of HTTP request latency.
        while not stopped.is_set():
            try:
                with socket.create_connection(('www.google.com', 443), timeout=2):
                    self.mode = 'online'
            except OSError:
                self.mode = 'offline'
            self.checked_at = int(time.time())
            stopped.wait(10)
