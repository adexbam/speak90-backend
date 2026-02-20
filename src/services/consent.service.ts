import {
    createAudioCloudConsent,
    getLatestAudioCloudConsent,
    type AudioCloudConsent,
} from "../repositories/consent.repository.js";

export async function saveAudioCloudConsent(input: {
    subjectId: string;
    decision: "granted" | "denied";
    decidedAt: string;
    policyVersion: string;
}): Promise<AudioCloudConsent> {
    return createAudioCloudConsent({
        subjectId: input.subjectId,
        decision: input.decision,
        decidedAtClient: input.decidedAt,
        policyVersion: input.policyVersion,
    });
}

export async function readAudioCloudConsent(
    subjectId: string
): Promise<AudioCloudConsent | null> {
    return getLatestAudioCloudConsent(subjectId);
}
