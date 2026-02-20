import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { insertDeviceSession } from "../repositories/device-session.repository.js";

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

export async function createDeviceSession(
    input: CreateDeviceSessionInput
): Promise<DeviceSessionResponse> {
    const secret = getJwtSecret();
    const accessTtlSeconds = getAccessTtlSeconds();
    const expiresAt = new Date(Date.now() + accessTtlSeconds * 1000);
    const refreshToken = randomBytes(32).toString("hex");

    const accessToken = jwt.sign(
        {
            sub: input.deviceId,
            deviceId: input.deviceId,
            platform: input.platform,
            appVersion: input.appVersion,
            tokenType: "device",
        },
        secret,
        { expiresIn: accessTtlSeconds }
    );

    await insertDeviceSession({
        deviceId: input.deviceId,
        platform: input.platform,
        appVersion: input.appVersion,
        accessTokenHash: hashToken(accessToken),
        refreshTokenHash: hashToken(refreshToken),
        expiresAt,
    });

    return {
        accessToken,
        refreshToken,
        expiresAt: expiresAt.toISOString(),
        userIdOrDeviceId: input.deviceId,
    };
}
