import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { uploadFileHandler } from "./upload.handlers.js";
import { uploadPreHandler } from "../../../middleware/upload.prehandlers.js";
import { uploadSchema } from "./upload.schemas.js";

export async function upLoadRoutes(app: FastifyInstance) {
    await app.register(multipart, {
        limits: { fileSize: 10 * 1024 * 1024 },
        attachFieldsToBody: true,
    });

    app.post(
        "/",
        {
            config: { auth: true },
            preHandler: uploadPreHandler,
            schema: uploadSchema,
        },
        uploadFileHandler
    );
}
