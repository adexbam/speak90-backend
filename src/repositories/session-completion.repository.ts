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

    const inserted = await pool.query<{
        id: string;
        day_number: number;
        elapsed_seconds: number;
        completed_at: string;
    }>(
        `
        INSERT INTO session_completions (subject_id, day_number, elapsed_seconds, completed_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (subject_id, day_number, completed_at) DO UPDATE
        SET elapsed_seconds = session_completions.elapsed_seconds
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
