import { afterEach, expect, test, vi } from "vitest";
import { localReply, localVoiceReady, speechAudio } from "../../src/components/local-voice";
import type { ChatReply } from "../../src/server/ai/chat";

const reply = { messageId: "fixture", spokenText: "Hola Ary" } as ChatReply;
afterEach(() => vi.unstubAllGlobals());
test("kiosk falls back to local speech when online TTS fails", async () => {
  vi.stubGlobal("navigator", { onLine: true });
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValueOnce(new Response("wav", { headers: { "Content-Type": "audio/wav" } }));
  vi.stubGlobal("fetch", fetcher);
  expect(await (await speechAudio(reply, true, new AbortController().signal)).text()).toBe("wav");
  expect(fetcher.mock.calls[1][0]).toBe("http://127.0.0.1:8766/speak");
});
test("offline kiosk skips remote API; visitor never accesses loopback", async () => {
  vi.stubGlobal("navigator", { onLine: false });
  const fetcher = vi.fn().mockResolvedValue(new Response("wav")); vi.stubGlobal("fetch", fetcher);
  await speechAudio(reply, true, new AbortController().signal);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await expect(speechAudio(reply, false, new AbortController().signal)).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test("online audio is persisted on kiosk before returning it", async () => {
  vi.stubGlobal("navigator", { onLine: true });
  const fetcher = vi.fn().mockResolvedValueOnce(new Response("test-audio")).mockResolvedValueOnce(Response.json({ cached: true })); vi.stubGlobal("fetch", fetcher);
  expect(await (await speechAudio(reply, true, new AbortController().signal)).text()).toBe("test-audio");
  expect(fetcher.mock.calls[1][0]).toBe("http://127.0.0.1:8766/cache");
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ text: "Hola Ary", wav: btoa("test-audio") });
});
test("cancelled speech does not fall back; unavailable health stays false", async () => {
  vi.stubGlobal("navigator", { onLine: true });
  const controller = new AbortController(); controller.abort();
  const fetcher = vi.fn().mockRejectedValue(new Error("abort")); vi.stubGlobal("fetch", fetcher);
  await expect(speechAudio(reply, true, controller.signal)).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(await localVoiceReady()).toBe(false);
});
test("local replies use loopback only with bounded request", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ spokenText: "Ficha" })));
  expect((await localReply("Merengue")).spokenText).toBe("Ficha");
  expect(fetch).toHaveBeenCalledWith("http://127.0.0.1:8766/reply", expect.objectContaining({ credentials: "omit", body: '{"text":"Merengue"}' }));
});
