WITH ranked AS (
    SELECT
        ctid,
        ROW_NUMBER() OVER (
            PARTITION BY subject_id, day_number, completed_at
            ORDER BY id
        ) AS row_num
    FROM session_completions
)
DELETE FROM session_completions sc
USING ranked r
WHERE sc.ctid = r.ctid
  AND r.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_completions_idempotency
ON session_completions(subject_id, day_number, completed_at);
