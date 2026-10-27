import "server-only";
import { z } from "zod";

/**
 * Server-side environment, validated once at startup.
 * Add new variables here AND in .env.example.
 */
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),

    PAYMENT_PROVIDER: z.enum(["mock", "payplus"]).default("mock"),
    PAYPLUS_API_KEY: z.string().optional(),
    PAYPLUS_SECRET_KEY: z.string().optional(),
    PAYPLUS_PAYMENT_PAGE_UID: z.string().optional(),
    /** Required with PAYMENT_PROVIDER=payplus. Sandbox: https://restapidev.payplus.co.il · Live: https://restapi.payplus.co.il */
    PAYPLUS_BASE_URL: z.url().optional(),

    EMAIL_PROVIDER: z.enum(["log", "resend"]).default("log"),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("Moto Star <orders@motostar.co.il>"),
    STORE_NOTIFICATION_EMAIL: z.string().optional(),

    STORAGE_PROVIDER: z.enum(["local", "vercel-blob"]).default("local"),
    UPLOAD_DIR: z.string().default("storage/uploads"),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.PAYMENT_PROVIDER === "payplus") {
      for (const key of ["PAYPLUS_API_KEY", "PAYPLUS_SECRET_KEY", "PAYPLUS_PAYMENT_PAGE_UID", "PAYPLUS_BASE_URL"] as const) {
        if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: `${key} is required when PAYMENT_PROVIDER=payplus` });
      }
    }
    if (env.STORAGE_PROVIDER === "vercel-blob" && !env.BLOB_READ_WRITE_TOKEN) {
      ctx.addIssue({ code: "custom", path: ["BLOB_READ_WRITE_TOKEN"], message: "BLOB_READ_WRITE_TOKEN is required when STORAGE_PROVIDER=vercel-blob" });
    }
    if (env.EMAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "RESEND_API_KEY is required when EMAIL_PROVIDER=resend" });
    }
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/**
 * On Vercel, if NEXT_PUBLIC_SITE_URL is not set, use the project's production address
 * (e.g. https://motostar-xyz.vercel.app). Set NEXT_PUBLIC_SITE_URL explicitly for the real domain.
 */
export function defaultSiteUrl(source: NodeJS.ProcessEnv = process.env): string | undefined {
  if (source.NEXT_PUBLIC_SITE_URL) return source.NEXT_PUBLIC_SITE_URL;
  const vercel = source.VERCEL_PROJECT_PRODUCTION_URL ?? source.VERCEL_URL;
  return vercel ? `https://${vercel}` : undefined;
}

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse({ ...process.env, NEXT_PUBLIC_SITE_URL: defaultSiteUrl() });
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => env().NODE_ENV === "production";
