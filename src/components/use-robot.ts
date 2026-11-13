"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { HardwareRobotAdapter, sendLocalState } from "../robot/hardware";
import { defaultGesture, MockRobotAdapter, type RobotState } from "../robot/protocol";

export function useRobot(state: RobotState, authorized: boolean, onPresence: () => void) {
  const [status, setStatus] = useState<"disconnected" | "simulated" | "ok" | "error">("disconnected");
  // True while no signed bridge token can be obtained (no internet). States then go token-less to the
  // local bridge (started with --local-state), so Ary keeps moving while it talks with the offline voice.
  const [tokenless, setTokenless] = useState(false);
  const adapter = useRef<HardwareRobotAdapter | null>(null), mock = useRef(new MockRobotAdapter());
  const presence = useRef(onPresence), currentState = useRef(state);
  useEffect(() => { presence.current = onPresence; currentState.current = state; }, [onPresence, state]);
  useEffect(() => {
    if (!authorized) return;
    let live = true, timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    async function connect() {
      let bridge: HardwareRobotAdapter | null = null;
      try {
        let credentials: { token: string };
        try { credentials = await api<{ token: string }>("/api/kiosk/bridge-token"); }
        catch (error) { if (live) setTokenless(true); throw error; }
        if (!live) return;
        setTokenless(false);
        bridge = new HardwareRobotAdapter(credentials.token, event => {
          if (!live) return;
          if (event.type === "sensor" && event.value && currentState.current === "idle") presence.current();
          if (event.type === "hardware") {
            setStatus(event.status); failures = 0;
            if (event.status !== "error") void bridge?.setState(currentState.current).catch(() => setStatus("error"));
          }
        });
        adapter.current = bridge;
        await bridge.listen();
      } catch { if (live) setStatus("disconnected"); }
      finally {
        bridge?.close(); if (adapter.current === bridge) adapter.current = null;
        if (live) timer = setTimeout(() => void connect(), Math.min(15000, 1000 * 2 ** Math.min(failures++, 4)));
      }
    }
    void connect();
    return () => { live = false; clearTimeout(timer); adapter.current?.close(); adapter.current = null; };
  }, [authorized]);
  useEffect(() => {
    void mock.current.setState(state);
    if (adapter.current && status !== "error") void adapter.current.setState(state).catch(() => setStatus("error"));
  }, [state, status]);
  useEffect(() => {
    if (!authorized || !tokenless) return;
    const controller = new AbortController();
    const send = () => { if (!adapter.current) void sendLocalState(currentState.current, controller.signal).then(() => setStatus("ok"), () => { if (!controller.signal.aborted) setStatus("disconnected"); }); };
    send();
    // Keepalive: the bridge and firmware return Ary to rest if states stop arriving (watchdog).
    const interval = setInterval(send, 1500);
    return () => { controller.abort(); clearInterval(interval); };
  }, [authorized, tokenless, state]);
  return { status, gesture: defaultGesture(state) };
}
