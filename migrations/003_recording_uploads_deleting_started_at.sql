ALTER TABLE recording_uploads
ADD COLUMN IF NOT EXISTS deleting_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_recording_uploads_deleting_started_at
ON recording_uploads(status, deleting_started_at);
