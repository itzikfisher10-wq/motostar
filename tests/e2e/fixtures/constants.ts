/** Shared constants for the end-to-end suite. Test-only values. */
export const E2E = {
  port: 3100,
  baseURL: "http://localhost:3100",
  databaseUrl: process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/motostar_e2e",
  appSecret: "e2e-secret-e2e-secret-e2e-secret-e2e-123456",
  deliveryPriceAgorot: 3500,
  freeShippingOverAgorot: 50000,
  admin: { email: "owner@e2e.test", password: "e2e-owner-password-1" },
  staff: { email: "staff@e2e.test", password: "e2e-staff-password-1" },
  /** A real catalog product with several colour variants. */
  variantProductSlug: "ספוילרים-arai-szr-vas",
} as const;
