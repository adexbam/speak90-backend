import { beforeEach, describe, expect, it, vi } from "vitest";

const getBackupSettingsMock = vi.fn();
const upsertBackupSettingsMock = vi.fn();

vi.mock("../../../src/repositories/user-settings.repository.js", () => ({
    getBackupSettings: getBackupSettingsMock,
    upsertBackupSettings: upsertBackupSettingsMock,
}));

describe("user-settings.service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("preserves existing retention when retentionDays is omitted", async () => {
        getBackupSettingsMock.mockResolvedValue({
            enabled: true,
            retentionDays: 120,
        });
        upsertBackupSettingsMock.mockResolvedValue({
            enabled: false,
            retentionDays: 120,
        });

        const { saveBackupSettings } = await import(
            "../../../src/services/user-settings.service.js"
        );
        const result = await saveBackupSettings({
            subjectId: "dev_abc",
            enabled: false,
        });

        expect(getBackupSettingsMock).toHaveBeenCalledWith("dev_abc");
        expect(upsertBackupSettingsMock).toHaveBeenCalledWith({
            subjectId: "dev_abc",
            enabled: false,
            retentionDays: 120,
        });
        expect(result).toEqual({ enabled: false, retentionDays: 120 });
    });

    it("uses provided retention when explicitly set", async () => {
        upsertBackupSettingsMock.mockResolvedValue({
            enabled: true,
            retentionDays: 365,
        });

        const { saveBackupSettings } = await import(
            "../../../src/services/user-settings.service.js"
        );
        const result = await saveBackupSettings({
            subjectId: "dev_abc",
            enabled: true,
            retentionDays: 365,
        });

        expect(getBackupSettingsMock).not.toHaveBeenCalled();
        expect(upsertBackupSettingsMock).toHaveBeenCalledWith({
            subjectId: "dev_abc",
            enabled: true,
            retentionDays: 365,
        });
        expect(result).toEqual({ enabled: true, retentionDays: 365 });
    });
});
