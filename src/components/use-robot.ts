"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { HardwareRobotAdapter } from "../robot/hardware";
import { defaultGesture, MockRobotAdapter, type RobotState } from "../robot/protocol";

export function useRobot(state: RobotState, authorized: boolean, onPresence: () => void) {
  const [status, setStatus] = useState<"disconnected" | "simulated" | "ok" | "error">("disconnected");
  const adapter = useRef<HardwareRobotAdapter | null>(null), mock = useRef(new MockRobotAdapter());
  const presence = useRef(onPresence), currentState = useRef(state);
  useEffect(() => { presence.current = onPresence; currentState.current = state; }, [onPresence, state]);
  useEffect(() => {
    if (!authorized) return;
    let live = true, timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    async function connect() {
      let local: HardwareRobotAdapter | null = null;
      try {
        const credentials = await api<{ token: string }>("/api/kiosk/bridge-token");
        if (!live) return;
        local = new HardwareRobotAdapter(credentials.token, event => {
          if (!live) return;
          if (event.type === "sensor" && event.value && currentState.current === "idle") presence.current();
          if (event.type === "hardware") {
            setStatus(event.status); failures = 0;
            if (event.status !== "error") void local?.setState(currentState.current).catch(() => setStatus("error"));
          }
        });
        adapter.current = local;
        await local.listen();
      } catch { if (live) setStatus("disconnected"); }
      finally {
        local?.close(); if (adapter.current === local) adapter.current = null;
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
  return { status, gesture: defaultGesture(state) };
}
