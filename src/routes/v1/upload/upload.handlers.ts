import type { FastifyReply, FastifyRequest } from "fastify";
import { uploadFile } from "../../../controllers/upload.controller.js";
import { logEvent } from "../../../utils/logger.js";

export async function uploadFileHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const result = await uploadFile(request);
    logEvent(
        request.log,
        "upload.file.succeeded",
        {
            data: {
                key: result.key,
                filename: result.filename,
            },
        },
        "File uploaded"
    );
    reply.code(201);
    return result;
}
