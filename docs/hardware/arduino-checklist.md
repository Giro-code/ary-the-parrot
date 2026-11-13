# Arduino UNO: inspección pendiente, sin cargar firmware

Estado del 13 de noviembre de 2026: `lsusb` solo muestra hubs; no hay
`/dev/ttyACM*`, `/dev/ttyUSB*` ni enlaces en `/dev/serial/by-id`.
No se ha abierto ningún puerto serie, ejecutado avrdude, cargado firmware ni
movido servos en esta etapa. El programa instalado en el UNO sigue siendo desconocido.

## 1. Verificar USB sin hablar con el UNO

- Con la alimentación de los servos desconectada, identificar placa, conectores,
  fuente y cableado con fotografías. Conservar el montaje y etiquetar cada cable.
- Usar un cable USB **de datos** USB-A a USB-B para un UNO R3 habitual;
  comprobar el conector real si es una variante. Probar un cable conocido y otro
  puerto USB de la Pi. Un LED encendido no confirma comunicación de datos.
- Ejecutar solamente `lsusb`, `ls -l /dev/serial/by-id/` y
  `ls -l /dev/ttyACM* /dev/ttyUSB*`. Anotar VID:PID y nombre estable del dispositivo.
- No abrir monitor serie, IDE conectado al puerto ni puente en modo `--serial`.
  Abrir el puerto puede reiniciar la placa; conectar USB también puede alimentarla.

## 2. Identificar el programa existente sin sobrescribirlo

Buscar con el propietario el `.ino`, librerías, copia del proyecto y registro de
la última carga. Leer esos archivos y contrastar placa, pines y mecanismo.
**USB/VID:PID no identifica el sketch**; no hay un comando universal que recupere
el código fuente desde el UNO. No interpretar un sketch encontrado como el
instalado sin evidencia. Una eventual copia binaria mediante programador no
recupera el fuente y puede reiniciar el circuito: queda fuera de esta etapa y
requiere autorización nueva con motores aislados. No ejecutar avrdude ni upload.

## 3. Alimentación antes de cualquier prueba futura

Para los cinco SG90, preparar una fuente externa regulada de 5 V con **al menos
3 A recomendados como punto de partida**; contrastar corriente de bloqueo y
simultaneidad con los servos reales y medir caída de tensión. No alimentar el
conjunto desde GPIO, regulador del UNO o USB de la Pi. Distribuir 5 V y GND con
cableado adecuado, protección y corte de alimentación accesible. Unir las masas
de fuente de servos y UNO; revisar polaridad con alimentación desconectada.
No unir indiscriminadamente salidas de 5 V de fuentes distintas ni realimentar USB.

## 4. Mapeo por completar con inspección física

| Articulación propuesta | Etiqueta del servo | Pin UNO real | Reposo | Mín./máx. seguros | Sentido |
|---|---|---|---|---|---|
| Cabeza | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Pico | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Ala izquierda | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Ala derecha | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Cola | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |

Los nombres son una hipótesis del handoff, no cableado confirmado.

## 5. Revisión del firmware de referencia del repositorio

`pi/firmware/ary_servos/ary_servos.ino` tiene **cuatro**, no cinco canales:

| Canal de referencia | Pin | Límites del ejemplo | Reposo del ejemplo |
|---|---|---|---|
| head pan | 9 | 65–115° | 90° |
| head tilt | 10 | 75–105° | 90° |
| beak | 5 | 80–105° | 80° |
| wings, un único canal | 6 | 70–110° | 90° |

No define cola ni alas independientes. PIR propuesto en pin 7, no confirmado.
Suaviza hasta 2° cada 20 ms. ACK precede actualización de destinos, pero eso
**no prueba movimiento ni posición física**. El primer STATE válido conecta los
servos aun si es `idle`; el handshake del puente real ya puede causar movimiento.
El watchdog de 3 s ordena reposo y después suelta par cuando se cumple la
condición del ejemplo. `stop` vuelve a destinos de reposo: **no es un corte de
emergencia**. Ningún ángulo de esa tabla está calibrado para Ari.

## 6. Calibración futura, una articulación cada vez

Solo después de identificar y respaldar el programa actual y recibir autorización
específica: aislar los otros cuatro servos, asegurar el mecanismo y disponer de
corte inmediato. Confirmar alimentación y posición física antes de acoplar el
brazo; no asumir que 90° sea neutro. Con una herramienta de calibración revisada,
probar pasos pequeños desde la posición verificada, medir corriente y observar
rozamiento, esfuerzo, sentido y topes. Detener ante ruido, bloqueo o caída de
tensión. Registrar límites internos con margen antes del tope; verificar retorno
a reposo y desconexión segura individualmente. Después revisar movimientos
combinados y watchdog con la fuente real. No utilizar esta guía como autorización
para energizar, abrir serie o cargar el sketch de referencia.

Referencias: [placa y recursos oficiales UNO R3](https://docs.arduino.cc/hardware/uno-rev3/)
y [guía oficial de servomotores](https://docs.arduino.cc/learn/electronics/servo-motors/).
