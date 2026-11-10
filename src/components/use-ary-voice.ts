"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatReply } from "../server/ai/chat";
import type { ChatActivity } from "./ary-chat";
import { ApiError } from "./api";

export function useAryVoice({ enabled, onReply, onActivity }: { enabled: boolean; onReply: (reply: ChatReply) => Promise<void>; onActivity: (activity: ChatActivity) => void }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const bindAudio = useCallback((element: HTMLAudioElement | null) => { audio.current = element; }, []);
  const recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null);
  const [muted, setMuted] = useState(false), [recording, setRecording] = useState(false), [processing, setProcessing] = useState(false);
  const [seconds, setSeconds] = useState(0), [level, setLevel] = useState(0), [notice, setNotice] = useState<"tts" | "permission" | "unsupported" | "ask" | null>(null);
  const request = useRef<AbortController | null>(null), audioUrl = useRef<string | null>(null), version = useRef(0), alive = useRef(true);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null), limitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const context = useRef<AudioContext | null>(null), callbacks = useRef({ onReply, onActivity }), allowed = useRef(enabled), silent = useRef(muted), acquiring = useRef(false);
  useEffect(() => { callbacks.current = { onReply, onActivity }; allowed.current = enabled; silent.current = muted; }, [onReply, onActivity, enabled, muted]);
  const releaseMic = useCallback(() => {
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    if (limitTimer.current) clearTimeout(limitTimer.current);
    void context.current?.close().catch(() => undefined); context.current = null;
    if (alive.current) { setRecording(false); setLevel(0); }
  }, []);
  const interrupt = useCallback(() => {
    version.current++; request.current?.abort(); request.current = null;
    if (audio.current) { audio.current.pause(); audio.current.removeAttribute("src"); audio.current.load(); }
    if (audioUrl.current) { URL.revokeObjectURL(audioUrl.current); audioUrl.current = null; }
    if (alive.current) callbacks.current.onActivity("idle");
  }, []);
  const cancel = useCallback(() => {
    interrupt();
    if (recorder.current?.state === "recording") { recorder.current.onstop = null; recorder.current.stop(); }
    recorder.current = null; releaseMic();
    if (alive.current) setProcessing(false);
  }, [interrupt, releaseMic]);
  useEffect(() => { if (!enabled) cancel(); }, [enabled, cancel]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; cancel(); }; }, [cancel]);
  async function play(reply: ChatReply) {
    interrupt(); setNotice(null);
    if (!allowed.current || silent.current || !navigator.onLine) return;
    const current = version.current, controller = new AbortController(); request.current = controller;
    try {
      const response = await fetch("/api/voice/speak", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Ary-Request": "1" }, body: JSON.stringify({ messageId: reply.messageId }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) });
      if (!response.ok) throw new ApiError("voice_unavailable");
      const blob = await response.blob();
      if (!alive.current || current !== version.current || silent.current || !allowed.current) return;
      audioUrl.current = URL.createObjectURL(blob); audio.current?.setAttribute("src", audioUrl.current);
      await audio.current!.play();
    } catch {
      if (alive.current && current === version.current && !controller.signal.aborted) { setNotice("tts"); callbacks.current.onActivity("idle"); }
    }
  }
  function stopRecording() { if (recorder.current?.state === "recording") recorder.current.stop(); }
  async function startRecording() {
    if (!allowed.current || acquiring.current || recording || processing) return;
    interrupt(); setNotice(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setNotice("unsupported"); return; }
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) { setNotice("unsupported"); return; }
    acquiring.current = true;
    const current = version.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (!alive.current || !allowed.current || current !== version.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      const local = new MediaRecorder(media, { mimeType, audioBitsPerSecond: 32000 }); recorder.current = local;
      const chunks: Blob[] = []; let size = 0; const started = performance.now();
      local.ondataavailable = event => { if (event.data.size) { size += event.data.size; chunks.push(event.data); if (size > 1024 * 1024) stopRecording(); } };
      local.onerror = () => { local.onstop = null; releaseMic(); setNotice("ask"); callbacks.current.onActivity("error"); };
      local.onstop = () => {
        const duration = Math.min(15000, Math.round(performance.now() - started)); releaseMic();
        if (!alive.current || current !== version.current || !allowed.current) return;
        if (duration < 100 || !size || size > 1024 * 1024) { setNotice("ask"); callbacks.current.onActivity("idle"); return; }
        setProcessing(true); callbacks.current.onActivity("thinking");
        const controller = new AbortController(); request.current = controller;
        void (async () => {
          try {
            const response = await fetch("/api/voice/ask", { method: "POST", credentials: "same-origin", headers: { "Content-Type": mimeType, "X-Ary-Request": "1", "X-Ary-Audio-Duration": String(duration) }, body: new Blob(chunks, { type: mimeType }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(18000)]) });
            const reply = await response.json();
            if (!response.ok) throw new ApiError(reply.error);
            if (alive.current && current === version.current && allowed.current) { setProcessing(false); callbacks.current.onActivity("idle"); await callbacks.current.onReply(reply); }
          } catch { if (alive.current && current === version.current && !controller.signal.aborted) { setNotice("ask"); callbacks.current.onActivity("error"); } }
          finally { if (alive.current && current === version.current) setProcessing(false); }
        })();
      };
      local.start(200); setRecording(true); setSeconds(0); callbacks.current.onActivity("listening");
      limitTimer.current = setTimeout(stopRecording, 15000);
      try {
        context.current = new AudioContext(); const analyser = context.current.createAnalyser(); analyser.fftSize = 256;
        context.current.createMediaStreamSource(media).connect(analyser); const samples = new Uint8Array(256);
        recordingTimer.current = setInterval(() => { analyser.getByteTimeDomainData(samples); setLevel(Math.min(1, Math.max(...samples.map(value => Math.abs(value - 128))) / 60)); setSeconds(Math.min(15, Math.floor((performance.now() - started) / 1000))); }, 120);
      } catch { recordingTimer.current = setInterval(() => setSeconds(Math.min(15, Math.floor((performance.now() - started) / 1000))), 250); }
    } catch { releaseMic(); setNotice("permission"); callbacks.current.onActivity("idle"); }
    finally { acquiring.current = false; }
  }
  function playbackFailed() {
    if (!allowed.current || !audio.current?.getAttribute("src")) return;
    interrupt(); setNotice("tts");
  }
  function toggleMute() {
    // Muting speech must not abort transcription or leave a recorder running with
    // an obsolete version. The keyboard action explicitly cancels recording.
    if (!muted && !recording && !processing) interrupt();
    silent.current = !muted; setMuted(value => !value);
  }
  return { bindAudio, muted, recording, processing, seconds, level, notice, play, interrupt, cancel, startRecording, stopRecording, toggleMute, playbackFailed, activity: (state: ChatActivity) => callbacks.current.onActivity(state) };
}
