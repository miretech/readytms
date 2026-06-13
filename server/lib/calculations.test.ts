import { describe, it, expect } from "vitest";
import {
  calculateDriverPay,
  calculateInvoiceTotals,
  generateDocumentNumber,
} from "./calculations";

describe("generateDocumentNumber", () => {
  it("formats prefix, zero-padded date, and 4-digit suffix", () => {
    const date = new Date(2026, 0, 5); // Jan 5, 2026 (month is 0-indexed)
    expect(generateDocumentNumber("INV", date, () => 0.0042)).toBe(
      "INV-20260105-0042",
    );
  });

  it("zero-pads the random suffix to 4 digits", () => {
    const date = new Date(2026, 11, 31);
    expect(generateDocumentNumber("SETTLE", date, () => 0)).toBe(
      "SETTLE-20261231-0000",
    );
  });

  it("clamps the suffix below 10000", () => {
    const date = new Date(2026, 5, 13);
    // rng just under 1 -> floor(0.99999 * 10000) = 9999
    expect(generateDocumentNumber("INV", date, () => 0.99999)).toBe(
      "INV-20260613-9999",
    );
  });
});

describe("calculateInvoiceTotals", () => {
  it("defaults to no tax", () => {
    expect(calculateInvoiceTotals("1500.50")).toEqual({
      subtotal: 1500.5,
      tax: 0,
      total: 1500.5,
    });
  });

  it("applies a tax rate", () => {
    const result = calculateInvoiceTotals("1000", 0.07);
    expect(result.subtotal).toBe(1000);
    expect(result.tax).toBeCloseTo(70, 5);
    expect(result.total).toBeCloseTo(1070, 5);
  });

  it("accepts numeric input", () => {
    expect(calculateInvoiceTotals(250).subtotal).toBe(250);
  });
});

describe("calculateDriverPay", () => {
  const loads = [
    { rate: "1000", weight: 500 },
    { rate: "2000", weight: 300 },
  ];

  it("sums revenue and miles across loads", () => {
    const r = calculateDriverPay(loads, []);
    expect(r.totalRevenue).toBe(3000);
    expect(r.totalMiles).toBe(800);
  });

  it("defaults to 70% of revenue when no payRate is given", () => {
    const r = calculateDriverPay(loads, []);
    expect(r.isPercentageBased).toBe(false); // no payRate -> per-mile branch
    expect(r.rateValue).toBe(0.7);
    // per-mile: 800 miles * 0.70
    expect(r.driverPay).toBeCloseTo(560, 5);
  });

  it("treats a payRate below 10 as a revenue percentage", () => {
    const r = calculateDriverPay(loads, [], "0.75");
    expect(r.isPercentageBased).toBe(true);
    expect(r.driverPay).toBeCloseTo(2250, 5); // 3000 * 0.75
    expect(r.perLoadPay).toEqual([750, 1500]);
  });

  it("treats a payRate of 10 or more as a per-mile rate", () => {
    const r = calculateDriverPay(loads, [], "2");
    // 2 < 10 -> percentage; so use 12 to hit per-mile branch
    const perMile = calculateDriverPay(loads, [], "12");
    expect(r.isPercentageBased).toBe(true);
    expect(perMile.isPercentageBased).toBe(false);
    expect(perMile.driverPay).toBeCloseTo(9600, 5); // 800 miles * 12
    expect(perMile.perLoadPay).toEqual([6000, 3600]);
  });

  it("subtracts recurring expenses to compute net pay", () => {
    const r = calculateDriverPay(loads, [{ amount: "100" }, { amount: "50.5" }], "0.70");
    expect(r.deductions).toBeCloseTo(150.5, 5);
    expect(r.netPay).toBeCloseTo(3000 * 0.7 - 150.5, 5);
  });

  it("handles missing weights as zero miles", () => {
    const r = calculateDriverPay([{ rate: "1000", weight: null }], [], "15");
    expect(r.totalMiles).toBe(0);
    expect(r.driverPay).toBe(0); // per-mile on zero miles
  });

  it("handles an empty load list", () => {
    const r = calculateDriverPay([], [], "0.7");
    expect(r.totalRevenue).toBe(0);
    expect(r.driverPay).toBe(0);
    expect(r.perLoadPay).toEqual([]);
  });
});
