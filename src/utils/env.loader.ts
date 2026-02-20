import { GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";
import { logEvent, logger } from "./logger.js";

export async function getSSMParameters(
    paramNames: string[],
    decrypt: boolean = true,
    region: string = "eu-central-1"
): Promise<Record<string, string>> {
    const ssmClient = new SSMClient({ region });

    try {
        logEvent(
            logger,
            "ssm.fetch.started",
            { data: { param_count: paramNames.length } },
            "Fetching SSM parameters"
        );

        const command = new GetParametersCommand({
            Names: paramNames,
            WithDecryption: decrypt,
        });

        const response = await ssmClient.send(command);

        const params: Record<string, string> = {};

        for (const p of response.Parameters ?? []) {
            if (p.Name && typeof p.Value === "string") {
                params[p.Name] = p.Value;
            }
        }

        if ((response.InvalidParameters?.length ?? 0) > 0) {
            logEvent(
                logger,
                "ssm.fetch.invalid_params",
                { data: { invalid_params: response.InvalidParameters } },
                "Invalid SSM parameters found"
            );
        }

        logEvent(
            logger,
            "ssm.fetch.completed",
            { data: { fetched_count: Object.keys(params).length } },
            "SSM parameters fetched successfully"
        );
        return params;
    } catch (error) {
        logEvent(
            logger,
            "ssm.fetch.failed",
            {
                error: {
                    type: error instanceof Error ? error.name : "Error",
                    message:
                        error instanceof Error ? error.message : String(error),
                },
            },
            "Failed to fetch SSM parameters"
        );
        throw error;
    }
}

export async function loadEnv(keys: string[]) {
    const params = await getSSMParameters(keys);

    if (!params || typeof params !== "object") return;

    for (const [fullKey, value] of Object.entries(params)) {
        if (!fullKey || value == null) continue;

        const last = fullKey.split("/").filter(Boolean).pop();
        if (!last) continue;

        const envKey = last.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase();

        process.env[envKey] = value;
    }
}

function mapNodeEnvToSsmEnv(nodeEnv?: string): string {
    switch ((nodeEnv ?? "").toLowerCase()) {
        case "production":
        case "prod":
            return "prod";
        case "dev":
            return "dev";
        case "local":
            return "dev";
        default:
            return "dev";
    }
}

/**
 * Build an array of full SSM parameter paths based on environment.
 */
async function getEnvParamKeys(nodeEnv?: string) {
    const { ENV_CONFIG } = await import("../config/env.config.js");
    const env = mapNodeEnvToSsmEnv(nodeEnv);

    // election-controller params
    const appKeys = ENV_CONFIG.ssmKeys.map(
        (k: string) => `/${env}/speak90-backend/${k}`
    );

    // other project keys
    const otherKeys = ENV_CONFIG.extraSsmKeys.map(
        (k: string) => `/${env}/${k}`
    );

    return [...appKeys, ...otherKeys];
}

/**
 * Load ALL environment configuration - both static and SSM values
 */
export async function loadAllEnvConfig(nodeEnv?: string) {
    const { ENV_CONFIG } = await import("../config/env.config.js");

    const env = mapNodeEnvToSsmEnv(nodeEnv);

    // 1. Load static values first
    const staticConfig =
        ENV_CONFIG.staticValues[env] || ENV_CONFIG.staticValues.dev;
    for (const [key, value] of Object.entries(staticConfig)) {
        process.env[key] = String(value);
    }

    // 2. Load SSM values (only for dev and prod environments, not local/test)
    if (nodeEnv !== "local" && nodeEnv !== "test") {
        const ssmKeys = await getEnvParamKeys(nodeEnv);
        await loadEnv(ssmKeys);
    }
}
