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
    return createAudioCloudConsent(input);
}

export async function readAudioCloudConsent(
    subjectId: string
): Promise<AudioCloudConsent | null> {
    return getLatestAudioCloudConsent(subjectId);
}
