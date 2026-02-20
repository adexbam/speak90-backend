import type { FastifyReply, FastifyRequest } from "fastify";
import {
    createDeviceSession,
    InvalidRefreshTokenError,
    refreshDeviceSession,
} from "../../services/device-session.service.js";
import { ERROR_CODES } from "../../utils/error-codes.js";
import { httpError } from "../../utils/http-errors.js";

type CreateDeviceSessionBody = {
    deviceId: string;
    platform: string;
    appVersion: string;
};

type RefreshDeviceSessionBody = {
    refreshToken: string;
};

export async function createDeviceSessionHandler(
    request: FastifyRequest<{ Body: CreateDeviceSessionBody }>,
    reply: FastifyReply
) {
    const session = await createDeviceSession(request.body);
    reply.code(201);
    return session;
}

export async function refreshDeviceSessionHandler(
    request: FastifyRequest<{ Body: RefreshDeviceSessionBody }>,
    reply: FastifyReply
) {
    try {
        const session = await refreshDeviceSession({
            refreshToken: request.body.refreshToken,
        });
        reply.code(200);
        return session;
    } catch (error) {
        if (error instanceof InvalidRefreshTokenError) {
            throw httpError(
                request,
                "unauthorized",
                error.message,
                ERROR_CODES.authInvalidRefresh
            );
        }
        throw error;
    }
}
