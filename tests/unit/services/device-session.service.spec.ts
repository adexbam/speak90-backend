import { beforeEach, describe, expect, it, vi } from "vitest";

const insertDeviceSessionMock = vi.fn();
const findActiveSessionByRefreshTokenHashMock = vi.fn();
const rotateSessionTokensMock = vi.fn();

vi.mock("../../../src/repositories/device-session.repository.js", () => ({
    insertDeviceSession: insertDeviceSessionMock,
    findActiveSessionByRefreshTokenHash: findActiveSessionByRefreshTokenHashMock,
    rotateSessionTokens: rotateSessionTokensMock,
}));

describe("device-session.service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.JWT_SECRET = "test-secret";
    });

    it("creates session and stores hashed tokens", async () => {
        const { createDeviceSession } = await import(
            "../../../src/services/device-session.service.js"
        );

        const session = await createDeviceSession({
            deviceId: "device-1",
            platform: "ios",
            appVersion: "1.0.0",
        });

        expect(session.userIdOrDeviceId.startsWith("dev_")).toBe(true);
        expect(session.accessToken).toBeTruthy();
        expect(session.refreshToken).toBeTruthy();
        expect(insertDeviceSessionMock).toHaveBeenCalledTimes(1);
        expect(insertDeviceSessionMock.mock.calls[0][0].accessTokenHash).not.toBe(
            session.accessToken
        );
    });

    it("rejects refresh for invalid refresh token", async () => {
        findActiveSessionByRefreshTokenHashMock.mockResolvedValue(null);

        const { refreshDeviceSession, InvalidRefreshTokenError } = await import(
            "../../../src/services/device-session.service.js"
        );

        await expect(
            refreshDeviceSession({ refreshToken: "nope" })
        ).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    });

    it("rejects refresh replay when CAS rotation fails", async () => {
        findActiveSessionByRefreshTokenHashMock.mockResolvedValue({
            id: "session-1",
            deviceId: "device-1",
            platform: "ios",
            appVersion: "1.0.0",
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
        });
        rotateSessionTokensMock.mockResolvedValue(false);

        const { refreshDeviceSession, InvalidRefreshTokenError } = await import(
            "../../../src/services/device-session.service.js"
        );

        await expect(
            refreshDeviceSession({ refreshToken: "used-token" })
        ).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    });
});
