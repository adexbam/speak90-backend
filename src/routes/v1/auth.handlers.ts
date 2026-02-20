import type { FastifyReply, FastifyRequest } from "fastify";
import { createDeviceSession } from "../../services/device-session.service.js";

type CreateDeviceSessionBody = {
    deviceId: string;
    platform: string;
    appVersion: string;
};

export async function createDeviceSessionHandler(
    request: FastifyRequest<{ Body: CreateDeviceSessionBody }>,
    reply: FastifyReply
) {
    const session = await createDeviceSession(request.body);
    reply.code(201);
    return session;
}
