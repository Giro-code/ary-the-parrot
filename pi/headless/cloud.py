"""Ari con IA: la Pi conversa con la web (arytheparrot.app) como un kiosco autorizado.

La web hace todo lo de Gemini (entiende el audio, responde con las fichas y genera la voz Sulafat), así que
la clave de Gemini nunca está en la Pi. La Pi solo guarda la credencial de kiosco (archivo 0600), igual que
la cookie del navegador del kiosco. Si algo falla, quien llama vuelve al modo local (Vosk + fichas + Piper).
"""
import io
import json
import os
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

DEFAULT_SITE = "https://arytheparrot.app"
SESSION_IDLE_S = 180      # tras 3 min sin hablar, el siguiente visitante empieza una conversación nueva
ANSWER_TIMEOUT_S = 10    # si Gemini no responde en 10 s, Ari contesta en local
VOICE_TIMEOUT_S = 12     # si la voz de Gemini no llega en 12 s, Ari dice la respuesta con la voz local
BACKOFF_S = 60            # tras un fallo de red, no se reintenta la web durante 1 min (responde en local)


class CloudError(RuntimeError):
    def __init__(self, code, status=0):
        super().__init__(code)
        self.code, self.status = code, status


def pcm_to_wav(pcm, rate=16000):
    out = io.BytesIO()
    with wave.open(out, "wb") as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate)
        wav.writeframes(pcm)
    return out.getvalue()


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class CloudAry:
    def __init__(self, site=DEFAULT_SITE, credential_path="/home/ari/ary/kiosk-device.json", timeout=25, opener=None, clock=time.monotonic):
        self.site = site.rstrip("/")
        self.credential_path = Path(credential_path)
        self.timeout, self.clock = timeout, clock
        self.opener = opener or urllib.request.build_opener(_NoRedirect)
        self.device_token = None
        self.session_token, self.last_use = None, 0.0
        self.down_until = 0.0
        if self.credential_path.exists():
            self.device_token = json.loads(self.credential_path.read_text()).get("ary_kiosk")

    # ---------- transporte ----------
    def _request(self, method, path, body=None, content_type="application/json", headers=None, raw=False, timeout=None):
        cookies = [f"{name}={value}" for name, value in (("ary_kiosk", self.device_token), ("ary_sid", self.session_token)) if value]
        data = json.dumps(body).encode() if body is not None and content_type == "application/json" else body
        request = urllib.request.Request(self.site + path, data=data, method=method)
        request.add_header("Origin", self.site)          # la web exige el mismo origen y X-Ary-Request (anti-CSRF)
        request.add_header("X-Ary-Request", "1")
        request.add_header("User-Agent", "ary-pi/1")
        if data is not None:
            request.add_header("Content-Type", content_type)
        if cookies:
            request.add_header("Cookie", "; ".join(cookies))
        for key, value in (headers or {}).items():
            request.add_header(key, value)
        try:
            with self.opener.open(request, timeout=timeout or self.timeout) as response:
                for header in response.headers.get_all("Set-Cookie") or []:
                    name, _, rest = header.partition("=")
                    if name.strip() == "ary_sid":
                        self.session_token = rest.split(";", 1)[0]
                    if name.strip() == "ary_kiosk":
                        self.device_token = rest.split(";", 1)[0]
                payload = response.read()
                return payload if raw else json.loads(payload or b"{}")
        except urllib.error.HTTPError as error:
            try:
                code = json.loads(error.read() or b"{}").get("error", f"http_{error.code}")
            except ValueError:
                code = f"http_{error.code}"
            raise CloudError(code, error.code) from None
        except (urllib.error.URLError, OSError, ValueError) as error:
            raise CloudError("network_" + type(error).__name__) from None

    # ---------- credencial de kiosco ----------
    def activate(self, code):
        """Canjea un código de activación (panel de administración → kioscos) por la credencial de 30 días."""
        self._request("POST", "/api/kiosk/activate", {"code": code})
        if not self.device_token:
            raise CloudError("activation_without_credential")
        self.credential_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.credential_path.with_suffix(".tmp")
        with os.fdopen(os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w") as handle:
            json.dump({"ary_kiosk": self.device_token, "activatedAt": int(time.time())}, handle)
        temporary.replace(self.credential_path)

    def authorized(self):
        return bool(self.device_token) and bool(self._request("GET", "/api/kiosk/me").get("authorized"))

    # ---------- conversación ----------
    def available(self):
        return bool(self.device_token) and self.clock() >= self.down_until

    def _guard(self, action):
        """Ejecuta una llamada; si la sesión caducó o llegó a su límite, abre otra una vez. Fallos de red → pausa."""
        for attempt in (0, 1):
            try:
                if not self.session_token or self.clock() - self.last_use > SESSION_IDLE_S:
                    self.end()
                    self._request("POST", "/api/visitor/session", {"locale": "es", "kiosk": True})
                result = action()
                self.last_use = self.clock()
                return result
            except CloudError as error:
                if attempt == 0 and error.code in ("session_required", "rate_limited", "conversation_changed"):
                    self.session_token = None
                    continue
                # Si solo falló la voz, Gemini sigue respondiendo: no se pausa la web por eso.
                if error.code.startswith("network_") or (error.status >= 500 and error.code != "voice_unavailable"):
                    self.down_until = self.clock() + BACKOFF_S
                raise

    def welcome(self):
        return self._guard(lambda: self._request("POST", "/api/chat/cue", {"cue": "welcome"}))

    def ask_audio(self, pcm, rate=16000):
        duration = int(len(pcm) / 2 / rate * 1000)
        if not 300 <= duration <= 15000:
            raise CloudError("audio_length")
        wav = pcm_to_wav(pcm, rate)
        return self._guard(lambda: self._request("POST", "/api/voice/ask", wav, "audio/wav", {"X-Ary-Audio-Duration": str(duration)}, timeout=ANSWER_TIMEOUT_S))

    def ask_text(self, text):
        return self._guard(lambda: self._request("POST", "/api/chat", {"message": text[:500]}, timeout=ANSWER_TIMEOUT_S))

    def speak(self, message_id):
        return self._guard(lambda: self._request("POST", "/api/voice/speak", {"messageId": message_id}, raw=True, timeout=VOICE_TIMEOUT_S))

    def end(self):
        if self.session_token:
            try:
                self._request("POST", "/api/visitor/session/end", {})
            except CloudError:
                pass
        self.session_token = None
