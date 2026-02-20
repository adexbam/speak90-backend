import type { FastifyInstance } from "fastify";
import { requirePremiumEntitlement } from "../../middleware/premium.middleware.js";
import {
    getBackupSettingsHandler,
    putBackupSettingsHandler,
} from "./user-settings.handlers.js";
import {
    getBackupSettingsSchema,
    upsertBackupSettingsSchema,
} from "./user-settings.schemas.js";

export async function userSettingsRoutes(app: FastifyInstance) {
    app.put(
        "/backup",
        {
            config: { auth: true },
            preHandler: requirePremiumEntitlement,
            schema: upsertBackupSettingsSchema,
        },
        putBackupSettingsHandler
    );

    app.get(
        "/backup",
        {
            config: { auth: true },
            preHandler: requirePremiumEntitlement,
            schema: getBackupSettingsSchema,
        },
        getBackupSettingsHandler
    );
}
