#!/bin/sh
# Read-only: never opens serial devices or records/plays audio.
set -u
export LC_ALL=C
date -u '+UTC %Y-%m-%dT%H:%M:%SZ'
uname -srmo
python3 --version
df -h /
lsusb
printf '\nSerial device names (not opened):\n'
find /dev/serial/by-id -maxdepth 1 -type l -printf '%f\n' 2>/dev/null || true
find /dev -maxdepth 1 \( -name 'ttyACM*' -o -name 'ttyUSB*' \) -printf '%f\n'
printf '\nPlayback/capture inventory:\n'
aplay -l 2>&1 || true
arecord -l 2>&1 || true
printf '\nNetwork links (no addresses or identifiers):\n'
ip -brief link | awk '{print $1, $2}'
printf '\nDefault route present: '
ip route show default | awk 'END {print (NR > 0 ? "yes" : "no")}'
