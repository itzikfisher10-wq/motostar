/**
 * The original store used the SKU field for free-text names. Only values that look
 * like a manufacturer/stock code are shown to customers as "מק״ט".
 */
export function isPartNumber(sku: string | null | undefined): sku is string {
  return !!sku && /^[A-Z0-9][A-Z0-9\-\/.]{2,}$/i.test(sku.trim());
}
