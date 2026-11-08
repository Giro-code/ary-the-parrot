-- DESTRUCTIVE stage 3 rollback. Only explicitly authorized empty/test databases.
ALTER TABLE email_outbox DROP COLUMN inquiry_id;
DROP TABLE commercial_inquiries;
DROP TABLE email_suppressions;
DROP TABLE email_webhook_events;
ALTER TABLE auth_magic_links DROP COLUMN email_encrypted, DROP COLUMN email_lookup_hash, DROP COLUMN source_session_id, DROP COLUMN locale, DROP COLUMN marketing_requested;
ALTER TABLE email_outbox DROP COLUMN recipient_hash, DROP COLUMN recipient_encrypted, DROP COLUMN rendered_encrypted, DROP COLUMN category, DROP COLUMN created_at;
DELETE FROM email_outbox WHERE recipient_ref IS NULL;
ALTER TABLE email_outbox ALTER COLUMN recipient_ref SET NOT NULL;
ALTER TABLE email_outbox ALTER COLUMN delivery_state SET DEFAULT 'pending';
ALTER TABLE visitor_accounts DROP COLUMN last_active_at;
