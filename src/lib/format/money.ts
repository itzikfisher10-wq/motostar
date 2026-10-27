/** All prices are stored as integer agorot. Format only at the edge. */
const whole = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0, minimumFractionDigits: 0 });
const fractional = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatPrice(agorot: number): string {
  return agorot % 100 === 0 ? whole.format(agorot / 100) : fractional.format(agorot / 100);
}

/** "12345" → "123.45" for structured data / payment providers. */
export function agorotToDecimal(agorot: number): string {
  const sign = agorot < 0 ? "-" : "";
  const abs = Math.abs(agorot);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function discountPercent(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
