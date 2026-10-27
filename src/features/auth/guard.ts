import "server-only";
import { forbidden, redirect } from "next/navigation";
import { can, type Permission } from "./permissions";
import { getSessionUser, type SessionUser } from "./session";

/**
 * Use at the top of every admin page and every admin server action.
 * Not signed in → login page. Signed in without the permission → 403.
 */
export async function requireUser(permission?: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (permission && !can(user.role, permission)) forbidden();
  return user;
}
