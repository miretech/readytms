/**
 * Settlement math — Ready TMS
 * ------------------------------------------------------------------
 * PURE functions only. No database, no env, no imports. Unit-testable core.
 *
 * ONE unified formula, verified against two real Ready Carrier settlements:
 *
 *     netPay = (grossRevenue × driverPay%) − totalDeductions + accessorials
 *
 *   totalDeductions = factoringFee + dispatchFee + Σ(expenses) + advance
 *
 * The difference between driver types is WHICH deductions get passed in:
 *
 *  • OWNER-OPERATOR (Truck 630): driverPay% = 100, and EVERY truck cost is
 *    charged to the driver — factoring (~2.99%), dispatch (8% of gross), fuel,
 *    tolls, insurance, trailer, repairs, advance. Accessorials (detention) add
 *    back. → reproduces net pay $5,539.94.
 *
 *  • COMPANY DRIVER (Truck 790): driverPay% = 30 of gross linehaul, and ONLY
 *    the driver's advances are deducted — the company absorbs fuel, dispatch,
 *    insurance, repairs. → reproduces take-home $2,320.00.
 *
 * Both verified to the penny in settlementCalculations.test.ts.
 */

export type PayModel = "owner_operator" | "company_driver";

/** Parse a decimal-ish value (string | number | null) into a safe number. */
export function num(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
}

