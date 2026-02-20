import multipart from "@fastify/multipart";
import type { FastifyInstance } from "fastify";
import { requirePremiumEntitlement } from "../../middleware/premium.middleware.js";
import {
    deleteAudioUploadHandler,
    getAudioUploadsHandler,
    purgeAudioUploadsHandler,
    postAudioUploadHandler,
} from "./audio-uploads.handlers.js";
import {
    deleteAudioUploadSchema,
    getAudioUploadsSchema,
    postAudioUploadSchema,
    purgeAudioUploadsSchema,
} from "./audio-uploads.schemas.js";

export async function audioUploadsRoutes(app: FastifyInstance) {
    await app.register(multipart, {
        limits: { fileSize: 25 * 1024 * 1024 },
        attachFieldsToBody: true,
    });

    app.post(
        "/",
        {
            config: { auth: true },
            preHandler: requirePremiumEntitlement,
            schema: postAudioUploadSchema,
        },
        postAudioUploadHandler
    );

    app.get(
        "/",
        {
            config: { auth: true },
            preHandler: requirePremiumEntitlement,
            schema: getAudioUploadsSchema,
        },
        getAudioUploadsHandler
    );

    app.delete(
        "/:uploadId",
        {
            config: { auth: true },
            preHandler: requirePremiumEntitlement,
            schema: deleteAudioUploadSchema,
        },
        deleteAudioUploadHandler
    );

    app.post(
        "/purge",
        {
            config: { auth: true },
            preHandler: requirePremiumEntitlement,
            schema: purgeAudioUploadsSchema,
        },
        purgeAudioUploadsHandler
    );
}
