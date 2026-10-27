import { NextResponse, type NextRequest } from "next/server";
import { getSuggestions } from "@/features/search/suggest";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";

export async function GET(req: NextRequest) {
  const limited = await rateLimit(`suggest:${await clientIp()}`, { limit: 120, windowSeconds: 60 });
  if (!limited.ok) return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const data = await getSuggestions(q);
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
