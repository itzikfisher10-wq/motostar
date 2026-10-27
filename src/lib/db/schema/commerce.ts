import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { productVariants, products } from "./catalog";
import { users } from "./auth";

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("cart_items_cart_variant_uq").on(t.cartId, t.variantId)],
);

export const shippingMethods = pgTable(
  "shipping_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    etaText: text("eta_text"),
    priceAgorot: integer("price_agorot").notNull().default(0),
    /** Order subtotal at or above which this method is free. Null = never free. */
    freeOverAgorot: integer("free_over_agorot"),
    requiresAddress: boolean("requires_address").notNull().default(true),
    isActive: boolean("is_active").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("shipping_methods_code_uq").on(t.code)],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone").notNull(),
    marketingConsent: boolean("marketing_consent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("customers_email_uq").on(t.email)],
);

export const orderStatus = pgEnum("order_status", [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "PAYMENT_FAILED",
]);

export const paymentStatus = pgEnum("payment_status", ["UNPAID", "PAID", "FAILED", "REFUNDED"]);

export type ShippingAddress = {
  city: string;
  street: string;
  houseNumber: string;
  apartment?: string;
  zip?: string;
  notes?: string;
};

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human-facing sequential number, e.g. 100245. Shown as "MS-100245". */
    number: serial("number").notNull(),
    status: orderStatus("status").notNull().default("PENDING_PAYMENT"),
    paymentStatus: paymentStatus("payment_status").notNull().default("UNPAID"),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone").notNull(),
    shippingAddress: jsonb("shipping_address").$type<ShippingAddress | null>(),
    shippingMethodCode: text("shipping_method_code").notNull(),
    shippingMethodName: text("shipping_method_name").notNull(),
    shippingAgorot: integer("shipping_agorot").notNull(),
    subtotalAgorot: integer("subtotal_agorot").notNull(),
    totalAgorot: integer("total_agorot").notNull(),
    currency: text("currency").notNull().default("ILS"),
    customerNote: text("customer_note"),
    paymentProvider: text("payment_provider").notNull(),
    /** Provider's payment-page / request id. */
    paymentRequestId: text("payment_request_id"),
    /** Hosted payment page of the current request, reused when checkout is re-submitted (no second payment request). */
    paymentRedirectUrl: text("payment_redirect_url"),
    /** Provider's transaction id once paid. */
    paymentTransactionId: text("payment_transaction_id"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Client-generated key that prevents duplicate orders on double-submit. */
    idempotencyKey: text("idempotency_key").notNull(),
    /** SHA-256 of the secret token in the customer's order-status link. */
    accessTokenHash: text("access_token_hash").notNull(),
    /** Cart the order was placed from; emptied once payment is confirmed. */
    cartId: uuid("cart_id"),
    /** True when stock was decremented for this order (so cancellation can restore it). */
    stockCommitted: boolean("stock_committed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("orders_number_uq").on(t.number),
    uniqueIndex("orders_idempotency_uq").on(t.idempotencyKey),
    uniqueIndex("orders_payment_tx_uq").on(t.paymentTransactionId),
    index("orders_status_idx").on(t.status),
    index("orders_email_idx").on(t.email),
    index("orders_created_idx").on(t.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    // Snapshots: an order must never change when the catalog changes.
    productTitle: text("product_title").notNull(),
    variantTitle: text("variant_title"),
    sku: text("sku"),
    imageUrl: text("image_url"),
    unitPriceAgorot: integer("unit_price_agorot").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalAgorot: integer("line_total_agorot").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: orderStatus("from_status"),
    toStatus: orderStatus("to_status").notNull(),
    note: text("note"),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_status_history_order_idx").on(t.orderId)],
);

/** Every payment notification received, verified or not. `eventKey` makes processing idempotent. */
export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    eventKey: text("event_key").notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    signatureValid: boolean("signature_valid").notNull(),
    outcome: text("outcome").notNull(),
    /** Payload with card data removed. Providers never send full card numbers, but we strip defensively. */
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("payment_events_provider_key_uq").on(t.provider, t.eventKey)],
);
