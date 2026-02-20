import type { FastifyInstance } from "fastify";
import { requirePremiumEntitlement } from "../../middleware/premium.middleware.js";
import {
    getAudioCloudConsentHandler,
    postAudioCloudConsentHandler,
} from "./consents.handlers.js";
import {
    getAudioCloudConsentSchema,
    createAudioCloudConsentSchema,
} from "./consents.schemas.js";

export async function consentRoutes(app: FastifyInstance) {
    app.post(
        "/audio-cloud",
        {
            config: { auth: true },
            preHandler: requirePremiumEntitlement,
            schema: createAudioCloudConsentSchema,
        },
        postAudioCloudConsentHandler
    );

    app.get(
        "/audio-cloud",
        {
            config: { auth: true },
            preHandler: requirePremiumEntitlement,
            schema: getAudioCloudConsentSchema,
        },
        getAudioCloudConsentHandler
    );
}
