import { createHash, createHmac, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import {
    findActiveSessionByRefreshTokenHash,
    insertDeviceSession,
    rotateSessionTokens,
} from "../repositories/device-session.repository.js";

type CreateDeviceSessionInput = {
    deviceId: string;
    platform: string;
    appVersion: string;
};

type DeviceSessionResponse = {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    userIdOrDeviceId: string;
};

export class InvalidRefreshTokenError extends Error {
    constructor(message = "Invalid or expired refresh token") {
        super(message);
        this.name = "InvalidRefreshTokenError";
    }
}

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not configured");
    }
    return secret;
}

function getAccessTtlSeconds(): number {
    const value = Number(process.env.DEVICE_ACCESS_TOKEN_TTL_SECONDS || 86400);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 86400;
}

function getRefreshTtlSeconds(): number {
    const value = Number(process.env.DEVICE_REFRESH_TOKEN_TTL_SECONDS || 2592000);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 2592000;
}

function deriveSubjectId(deviceId: string, secret: string): string {
    const digest = createHmac("sha256", secret)
        .update(`device:${deviceId}`)
        .digest("hex");
    return `dev_${digest.slice(0, 40)}`;
}

function issueAccessToken(input: {
    secret: string;
    subjectId: string;
    deviceId: string;
    platform: string;
    appVersion: string;
    accessTtlSeconds: number;
}): string {
    const jti = randomBytes(12).toString("hex");
    return jwt.sign(
        {
            sub: input.subjectId,
            deviceId: input.deviceId,
            platform: input.platform,
            appVersion: input.appVersion,
            tokenType: "device",
            jti,
        },
        input.secret,
        { expiresIn: input.accessTtlSeconds }
    );
}

function buildTokenPair(input: {
    secret: string;
    subjectId: string;
    deviceId: string;
    platform: string;
    appVersion: string;
}): {
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: Date;
    sessionExpiresAt: Date;
} {
    const accessTtlSeconds = getAccessTtlSeconds();
    const refreshTtlSeconds = getRefreshTtlSeconds();

    const accessExpiresAt = new Date(Date.now() + accessTtlSeconds * 1000);
    const sessionExpiresAt = new Date(Date.now() + refreshTtlSeconds * 1000);
    const refreshToken = randomBytes(32).toString("hex");

    const accessToken = issueAccessToken({
        secret: input.secret,
        subjectId: input.subjectId,
        deviceId: input.deviceId,
        platform: input.platform,
        appVersion: input.appVersion,
        accessTtlSeconds,
    });

    return {
        accessToken,
        refreshToken,
        accessExpiresAt,
        sessionExpiresAt,
    };
}

export async function createDeviceSession(
    input: CreateDeviceSessionInput
): Promise<DeviceSessionResponse> {
    const secret = getJwtSecret();
    const subjectId = deriveSubjectId(input.deviceId, secret);

    const tokenPair = buildTokenPair({
        secret,
        subjectId,
        deviceId: input.deviceId,
        platform: input.platform,
        appVersion: input.appVersion,
    });

    await insertDeviceSession({
        deviceId: input.deviceId,
        platform: input.platform,
        appVersion: input.appVersion,
        accessTokenHash: hashToken(tokenPair.accessToken),
        refreshTokenHash: hashToken(tokenPair.refreshToken),
        expiresAt: tokenPair.sessionExpiresAt,
    });

    return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresAt: tokenPair.accessExpiresAt.toISOString(),
        userIdOrDeviceId: subjectId,
    };
}

export async function refreshDeviceSession(input: {
    refreshToken: string;
}): Promise<DeviceSessionResponse> {
    const secret = getJwtSecret();
    const expectedRefreshTokenHash = hashToken(input.refreshToken);
    const session =
        await findActiveSessionByRefreshTokenHash(expectedRefreshTokenHash);

    if (!session) {
        throw new InvalidRefreshTokenError();
    }

    const subjectId = deriveSubjectId(session.deviceId, secret);

    const tokenPair = buildTokenPair({
        secret,
        subjectId,
        deviceId: session.deviceId,
        platform: session.platform,
        appVersion: session.appVersion || "unknown",
    });

    const rotated = await rotateSessionTokens({
        sessionId: session.id,
        expectedRefreshTokenHash,
        accessTokenHash: hashToken(tokenPair.accessToken),
        refreshTokenHash: hashToken(tokenPair.refreshToken),
        expiresAt: tokenPair.sessionExpiresAt,
    });
    if (!rotated) {
        throw new InvalidRefreshTokenError(
            "Invalid, expired, or already-used refresh token"
        );
    }

    return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresAt: tokenPair.accessExpiresAt.toISOString(),
        userIdOrDeviceId: subjectId,
    };
}
