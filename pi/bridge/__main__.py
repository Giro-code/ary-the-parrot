import argparse
import os
import sys
import threading
from bridge import BridgeError, BridgeServer, Controller, SerialHardware, Simulator, TokenVerifier
from ary_robot import CloudClient, OfflineQueue


def main():
    parser = argparse.ArgumentParser(description="Ary loopback bridge, SSE + POST")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--simulate", action="store_true")
    mode.add_argument("--serial", help="Explicit serial device, e.g. /dev/ttyACM0")
    parser.add_argument("--dev", action="store_true", help="Allow localhost origins for development")
    parser.add_argument("--queue", default="events.sqlite3")
    args = parser.parse_args()
    verifier = TokenVerifier(os.environ["ROBOT_BRIDGE_SECRET"], os.environ["APP_BASE_URL"], os.environ["ROBOT_DEVICE_ID"], args.dev)
    if args.simulate:
        hardware = Simulator()
    else:
        import serial  # Optional pyserial, installed by the operator for real hardware.
        port = serial.Serial(args.serial, baudrate=115200, timeout=0.1, write_timeout=0.5)
        # Arduino may reset when serial opens. Operator starts bridge after boot is complete.
        hardware = SerialHardware(port)
    controller = Controller(hardware)
    server = BridgeServer(verifier, controller)
    stopped = threading.Event()
    offline = OfflineQueue(args.queue)
    threads = []

    def heartbeat():
        while not stopped.wait(1):
            with controller.lock:
                if hardware.status == "ok" and controller.subscribers:
                    try:
                        hardware.heartbeat()
                        for value in hardware.sensors:
                            controller.sensor(value)
                        hardware.sensors.clear()
                    except BridgeError:
                        controller.publish({"type": "hardware", "status": "error"})
                elif hardware.status == "ok" and controller.state != "idle":
                    try:
                        controller.command({"type": "state", "state": "idle"})
                    except BridgeError:
                        controller.publish({"type": "hardware", "status": "error"})

    def console():
        print("Simulador. Escribe presence 1 o presence 0 y Enter.", flush=True)
        for line in sys.stdin:
            if line.strip() in ("presence 1", "presence 0"):
                controller.sensor(line.strip().endswith("1"))

    if os.environ.get("ROBOT_DEVICE_AUTH_SECRET"):
        client = CloudClient(os.environ["APP_BASE_URL"], os.environ["ROBOT_DEVICE_ID"], os.environ["ROBOT_DEVICE_AUTH_SECRET"], offline, controller.maintenance, args.dev)
        threads.append(threading.Thread(target=client.run, args=(stopped, controller.snapshot), daemon=True))
    if args.simulate:
        threads.append(threading.Thread(target=console, daemon=True))
    threads.append(threading.Thread(target=heartbeat, daemon=True))
    for thread in threads:
        thread.start()
    print("Ary bridge listening on 127.0.0.1:8765", flush=True)
    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        pass
    finally:
        stopped.set()
        server.server_close()
        for thread in threads:
            if thread.name != "console":
                thread.join(timeout=6)
        hardware.close()
        offline.close()


if __name__ == "__main__":
    main()
