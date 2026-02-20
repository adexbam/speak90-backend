import {
    getProgressOrDefault,
    upsertProgressLww,
    type UserProgressRecord,
} from "../repositories/progress.repository.js";

type UpsertProgressInput = {
    subjectId: string;
    currentDay: number;
    streak: number;
    totalMinutes: number;
    sessionsCompleted: number[];
    updatedAt: string;
};

export async function saveProgress(
    input: UpsertProgressInput
): Promise<UserProgressRecord> {
    return upsertProgressLww(input);
}

export async function readProgress(subjectId: string): Promise<UserProgressRecord> {
    return getProgressOrDefault(subjectId);
}
