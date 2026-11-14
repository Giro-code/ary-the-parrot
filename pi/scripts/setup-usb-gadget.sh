#!/bin/sh
# Modo "red por USB-C" para mantenimiento: al conectar la Pi 4 al PC por el USB-C (el de alimentación),
# el PC la ve como un adaptador de red y se entra con: ssh ari@10.55.0.1
# Solo para configurar (p. ej. poner el Wi-Fi de otro lugar). Con el USB del PC NO mover servos: no da corriente suficiente.
# Uso (una vez):  sudo sh setup-usb-gadget.sh   y luego reiniciar la Pi.
# Deshacer:       restaurar /boot/firmware/config.txt.antes-usb y cmdline.txt.antes-usb, y  nmcli con delete usb-pc
set -eu
[ "$(id -u)" = 0 ] || { echo "Ejecuta con sudo"; exit 1; }
BOOT=/boot/firmware
cp -n "$BOOT/config.txt" "$BOOT/config.txt.antes-usb"
cp -n "$BOOT/cmdline.txt" "$BOOT/cmdline.txt.antes-usb"

# 1) Controlador USB en modo dispositivo (solo afecta al puerto USB-C; los USB-A siguen igual).
# Ojo: el config.txt de fábrica ya trae "dtoverlay=dwc2,dr_mode=host" en [cm5]; se busca la línea propia.
if ! grep -q "dr_mode=peripheral" "$BOOT/config.txt"; then
  printf '\n[pi4]\n# Red por USB-C para mantenimiento (Ari)\ndtoverlay=dwc2,dr_mode=peripheral\n[all]\n' >> "$BOOT/config.txt"
fi

# 2) Cargar el gadget de red. cmdline.txt es UNA sola línea: se añade al final sin saltos.
if ! grep -q "modules-load=dwc2,g_ether" "$BOOT/cmdline.txt"; then
  sed -i '1 s/$/ modules-load=dwc2,g_ether/' "$BOOT/cmdline.txt"
fi
[ "$(wc -l < "$BOOT/cmdline.txt")" -le 1 ] || { echo "cmdline.txt quedó con varias líneas; restaurando"; cp "$BOOT/cmdline.txt.antes-usb" "$BOOT/cmdline.txt"; exit 1; }

# 3) La Pi da una IP fija al PC por ese cable (10.55.0.1 la Pi, el PC recibe 10.55.0.x). No toca el Wi-Fi.
nmcli -t -f NAME con show | grep -qx usb-pc || nmcli con add type ethernet ifname usb0 con-name usb-pc \
  ipv4.method shared ipv4.addresses 10.55.0.1/24 ipv6.method disabled connection.autoconnect yes

echo "Listo. Reinicia la Pi (sudo reboot). El Wi-Fi sigue igual; el USB-C sirve además como red hacia el PC."
