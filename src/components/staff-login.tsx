"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "./api";
import { StaffError } from "./staff-shared";
export function StaffLogin({ token }: { token?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState<unknown>(null);
  async function run(action: () => Promise<void>) { setBusy(true); setError(null); try { await action(); } catch (e) { setError(e); } finally { setBusy(false); } }
  return <div className="ary-app"><main className="flow-panel" id="main"><p className="eyebrow">Ary · Personal autorizado</p><h1>Acceso del personal</h1><p>Usa el correo de tu membresía activa. El enlace caduca en 15 minutos y se usa una sola vez.</p>{token ? <button disabled={busy} onClick={() => void run(async () => { const result = await api<{ redirect: string }>("/api/staff/verify", "POST", { token }); router.replace(result.redirect); })}>{busy ? "Comprobando…" : "Confirmar acceso de personal"}</button> : <form className="account-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void run(async () => { const result = await api<{ message: string }>("/api/staff/request-link", "POST", { email: form.get("email") }); setMessage(result.message); }); }}><label htmlFor="staff-email">Correo de personal</label><input id="staff-email" name="email" type="email" required maxLength={254} autoComplete="email" /><button disabled={busy}>{busy ? "Registrando…" : "Solicitar enlace de acceso"}</button></form>}{message && <p role="status" className="notice">{message}</p>}<StaffError error={error} /><p><Link href="/admin/entrar">Solicitar otro enlace</Link> · <a href="/experiencia">Explorar como visitante</a></p><p>Sin MFA nativo. Para producción se recomienda añadir TOTP o un proveedor de identidad con MFA.</p></main></div>;
}
