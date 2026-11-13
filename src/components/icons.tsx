import type { SVGProps } from "react";
export type IconName = "trips" | "conversations" | "privacy" | "save" | "mic" | "keyboard" | "sound" | "mute" | "exit" | "globe" | "send" | "stop" | "open" | "mail" | "clock" | "pin" | "pause" | "play";
export function Icon({ kind, label, ...props }: SVGProps<SVGSVGElement> & { kind: IconName; label?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    pause: <path d="M8 5v14M16 5v14" strokeWidth="3"/>,
    play: <path d="M7 4v16l13-8L7 4Z" fill="currentColor"/>,
    pin: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    trips: <><rect x="3" y="3" width="18" height="18" rx="3" strokeDasharray="2 2"/><path d="M11 18q3-4 2-9M13 9Q8 5 6 11q4-2 7-2Zm0 0q2-5 5-2l1 4q-3-3-6-2ZM6 18q3-2 6 0t6 0"/></>,
    conversations: <><path d="M4 4h13v10H8l-4 3V4Z"/><path d="M8 18h8l4 3V9"/></>,
    privacy: <><path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
    save: <path d="M6 3h12v18l-6-4-6 4V3Z"/>,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></>,
    keyboard: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/></>,
    sound: <><path d="m11 4-6 5H2v6h3l6 5V4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
    mute: <><path d="m11 4-6 5H2v6h3l6 5V4ZM16 9l6 6m0-6-6 6"/></>,
    exit: <><path d="M10 3H4v18h6m4-14 5 5-5 5m-6-5h13"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>,
    send: <path d="m4 4 17 8-17 8 4-8-4-8Zm4 8h13"/>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>,
    open: <><path d="M14 3h7v7m0-7L10 14M10 5H4v16h16v-6"/></>,
  };
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} {...props}>{paths[kind]}</svg>;
}
export function WelcomeEnvelope({ label }: { label: string }) {
  return <svg className="welcome-envelope" viewBox="0 0 180 140" role="img" aria-label={label} fill="none"><path d="M21 48 89 10l70 38" fill="#dce7d6" stroke="#254e3b" strokeWidth="2"/><rect x="21" y="48" width="138" height="82" rx="8" fill="#fffefa" stroke="#254e3b" strokeWidth="2"/><path d="m22 51 67 45 69-45M22 126l46-43m89 43-46-43" stroke="#254e3b" strokeWidth="2"/><path d="M54 42h57M54 53h39" stroke="#91a99b" strokeWidth="3" strokeLinecap="round"/><rect x="119" y="23" width="33" height="39" rx="3" fill="#e9d4ad" stroke="#254e3b" strokeWidth="1.5" strokeDasharray="3 2"/><path d="M127 41c0-12 15-13 15-2l-7 13-8-11Z" fill="#598049"/><path d="m136 37 10 4-9 2" fill="#684d78"/><circle cx="137" cy="34" r="1.5" fill="#fffefa"/><path d="M123 55q5-4 10 0t14 0" stroke="#45828b" strokeWidth="1.5"/><circle cx="30" cy="26" r="4" fill="#b65c4d"/></svg>;
}
