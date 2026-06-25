import { storage } from "./storage";
import type { Load, Expense, RecurringExpense, Driver } from "@shared/schema";
import {
  calculateSettlement,
  money,
  num,
  type PayModel,
  type SettlementCalcResult,
  type SettlementExpenses,
} from "./settlementMath";

/**
 * Settlement Calculation Engine — DB-aware layer.
 * The pure math lives in ./settlementMath (no DB, unit-tested, verified against
 * the real Truck 630 PDF). This file gathers a driver's loads, expenses and
 * recurring deductions for a period and feeds them into calculateSettlement().
 *
 * Pay model is chosen from driver.driverType:
 *   "owner-operator"  → revenue pass-through (factoring %, dispatch %, expenses)
 *   "company-driver"  → flat $ per delivered load
 */

// Statuses that count as "the load is done and the driver should be paid".
// NOTE: production data has inconsistent casing ("delivered" vs "Delivered",
// "completed" vs "Completed"), so we always compare lowercased.
const PAYABLE_STATUSES = new Set(["delivered", "completed", "invoiced"]);

function normalizeStatus(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

/** Map a free-text expense category onto a settlement expense bucket. */
function bucketForExpense(category: string): keyof SettlementExpenses {
  const c = (category ?? "").toLowerCase();
  if (c.includes("flying")) return "fuelFlyingJ";
  if (c.includes("fleet")) return "fuelFleetOne";
  if (c.includes("fuel") || c.includes("diesel") || c.includes("gas")) return "fuelOther";
  if (c.includes("toll")) return "tolls";
  if (c.includes("insur")) return "insurance";
  if (c.includes("trailer") && c.includes("repair")) return "trailerRepair";
  if (c.includes("truck") && c.includes("repair")) return "truckRepair";
  if (c.includes("repair")) return "truckRepair";
  if (c.includes("trailer")) return "trailerFee";
  if (c.includes("prepass")) return "prepass";
  if (c.includes("eld")) return "eld";
  if (c.includes("plate")) return "plate";
  if (c.includes("2290")) return "fee2290";
  if (c.includes("park")) return "parking";
  return "other";
}

export interface SettlementDraftOptions {
  /** Driver pay % of gross linehaul. Overrides per-driver column / model default. */
  driverPayPercentage?: number;
  /** Factoring fee % (owner-operator). Defaults to per-driver column or 0. */
  factoringFeePercentage?: number;
  /** Dispatch fee % of gross (owner-operator). Defaults to per-driver column or 0. */
  dispatchPercentage?: number;
}

export interface SettlementDraft extends SettlementCalcResult {
  driverId: string;
  driverName: string;
  driverType: string;
  periodStart: string;
  periodEnd: string;
  loads: Array<{
    id: string;
    loadNumber: string;
    broker: string;
    route: string;
    deliveryDate: string;
    rate: number;
  }>;
  fuelDiscountTotal: number; // total WEX discount across the period
  fuelDiscountShare: number; // owner's 50% payback added to the fuel deduction
  /** Ready-to-apply values matching the settlement form's field names. */
  formValues: Record<string, string | Array<{ brokerName: string; description: string; grossAmount: string }>>;
}

function field(driver: Driver | undefined, key: string): number {
  return num((driver as unknown as Record<string, unknown>)?.[key]);
}

export async function buildSettlementDraft(
  driverId: string,
  periodStart: string,
  periodEnd: string,
  opts: SettlementDraftOptions = {}
): Promise<SettlementDraft> {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  end.setHours(23, 59, 59, 999); // make the end date inclusive of the whole day

  const [allLoads, driver] = await Promise.all([
    storage.getAllLoads(),
    storage.getDriver(driverId),
  ]);

  const driverLoads = allLoads.filter((load: Load) => {
    if (load.assignedDriverId !== driverId) return false;
    if (!PAYABLE_STATUSES.has(normalizeStatus(load.status))) return false;
    const delivered = load.deliveryDate ? new Date(load.deliveryDate) : null;
    if (!delivered) return false;
    return delivered >= start && delivered <= end;
  });

  // Gather load-linked expenses for the period, bucketed by category.
  const expenses: SettlementExpenses = {};
  const addExpense = (key: keyof SettlementExpenses, amt: number) => {
    expenses[key] = money(num(expenses[key]) + amt);
  };
  const expenseLists = await Promise.all(
    driverLoads.map((l: Load) => storage.getExpensesByLoad(l.id))
  );
  for (const list of expenseLists) {
    for (const exp of list as Expense[]) {
      addExpense(bucketForExpense(exp.category), num(exp.amount));
    }
  }

  // Active recurring deductions (insurance, lease…) fold into "other".
  const recurring = await storage.getActiveRecurringExpenses(driverId);
  const recurringTotal = (recurring as RecurringExpense[]).reduce(
    (s, r) => s + num(r.amount),
    0
  );
  if (recurringTotal > 0) addExpense("other", money(recurringTotal));

  // Imported fuel-card transactions for this driver in the period → fuel buckets.
  // totalCost is the NET amount WEX charged (after discount). Owner-operators
  // pay back HALF the WEX discount (Ready Carrier keeps the other half), so we
  // add that half as a separate "Fuel discount (Ready Carrier 50%)" deduction.
  const fuelTx = await storage.getFuelTransactionsByDriver(driverId);
  let fuelDiscountTotal = 0;
  for (const t of fuelTx) {
    const when = t.transactionDate ? new Date(t.transactionDate) : null;
    if (!when || when < start || when > end) continue;
    // Prefer the explicit card source set at import time (WEX -> fleet_one,
    // Pilot -> flying_j). Fall back to the truck-stop brand for older rows that
    // were imported before card source was captured.
    const cs = (t as Record<string, unknown>).cardSource;
    const v = (t.vendor || "").toLowerCase();
    const bucket: keyof SettlementExpenses =
      cs === "flying_j"
        ? "fuelFlyingJ"
        : cs === "fleet_one"
        ? "fuelFleetOne"
        : v.includes("flying j")
        ? "fuelFlyingJ"
        : v.includes("fleet")
        ? "fuelFleetOne"
        : "fuelOther";
    addExpense(bucket, num(t.totalCost));
    fuelDiscountTotal += num((t as Record<string, unknown>).discount);
  }
  fuelDiscountTotal = money(fuelDiscountTotal);
  const isOwnerOpType = (driver?.driverType ?? "owner-operator") !== "company-driver";
  const fuelDiscountShare = isOwnerOpType ? money(fuelDiscountTotal / 2) : 0;
  if (fuelDiscountShare > 0) addExpense("fuelDiscountShare", fuelDiscountShare);

  const driverType = driver?.driverType ?? "owner-operator";
  const isCompanyDriver = driverType === "company-driver";
  const payModel: PayModel = isCompanyDriver ? "company_driver" : "owner_operator";

  // Owner-operators bear every truck cost (factoring, dispatch, fuel, repairs…)
  // and are paid 100%. Company drivers are paid a % of gross linehaul and bear
  // only their advances — the company absorbs fuel/dispatch/insurance/repairs.
  // Resolution order: explicit override → per-driver column → model default.
  const driverPayPercentage =
    opts.driverPayPercentage ||
    field(driver, "payPercentage") ||
    (isCompanyDriver ? 0 : 100);

  // Explicit overrides always win. Otherwise default by driver type:
  // owner-operators bear factoring/dispatch/expenses, company drivers don't.
  const factoringFeePercentage =
    opts.factoringFeePercentage ?? (isCompanyDriver ? 0 : field(driver, "factoringFeePercentage"));
  const dispatchPercentage =
    opts.dispatchPercentage ?? (isCompanyDriver ? 0 : field(driver, "dispatchPercentage"));

  const result = calculateSettlement({
    payModel,
    loads: driverLoads.map((l: Load) => ({ broker: l.brokerName || l.commodity || undefined, rate: num(l.rate) })),
    driverPayPercentage,
    factoringFeePercentage,
    dispatchPercentage,
    expenses: isCompanyDriver ? {} : expenses,
  });

  const e = isCompanyDriver ? {} : expenses;
  const s = (n: number) => money(num(n)).toFixed(2);

  // Map engine output → the settlement form's exact field names, so the
  // frontend can apply it field-by-field with no extra logic.
  const formValues: SettlementDraft["formValues"] = {
    totalRevenue: s(result.grossRevenue),
    driverPayPercentage: String(result.driverPayPercentage),
    factoringFeePercentage: String(factoringFeePercentage || 0),
    dispatchPercentage: String(dispatchPercentage || 0),
    fuelFlyingJ: s(num((e as Record<string, number>).fuelFlyingJ)),
    fuelFleetOne: s(num((e as Record<string, number>).fuelFleetOne)),
    // Fold the owner's 50% discount payback into the Fuel (Other) field, since
    // the settlement form has no dedicated discount field. Documented in notes.
    fuel: s(num((e as Record<string, number>).fuelOther) + num((e as Record<string, number>).fuelDiscountShare)),
    tolls: s(num((e as Record<string, number>).tolls)),
    insurance: s(num((e as Record<string, number>).insurance)),
    trailerFee: s(num((e as Record<string, number>).trailerFee)),
    truckRepair: s(num((e as Record<string, number>).truckRepair) + num((e as Record<string, number>).repairs)),
    trailerRepair: s(num((e as Record<string, number>).trailerRepair)),
    prepassFee: s(num((e as Record<string, number>).prepass)),
    eldFee: s(num((e as Record<string, number>).eld)),
    plateFee: s(num((e as Record<string, number>).plate)),
    fee2290: s(num((e as Record<string, number>).fee2290)),
    parkingFee: s(num((e as Record<string, number>).parking)),
    netPay: s(result.netPay),
    lineItems: driverLoads.map((l: Load) => ({
      brokerName: l.brokerName || l.commodity || "",
      description: `Load ${l.loadNumber} - ${l.pickupLocation} → ${l.deliveryLocation}`,
      grossAmount: s(num(l.rate)),
    })),
  };
  if (fuelDiscountShare > 0) {
    // Show only the owner's discount share on the settlement; the company's
    // half is intentionally NOT displayed.
    formValues.notes =
      `WEX fuel discount — owner's share $${s(fuelDiscountShare)} (included in the Fuel deduction).`;
  }

  return {
    ...result,
    driverId,
    driverName: driver?.name ?? "(unknown driver)",
    driverType,
    periodStart,
    periodEnd,
    loads: driverLoads.map((l: Load) => ({
      id: l.id,
      loadNumber: l.loadNumber,
      broker: l.brokerName || l.commodity || "",
      route: `${l.pickupLocation} → ${l.deliveryLocation}`,
      deliveryDate: l.deliveryDate ? new Date(l.deliveryDate).toISOString().slice(0, 10) : "",
      rate: money(num(l.rate)),
    })),
    fuelDiscountTotal,
    fuelDiscountShare,
    formValues,
  };
}

export { calculateSettlement } from "./settlementMath";
