"""Create DEV configuration on the Pi without printing secrets. Never replaces it."""
import os
import secrets
import uuid
from pathlib import Path

path = Path('/home/ari/ary/ary.env')
fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w') as output:
    output.write('# DEV only; not paired with production; no outbound telemetry\n')
    output.write('APP_BASE_URL=http://127.0.0.1:3000\n')
    output.write('ROBOT_DEVICE_ID=' + str(uuid.uuid4()) + '\n')
    output.write('ROBOT_BRIDGE_SECRET=DEV_' + secrets.token_hex(32) + '\n')
print('DEV environment created, mode 0600; secrets not displayed')
