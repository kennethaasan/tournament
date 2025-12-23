import "dotenv/config";

import { db, shutdown } from "@/server/db/client";
import { sessions } from "@/server/db/schema";

async function main() {
  try {
    const allSessions = await db.select().from(sessions).limit(10);
    process.stdout.write("Sessions in DB:\n");
    for (const session of allSessions) {
      process.stdout.write(
        JSON.stringify({
          id: session.id,
          token: session.token,
          expiresAt: session.expiresAt,
          userId: session.userId,
        }) + "\n",
      );
    }
    if (allSessions.length === 0) {
      process.stdout.write("No sessions found in database.\n");
    }
  } catch (error) {
    process.stderr.write(`Error: ${error}\n`);
  } finally {
    await shutdown();
  }
}

void main();
