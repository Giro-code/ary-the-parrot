#!/bin/sh
# Deja a Ari autonomo: arranca solo al encender la Pi y se reinicia si falla. Ejecutar con sudo.
set -eu
[ "$(id -u)" = 0 ] || { echo "Ejecuta con sudo"; exit 1; }
sh /home/ari/ary/pi/scripts/setup-usb-gadget.sh
install -m 644 /home/ari/ary/pi/systemd/ary-headless.service /etc/systemd/system/ary-headless.service
systemctl daemon-reload
systemctl enable ary-headless.service
echo "ARI_AUTONOMO_OK: la Pi se reinicia ahora; Ari arrancara solo en ~1 minuto."
systemctl reboot
