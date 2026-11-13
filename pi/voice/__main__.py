import argparse
import base64
import json
import os
import threading
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from voice import Voice


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def allowed(self):
        return self.headers.get('Host') == '127.0.0.1:8766' and self.headers.get('Origin') == self.server.origin

    def respond(self, status, body, mime='application/json', source=None):
        data = json.dumps(body).encode() if mime == 'application/json' else body
        self.send_response(status)
        if self.allowed():
            self.send_header('Access-Control-Allow-Origin', self.server.origin)
        self.send_header('Vary', 'Origin')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(data)))
        if source:
            self.send_header('X-Ary-Voice', source)
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        if not self.allowed():
            return self.respond(403, {'error': 'origin_rejected'})
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', self.server.origin)
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.end_headers()

    def do_GET(self):
        if not self.allowed():
            return self.respond(403, {'error': 'origin_rejected'})
        if self.path != '/health':
            return self.respond(404, {'error': 'not_found'})
        self.respond(200, self.server.voice.health())

    def do_POST(self):
        self.connection.settimeout(5)
        if not self.allowed():
            return self.respond(403, {'error': 'origin_rejected'})
        if not self.server.busy.acquire(blocking=False):
            return self.respond(429, {'error': 'voice_busy'})
        try:
            limit = 4 * 1024**2 if self.path == '/cache' else 1500000 if self.path == '/transcribe' else 4096
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= limit or self.headers.get('Transfer-Encoding'):
                raise ValueError('invalid_length')
            raw = self.rfile.read(length)
            if self.path == '/transcribe':
                return self.respond(200, {'text': self.server.voice.transcribe(raw)})
            data = json.loads(raw)
            if not isinstance(data, dict):
                raise ValueError('invalid_body')
            if self.path == '/speak' and set(data) == {'text'}:
                wav, source = self.server.voice.speak(data['text'])
                return self.respond(200, wav, 'audio/wav', source)
            if self.path == '/reply' and set(data) == {'text'}:
                return self.respond(200, self.server.voice.reply(data['text']))
            if self.path == '/cache' and set(data) == {'text', 'wav'}:
                self.server.voice.cache(data['text'], base64.b64decode(data['wav'], validate=True))
                return self.respond(200, {'cached': True})
            self.respond(404, {'error': 'not_found'})
        except (ValueError, TypeError, KeyError, wave.Error, EOFError):
            self.respond(400, {'error': 'invalid_voice_input'})
        except (OSError, RuntimeError, ImportError):
            self.respond(503, {'error': 'local_voice_unavailable'})
        finally:
            self.server.busy.release()


def main():
    parser = argparse.ArgumentParser(description='Loopback voice only; never controls hardware')
    parser.add_argument('--root', default='/home/ari/ary')
    parser.add_argument('--origin', required=True)
    args = parser.parse_args()
    url = urlsplit(args.origin)
    if url.scheme not in ('https', 'http') or not url.netloc or url.path or url.query or url.fragment or url.username or (url.scheme == 'http' and url.hostname not in ('127.0.0.1', 'localhost')):
        parser.error('exact HTTPS origin or HTTP localhost required')
    os.umask(0o077)
    root = Path(args.root)
    catalog_path = root / 'catalog.json'
    voice = Voice(root / 'voice-cache', root / 'models/es_MX-ald-medium.onnx', root / 'models/vosk-model-small-es-0.42', json.loads(catalog_path.read_text()) if catalog_path.exists() else [])
    server = ThreadingHTTPServer(('127.0.0.1', 8766), Handler)
    server.daemon_threads = True
    server.origin, server.voice, server.busy = args.origin, voice, threading.Semaphore(1)
    stopped = threading.Event()
    threading.Thread(target=voice.connectivity, args=(stopped,), daemon=True).start()
    print('Ary voice listening on 127.0.0.1:8766', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        stopped.set()
        server.server_close()


if __name__ == '__main__':
    main()
