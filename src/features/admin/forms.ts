import { z } from "zod";

/** Result shape every admin form action returns (used with useActionState). */
export type ActionState = { ok: boolean; message: string | null; fieldErrors?: Record<string, string> };
export const IDLE: ActionState = { ok: false, message: null };

export function fail(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, message, fieldErrors };
}
export function success(message: string): ActionState {
  return { ok: true, message };
}

/** Zod issues → { "field.path": "message" } (first message per field). */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Form text → trimmed string, or undefined when empty. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `עד ${max} תווים`)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

/** "129.90" / "129,90" / "₪129" → 12990 agorot. Rejects negatives and more than 2 decimals. */
export function parseShekelsToAgorot(input: string): number | null {
  const clean = input.replace(/[₪\s]/g, "").replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(clean)) return null;
  const [whole, frac = ""] = clean.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export const shekels = (label = "מחיר") =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const agorot = parseShekelsToAgorot(v);
      if (agorot === null) {
        ctx.addIssue({ code: "custom", message: `${label} לא תקין` });
        return z.NEVER;
      }
      return agorot;
    });

export const optionalShekels = (label = "מחיר") =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const agorot = parseShekelsToAgorot(v);
      if (agorot === null) {
        ctx.addIssue({ code: "custom", message: `${label} לא תקין` });
        return z.NEVER;
      }
      return agorot;
    });

/** Agorot → "129.90" for form inputs. */
export function agorotToInput(agorot: number | null | undefined): string {
  if (agorot === null || agorot === undefined) return "";
  return agorot % 100 === 0 ? String(agorot / 100) : (agorot / 100).toFixed(2);
}

export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "שדה חובה")
  .max(120)
  .regex(/^[\p{Script=Hebrew}a-z0-9]+(-[\p{Script=Hebrew}a-z0-9]+)*$/u, "אותיות, ספרות ומקפים בלבד, ללא רווחים");
