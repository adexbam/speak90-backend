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

export type StoredUpload = {
    uploadId: string;
    subjectId: string;
    storageKey: string;
    status: string;
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
          AND status = 'uploaded'
          AND expires_at > NOW()
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

export async function findUploadById(
    subjectId: string,
    uploadId: string
): Promise<StoredUpload | null> {
    const pool = getDbPool();
    const result = await pool.query<{
        id: string;
        subject_id: string;
        storage_key: string;
        status: string;
        expires_at: string;
    }>(
        `
        SELECT id, subject_id, storage_key, status, expires_at
        FROM recording_uploads
        WHERE subject_id = $1 AND id = $2
        LIMIT 1
        `,
        [subjectId, uploadId]
    );

    const row = result.rows[0];
    if (!row) {
        return null;
    }

    return {
        uploadId: row.id,
        subjectId: row.subject_id,
        storageKey: row.storage_key,
        status: row.status,
        expiresAt: new Date(row.expires_at).toISOString(),
    };
}

export async function markUploadDeleted(
    subjectId: string,
    uploadId: string
): Promise<void> {
    const pool = getDbPool();
    await pool.query(
        `
        UPDATE recording_uploads
        SET status = 'deleted', expires_at = NOW()
        WHERE subject_id = $1 AND id = $2
        `,
        [subjectId, uploadId]
    );
}

export async function listPurgeCandidates(params: {
    subjectId: string;
    retentionDays: number;
}): Promise<StoredUpload[]> {
    const pool = getDbPool();
    const result = await pool.query<{
        id: string;
        subject_id: string;
        storage_key: string;
        status: string;
        expires_at: string;
    }>(
        `
        SELECT id, subject_id, storage_key, status, expires_at
        FROM recording_uploads
        WHERE subject_id = $1
          AND status = 'uploaded'
          AND (
            expires_at <= NOW()
            OR uploaded_at <= (NOW() - ($2::int * INTERVAL '1 day'))
          )
        `,
        [params.subjectId, params.retentionDays]
    );

    return result.rows.map((row) => ({
        uploadId: row.id,
        subjectId: row.subject_id,
        storageKey: row.storage_key,
        status: row.status,
        expiresAt: new Date(row.expires_at).toISOString(),
    }));
}

export async function markUploadsDeleted(uploadIds: string[]): Promise<void> {
    if (uploadIds.length === 0) {
        return;
    }

    const pool = getDbPool();
    await pool.query(
        `
        UPDATE recording_uploads
        SET status = 'deleted', expires_at = NOW()
        WHERE id = ANY($1::uuid[])
        `,
        [uploadIds]
    );
}

export async function insertRetentionJob(params: {
    jobType: string;
    startedAt: string;
    finishedAt: string;
    deletedCount: number;
    status: "succeeded" | "failed";
    errorMessage?: string;
}): Promise<void> {
    const pool = getDbPool();
    await pool.query(
        `
        INSERT INTO retention_jobs (
            job_type,
            started_at,
            finished_at,
            deleted_count,
            status,
            error_message
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
            params.jobType,
            params.startedAt,
            params.finishedAt,
            params.deletedCount,
            params.status,
            params.errorMessage ?? null,
        ]
    );
}
