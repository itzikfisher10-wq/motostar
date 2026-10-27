/**
 * Order status vocabulary, shared by the storefront order page and the admin.
 * The allowed manual transitions are enforced in features/admin/orders/actions.ts.
 */
export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED" | "PAYMENT_FAILED";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "ממתינה לתשלום",
  PAID: "שולמה",
  PROCESSING: "בטיפול",
  SHIPPED: "נשלחה",
  DELIVERED: "נמסרה",
  CANCELLED: "בוטלה",
  REFUNDED: "זוכתה",
  PAYMENT_FAILED: "התשלום נכשל",
};

/** Customer-facing explanation shown on the order status page. */
export const ORDER_STATUS_HELP: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "ההזמנה נוצרה אך התשלום עדיין לא אושר.",
  PAID: "התשלום התקבל. נתחיל להכין את ההזמנה בהקדם.",
  PROCESSING: "אנחנו מכינים את ההזמנה.",
  SHIPPED: "ההזמנה יצאה אליכם.",
  DELIVERED: "ההזמנה נמסרה.",
  CANCELLED: "ההזמנה בוטלה.",
  REFUNDED: "ההזמנה זוכתה.",
  PAYMENT_FAILED: "התשלום לא הושלם. לא בוצע חיוב. אפשר לנסות שוב או ליצור איתנו קשר.",
};

/**
 * Manual status changes an admin may make. Payment states (PAID, PAYMENT_FAILED)
 * are set only by verified payment confirmation, never by hand.
 */
export const MANUAL_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAYMENT_FAILED: ["CANCELLED"],
  PAID: ["PROCESSING", "SHIPPED", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function formatOrderNumber(n: number) {
  return `MS-${n}`;
}
