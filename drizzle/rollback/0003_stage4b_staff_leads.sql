DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS staff_sessions;
ALTER TABLE analytics_events DROP COLUMN kiosk_device_id;
ALTER TABLE visitor_sessions DROP COLUMN origin_kiosk_id;
ALTER TABLE auth_magic_links DROP COLUMN organization_id;
ALTER TABLE organizations DROP COLUMN demo;
ALTER TABLE provider_leads DROP COLUMN payload_encrypted;
ALTER TABLE provider_leads DROP COLUMN idempotency_key;
