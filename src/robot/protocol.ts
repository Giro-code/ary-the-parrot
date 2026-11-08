export const robotStates = ["idle", "welcome", "listening", "thinking", "speaking", "handoff_qr", "offline", "error", "maintenance"] as const;
export type RobotState = typeof robotStates[number];
export const gesturesByState = {
  idle: ["rest"], welcome: ["wave", "rest"], listening: ["attentive", "rest"], thinking: ["ponder", "rest"],
  speaking: ["talk", "rest"], handoff_qr: ["point", "rest"], offline: ["rest"], error: ["stop"], maintenance: ["rest", "stop"],
} as const;
export type Gesture = typeof gesturesByState[RobotState][number];
export const defaultGesture = (state: RobotState): Gesture => gesturesByState[state][0];
export const gestureLabels = { rest: "reposo", wave: "saludar", attentive: "escuchar", ponder: "pensar", talk: "hablar", point: "señalar", stop: "parar" };
export interface RobotAdapter {
  readonly label: string;
  setState(state: RobotState): Promise<void>;
  gesture(name: Gesture): Promise<void>;
  close(): void;
}
export class MockRobotAdapter implements RobotAdapter {
  readonly label = "Simulador";
  state: RobotState = "idle";
  currentGesture: Gesture = "rest";
  async setState(state: RobotState) { this.state = state; this.currentGesture = defaultGesture(state); }
  async gesture(name: Gesture) {
    if (!(gesturesByState[this.state] as readonly string[]).includes(name)) throw new Error("gesture_not_allowed");
    this.currentGesture = name;
  }
  close() { this.state = "idle"; this.currentGesture = "rest"; }
}
