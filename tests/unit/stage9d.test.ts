import { describe, expect, it } from "vitest";
import { nextTurn, readMode, writeMode, sampleTurn, readingDelay } from "../../src/components/voice-turns";
import { spokenText } from "../../src/server/ai/safety";

describe("voice-first turns", () => {
  it("follows the hands-free cycle, pause, cancellation and interruption", () => {
    expect(nextTurn("idle", "listen")).toBe("listening");
    expect(nextTurn("listening", "submit")).toBe("thinking");
    expect(nextTurn("thinking", "speak")).toBe("speaking");
    expect(nextTurn("speaking", "ended")).toBe("listening");
    expect(nextTurn("speaking", "listen")).toBe("listening");
    expect(nextTurn("listening", "pause")).toBe("paused");
    expect(nextTurn("paused", "ended")).toBe("paused");
    expect(nextTurn("paused", "cancel")).toBe("idle");
  });
  it("sends after 1.2 seconds of silence following speech, including speech at time zero", () => {
    let window = sampleTurn({ started: 0, lastVoice: null }, 0, .4).window;
    window = sampleTurn(window, 500, .2).window;
    expect(sampleTurn(window, 1699, 0).action).toBe("listen");
    expect(sampleTurn(window, 1700, 0).action).toBe("send");
    expect(sampleTurn({ started: 0, lastVoice: 0 }, 1200, 0).action).toBe("send");
  });
  it("cancels after eight seconds without voice and sends at the fifteen-second cap", () => {
    const window = { started: 0, lastVoice: null };
    expect(sampleTurn(window, 7999, .01).action).toBe("listen");
    expect(sampleTurn(window, 8000, .01).action).toBe("cancel");
    expect(sampleTurn(window, 15000, .4).action).toBe("send");
  });
  it("defaults safely to voice and persists chat", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(readMode(storage)).toBe("voice");
    writeMode(storage, "chat"); expect(readMode(storage)).toBe("chat");
    writeMode(storage, "voice"); expect(readMode(storage)).toBe("voice");
    values.set("ary_mode", "invalid"); expect(readMode(storage)).toBe("voice");
    const denied = { getItem: () => { throw Error(); }, setItem: () => { throw Error(); } };
    expect(readMode(denied)).toBe("voice"); expect(() => writeMode(denied, "chat")).not.toThrow();
  });
  it("bounds subtitle reading time", () => {
    expect(readingDelay("Hi")).toBe(2080); expect(readingDelay("x".repeat(500))).toBe(8000);
  });
  it("speaks a short preview without URLs or a long list", () => {
    const text = "Descubre la música.\n- Merengue\n- Bachata\n- Más música https://example.com";
    expect(spokenText(text, text, false)).toBe("Descubre la música. Merengue");
    const long = "Una respuesta sobre cultura. ".repeat(30);
    expect(spokenText(long, long, false).length).toBeLessThanOrEqual(400);
    expect(spokenText("Consulta https://example.com la ficha.", "", false)).not.toContain("https");
  });
});
