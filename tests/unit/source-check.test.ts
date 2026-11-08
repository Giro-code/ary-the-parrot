import { afterEach, expect, test, vi } from "vitest";
import { EventEmitter } from "node:events";
const transport = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("node:https", () => ({ request: transport.request }));
import { checkSource } from "../../src/server/source-check";
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
function httpsResponse(status: number, callback?: (options: Record<string, unknown>) => void) {
  transport.request.mockImplementation((_url, options, response) => {
    callback?.(options);
    const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: (error?: Error) => void };
    req.end = () => queueMicrotask(() => { response({ statusCode: status, destroy: () => {} }); req.emit("close"); });
    req.destroy = error => { if (error) req.emit("error", error); req.emit("close"); };
    return req;
  });
}
test("source transport pins verified DNS for both Node lookup modes and keeps TLS hostname", async () => {
  const dns = vi.fn().mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
  httpsResponse(200, options => {
    const lookup = options.lookup as (host: string, options: { all?: boolean }, cb: (...args: unknown[]) => void) => void;
    const single = vi.fn(), all = vi.fn(); lookup("example.com", {}, single); lookup("example.com", { all: true }, all);
    expect(single).toHaveBeenCalledWith(null, "8.8.8.8", 4); expect(all).toHaveBeenCalledWith(null, [{ address: "8.8.8.8", family: 4 }]);
  });
  expect(await checkSource("https://example.com/source", dns)).toBeInstanceOf(Date);
  expect(transport.request.mock.calls[0][0].hostname).toBe("example.com"); expect(dns).toHaveBeenCalledTimes(1);
});
test("source redirects and mixed public/private DNS never cause a follow-up request", async () => {
  const dns = vi.fn().mockResolvedValue([{ address: "8.8.8.8", family: 4 }]); httpsResponse(302);
  await expect(checkSource("https://example.com", dns)).rejects.toMatchObject({ code: "source_not_verified" }); expect(transport.request).toHaveBeenCalledTimes(1);
  transport.request.mockClear(); dns.mockResolvedValue([{ address: "8.8.8.8", family: 4 }, { address: "169.254.169.254", family: 4 }]);
  await expect(checkSource("https://example.com", dns)).rejects.toMatchObject({ code: "source_blocked" }); expect(transport.request).not.toHaveBeenCalled();
});
test("source HTTP and DNS hangs have bounded timeouts", async () => {
  vi.useFakeTimers();
  const dns = vi.fn().mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
  transport.request.mockImplementation(() => { const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: (error: Error) => void }; req.end = () => {}; req.destroy = error => { req.emit("error", error); req.emit("close"); }; return req; });
  const http = expect(checkSource("https://example.com", dns)).rejects.toMatchObject({ code: "source_not_verified" }); await vi.advanceTimersByTimeAsync(5001); await http;
  const hangingDns = expect(checkSource("https://example.com", vi.fn(() => new Promise<never>(() => {})))).rejects.toMatchObject({ code: "source_timeout" }); await vi.advanceTimersByTimeAsync(5001); await hangingDns;
});
