// Pure, side-effect-free financial calculations used by invoice and settlement
// generation. Extracted from route/automation handlers so the logic can be
// unit-tested without a database or HTTP layer.

/**
 * Generate a document number such as `INV-20260613-0042` or
 * `SETTLE-20260613-0042`.
 *
 * @param prefix e.g. "INV" or "SETTLE"
 * @param date   the date the document is generated for
 * @param rng    random source in [0, 1); injectable for deterministic tests
 */
export function generateDocumentNumber(
  prefix: string,
  date: Date = new Date(),
  rng: () => number = Math.random,
): string {
  const datePart =
    `${date.getFullYear()}` +
    `${String(date.getMonth() + 1).padStart(2, "0")}` +
    `${String(date.getDate()).padStart(2, "0")}`;
  const suffix = String(Math.floor(rng() * 10000)).padStart(4, "0");
  return `${prefix}-${datePart}-${suffix}`;
}

export interface InvoiceTotals {
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * Compute invoice subtotal/tax/total from a raw rate string and an optional
 * tax rate (e.g. 0.07 for 7%). Defaults to no tax to match current behavior.
 */
export function calculateInvoiceTotals(
  rate: string | number,
  taxRate = 0,
): InvoiceTotals {
  const subtotal = parseFloat(rate.toString());
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

export interface PayLoad {
  rate: string | number;
  weight?: number | null;
}

export interface PayExpense {
  amount: string | number;
}

export interface DriverPayResult {
  totalRevenue: number;
  totalMiles: number;
  rateValue: number;
  /** True when pay is computed as a percentage of revenue rather than per-mile. */
  isPercentageBased: boolean;
  driverPay: number;
  deductions: number;
  netPay: number;
  /** Pay attributed to each input load, in the same order. */
  perLoadPay: number[];
}

/**
 * Compute a driver settlement. A `payRate` below 10 is treated as a revenue
 * percentage (e.g. 0.70 = 70% of revenue); otherwise it is treated as a
 * per-mile rate applied to total miles. Defaults to 70% of revenue.
 */
export function calculateDriverPay(
  loads: PayLoad[],
  recurringExpenses: PayExpense[],
  payRate?: string | number,
): DriverPayResult {
  const totalRevenue = loads.reduce(
    (sum, load) => sum + parseFloat(load.rate.toString()),
    0,
  );
  const totalMiles = loads.reduce((sum, load) => sum + (load.weight || 0), 0);

  const rateValue = parseFloat((payRate ?? "0.70").toString());
  const isPercentageBased = Boolean(payRate) && Number(payRate) < 10;

  const perLoadPay = loads.map((load) =>
    isPercentageBased
      ? parseFloat(load.rate.toString()) * rateValue
      : (load.weight || 0) * rateValue,
  );
  const driverPay = isPercentageBased
    ? totalRevenue * rateValue
    : totalMiles * rateValue;

  const deductions = recurringExpenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount.toString()),
    0,
  );
  const netPay = driverPay - deductions;

  return {
    totalRevenue,
    totalMiles,
    rateValue,
    isPercentageBased,
    driverPay,
    deductions,
    netPay,
    perLoadPay,
  };
}
