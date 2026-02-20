import { getDbPool } from "../db/client.js";

export type RecordingUploadInsert = {
    subjectId: string;
    storageKey: string;
    fileUri: string;
    dayNumber: number;
    sectionId: string;
    durationMs: number;
    createdAtClient: string;
    expiresAt: Date;
};

export type RecordingUploadRow = {
    uploadId: string;
    dayNumber: number;
    sectionId: string;
    durationMs: number;
    createdAt: string;
    uploadedAt: string;
    expiresAt: string;
};

export async function insertRecordingUpload(
    input: RecordingUploadInsert
): Promise<{
    uploadId: string;
    uri: string;
    uploadedAt: string;
}> {
    const pool = getDbPool();
    const result = await pool.query<{
        id: string;
        file_uri: string;
        uploaded_at: string;
    }>(
        `
        INSERT INTO recording_uploads (
            subject_id,
            storage_key,
            file_uri,
            day_number,
            section_id,
            duration_ms,
            created_at_client,
            expires_at,
            status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'uploaded')
        RETURNING id, file_uri, uploaded_at
        `,
        [
            input.subjectId,
            input.storageKey,
            input.fileUri,
            input.dayNumber,
            input.sectionId,
            input.durationMs,
            input.createdAtClient,
            input.expiresAt.toISOString(),
        ]
    );

    const row = result.rows[0];
    return {
        uploadId: row.id,
        uri: row.file_uri,
        uploadedAt: new Date(row.uploaded_at).toISOString(),
    };
}

export async function listRecordingUploads(
    subjectId: string
): Promise<RecordingUploadRow[]> {
    const pool = getDbPool();
    const result = await pool.query<{
        id: string;
        day_number: number;
        section_id: string;
        duration_ms: number;
        created_at_client: string | null;
        uploaded_at: string;
        expires_at: string;
    }>(
        `
        SELECT
            id,
            day_number,
            section_id,
            duration_ms,
            created_at_client,
            uploaded_at,
            expires_at
        FROM recording_uploads
        WHERE subject_id = $1
        ORDER BY uploaded_at DESC
        `,
        [subjectId]
    );

    return result.rows.map((row) => ({
        uploadId: row.id,
        dayNumber: row.day_number,
        sectionId: row.section_id,
        durationMs: row.duration_ms,
        createdAt: new Date(row.created_at_client ?? row.uploaded_at).toISOString(),
        uploadedAt: new Date(row.uploaded_at).toISOString(),
        expiresAt: new Date(row.expires_at).toISOString(),
    }));
}
