export type AryMode = "voice" | "chat";
type ModeStorage = Pick<Storage, "getItem" | "setItem">;
export function readMode(storage: ModeStorage): AryMode {
  try { return storage.getItem("ary_mode") === "chat" ? "chat" : "voice"; } catch { return "voice"; }
}
export function writeMode(storage: ModeStorage, mode: AryMode) {
  try { storage.setItem("ary_mode", mode); } catch { /* Private browsing can disable storage. */ }
}
export type TurnState = "idle" | "listening" | "thinking" | "speaking" | "paused";
export function nextTurn(state: TurnState, event: "listen" | "submit" | "speak" | "ended" | "pause" | "cancel"): TurnState {
  if (event === "pause") return "paused";
  if (event === "cancel") return "idle";
  if (event === "listen") return "listening";
  if (event === "submit" && state === "listening") return "thinking";
  if (event === "speak") return "speaking";
  if (event === "ended" && state === "speaking") return "listening";
  return state;
}
export type SilenceWindow = { started: number; lastVoice: number | null };
export function sampleTurn(window: SilenceWindow, now: number, level: number): { window: SilenceWindow; action: "listen" | "send" | "cancel" } {
  const updated = { ...window, lastVoice: level >= .08 ? now : window.lastVoice };
  const elapsed = now - updated.started;
  return { window: updated, action: elapsed >= 15000 ? "send" : updated.lastVoice !== null && now - updated.lastVoice >= 1200 ? "send" : updated.lastVoice === null && elapsed >= 8000 ? "cancel" : "listen" };
}
export function readingDelay(text: string) { return Math.min(8000, 2000 + text.length * 40); }
