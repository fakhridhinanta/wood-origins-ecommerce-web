CREATE TABLE IF NOT EXISTS tracking_settings (
 id INTEGER PRIMARY KEY, meta_pixel_id TEXT NOT NULL, gtm_id TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS event_config (
 event_key TEXT PRIMARY KEY, meta_event_name TEXT NOT NULL, gtm_event_name TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS whatsapp_templates (
 id SERIAL PRIMARY KEY, campaign_name TEXT NOT NULL DEFAULT '', ad_set_name TEXT NOT NULL DEFAULT '',
 ad_name TEXT NOT NULL DEFAULT '', message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', notes TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS website_events (
 id SERIAL PRIMARY KEY, event_id TEXT NOT NULL UNIQUE, event_name TEXT NOT NULL, event_type TEXT NOT NULL,
 timestamp TEXT NOT NULL, page_url TEXT NOT NULL, page_section TEXT NOT NULL DEFAULT '', cta_name TEXT NOT NULL DEFAULT '',
 campaign_name TEXT NOT NULL DEFAULT '', ad_set_name TEXT NOT NULL DEFAULT '', ad_name TEXT NOT NULL DEFAULT '',
 utm_source TEXT NOT NULL DEFAULT '', utm_medium TEXT NOT NULL DEFAULT '', utm_content TEXT NOT NULL DEFAULT '',
 session_id TEXT NOT NULL, lead_id TEXT NOT NULL DEFAULT '', test_live TEXT NOT NULL DEFAULT 'live', payload TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS events_timestamp_idx ON website_events(timestamp);
CREATE TABLE IF NOT EXISTS leads (
 id SERIAL PRIMARY KEY, submission_id TEXT NOT NULL UNIQUE, submitted_at TEXT NOT NULL,
 name TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', answers TEXT NOT NULL DEFAULT '{}',
 campaign_name TEXT NOT NULL DEFAULT '', ad_set_name TEXT NOT NULL DEFAULT '', ad_name TEXT NOT NULL DEFAULT '',
 utm_source TEXT NOT NULL DEFAULT '', utm_medium TEXT NOT NULL DEFAULT '', utm_content TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'new', lead_source TEXT NOT NULL DEFAULT 'website', test_live TEXT NOT NULL DEFAULT 'live',
 webhook_status TEXT NOT NULL DEFAULT 'pending', webhook_attempted_at TEXT
);
CREATE INDEX IF NOT EXISTS leads_submitted_idx ON leads(submitted_at);
CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY NOT NULL, expires_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS admin_login_attempts (key TEXT PRIMARY KEY NOT NULL, attempts INTEGER NOT NULL, expires_at BIGINT NOT NULL);
