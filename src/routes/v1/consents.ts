import type { FastifyInstance } from "fastify";
import {
    getAudioCloudConsentHandler,
    postAudioCloudConsentHandler,
} from "./consents.handlers.js";
import {
    getAudioCloudConsentSchema,
    upsertAudioCloudConsentSchema,
} from "./consents.schemas.js";

export async function consentRoutes(app: FastifyInstance) {
    app.post(
        "/audio-cloud",
        {
            config: { auth: true },
            schema: upsertAudioCloudConsentSchema,
        },
        postAudioCloudConsentHandler
    );

    app.get(
        "/audio-cloud",
        {
            config: { auth: true },
            schema: getAudioCloudConsentSchema,
        },
        getAudioCloudConsentHandler
    );
}
