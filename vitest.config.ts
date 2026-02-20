import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        setupFiles: ["tests/setup.ts"],
        testTimeout: 60000,
        hookTimeout: 60000,
        teardownTimeout: 30000,
        pool: "threads",
        poolOptions: {
            threads: {
                singleThread: false,
                maxThreads: 8,
                minThreads: 1,
            },
        },
    },
});