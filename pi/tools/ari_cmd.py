#!/usr/bin/env python3
"""Envia ordenes al Arduino de Ari y muestra las respuestas. Uso: ari_cmd.py ORDEN [ORDEN ...]"""
import sys, time, serial
P = "/dev/serial/by-id/usb-Silicon_Labs_CP2102_USB_to_UART_Bridge_Controller_0001-if00-port0"
s = serial.Serial(P, 115200, timeout=0.2)
time.sleep(2.0)  # abrir el puerto reinicia la placa; esperar a "ARI LISTO"
def leer(t=0.6):
    fin = time.time() + t
    while time.time() < fin:
        l = s.readline().decode(errors="replace").strip()
        if l: print("<", l)
leer(0.5)
for o in sys.argv[1:]:
    if o.startswith("ESPERA"):
        time.sleep(float(o.split("=")[1])); leer(0.3); continue
    print(">", o); s.write((o + "\n").encode()); leer()
s.close()
