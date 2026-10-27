/**
 * Deploy step: creates the first owner account from ADMIN_EMAIL / ADMIN_PASSWORD,
 * only if no user with that email exists yet. It never changes an existing account,
 * so after the first deploy these variables can (and should) be removed from the host.
 */
import { eq } from "drizzle-orm";
import { createDb } from "../../src/lib/db/create";
import { users } from "../../src/lib/db/schema";
import { hashPassword, PASSWORD_MIN_LENGTH } from "../../src/lib/security/password";
import { loadScriptEnv } from "../lib/env";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.info("• ADMIN_EMAIL / ADMIN_PASSWORD not set: no owner account created");
  process.exit(0);
}
if (password.length < PASSWORD_MIN_LENGTH) {
  console.error(`✗ ADMIN_PASSWORD must be at least ${PASSWORD_MIN_LENGTH} characters`);
  process.exit(1);
}

const { DATABASE_URL } = loadScriptEnv();
const { db, client } = createDb(DATABASE_URL, { max: 1 });
try {
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    console.info(`• Owner ${email} already exists (unchanged)`);
  } else {
    await db.insert(users).values({ email, name: "בעל החנות", role: "OWNER", passwordHash: await hashPassword(password) });
    console.info(`✓ Owner account created: ${email}`);
  }
} finally {
  await client.end();
}
