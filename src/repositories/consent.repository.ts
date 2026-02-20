import { getDbPool } from "../db/client.js";

export type AudioCloudConsent = {
    decision: "granted" | "denied";
    decidedAt: string;
    policyVersion: string;
};

export async function createAudioCloudConsent(params: {
    subjectId: string;
    decision: "granted" | "denied";
    decidedAtClient: string;
    policyVersion: string;
}): Promise<AudioCloudConsent> {
    const pool = getDbPool();
    const result = await pool.query<{
        decision: "granted" | "denied";
        decided_at: string;
        decided_at_client: string | null;
        policy_version: string;
    }>(
        `
        INSERT INTO user_consents (
            subject_id,
            consent_type,
            decision,
            policy_version,
            decided_at,
            decided_at_client
        )
        VALUES ($1, 'audio_cloud', $2, $3, NOW(), $4)
        RETURNING decision, decided_at, decided_at_client, policy_version
        `,
        [
            params.subjectId,
            params.decision,
            params.policyVersion,
            params.decidedAtClient,
        ]
    );

    const row = result.rows[0];
    return {
        decision: row.decision,
        decidedAt: new Date(
            row.decided_at_client ?? row.decided_at
        ).toISOString(),
        policyVersion: row.policy_version,
    };
}

export async function getLatestAudioCloudConsent(
    subjectId: string
): Promise<AudioCloudConsent | null> {
    const pool = getDbPool();
    const result = await pool.query<{
        decision: "granted" | "denied";
        decided_at: string;
        decided_at_client: string | null;
        policy_version: string;
    }>(
        `
        SELECT decision, decided_at, decided_at_client, policy_version
        FROM user_consents
        WHERE subject_id = $1 AND consent_type = 'audio_cloud'
        ORDER BY decided_at DESC, created_at DESC
        LIMIT 1
        `,
        [subjectId]
    );

    const row = result.rows[0];
    if (!row) {
        return null;
    }

    return {
        decision: row.decision,
        decidedAt: new Date(
            row.decided_at_client ?? row.decided_at
        ).toISOString(),
        policyVersion: row.policy_version,
    };
}
