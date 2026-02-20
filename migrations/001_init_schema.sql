CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  app_version TEXT,
  access_token_hash TEXT NOT NULL,
  refresh_token_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_device_sessions_device_id ON device_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_expires_at ON device_sessions(expires_at);

CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_percent INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('granted', 'denied')),
  policy_version TEXT,
  decided_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_consents_subject_type ON user_consents(subject_id, consent_type, decided_at DESC);

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL UNIQUE,
  cloud_backup_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  backup_retention_days INT NOT NULL DEFAULT 90,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recording_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  file_uri TEXT NOT NULL,
  day_number INT NOT NULL,
  section_id TEXT NOT NULL,
  duration_ms INT NOT NULL,
  created_at_client TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded'
);
CREATE INDEX IF NOT EXISTS idx_recording_uploads_subject_uploaded_at ON recording_uploads(subject_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_recording_uploads_expires_at ON recording_uploads(expires_at);

CREATE TABLE IF NOT EXISTS retention_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  deleted_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL UNIQUE,
  current_day INT NOT NULL DEFAULT 1,
  streak INT NOT NULL DEFAULT 0,
  total_minutes INT NOT NULL DEFAULT 0,
  sessions_completed_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS srs_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  box INT NOT NULL DEFAULT 1,
  due_at TIMESTAMPTZ,
  review_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subject_id, card_id)
);
CREATE INDEX IF NOT EXISTS idx_srs_cards_subject_due ON srs_cards(subject_id, due_at);

CREATE TABLE IF NOT EXISTS srs_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  result TEXT NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_srs_reviews_subject_created_at ON srs_reviews(subject_id, created_at DESC);

CREATE TABLE IF NOT EXISTS session_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL,
  day_number INT NOT NULL,
  elapsed_seconds INT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_completions_subject_completed_at ON session_completions(subject_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT,
  name TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created ON analytics_events(name, created_at DESC);

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  product_id TEXT NOT NULL,
  transaction_id TEXT,
  purchased_at TIMESTAMPTZ NOT NULL,
  raw_receipt_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(platform, transaction_id)
);

CREATE TABLE IF NOT EXISTS receipt_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_receipt_verifications_subject_verified ON receipt_verifications(subject_id, verified_at DESC);

CREATE TABLE IF NOT EXISTS entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL,
  entitlement_key TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subject_id, entitlement_key)
);
CREATE INDEX IF NOT EXISTS idx_entitlements_subject_active ON entitlements(subject_id, active);

INSERT INTO feature_flags(key, enabled, rollout_percent)
VALUES
  ('v3_stt_on_device', FALSE, 0),
  ('v3_stt_cloud_opt_in', FALSE, 0),
  ('v3_cloud_backup', FALSE, 0),
  ('v3_premium_iap', FALSE, 0)
ON CONFLICT (key) DO NOTHING;
