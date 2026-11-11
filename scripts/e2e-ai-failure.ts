// Test-process preload only. No application route or production flag enables this.
// This wrapper returns a synthetic HTTP 500 without contacting the AI host.
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.hostname === "generativelanguage.googleapis.com") return Promise.resolve(new Response(null, { status: 500 }));
  return originalFetch(input, init);
};
