import { NextResponse, type NextRequest } from "next/server";
import legacy from "@/content/generated/legacy-redirects.json";
import { findSlugRedirect } from "@/features/catalog/slug-redirects";

/**
 * 301 redirects from the old Shopify store's URLs:
 *  - collections and pages: src/content/generated/legacy-redirects.json (catalog import);
 *  - products: slug history in the database (old handles + admin renames), see
 *    features/catalog/slug-redirects.ts.
 *
 * Also gates /admin (redirects to the login page when there is no session cookie).
 *
 * Also handles Shopify URL shapes that carry the same product:
 *   /collections/<c>/products/<handle>   → product
 *   /en/… and /ar/… (old language prefixes) → same path without the prefix
 */
const MAP = legacy as Record<string, string>;

const ADMIN_SESSION_COOKIE = "ms_admin";

export async function proxy(request: NextRequest) {
  // Admin: a cheap first gate. The session itself is validated in every admin page and action.
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (request.nextUrl.pathname === "/admin/login" || request.cookies.has(ADMIN_SESSION_COOKIE)) return NextResponse.next();
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = "";
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  let path: string;
  try {
    path = decodeURIComponent(request.nextUrl.pathname);
  } catch {
    return NextResponse.next();
  }
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  path = path.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
  const nested = path.match(/^\/collections\/[^/]+(\/products\/[^/]+)$/);
  if (nested) path = nested[1]!;

  // Old product slugs (Shopify handles and admin renames) → the product's current URL, in one hop.
  const product = path.match(/^\/products\/([^/]+)$/);
  const renamed = product ? await findSlugRedirect(product[1]!) : null;

  const target = (renamed ? `/products/${renamed}` : undefined) ?? MAP[path] ?? (nested || path !== decodeURIComponent(request.nextUrl.pathname) ? path : undefined);
  if (!target || target === decodeURIComponent(request.nextUrl.pathname)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = target;
  url.search = "";
  return NextResponse.redirect(url, 301);
}

export const config = {
  // The admin plus paths that existed on the old store. Everything else skips the proxy entirely.
  matcher: ["/admin/:path*", "/products/:path*", "/collections/:path*", "/pages/:path*", "/en/:path*", "/ar/:path*"],
};
