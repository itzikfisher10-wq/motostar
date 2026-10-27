/** Vitest globalSetup: a fresh integration-test database with the real catalog. */
import { resetDatabase } from "./reset-db";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/motostar_test";

export default async function setup() {
  await resetDatabase(TEST_DATABASE_URL);
}
