import { z } from "zod";

/** Israeli phone: 05X-XXXXXXX, 0X-XXXXXXX landline, or +972… — normalized to digits. */
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s\-()]/g, "").replace(/^\+972/, "0"))
  .refine((v) => /^0(5\d|[2-4]|[89]|7\d)\d{7}$/.test(v), "מספר טלפון לא תקין");

const text = (max: number, message = "שדה חובה") => z.string().trim().min(1, message).max(max);

export const addressSchema = z.object({
  city: text(60, "יש להזין עיר"),
  street: text(80, "יש להזין רחוב"),
  houseNumber: text(10, "יש להזין מספר בית"),
  apartment: z.string().trim().max(20).optional(),
  zip: z.string().trim().regex(/^\d{7}$/, "מיקוד בן 7 ספרות").optional().or(z.literal("")),
  notes: z.string().trim().max(300).optional(),
});

export const checkoutSchema = z.object({
  idempotencyKey: z.uuid(),
  firstName: text(50, "יש להזין שם פרטי"),
  lastName: text(50, "יש להזין שם משפחה"),
  email: z.email("כתובת אימייל לא תקינה").trim().toLowerCase().max(120),
  phone,
  shippingMethodCode: z.string().trim().min(1, "יש לבחור שיטת משלוח").max(40),
  address: addressSchema.optional(),
  customerNote: z.string().trim().max(500).optional(),
  marketingConsent: z.boolean().default(false),
  termsAccepted: z.literal(true, { error: "יש לאשר את תנאי השימוש" }),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;
