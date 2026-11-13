import io
import tempfile
import unittest
import wave
from unittest.mock import MagicMock, patch
from pathlib import Path
from voice import Voice, cache_key, validate_wav


def wav():
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as output:
        output.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
        output.writeframes(b'\0\0' * 1600)
    return buffer.getvalue()


class VoiceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.calls = []
        self.voice = Voice(self.temp.name, 'missing.onnx', 'missing-vosk', synthesizer=lambda text: self.calls.append(text) or wav(), recognizer=lambda data: 'merengue')

    def test_cache_precedes_piper_and_normalizes_whitespace(self):
        self.assertEqual(self.voice.speak('Hola')[1], 'piper')
        self.voice.cache(' Hola ', wav())
        self.assertEqual(self.voice.speak('Hola')[1], 'cache')
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(cache_key(' Hola  Ary '), cache_key('Hola Ary'))

    def test_invalid_audio_and_text_rejected(self):
        for text in ('', '!', 'x' * 701, None):
            with self.assertRaises(ValueError):
                self.voice.speak(text)
        with self.assertRaises((ValueError, wave.Error, EOFError)):
            self.voice.cache('Hola', b'bad')

    def test_transcription_mock_and_no_files_written(self):
        self.assertEqual(self.voice.transcribe(wav()), 'merengue')
        self.assertEqual(list(Path(self.temp.name).iterdir()), [])

    def test_corrupt_cache_recovers_and_health_does_not_claim_models(self):
        (Path(self.temp.name) / (cache_key('Hola') + '.wav')).write_bytes(b'bad')
        self.assertEqual(self.voice.speak('Hola')[1], 'piper')
        self.assertFalse(self.voice.health()['piper'])
        self.assertEqual(self.voice.health()['mode'], 'unknown')

    def test_local_catalog_grounding_and_sensitive_redirect(self):
        self.voice.catalog = [dict(id='123', title='Merengue', summary='Ficha existente.', aliases=['musica'], url='https://example.invalid', editor='Fixture')]
        answer = self.voice.reply('Háblame de música')
        self.assertEqual(answer['spokenText'], 'Ficha existente.')
        self.assertEqual(len(answer['sources']), 1)
        answer = self.voice.reply('puerta de vuelo')
        self.assertEqual(answer['intent'], 'sensitive')
        self.assertEqual(answer['sources'], [])

    def test_long_audio_rejected_before_recognition(self):
        data = wav()
        self.assertEqual(validate_wav(data), data)
        with self.assertRaises(ValueError):
            validate_wav(data, max_seconds=.01)

    def test_connectivity_transition_does_not_use_audio(self):
        for available in (True, False):
            stopped = MagicMock()
            stopped.is_set.side_effect = [False, True]
            with patch('voice.socket.create_connection') as connection:
                if not available:
                    connection.side_effect = OSError('offline fixture')
                self.voice.connectivity(stopped)
            self.assertEqual(self.voice.health()['mode'], 'online' if available else 'offline')
            stopped.wait.assert_called_once_with(10)
