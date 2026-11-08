import { defaultGesture, gesturesByState, type Gesture, type RobotAdapter, type RobotState } from "./protocol";

export type BridgeEvent = { type: "sensor"; sensor: "presence"; value: boolean } | { type: "hardware"; status: "ok" | "simulated" | "error" };
const endpoint = "http://127.0.0.1:8765";
// Only named, allowlisted operations. Raw servo angles have no representation here.
export class HardwareRobotAdapter implements RobotAdapter {
  readonly label = "Puente local";
  private state: RobotState = "idle";
  private controller = new AbortController();
  private pending: Promise<void> = Promise.resolve();
  constructor(private token: string, private onEvent: (event: BridgeEvent) => void) {}
  async listen() {
    const response = await fetch(`${endpoint}/events`, { headers: { Authorization: `Bearer ${this.token}` }, signal: this.controller.signal, cache: "no-store" });
    if (!response.ok || !response.body) throw new Error("bridge_unavailable");
    const reader = response.body.getReader(), decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const part = await reader.read(); if (part.done) break;
        buffer += decoder.decode(part.value, { stream: true });
        if (buffer.length > 8192) throw new Error("bridge_invalid_event");
        let boundary: number;
        while ((boundary = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
          if (!frame.startsWith("data: ")) continue;
          const event = JSON.parse(frame.slice(6));
          if (event.type === "sensor" && event.sensor === "presence" && typeof event.value === "boolean") this.onEvent(event);
          if (event.type === "hardware" && ["ok", "simulated", "error"].includes(event.status)) this.onEvent(event);
        }
      }
      throw new Error("bridge_closed");
    } finally { await reader.cancel().catch(() => {}); }
  }
  setState(state: RobotState) {
    this.pending = this.pending.catch(() => {}).then(async () => {
      await this.send({ type: "state", state }); this.state = state;
    });
    return this.pending;
  }
  async gesture(name: Gesture) {
    if (!(gesturesByState[this.state] as readonly string[]).includes(name)) throw new Error("gesture_not_allowed");
    await this.send({ type: "gesture", name });
  }
  private async send(command: { type: "state"; state: RobotState } | { type: "gesture"; name: Gesture }) {
    const response = await fetch(`${endpoint}/command`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` }, body: JSON.stringify(command), signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(2000)]) });
    if (!response.ok) throw new Error("bridge_command_failed");
  }
  close() { this.controller.abort(); }
}
export { defaultGesture };
