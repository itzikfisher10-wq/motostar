import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseShekelsToAgorot, agorotToInput } from "@/features/admin/forms";
import { variantsPayloadSchema } from "@/features/admin/products/schema";
import { can } from "@/features/auth/permissions";
import { MANUAL_TRANSITIONS } from "@/features/orders/status";
import { hashPassword, verifyPassword } from "@/lib/security/password";

describe("money input", () => {
  it("parses shekel strings to integer agorot", () => {
    expect(parseShekelsToAgorot("129.90")).toBe(12990);
    expect(parseShekelsToAgorot("129,9")).toBe(12990);
    expect(parseShekelsToAgorot("₪ 80")).toBe(8000);
    expect(parseShekelsToAgorot("0.05")).toBe(5);
  });
  it("rejects negatives, 3 decimals and junk", () => {
    for (const bad of ["-5", "1.999", "abc", "", "1e3", "12.3.4"]) expect(parseShekelsToAgorot(bad)).toBeNull();
  });
  it("round-trips through the form representation", () => {
    for (const a of [0, 5, 100, 12990, 179000]) expect(parseShekelsToAgorot(agorotToInput(a))).toBe(a);
  });
});

describe("variant editor validation", () => {
  const row = { optionValues: {}, sku: "", barcode: "", price: "100", compareAt: "", isAvailable: true, inventoryTracked: false, stockQuantity: null, weightGrams: null, imageId: null };
  it("accepts a single default variant", () => {
    expect(variantsPayloadSchema.safeParse({ options: [], variants: [row] }).success).toBe(true);
  });
  it("rejects a compare-at price that is not higher than the price", () => {
    const r = variantsPayloadSchema.safeParse({ options: [], variants: [{ ...row, compareAt: "90" }] });
    expect(r.success).toBe(false);
  });
  it("requires a stock quantity when stock is tracked", () => {
    expect(variantsPayloadSchema.safeParse({ options: [], variants: [{ ...row, inventoryTracked: true }] }).success).toBe(false);
  });
  it("rejects two variants with the same option values", () => {
    const v = { ...row, optionValues: { צבע: "שחור" } };
    expect(variantsPayloadSchema.safeParse({ options: ["צבע"], variants: [v, v] }).success).toBe(false);
  });
  it("rejects several variants without an option to tell them apart", () => {
    expect(variantsPayloadSchema.safeParse({ options: [], variants: [row, row] }).success).toBe(false);
  });
});

describe("announcement link", () => {
  it("accepts internal paths only", async () => {
    const { BLOCKS } = await import("@/features/content/blocks");
    const ok = (href: string) => BLOCKS.announcement.schema.safeParse({ enabled: true, text: "x", href }).success;
    expect(ok("/deals")).toBe(true);
    expect(ok("")).toBe(true);
    for (const bad of ["//evil.com", "https://evil.com", "javascript:alert(1)", "/\\evil.com"]) expect(ok(bad), bad).toBe(false);
  });
});

describe("roles", () => {
  it("only admins and owners can cancel or refund orders", () => {
    expect(can("STAFF", "orders:cancel")).toBe(false);
    expect(can("ADMIN", "orders:cancel")).toBe(true);
  });
  it("staff can update orders but not edit the catalog or manage users", () => {
    expect(can("STAFF", "orders:update")).toBe(true);
    expect(can("STAFF", "catalog:write")).toBe(false);
    expect(can("STAFF", "users:manage")).toBe(false);
  });
  it("only owners manage users", () => {
    expect(can("ADMIN", "users:manage")).toBe(false);
    expect(can("OWNER", "users:manage")).toBe(true);
  });
});

describe("order status transitions", () => {
  it("never allows setting payment states by hand", () => {
    for (const targets of Object.values(MANUAL_TRANSITIONS)) {
      expect(targets).not.toContain("PAID");
      expect(targets).not.toContain("PAYMENT_FAILED");
      expect(targets).not.toContain("PENDING_PAYMENT");
    }
  });
  it("an unpaid order cannot be marked shipped", () => {
    expect(MANUAL_TRANSITIONS.PENDING_PAYMENT).not.toContain("SHIPPED");
  });
  it("final states have no way out", () => {
    expect(MANUAL_TRANSITIONS.CANCELLED).toEqual([]);
    expect(MANUAL_TRANSITIONS.REFUNDED).toEqual([]);
  });
});

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).toMatch(/^scrypt\$/);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batterY", hash)).toBe(false);
  });
  it("salts every hash", async () => {
    expect(await hashPassword("same-password-123")).not.toBe(await hashPassword("same-password-123"));
  });
});

/**
 * Server actions are public HTTP endpoints. Every exported function in an admin
 * "use server" file must check the session/permission before doing anything.
 */
describe("admin server actions are guarded", () => {
  const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
  const actionFiles = files("src/features/admin").filter((f) => readFileSync(f, "utf8").startsWith('"use server"'));

  it("finds the admin action files", () => {
    expect(actionFiles.length).toBeGreaterThanOrEqual(6);
  });
  for (const file of actionFiles) {
    it(`${file}: every exported action calls requireUser first`, () => {
      const src = readFileSync(file, "utf8");
      const fns = [...src.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{\n([^\n]*)/g)];
      expect(fns.length).toBeGreaterThan(0);
      for (const [, name, firstLine] of fns) expect(firstLine, name).toMatch(/await requireUser\("/);
      expect(src).not.toMatch(/export (const|function) /);
    });
  }
});
