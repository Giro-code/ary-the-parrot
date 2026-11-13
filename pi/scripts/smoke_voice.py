"""Exercise the running voice service with curl, no audio playback."""
import json
import base64
import subprocess
from pathlib import Path

root = Path('/home/ari/ary')
base = ['curl', '--silent', '--show-error', '--fail', '--max-time', '30', '-H', 'Origin: http://127.0.0.1:3002']
def request(path, data=None, output=None):
    args = base + ['http://127.0.0.1:8766' + path]
    if data is not None:
        args += ['-H', 'Content-Type: application/json', '--data-binary', '@-']
    if output:
        args += ['-o', str(output)]
    result = subprocess.run(args, input=json.dumps(data) if data is not None else None, text=True, capture_output=True, check=True)
    return result.stdout
print('GET /health', request('/health'))
print('POST /reply', request('/reply', {'text': 'merengue'}))
request('/speak', {'text': 'Hola, soy Ary.'}, root/'endpoint-test.wav')
print('POST /speak WAV bytes:', (root/'endpoint-test.wav').stat().st_size)
print('POST /cache', request('/cache', {'text': 'Hola, soy Ary.', 'wav': base64.b64encode((root/'endpoint-test.wav').read_bytes()).decode()}))
result = subprocess.run(base + ['-D', '-', '-o', '/dev/null', '-H', 'Content-Type: application/json', '--data-binary', '@-', 'http://127.0.0.1:8766/speak'], input=json.dumps({'text': 'Hola, soy Ary.'}), text=True, capture_output=True, check=True)
assert 'X-Ary-Voice: cache' in result.stdout
print('POST /speak repeated: X-Ary-Voice: cache (synthetic Piper fixture, not Gemini)')
