import { NextResponse } from "next/server";
import { buildCartView, readCartId } from "@/features/cart/service";

/** Current cart for the client-side drawer. Never cached: prices and stock are live. */
export async function GET() {
  const cart = await buildCartView(await readCartId());
  return NextResponse.json(cart, { headers: { "Cache-Control": "no-store" } });
}
