// Per-file test environment. Integration tests use a dedicated database (see global-setup.ts).
import { TEST_DATABASE_URL } from "./global-setup";

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.APP_SECRET ??= "test-secret-test-secret-test-secret-123456";
process.env.NEXT_PUBLIC_SITE_URL ??= "http://localhost:3000";
process.env.PAYMENT_PROVIDER = "mock";
process.env.EMAIL_PROVIDER = "log";
export {};
