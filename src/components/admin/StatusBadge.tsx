import { ORDER_STATUS_LABEL, type OrderStatus } from "@/features/orders/status";

type Tone = "ok" | "warn" | "bad" | "muted" | "info";

const TONE: Record<Tone, string> = {
  ok: "bg-[#e8f3ec] text-ok",
  warn: "bg-[#fdf1df] text-warn",
  bad: "bg-[#fde9e8] text-signal-deep",
  muted: "bg-mist text-steel",
  info: "bg-[#e9eef7] text-[#24467a]",
};

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONE[tone]}`}>{children}</span>;
}

const PRODUCT: Record<"DRAFT" | "ACTIVE" | "ARCHIVED", [Tone, string]> = {
  ACTIVE: ["ok", "פעיל"],
  DRAFT: ["muted", "טיוטה"],
  ARCHIVED: ["warn", "בארכיון"],
};

export function ProductStatusBadge({ status }: { status: keyof typeof PRODUCT }) {
  const [tone, label] = PRODUCT[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const ORDER_TONE: Record<OrderStatus, Tone> = {
  PENDING_PAYMENT: "muted",
  PAYMENT_FAILED: "bad",
  PAID: "info",
  PROCESSING: "warn",
  SHIPPED: "ok",
  DELIVERED: "ok",
  CANCELLED: "muted",
  REFUNDED: "muted",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}
