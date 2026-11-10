export const noticeVersion = "2026-11-10.v2";
export const purposes = ["terms", "conversation_history", "marketing", "service_storage", "transactional_recovery", "marketing_email", "provider_share", "analytics_optional"] as const;
export type Purpose = typeof purposes[number];
