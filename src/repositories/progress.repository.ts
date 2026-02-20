import { getDbPool } from "../db/client.js";

export type UserProgressRecord = {
    currentDay: number;
    streak: number;
    totalMinutes: number;
    sessionsCompleted: number[];
    updatedAt: string;
};

type UpsertProgressInput = {
    subjectId: string;
    currentDay: number;
    streak: number;
    totalMinutes: number;
    sessionsCompleted: number[];
    updatedAt: string;
};

export async function upsertProgressLww(
    input: UpsertProgressInput
): Promise<UserProgressRecord> {
    const pool = getDbPool();
    const result = await pool.query<{
        current_day: number;
        streak: number;
        total_minutes: number;
        sessions_completed_json: number[];
        updated_at: string;
    }>(
        `
        INSERT INTO user_progress (
            subject_id,
            current_day,
            streak,
            total_minutes,
            sessions_completed_json,
            updated_at
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6)
        ON CONFLICT (subject_id) DO UPDATE
        SET
            current_day = EXCLUDED.current_day,
            streak = EXCLUDED.streak,
            total_minutes = EXCLUDED.total_minutes,
            sessions_completed_json = EXCLUDED.sessions_completed_json,
            updated_at = EXCLUDED.updated_at
        WHERE user_progress.updated_at <= EXCLUDED.updated_at
        RETURNING
            current_day,
            streak,
            total_minutes,
            sessions_completed_json,
            updated_at
        `,
        [
            input.subjectId,
            input.currentDay,
            input.streak,
            input.totalMinutes,
            JSON.stringify(input.sessionsCompleted),
            input.updatedAt,
        ]
    );

    if (result.rowCount && result.rows[0]) {
        return {
            currentDay: result.rows[0].current_day,
            streak: result.rows[0].streak,
            totalMinutes: result.rows[0].total_minutes,
            sessionsCompleted: result.rows[0].sessions_completed_json,
            updatedAt: new Date(result.rows[0].updated_at).toISOString(),
        };
    }

    return getProgressOrDefault(input.subjectId);
}

export async function getProgressOrDefault(
    subjectId: string
): Promise<UserProgressRecord> {
    const pool = getDbPool();
    const result = await pool.query<{
        current_day: number;
        streak: number;
        total_minutes: number;
        sessions_completed_json: number[];
        updated_at: string;
    }>(
        `
        SELECT
            current_day,
            streak,
            total_minutes,
            sessions_completed_json,
            updated_at
        FROM user_progress
        WHERE subject_id = $1
        LIMIT 1
        `,
        [subjectId]
    );

    const row = result.rows[0];
    if (!row) {
        return {
            currentDay: 1,
            streak: 0,
            totalMinutes: 0,
            sessionsCompleted: [],
            updatedAt: new Date(0).toISOString(),
        };
    }

    return {
        currentDay: row.current_day,
        streak: row.streak,
        totalMinutes: row.total_minutes,
        sessionsCompleted: row.sessions_completed_json,
        updatedAt: new Date(row.updated_at).toISOString(),
    };
}
