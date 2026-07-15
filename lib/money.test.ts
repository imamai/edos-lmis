import { describe, it, expect } from "vitest";
import { computeVatAmount, computeLineTotal, formatMoney } from "./money";

describe("computeVatAmount", () => {
  it("computes additive VAT on a pre-tax subtotal (TOTAL = subtotal + vat)", () => {
    // Real figures from the tenant's sample tax invoice/quotation — same
    // subtotal, but this is the additive model now (fixed from the earlier
    // VAT-inclusive-extraction bug), so these are NOT the same VAT amounts
    // shown in the original samples.
    expect(computeVatAmount(25150, 16)).toBeCloseTo(4024.0, 2);
    expect(computeVatAmount(27650, 16)).toBeCloseTo(4424.0, 2);
  });

  it("returns 0 for a 0 subtotal or 0% rate", () => {
    expect(computeVatAmount(0, 16)).toBe(0);
    expect(computeVatAmount(1000, 0)).toBe(0);
  });

  it("rounds to 2 decimal places", () => {
    expect(computeVatAmount(33.33, 16)).toBeCloseTo(5.33, 2);
  });
});

describe("computeLineTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(computeLineTotal(2, 200)).toBe(400);
    expect(computeLineTotal(1, 12500)).toBe(12500);
  });

  it("rounds to 2 decimal places to avoid float drift", () => {
    // 0.1 + 0.2 style floating point artifacts shouldn't leak through
    expect(computeLineTotal(3, 0.1)).toBe(0.3);
  });
});

describe("formatMoney", () => {
  it("adds thousands separators and pads to 2 decimals", () => {
    expect(formatMoney(25150)).toBe("25,150.00");
    expect(formatMoney(650)).toBe("650.00");
    expect(formatMoney(12500.5)).toBe("12,500.50");
  });

  it("handles zero", () => {
    expect(formatMoney(0)).toBe("0.00");
  });
});
