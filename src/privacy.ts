export const noticeVersion = "2026-11-07.v1";
export const purposes = ["service_storage", "transactional_recovery", "marketing_email", "provider_share", "analytics_optional"] as const;
export type Purpose = typeof purposes[number];
