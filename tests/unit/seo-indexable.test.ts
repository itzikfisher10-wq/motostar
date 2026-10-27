import { describe, it, expect } from "vitest";
describe("isIndexableSite", () => {
  it("blocks vercel.app, allows real domain and localhost", async () => {
    const { isIndexableSite } = await import("@/lib/seo/metadata");
    process.env.NEXT_PUBLIC_SITE_URL = "https://motostar-dusky.vercel.app"; expect(isIndexableSite()).toBe(false);
    process.env.NEXT_PUBLIC_SITE_URL = "https://motostar.co.il"; expect(isIndexableSite()).toBe(true);
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000"; expect(isIndexableSite()).toBe(true);
  });
});
