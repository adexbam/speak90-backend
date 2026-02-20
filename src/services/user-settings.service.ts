import {
    getBackupSettings,
    upsertBackupSettings,
    type BackupSettings,
} from "../repositories/user-settings.repository.js";

const DEFAULT_RETENTION_DAYS = 90;

export async function saveBackupSettings(input: {
    subjectId: string;
    enabled: boolean;
    retentionDays?: number;
}): Promise<BackupSettings> {
    return upsertBackupSettings({
        subjectId: input.subjectId,
        enabled: input.enabled,
        retentionDays: input.retentionDays ?? DEFAULT_RETENTION_DAYS,
    });
}

export async function readBackupSettings(
    subjectId: string
): Promise<BackupSettings> {
    return getBackupSettings(subjectId);
}
