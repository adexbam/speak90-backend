// Configuration schema - define ALL environment variables in one place
export const ENV_CONFIG: any = {
    // Keys that come from SSM
    ssmKeys: ["MONGO_URI_RW", "S3_BUCKET", "AWS_REGION"],

    // Extra SSM keys from other projects
    extraSsmKeys: ["react-authentication-lambda/JWT_SECRET"],

    // Static values per environment
    staticValues: {
        dev: {
            APP_NAME: "Content Delegation Backend",
            CORS_ORIGINS: "http://localhost:5137,http://localhost:5134,https://bild.de,https://backend.bild.services,https://backend.dev.bild.services",
        },
        prod: {
            APP_NAME: "Content Delegation Backend",
            CORS_ORIGINS:
                "https://bild.de,https://backend.bild.services,https://backend.dev.bild.services",
        },
    },
} as const;
