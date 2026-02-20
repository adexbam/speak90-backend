import dotenv from "dotenv";
import { createHash, createHmac } from "node:crypto";
import jwt from "jsonwebtoken";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isActiveSessionForAccessToken } from "../repositories/device-session.repository.js";
import { logger } from "../utils/logger.js";

dotenv.config();

type AuthRequest = FastifyRequest & { user?: any };

type DeviceTokenClaims = {
    sub?: string;
    tokenType?: string;
    deviceId?: string;
};

function parseBearerToken(headerValue: unknown): string | undefined {
    if (typeof headerValue !== "string") {
        return undefined;
    }
    const [scheme, token] = headerValue.split(" ");
    if (scheme !== "Bearer" || !token) {
        return undefined;
    }
    return token;
}

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

function deriveSubjectId(deviceId: string, secret: string): string {
    const digest = createHmac("sha256", secret)
        .update(`device:${deviceId}`)
        .digest("hex");
    return `dev_${digest.slice(0, 40)}`;
}

function validateDeviceClaims(claims: DeviceTokenClaims): {
    ok: boolean;
    error?: string;
} {
    if (claims.tokenType !== "device") {
        return { ok: false, error: "Unauthorized: invalid token type" };
    }
    if (!claims.sub || !claims.sub.startsWith("dev_")) {
        return { ok: false, error: "Unauthorized: invalid token subject" };
    }
    if (!claims.deviceId || typeof claims.deviceId !== "string") {
        return { ok: false, error: "Unauthorized: missing device id claim" };
    }
    return { ok: true };
}

export const authenticate = async (req: AuthRequest, reply: FastifyReply) => {
    const token = parseBearerToken(req.headers.authorization);
    if (!token) {
        return reply.status(401).send({
            error: "Missing Bearer token in Authorization header",
        });
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return reply.status(500).send({
                error: "JWT_SECRET is not configured",
            });
        }

        const decoded = jwt.verify(token, secret) as DeviceTokenClaims;
        const claimsValidation = validateDeviceClaims(decoded);
        if (!claimsValidation.ok) {
            return reply.status(401).send({
                error: claimsValidation.error,
            });
        }
        const expectedSub = deriveSubjectId(decoded.deviceId as string, secret);
        if (decoded.sub !== expectedSub) {
            return reply.status(401).send({
                error: "Unauthorized: token subject/device mismatch",
            });
        }

        const isActive = await isActiveSessionForAccessToken({
            accessTokenHash: hashToken(token),
            deviceId: decoded.deviceId as string,
        });

        if (!isActive) {
            return reply.status(401).send({
                error: "Unauthorized: session not active",
            });
        }

        req.user = decoded;
    } catch (err) {
        logger.error(
            {
                err,
                event: "auth.token_verification.failed",
                data: { token_present: true },
            },
            "Token validation failed"
        );
        return reply.status(401).send({
            error: "Unauthorized: invalid or expired token",
        });
    }
};

export const authorize = (allowedGroups: string[] = []) => {
    return async (req: AuthRequest, reply: FastifyReply) => {
        if (!req.user || !Array.isArray((req.user as any).groups)) {
            return reply
                .status(403)
                .send({ error: "No user groups found in token." });
        }

        const hasGroup = (req.user as any).groups.some((group: string) =>
            allowedGroups.includes(group)
        );
        if (!hasGroup) {
            return reply.status(403).send({
                error: "Insufficient permissions for this operation.",
            });
        }
    };
};

export const authenticateAndAuthorize =
    (requiredGroups: string[] = []) =>
    async (req: AuthRequest, reply: FastifyReply) => {
        const token = parseBearerToken(req.headers.authorization);

        if (!token) {
            return reply.status(401).send({
                error: "Missing Bearer token in Authorization header",
            });
        }

        try {
            const secret = process.env.JWT_SECRET;
            if (!secret) {
                return reply.status(500).send({
                    error: "JWT_SECRET is not configured",
                });
            }
            const decoded = jwt.verify(token, secret);

            const userGroups = Array.isArray((decoded as any).groups)
                ? (decoded as any).groups
                : [];

            const hasPermission = requiredGroups.some((group) =>
                userGroups.includes(group)
            );

            if (!hasPermission) {
                return reply.status(403).send({
                    error: "Insufficient permissions: group membership required",
                    requiredGroups,
                    userGroups,
                });
            }

            req.user = decoded;
        } catch (err) {
            logger.error(
                {
                    err,
                    event: "auth.token_verification.failed",
                    data: { token_present: true },
                },
                "Token validation failed"
            );
            return reply.status(401).send({
                error: "Unauthorized: invalid or expired token",
            });
        }
    };
