import { sql } from "drizzle-orm";
import type { ImageMetadata } from "./seed-media.ts";
import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, index, uniqueIndex, check } from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const date = (name: string) => timestamp(name, { withTimezone: true });
export const organizations = pgTable("organizations", {
  id: id(), name: text().notNull(), kind: text().notNull(), status: text().notNull().default("active"), createdAt: created(), demo: boolean().notNull().default(false),
});
export const visitorAccounts = pgTable("visitor_accounts", {
  id: id(), emailEncrypted: text("email_encrypted"), emailLookupHash: text("email_lookup_hash").unique(),
  emailVerifiedAt: date("email_verified_at"), createdAt: created(), deletionRequestedAt: date("deletion_requested_at"),
  lastActiveAt: date("last_active_at").notNull().defaultNow(),
});
export const memberships = pgTable("memberships", {
  id: id(), userId: uuid("user_id").notNull().references(() => visitorAccounts.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  role: text().notNull(), status: text().notNull().default("active"),
}, t => [uniqueIndex("membership_owner_org").on(t.userId, t.organizationId), index("membership_org").on(t.organizationId)]);
export const kioskDevices = pgTable("kiosk_devices", {
  id: id(), organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  locationLabel: text("location_label").notNull(), publicDeviceId: uuid("public_device_id").notNull().defaultRandom().unique(),
  keyHash: text("key_hash").unique(), activationHash: text("activation_hash").unique(), activationExpiresAt: date("activation_expires_at"),
  credentialExpiresAt: date("credential_expires_at"), firmwareVersion: text("firmware_version"),
  status: text().notNull().default("pending"), lastSeenAt: date("last_seen_at"), createdAt: created(),
});
export const conversations = pgTable("conversations", {
  id: id(), visitorId: uuid("visitor_id").notNull().references(() => visitorAccounts.id, { onDelete: "cascade" }),
  encryptedPayload: text("encrypted_payload").notNull(), createdAt: created(), updatedAt: date("updated_at").notNull().defaultNow(),
  retentionUntil: date("retention_until").notNull(),
}, t => [index("conversations_owner").on(t.visitorId), index("conversations_retention").on(t.retentionUntil)]);
export const visitorSessions = pgTable("visitor_sessions", {
  id: id(), tokenHash: text("token_hash").notNull().unique(),
  kioskDeviceId: uuid("kiosk_device_id").references(() => kioskDevices.id, { onDelete: "set null" }),
  originKioskId: uuid("origin_kiosk_id").references(() => kioskDevices.id, { onDelete: "set null" }),
  locale: text().notNull().default("es"), countryDeclared: text("country_declared"), interests: jsonb().$type<string[]>().notNull().default([]),
  status: text().notNull().default("active"), createdAt: created(), expiresAt: date("expires_at").notNull(),
  lastActiveAt: date("last_active_at").notNull().defaultNow(),
  ownerUserId: uuid("owner_user_id").references(() => visitorAccounts.id, { onDelete: "cascade" }),
  retentionClass: text("retention_class").notNull().default("anonymous_operational"),
  pendingEmailHash: text("pending_email_hash"),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
}, t => [index("sessions_expiry").on(t.expiresAt), index("sessions_kiosk").on(t.kioskDeviceId), index("sessions_owner").on(t.ownerUserId), check("session_locale", sql`${t.locale} in ('es','en')`)]);
export const visitorPreferences = pgTable("visitor_preferences", {
  id: id(), sessionId: uuid("session_id").unique().references(() => visitorSessions.id, { onDelete: "cascade" }),
  visitorId: uuid("visitor_id").references(() => visitorAccounts.id, { onDelete: "cascade" }),
  locale: text().notNull(), countryDeclared: text("country_declared"), interests: jsonb().$type<string[]>().notNull().default([]),
  desiredTripDuration: text("desired_trip_duration"), accessibilityPreferences: jsonb("accessibility_preferences"), updatedAt: date("updated_at").notNull().defaultNow(),
}, t => [check("preferences_owner", sql`${t.sessionId} is not null or ${t.visitorId} is not null`)]);
export const qrHandoffs = pgTable("qr_handoffs", {
  id: id(), sourceSessionId: uuid("source_session_id").notNull().references(() => visitorSessions.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(), confirmationCode: text("confirmation_code").notNull(),
  expiresAt: date("expires_at").notNull(), usedAt: date("used_at"), invalidatedAt: date("invalidated_at"),
  consumedBySessionId: uuid("consumed_by_session_id").references(() => visitorSessions.id, { onDelete: "set null" }),
  createdAt: created(), attemptCount: integer("attempt_count").notNull().default(0), status: text().notNull().default("pending"),
}, t => [index("handoff_session").on(t.sourceSessionId), index("handoff_expiry").on(t.expiresAt), check("handoff_attempts", sql`${t.attemptCount} >= 0`)]);
export const culturalItems = pgTable("cultural_items", {
  id: id(), contentKey: text("content_key").notNull(), type: text().notNull(), title: text().notNull(), summary: text().notNull(),
  validatedDescription: text("validated_description").notNull(), tags: jsonb().$type<string[]>().notNull().default([]),
  language: text().notNull(), country: text().notNull().default("DO"), region: text(), location: jsonb(), imageAsset: text("image_asset"), image: jsonb().$type<ImageMetadata>(),
  sourceUrl: text("source_url"), license: text().notNull(), editor: text().notNull(), sourceCheckedAt: date("source_checked_at"),
  publishedAt: date("published_at"), lastReviewedAt: date("last_reviewed_at"), status: text().notNull().default("needs_source"), demo: boolean().notNull().default(true),
}, t => [uniqueIndex("content_language").on(t.contentKey, t.language), index("content_published_language").on(t.status, t.language), check("published_has_source", sql`${t.status} != 'published' or (${t.sourceUrl} is not null and ${t.sourceCheckedAt} is not null)`)]);
export const culturalBridges = pgTable("cultural_bridges", {
  id: id(), countryCode: text("country_code").notNull(), culturalItemId: uuid("cultural_item_id").notNull().references(() => culturalItems.id, { onDelete: "cascade" }),
  relation: text().notNull(), sourceUrl: text("source_url").notNull(), sourceCheckedAt: date("source_checked_at").notNull(),
}, t => [uniqueIndex("bridge_country_item").on(t.countryCode, t.culturalItemId)]);
export const providers = pgTable("providers", {
  id: id(), organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text().notNull(), services: jsonb(), approvedStatus: text("approved_status").notNull().default("pending"),
}, t => [index("provider_org").on(t.organizationId)]);
export const offers = pgTable("offers", {
  id: id(), providerId: uuid("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
  title: text().notNull(), eligibility: text(), approvedStatus: text("approved_status").notNull().default("pending"), categories: jsonb(),
  pricingDisclaimer: text("pricing_disclaimer"), sourceUrl: text("source_url"), sourceCheckedAt: date("source_checked_at"), sponsored: boolean().notNull().default(false),
}, t => [index("offers_provider").on(t.providerId)]);
export const recommendations = pgTable("recommendations", {
  id: id(), sessionId: uuid("session_id").references(() => visitorSessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => visitorAccounts.id, { onDelete: "cascade" }),
  culturalItemId: uuid("cultural_item_id").references(() => culturalItems.id, { onDelete: "cascade" }), offerId: uuid("offer_id").references(() => offers.id, { onDelete: "cascade" }),
  rationale: text().notNull(), evidenceIds: jsonb("evidence_ids").$type<string[]>().notNull(), mode: text().notNull().default("rules"), status: text().notNull().default("shown"), createdAt: created(),
}, t => [index("recommendations_session").on(t.sessionId), check("recommendations_owner", sql`${t.sessionId} is not null or ${t.userId} is not null`)]);
export const savedExperiences = pgTable("saved_experiences", {
  id: id(), sessionId: uuid("session_id").references(() => visitorSessions.id, { onDelete: "cascade" }),
  visitorId: uuid("visitor_id").references(() => visitorAccounts.id, { onDelete: "cascade" }),
  itemId: uuid("item_id").notNull().references(() => culturalItems.id, { onDelete: "cascade" }), state: text().notNull().default("saved"),
  favorite: boolean().notNull().default(false), notes: text(), createdAt: created(),
}, t => [uniqueIndex("saved_session_item").on(t.sessionId, t.itemId), uniqueIndex("saved_visitor_item").on(t.visitorId, t.itemId), index("saved_owner").on(t.sessionId), check("saved_state", sql`${t.state} in ('saved','visited','removed')`), check("saved_owner_required", sql`${t.sessionId} is not null or ${t.visitorId} is not null`)]);
export const authMagicLinks = pgTable("auth_magic_links", {
  id: id(), tokenHash: text("token_hash").notNull().unique(), userId: uuid("user_id").references(() => visitorAccounts.id, { onDelete: "cascade" }),
  purpose: text().notNull(), expiresAt: date("expires_at").notNull(), usedAt: date("used_at"), createdAt: created(),
  emailEncrypted: text("email_encrypted"), emailLookupHash: text("email_lookup_hash"),
  sourceSessionId: uuid("source_session_id").references(() => visitorSessions.id, { onDelete: "cascade" }),
  locale: text().notNull().default("es"), marketingRequested: boolean("marketing_requested").notNull().default(false),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
}, t => [index("magic_expiry").on(t.expiresAt)]);
export const savedPlaces = pgTable("saved_places", {
  id: id(), sessionId: uuid("session_id").references(() => visitorSessions.id, { onDelete: "cascade" }),
  visitorId: uuid("visitor_id").references(() => visitorAccounts.id, { onDelete: "cascade" }),
  encryptedPayload: text("encrypted_payload").notNull(), createdAt: created(),
}, t => [index("places_session").on(t.sessionId), index("places_visitor").on(t.visitorId), check("place_owner", sql`${t.sessionId} is not null or ${t.visitorId} is not null`)]);
export const consentRecords = pgTable("consent_records", {
  id: id(), visitorId: uuid("visitor_id").references(() => visitorAccounts.id, { onDelete: "cascade" }), sessionId: uuid("session_id").references(() => visitorSessions.id, { onDelete: "cascade" }),
  purpose: text().notNull(), granted: boolean().notNull(), noticeVersion: text("notice_version").notNull(), collectedAt: date("collected_at").notNull().defaultNow(), revokedAt: date("revoked_at"), source: text().notNull(), proof: jsonb(), locale: text().notNull(),
}, t => [index("consent_visitor_purpose").on(t.visitorId, t.purpose), index("consent_session").on(t.sessionId)]);
export const chatMessages = pgTable("chat_messages", {
  id: id(), sessionId: uuid("session_id").references(() => visitorSessions.id, { onDelete: "cascade" }), visitorId: uuid("visitor_id").references(() => visitorAccounts.id, { onDelete: "cascade" }),
  role: text().notNull(), encryptedPayload: text("encrypted_payload"), provenance: jsonb(), retentionUntil: date("retention_until").notNull(), createdAt: created(),
}, t => [index("chat_session").on(t.sessionId), index("chat_retention").on(t.retentionUntil)]);
export const analyticsEvents = pgTable("analytics_events", {
  id: id(), createdAt: created(), organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  aggregationKey: text("aggregation_key"), eventType: text("event_type").notNull(), culturalItemId: uuid("cultural_item_id").references(() => culturalItems.id, { onDelete: "set null" }),
  providerId: uuid("provider_id").references(() => providers.id, { onDelete: "set null" }), metadata: jsonb().$type<Record<string, unknown>>().notNull().default({}),
  kioskDeviceId: uuid("kiosk_device_id").references(() => kioskDevices.id, { onDelete: "set null" }),
}, t => [index("analytics_org_date").on(t.organizationId, t.createdAt), index("analytics_event_date").on(t.eventType, t.createdAt)]);
export const providerLeads = pgTable("provider_leads", {
  id: id(), providerId: uuid("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }), visitorId: uuid("visitor_id").notNull().references(() => visitorAccounts.id, { onDelete: "cascade" }),
  userAuthorizedFields: jsonb("user_authorized_fields").notNull(), purpose: text().notNull(), consentRecordId: uuid("consent_record_id").notNull().references(() => consentRecords.id),
  status: text().notNull().default("pending"), createdAt: created(), expiresAt: date("expires_at").notNull(), auditReference: text("audit_reference"),
  payloadEncrypted: text("payload_encrypted"), idempotencyKey: text("idempotency_key").unique(),
}, t => [index("leads_provider").on(t.providerId)]);
export const emailSubscriptions = pgTable("email_subscriptions", {
  id: id(), visitorId: uuid("visitor_id").notNull().references(() => visitorAccounts.id, { onDelete: "cascade" }), addressRef: text("address_ref").notNull(), purpose: text().notNull(), doubleOptInAt: date("double_opt_in_at"),
  status: text().notNull().default("pending"), frequency: text(), locale: text().notNull(), timezone: text(), lastSentAt: date("last_sent_at"), unsubscribeTokenHash: text("unsubscribe_token_hash").unique(),
}, t => [uniqueIndex("subscription_visitor_purpose").on(t.visitorId, t.purpose)]);
export const emailOutbox = pgTable("email_outbox", {
  id: id(), template: text().notNull(), recipientRef: uuid("recipient_ref").references(() => visitorAccounts.id, { onDelete: "cascade" }), idempotencyKey: text("idempotency_key").notNull().unique(),
  scheduledAt: date("scheduled_at").notNull(), sentAt: date("sent_at"), providerMessageId: text("provider_message_id"), deliveryState: text("delivery_state").notNull().default("queued"), retries: integer().notNull().default(0), lastError: text("last_error"), campaignId: uuid("campaign_id"),
  recipientHash: text("recipient_hash"), recipientEncrypted: text("recipient_encrypted"), renderedEncrypted: text("rendered_encrypted"),
  category: text().notNull().default("transactional"), createdAt: created(),
  inquiryId: uuid("inquiry_id").references(() => commercialInquiries.id, { onDelete: "cascade" }),
}, t => [index("outbox_pending").on(t.deliveryState, t.scheduledAt)]);
export const auditLogs = pgTable("audit_logs", {
  id: id(), actor: uuid().references(() => visitorAccounts.id, { onDelete: "set null" }), action: text().notNull(), targetType: text("target_type").notNull(), targetId: uuid("target_id"),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }), createdAt: created(), metadata: jsonb(),
}, t => [index("audit_org_date").on(t.organizationId, t.createdAt)]);
export const deletionJobs = pgTable("deletion_jobs", {
  id: id(), subjectId: uuid("subject_id").references(() => visitorAccounts.id, { onDelete: "set null" }), requestedAt: date("requested_at").notNull().defaultNow(), status: text().notNull().default("pending"), completedAt: date("completed_at"), externalProcessorsNotifiedAt: date("external_processors_notified_at"),
});
export const rateLimits = pgTable("rate_limits", {
  keyHash: text("key_hash").primaryKey(), count: integer().notNull().default(1), resetAt: date("reset_at").notNull(),
}, t => [index("rate_limit_expiry").on(t.resetAt)]);
export const commercialInquiries = pgTable("commercial_inquiries", {
  id: id(), reference: text().notNull().unique(), idempotencyKey: text("idempotency_key").notNull().unique(), requestHash: text("request_hash").notNull(),
  payloadEncrypted: text("payload_encrypted").notNull(), source: text().notNull(), status: text().notNull().default("received"),
  createdAt: created(), leadType: text("lead_type").notNull().default("b2b_installation"), locale: text().notNull(), consentVersion: text("consent_version").notNull(),
});
export const emailSuppressions = pgTable("email_suppressions", {
  emailHash: text("email_hash").primaryKey(), reason: text().notNull(), createdAt: created(),
});
export const emailWebhookEvents = pgTable("email_webhook_events", {
  eventId: text("event_id").primaryKey(), createdAt: created(),
});
export const aiUsage = pgTable("ai_usage", {
  id: id(), createdAt: created(), model: text().notNull(), mode: text().notNull(),
  inputTokens: integer("input_tokens").notNull().default(0), outputTokens: integer("output_tokens").notNull().default(0),
  latencyMs: integer("latency_ms").notNull(), errorCode: text("error_code"),
}, t => [index("ai_usage_date").on(t.createdAt)]);
export const robotEvents = pgTable("robot_events", {
  eventId: uuid("event_id").primaryKey(), deviceId: uuid("device_id").notNull().references(() => kioskDevices.id, { onDelete: "cascade" }),
  state: text().notNull(), hardware: text().notNull(), payloadHash: text("payload_hash").notNull(), createdAt: created(),
}, t => [index("robot_events_device_date").on(t.deviceId, t.createdAt)]);
export const robotCommands = pgTable("robot_commands", {
  id: id(), deviceId: uuid("device_id").notNull().references(() => kioskDevices.id, { onDelete: "cascade" }),
  state: text().notNull(), gesture: text().notNull(), createdAt: created(), deliveredAt: date("delivered_at"), expiresAt: date("expires_at").notNull(),
}, t => [index("robot_commands_device").on(t.deviceId), check("maintenance_only", sql`${t.state} = 'maintenance' and ${t.gesture} in ('rest','stop')`)]);
export const staffSessions = pgTable("staff_sessions", {
  id: id(), userId: uuid("user_id").notNull().references(() => visitorAccounts.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(), createdAt: created(), expiresAt: date("expires_at").notNull(),
}, t => [index("staff_session_expiry").on(t.expiresAt)]);
export const campaigns = pgTable("campaigns", {
  id: id(), subject: text().notNull(), message: text().notNull(), status: text().notNull().default("queued"),
  createdAt: created(), createdBy: uuid("created_by").references(() => visitorAccounts.id, { onDelete: "set null" }),
});
