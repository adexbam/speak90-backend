import { getDbPool } from "../db/client.js";

export type SessionCompletionRecord = {
    sessionId: string;
    dayNumber: number;
    elapsedSeconds: number;
    completedAt: string;
};

export async function createOrGetSessionCompletion(params: {
    subjectId: string;
    dayNumber: number;
    elapsedSeconds: number;
    completedAt: string;
}): Promise<SessionCompletionRecord> {
    const pool = getDbPool();

    const existing = await pool.query<{
        id: string;
        day_number: number;
        elapsed_seconds: number;
        completed_at: string;
    }>(
        `
        SELECT id, day_number, elapsed_seconds, completed_at
        FROM session_completions
        WHERE subject_id = $1
          AND day_number = $2
          AND completed_at = $3
        LIMIT 1
        `,
        [params.subjectId, params.dayNumber, params.completedAt]
    );

    if (existing.rowCount && existing.rows[0]) {
        const row = existing.rows[0];
        return {
            sessionId: row.id,
            dayNumber: row.day_number,
            elapsedSeconds: row.elapsed_seconds,
            completedAt: new Date(row.completed_at).toISOString(),
        };
    }

    const inserted = await pool.query<{
        id: string;
        day_number: number;
        elapsed_seconds: number;
        completed_at: string;
    }>(
        `
        INSERT INTO session_completions (subject_id, day_number, elapsed_seconds, completed_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, day_number, elapsed_seconds, completed_at
        `,
        [
            params.subjectId,
            params.dayNumber,
            params.elapsedSeconds,
            params.completedAt,
        ]
    );

    const row = inserted.rows[0];
    return {
        sessionId: row.id,
        dayNumber: row.day_number,
        elapsedSeconds: row.elapsed_seconds,
        completedAt: new Date(row.completed_at).toISOString(),
    };
}
