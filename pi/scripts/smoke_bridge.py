"""Brief simulation smoke; generates a token in memory, invokes local curl, stops child."""
import base64
import hashlib
import hmac
import json
import os
import subprocess
import time
import uuid
from pathlib import Path

root = Path('/home/ari/ary')
env = dict(os.environ)
for line in (root / 'ary.env').read_text().splitlines():
    if line and not line.startswith('#'):
        key, value = line.split('=', 1)
        env[key] = value
now = int(time.time())
claims = dict(aud='ary-bridge', deviceId=env['ROBOT_DEVICE_ID'], origin=env['APP_BASE_URL'], iat=now, exp=now+120, jti=str(uuid.uuid4()))
encode = lambda data: base64.urlsafe_b64encode(data).decode().rstrip('=')
payload = encode(json.dumps(claims).encode())
token = payload + '.' + encode(hmac.new(env['ROBOT_BRIDGE_SECRET'].encode(), payload.encode(), hashlib.sha256).digest())
process = subprocess.Popen([str(root/'venv/bin/python'), '-m', 'bridge', '--simulate', '--dev', '--queue', str(root/'events.sqlite3')], cwd=root/'pi', env=env)
try:
    time.sleep(2)
    if process.poll() is not None:
        raise RuntimeError('bridge_exited')
    # Headers via stdin, never process arguments or access logs.
    config = f'header = "Origin: {env["APP_BASE_URL"]}"\nheader = "Authorization: Bearer {token}"\n'
    result = subprocess.run(['curl', '--silent', '--show-error', '--fail', '--max-time', '3', '--config', '-', '-H', 'Content-Type: application/json', '-d', '{"type":"state","state":"thinking"}', 'http://127.0.0.1:8765/command'], input=config, text=True, capture_output=True)
    print('curl POST /command:', result.returncode, result.stdout)
    result.check_returncode()
finally:
    process.send_signal(2)
    process.wait(timeout=15)
