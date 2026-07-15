/**
 * Shared money math — pulled out of lib/pdf/layout.tsx and lib/actions/quotations.ts
 * so the VAT/rounding formula lives in exactly one place and can be unit tested.
 * The equivalent SQL formula (edoslmis_generate_invoice_for_order,
 * edoslmis_cancel_invoice_for_order) is necessarily a separate implementation —
 * same math, different language — since Postgres functions can't import this.
 */

/** Additive VAT on a pre-tax subtotal, e.g. 25150 @ 16% -> 4024.00. Rounded to 2dp. */
export function computeVatAmount(subtotal: number, ratePercent: number): number {
  return Math.round(subtotal * ratePercent) / 100;
}

/** A line item's total, rounded to 2dp to avoid floating-point drift accumulating across many lines. */
export function computeLineTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

/** Consistent 2-decimal, comma-grouped money formatting, e.g. 25150 -> "25,150.00". */
export function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
