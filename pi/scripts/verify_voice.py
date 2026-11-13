"""Final bounded HTTP verification; always terminates its voice child."""
import subprocess
import sys
import time
from pathlib import Path

root = Path('/home/ari/ary')
python = root/'venv/bin/python'
process = subprocess.Popen([str(python), '-u', '-m', 'voice', '--origin', 'http://127.0.0.1:3002'], cwd=root/'pi')
try:
    time.sleep(2)
    if process.poll() is not None:
        raise RuntimeError('voice_did_not_start')
    subprocess.run([str(python), str(root/'pi/scripts/smoke_voice.py')], check=True)
finally:
    process.terminate()
    process.wait(timeout=10)
    print('Temporary voice process stopped; no systemd unit enabled.', flush=True)
