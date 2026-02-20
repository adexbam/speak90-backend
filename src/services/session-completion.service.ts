import { createOrGetSessionCompletion } from "../repositories/session-completion.repository.js";

export async function recordSessionCompletion(params: {
    subjectId: string;
    dayNumber: number;
    elapsedSeconds: number;
    completedAt: string;
}) {
    return createOrGetSessionCompletion(params);
}
