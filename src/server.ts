import { config } from "dotenv";

config({ path: ".env", override: true, quiet: true });

import { App } from "./app.js";
import { logEvent } from "./utils/logger.js";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const host = process.env.HOST || "0.0.0.0";

if (Number.isNaN(port)) {
    // eslint-disable-next-line no-console
    console.error(`Invalid PORT value: ${process.env.PORT}`);
    process.exit(1);
}

const app = await App({
    deploymentEnv: process.env.DEPLOYMENT_ENV,
    mongoUri: process.env.MONGO_URI_RW,
    jwtSecret: process.env.JWT_SECRET,
});

logEvent(app.log, "app.starting", { data: { host, port } }, "App starting");

app.listen({ port, host })
    .then(() =>
        logEvent(
            app.log,
            "app.started",
            { data: { host, port } },
            `Server listening on http://${host}:${port}`
        )
    )
    .catch((err) => {
        logEvent(
            app.log,
            "app.start.failed",
            {
                data: { host, port },
                error: {
                    type: err instanceof Error ? err.name : "Error",
                    message: err instanceof Error ? err.message : String(err),
                    stack: err instanceof Error ? err.stack : undefined,
                },
            },
            "Server failed to start"
        );
        process.exit(1);
    });
