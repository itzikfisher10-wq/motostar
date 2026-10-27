/**
 * Role-based access for the admin. Every admin page AND every admin server action
 * checks a permission through requireUser() — hiding a button is never the only guard.
 *
 *  OWNER – everything, including managing admin users.
 *  ADMIN – catalog, orders, customers, content, shipping, SEO.
 *  STAFF – view catalog and customers, view orders and move them along (processing / shipped /
 *          delivered). Cancelling and refunding (which change stock and payment status) need ADMIN.
 */
export type Role = "OWNER" | "ADMIN" | "STAFF";

export type Permission =
  | "catalog:read"
  | "catalog:write"
  | "orders:read"
  | "orders:update"
  | "orders:cancel"
  | "customers:read"
  | "content:write"
  | "settings:write"
  | "users:manage";

const GRANTS: Record<Role, readonly Permission[]> = {
  OWNER: ["catalog:read", "catalog:write", "orders:read", "orders:update", "orders:cancel", "customers:read", "content:write", "settings:write", "users:manage"],
  ADMIN: ["catalog:read", "catalog:write", "orders:read", "orders:update", "orders:cancel", "customers:read", "content:write", "settings:write"],
  STAFF: ["catalog:read", "orders:read", "orders:update", "customers:read"],
};

export function can(role: Role, permission: Permission): boolean {
  return GRANTS[role].includes(permission);
}

export const ROLE_LABEL: Record<Role, string> = { OWNER: "בעלים", ADMIN: "מנהל", STAFF: "צוות" };
