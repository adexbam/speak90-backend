import multipart from "@fastify/multipart";
import type { FastifyInstance } from "fastify";
import {
    getAudioUploadsHandler,
    postAudioUploadHandler,
} from "./audio-uploads.handlers.js";
import {
    getAudioUploadsSchema,
    postAudioUploadSchema,
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
            schema: postAudioUploadSchema,
        },
        postAudioUploadHandler
    );

    app.get(
        "/",
        {
            config: { auth: true },
            schema: getAudioUploadsSchema,
        },
        getAudioUploadsHandler
    );
}
