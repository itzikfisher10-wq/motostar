import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // No debug logging in production code. console.error/warn/info are allowed for operational logs.
      "no-console": ["error", { allow: ["error", "warn", "info"] }],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  globalIgnores([".next/**", ".next-e2e/**", "node_modules/**", "drizzle/**", "next-env.d.ts", "playwright-report/**", "test-results/**", "storage/**"]),
]);
