#!/bin/sh
# Empareja un parlante Bluetooth y deja a Ari hablando por él (con el jack de respaldo). Ejecutar con: sudo sh setup-bluetooth.sh
# Pon el parlante en modo emparejamiento (luz parpadeando) antes de empezar.
set -u
[ "$(id -u)" = 0 ] || { echo "Ejecuta con sudo"; exit 1; }

echo "== 1/5 Instalando audio Bluetooth (puede tardar 1-2 min)"
apt-get install -y --no-install-recommends bluez-alsa-utils libasound2-plugin-bluez >/tmp/bt-install.log 2>&1 || { echo "Fallo la instalacion (ver /tmp/bt-install.log)"; exit 1; }
usermod -aG bluetooth ari
systemctl enable --now bluealsa.service 2>/dev/null || systemctl enable --now bluealsad.service 2>/dev/null || true
rfkill unblock bluetooth 2>/dev/null || true
bluetoothctl power on >/dev/null

echo "== 2/5 Buscando parlantes durante 20 s (debe estar en modo emparejamiento)"
bluetoothctl --timeout 20 scan on >/dev/null 2>&1
bluetoothctl devices | sed 's/^Device //' > /tmp/bt-devices.txt
if [ ! -s /tmp/bt-devices.txt ]; then echo "No se encontro ningun dispositivo. Revisa que el parlante este en modo emparejamiento y vuelve a ejecutar."; exit 1; fi
nl -w2 -s') ' /tmp/bt-devices.txt
printf "Escribe el numero de tu parlante y pulsa Enter: "
read n
MAC=$(sed -n "${n}p" /tmp/bt-devices.txt | cut -d' ' -f1)
[ -n "$MAC" ] || { echo "Numero no valido"; exit 1; }
echo "Parlante elegido: $(sed -n "${n}p" /tmp/bt-devices.txt)"

echo "== 3/5 Emparejando y conectando"
bluetoothctl pair "$MAC" >/dev/null 2>&1 || true
bluetoothctl trust "$MAC" >/dev/null
bluetoothctl connect "$MAC" | tail -1
sleep 3

echo "== 4/5 Sonido de prueba (escucha el parlante)"
if su ari -c "speaker-test -D bluealsa:DEV=$MAC,PROFILE=a2dp -c 2 -t sine -f 440 -l 1" >/dev/null 2>&1; then
  echo "SONIDO_BT_OK"
else
  echo "No se pudo reproducir por Bluetooth todavia; Ari usara el jack hasta que conecte."
fi

echo "== 5/5 Ari hablara por el parlante Bluetooth (respaldo: jack)"
install -m 644 /home/ari/ary/pi/systemd/ary-headless.service /etc/systemd/system/ary-headless.service
mkdir -p /etc/systemd/system/ary-headless.service.d
cat > /etc/systemd/system/ary-headless.service.d/bluetooth.conf <<CONF
[Unit]
After=bluetooth.target
[Service]
ExecStart=
ExecStart=/home/ari/ary/venv/bin/python -m headless --greet --bluetooth $MAC --mic plughw:CARD=Device,DEV=0 --serial /dev/serial/by-id/usb-Silicon_Labs_CP2102_USB_to_UART_Bridge_Controller_0001-if00-port0
CONF
systemctl daemon-reload
systemctl restart ary-headless.service
echo "BT_LISTO $MAC: Ari se reinicio y saludara por el parlante."
