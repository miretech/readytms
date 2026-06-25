/**
 * Standalone test for the settlement calc engine.
 * Run with:  npx tsx server/settlementCalculations.test.ts
 * No database or env required — exercises the pure calculation only.
 *
 * Tests 1 & 2 reproduce REAL Ready Carrier settlement PDFs (source of truth).
 */
import { calculateSettlement } from "./settlementMath";

let passed = 0;
let failed = 0;

function expect(label: string, actual: number, want: number, tol = 0.02) {
  const ok = Math.abs(actual - want) < tol;
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}: ${actual}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}: got ${actual}, want ${want}`);
  }
}

// ── REAL #1: Truck 630, owner-operator (Garad), week 06/15–06/21/26 ───────────
console.log("Test 1: REAL owner-operator (Truck 630) → net $5,539.94");
{
  const r = calculateSettlement({
    payModel: "owner_operator",
    driverPayPercentage: 100,
    factoringFeePercentage: 2.99,
    dispatchPercentage: 8,
    loads: [
      { broker: "SPOT", rate: 2000.0 },
      { broker: "D & L TRANSPORT, LLC", rate: 1800.0 },
      { broker: "D & L TRANSPORT, LLC", rate: 1154.56 },
      { broker: "FLS Transportation Services Limited", rate: 1800.0 },
      { broker: "T A Services Inc", rate: 3800.0 },
    ],
    expenses: {
      fuelFlyingJ: 269.61,
      fuelOther: 2620.49, // Xpo
      tolls: 241.57,
      insurance: 298.0,
      trailerFee: 112.5,
    },
    advance: 400.0,
    accessorials: [{ label: "Detention", amount: 87.5, reference: "#1885104" }],
  });
  expect("grossRevenue", r.grossRevenue, 10554.56);
  expect("driverGross (100%)", r.driverGross, 10554.56);
  expect("dispatchFee (8%)", r.dispatchFee, 844.36, 0.5);
  expect("netPay", r.netPay, 5539.94, 0.5);
}

// ── REAL #2: Truck 790, company driver @ 30% (Abdiwali), 06/08–06/21/26 ───────
console.log("Test 2: REAL company driver @30% (Truck 790) → take-home $2,320.00");
{
  const r = calculateSettlement({
    payModel: "company_driver",
    driverPayPercentage: 30, // 30% of gross linehaul
    // company driver bears NO factoring/dispatch/fuel — only advances
    loads: [
      { broker: "M2 Logistics Inc.", rate: 3400.0 },
      { broker: "DM Trans, LLC dba Arrive Logistics", rate: 2400.0 },
      { broker: "TQL", rate: 1600.0 },
      { broker: "SPOT", rate: 2000.0 },
    ],
    advance: 500.0,
  });
  expect("grossRevenue", r.grossRevenue, 9400.0);
  expect("driverGross (30%)", r.driverGross, 2820.0);
  expect("advance deduction", r.totalDeductions, 500.0);
  expect("netPay (take-home)", r.netPay, 2320.0);
}

console.log("Test 3: float safety — 0.1 + 0.2 deductions don't drift");
{
  const r = calculateSettlement({
    payModel: "company_driver",
    driverPayPercentage: 100,
    loads: [{ rate: 100 }],
    expenses: { fuelFlyingJ: 0.1, tolls: 0.2 },
  });
  expect("expenseTotal", r.expenseTotal, 0.3);
  expect("netPay", r.netPay, 99.7);
}

console.log("Test 4: negative net pay flagged");
{
  const r = calculateSettlement({
    payModel: "owner_operator",
    driverPayPercentage: 100,
    loads: [{ rate: 1000 }],
    advance: 1500,
  });
  expect("netPay", r.netPay, -500);
  expect("negativeWarning", r.warnings.some((w) => w.includes("negative")) ? 1 : 0, 1);
}

console.log("Test 5: truck credit returns money to driver");
{
  const r = calculateSettlement({
    payModel: "owner_operator",
    driverPayPercentage: 100,
    loads: [{ rate: 1000 }],
    expenses: { insurance: 100, truckCredit: 40 },
  });
  expect("netPay", r.netPay, 940); // 1000 − (100 − 40)
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
