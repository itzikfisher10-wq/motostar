/**
 * Creates (or resets the password of) an admin user.
 *
 *   npm run admin:create -- --email owner@example.com --name "שם" --role OWNER
 *
 * The password is read from the ADMIN_PASSWORD environment variable, or prompted
 * for interactively (input hidden). It is never accepted as a CLI argument, so it
 * does not end up in shell history.
 */
import { createInterface } from "node:readline";
import { eq } from "drizzle-orm";
import { createDb } from "../../src/lib/db/create";
import { users } from "../../src/lib/db/schema";
import { hashPassword, PASSWORD_MIN_LENGTH } from "../../src/lib/security/password";
import { loadScriptEnv } from "../lib/env";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function promptHidden(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
  out._writeToOutput = (s: string) => {
    if (s.includes(question)) out.output.write(s);
  };
  const answer = await new Promise<string>((resolve) => rl.question(question, resolve));
  rl.close();
  process.stdout.write("\n");
  return answer;
}

const email = arg("email")?.trim().toLowerCase();
const name = arg("name")?.trim() || "מנהל";
const role = (arg("role") ?? "OWNER").toUpperCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run admin:create -- --email you@example.com [--name "שם"] [--role OWNER|ADMIN|STAFF]');
  process.exit(1);
}
if (!["OWNER", "ADMIN", "STAFF"].includes(role)) {
  console.error("--role must be OWNER, ADMIN or STAFF");
  process.exit(1);
}

const password = process.env.ADMIN_PASSWORD ?? (await promptHidden("Password: "));
if (password.length < PASSWORD_MIN_LENGTH) {
  console.error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  process.exit(1);
}

const { DATABASE_URL } = loadScriptEnv();
const { db, client } = createDb(DATABASE_URL, { max: 1 });
try {
  const passwordHash = await hashPassword(password);
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    await db.update(users).set({ passwordHash, role: role as "OWNER", name, isActive: true }).where(eq(users.id, existing.id));
    console.info(`✓ Updated ${email} (${role})`);
  } else {
    await db.insert(users).values({ email, name, passwordHash, role: role as "OWNER" });
    console.info(`✓ Created ${email} (${role})`);
  }
} finally {
  await client.end();
}
