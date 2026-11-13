import { describe, expect, it } from "vitest";
import { spokenText } from "../../src/server/ai/safety";

describe("spoken text", () => {
  it("never reads citation markers aloud", () => {
    const display = "La bachata fue inscrita por la UNESCO en 2019 [ee1806b0-0b5f-4293-a4a9-15bab9ffe071]. ¿Te gustaría saber más?";
    expect(spokenText(display, display, false)).toBe("La bachata fue inscrita por la UNESCO en 2019. ¿Te gustaría saber más?");
  });
});
