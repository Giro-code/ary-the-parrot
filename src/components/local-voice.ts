import type { ChatReply } from "../server/ai/chat";

const endpoint = "http://127.0.0.1:8766";
async function local(path: string, body?: unknown, signal?: AbortSignal) {
  const response = await fetch(endpoint + path, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? {} : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000), cache: "no-store", credentials: "omit" });
  if (!response.ok) throw new Error("local_voice_unavailable");
  return response;
}
export async function localVoiceReady() {
  try { const health = await (await local("/health", undefined, AbortSignal.timeout(1500))).json(); return health.piper === true && health.vosk === true && health.catalogItems > 0; }
  catch { return false; }
}
export async function localReply(text: string, signal?: AbortSignal): Promise<ChatReply> {
  return (await local("/reply", { text }, signal)).json();
}
export async function speechAudio(reply: ChatReply, kiosk: boolean, signal: AbortSignal) {
  if (navigator.onLine) {
    try {
      const response = await fetch("/api/voice/speak", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Ary-Request": "1" }, body: JSON.stringify({ messageId: reply.messageId }), signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]) });
      if (!response.ok) throw new Error("voice_unavailable");
      const blob = await response.blob();
      if (kiosk && !signal.aborted) {
        // Await local persistence before starting playback. Failure does not discard online speech.
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        for (const value of bytes) binary += String.fromCharCode(value);
        await local("/cache", { text: reply.spokenText, wav: btoa(binary) }, AbortSignal.any([signal, AbortSignal.timeout(2000)])).catch(() => undefined);
      }
      return blob;
    } catch (error) { if (signal.aborted || !kiosk) throw error; }
  }
  if (!kiosk || signal.aborted) throw new Error("voice_unavailable");
  return (await local("/speak", { text: reply.spokenText }, signal)).blob();
}

export async function localAudioReply(blob: Blob, signal: AbortSignal) {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const samples = Math.min(Math.floor(decoded.duration * 16000), 15 * 16000);
    const wav = new ArrayBuffer(44 + samples * 2), view = new DataView(wav);
    const word = (offset: number, text: string) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
    word(0, "RIFF"); view.setUint32(4, 36 + samples * 2, true); word(8, "WAVEfmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); word(36, "data"); view.setUint32(40, samples * 2, true);
    // OfflineAudioContext handles anti-aliasing when reducing the browser sample rate.
    const resampler = new OfflineAudioContext(1, samples, 16000), source = resampler.createBufferSource();
    source.buffer = decoded; source.connect(resampler.destination); source.start();
    const pcm = (await resampler.startRendering()).getChannelData(0);
    for (let i = 0; i < samples; i++) view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, pcm[i])) * 32767), true);
    const response = await fetch(endpoint + "/transcribe", { method: "POST", headers: { "Content-Type": "audio/wav" }, body: wav, signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]), credentials: "omit" });
    if (!response.ok) throw new Error("local_stt_unavailable");
    const { text } = await response.json();
    if (typeof text !== "string" || !text.trim()) throw new Error("empty_transcript");
    return { ...await localReply(text, signal), transcript: text };
  } finally { await context.close(); }
}
