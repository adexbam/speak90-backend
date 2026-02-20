import { config } from "dotenv";
import { closeDb, initializeDb } from "../src/db/client.js";
import { reconcileDeletingUploads } from "../src/services/audio-upload.service.js";

config({ path: ".env", override: true, quiet: true });

async function main() {
    await initializeDb();
    const recovered = await reconcileDeletingUploads();
    // eslint-disable-next-line no-console
    console.log(`Audio upload reconcile complete. recovered=${recovered}`);
    await closeDb();
}

void main().catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error("Audio upload reconcile failed:", error);
    await closeDb().catch(() => undefined);
    process.exit(1);
});