/** Round to 2 decimals, avoiding binary float drift (e.g. 0.1 + 0.2). */
export function money(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface SettlementLoad {
  broker?: string;
  rate: number;
}

/** Named pass-through expenses. All optional; only non-zero ones appear. */
export interface SettlementExpenses {
  fuelFlyingJ?: number;
  fuelFleetOne?: number;
  fuelOther?: number; // e.g. Xpo card
  fuelDiscountShare?: number; // owner-op pays back 50% of WEX discount (Ready Carrier keeps half)
  tolls?: number;
  insurance?: number;
  trailerFee?: number;
  truckRepair?: number;
  trailerRepair?: number;
  repairs?: number; // ad-hoc repairs (Oring, ABS, oil…) summed
  prepass?: number;
  eld?: number;
  plate?: number;
  fee2290?: number;
  parking?: number;
  truckCredit?: number; // credit BACK to the driver (reduces deductions)
  previousSettlement?: number;
  other?: number;
}

/** Accessorials are ADDED to driver pay (detention, layover, lumper reimb…). */
export interface SettlementAccessorial {
  label: string;
  amount: number;
  reference?: string;
}

export interface SettlementBreakdownLine {
  label: string;
  type: "earning" | "deduction";
  amount: number; // positive; sign implied by type
  detail?: string;
}

export interface SettlementCalcInput {
  payModel: PayModel;
  loads: SettlementLoad[];
  driverPayPercentage: number; // % of GROSS linehaul (100 owner-op, 30 company)
  factoringFeePercentage?: number; // % of gross, charged to driver (owner-op)
  dispatchPercentage?: number; // % of gross, charged to driver (owner-op)
  expenses?: SettlementExpenses;
  advance?: number; // advance recovered this period
  accessorials?: SettlementAccessorial[];
}

export interface SettlementCalcResult {
  payModel: PayModel;
  loadCount: number;
  grossRevenue: number;
  driverPayPercentage: number;
  driverGross: number; // gross × payPct
  factoringFee: number;
  dispatchFee: number;
  expenseTotal: number; // named expenses + advance (excludes factoring/dispatch)
  totalDeductions: number; // factoring + dispatch + expenses + advance
  totalAccessorials: number;
  netPay: number;
  lines: SettlementBreakdownLine[];
  warnings: string[];
}

const EXPENSE_LABELS: Array<[keyof SettlementExpenses, string]> = [
  ["fuelFlyingJ", "Fuel — Flying J"],
  ["fuelFleetOne", "Fuel — Fleet One"],
  ["fuelOther", "Fuel — Other"],
  ["fuelDiscountShare", "Fuel discount (Ready Carrier 50%)"],
  ["tolls", "Tolls"],
  ["insurance", "Insurance"],
  ["trailerFee", "Trailer fee"],
  ["truckRepair", "Truck repair"],
  ["trailerRepair", "Trailer repair"],
  ["repairs", "Repairs"],
  ["prepass", "PrePass"],
  ["eld", "ELD"],
  ["plate", "Plate fee"],
  ["fee2290", "2290 fee"],
  ["parking", "Parking"],
  ["previousSettlement", "Previous settlement balance"],
  ["other", "Other deductions"],
];

export function calculateSettlement(input: SettlementCalcInput): SettlementCalcResult {
  const warnings: string[] = [];
  const lines: SettlementBreakdownLine[] = [];

  const loads = input.loads ?? [];
  const loadCount = loads.length;
  const grossRevenue = money(loads.reduce((s, l) => s + num(l.rate), 0));
  const exp = input.expenses ?? {};
  const payPct = num(input.driverPayPercentage);

  if (loadCount === 0) {
    warnings.push("No payable (delivered/completed) loads were found in this period.");
  }
  if (payPct <= 0) {
    warnings.push("Driver pay percentage is 0 — driver gross pay will be $0.");
  }

  // ── Driver gross pay: % of gross linehaul ─────────────────────────────────────
  const driverGross = money(grossRevenue * (payPct / 100));
  lines.push({
    label: "Driver pay",
    type: "earning",
    amount: driverGross,
    detail: `${payPct.toFixed(0)}% of $${grossRevenue.toFixed(2)} gross (${loadCount} load${loadCount === 1 ? "" : "s"})`,
  });

  // ── Percentage-based deductions (charged to driver) ───────────────────────────
  const factoringPct = num(input.factoringFeePercentage);
  const factoringFee = money(grossRevenue * (factoringPct / 100));
  if (factoringFee > 0) {
    lines.push({
      label: "Factoring fee",
      type: "deduction",
      amount: factoringFee,
      detail: `${factoringPct.toFixed(2)}% of gross`,
    });
  }

  const dispatchPct = num(input.dispatchPercentage);
  const dispatchFee = money(grossRevenue * (dispatchPct / 100));
  if (dispatchFee > 0) {
    lines.push({
      label: "Dispatch fee",
      type: "deduction",
      amount: dispatchFee,
      detail: `${dispatchPct.toFixed(2)}% of gross`,
    });
  }

  // ── Named pass-through expenses ───────────────────────────────────────────────
  let expenseTotal = 0;
  for (const [key, label] of EXPENSE_LABELS) {
    const amt = money(num(exp[key]));
    if (amt === 0) continue;
    expenseTotal += amt;
    lines.push({ label, type: "deduction", amount: amt });
  }

  const truckCredit = money(num(exp.truckCredit));
  if (truckCredit > 0) {
    expenseTotal -= truckCredit;
    lines.push({ label: "Truck credit", type: "earning", amount: truckCredit });
  }

  const advance = money(num(input.advance));
  if (advance > 0) {
    expenseTotal += advance;
    lines.push({ label: "Advance recovery", type: "deduction", amount: advance });
  }
  expenseTotal = money(expenseTotal);

  const totalDeductions = money(factoringFee + dispatchFee + expenseTotal);

  // ── Accessorials (added to pay) ───────────────────────────────────────────────
  let totalAccessorials = 0;
  for (const acc of input.accessorials ?? []) {
    const amt = money(num(acc.amount));
    if (amt === 0) continue;
    totalAccessorials += amt;
    lines.push({
      label: acc.label || "Accessorial",
      type: "earning",
      amount: amt,
      detail: acc.reference,
    });
  }
  totalAccessorials = money(totalAccessorials);

  const netPay = money(driverGross - totalDeductions + totalAccessorials);
  if (netPay < 0) {
    warnings.push(
      `Net pay is negative ($${netPay.toFixed(2)}). Deductions exceed pay — review before approving.`
    );
  }

  return {
    payModel: input.payModel,
    loadCount,
    grossRevenue,
    driverPayPercentage: payPct,
    driverGross,
    factoringFee,
    dispatchFee,
    expenseTotal,
    totalDeductions,
    totalAccessorials,
    netPay,
    lines,
    warnings,
  };
}
