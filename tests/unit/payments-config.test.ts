import { afterEach, describe, expect, it, vi } from "vitest";

/** Test payments must be impossible to enable on a real (public) domain. */
describe("testPaymentsAllowed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });
  const check = async (siteUrl: string, flag?: string) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", siteUrl);
    if (flag) vi.stubEnv("ALLOW_TEST_PAYMENTS", flag);
    vi.resetModules();
    const { testPaymentsAllowed } = await import("@/lib/payments");
    return testPaymentsAllowed();
  };

  it("is off without the explicit flag", async () => {
    expect(await check("http://localhost:3000")).toBe(false);
  });
  it("is allowed with the flag on localhost and Vercel previews", async () => {
    expect(await check("http://localhost:3100", "true")).toBe(true);
    expect(await check("https://motostar-git-staging.vercel.app", "true")).toBe(true);
  });
  it("is refused on the real domain even with the flag", async () => {
    expect(await check("https://motostar.co.il", "true")).toBe(false);
    expect(await check("https://www.motostar.co.il", "true")).toBe(false);
  });
});
