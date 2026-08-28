import assert from "node:assert/strict";

// Helper from storage logic
function getUpcomingMonthKey(date = new Date()) {
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function calculateProjectedBalances(currentBalances, estimates, targetMonth) {
  let incomeUSD = 0;
  let expenseUSD = 0;
  let incomeLBP = 0;
  let expenseLBP = 0;

  for (const est of estimates) {
    if (est.skippedForMonth === targetMonth) {
      continue;
    }

    let effectiveAmount = est.amount;
    if (est.tempOverride && est.tempOverride.month === targetMonth) {
      effectiveAmount = est.tempOverride.amount;
    }

    if (est.currency === "USD") {
      if (est.type === "income") {
        incomeUSD += effectiveAmount;
      } else {
        expenseUSD += effectiveAmount;
      }
    } else if (est.currency === "LBP") {
      if (est.type === "income") {
        incomeLBP += effectiveAmount;
      } else {
        expenseLBP += effectiveAmount;
      }
    }
  }

  const netUSD = incomeUSD - expenseUSD;
  const netLBP = incomeLBP - expenseLBP;

  return {
    projectedUSD: currentBalances.usd + netUSD,
    projectedLBP: currentBalances.lbp + netLBP,
    netUSD,
    netLBP,
    incomeUSD,
    expenseUSD,
    incomeLBP,
    expenseLBP,
  };
}

console.log("Running monthly estimation unit checks...");

// 1. Upcoming Month Key rollover
assert.equal(getUpcomingMonthKey(new Date(2026, 7, 28)), "2026-09");
assert.equal(getUpcomingMonthKey(new Date(2026, 11, 15)), "2027-01");

// 2. Base projection calculation
const currentBalances = { usd: 200, lbp: 1_000_000 };
const targetMonth = "2026-09";
const sampleEstimates = [
  {
    id: "1",
    type: "expense",
    note: "Electricity",
    amount: 10,
    currency: "USD",
    skippedForMonth: null,
    tempOverride: null,
  },
  {
    id: "2",
    type: "expense",
    note: "Internet",
    amount: 7.5,
    currency: "USD",
    skippedForMonth: null,
    tempOverride: null,
  },
  {
    id: "3",
    type: "expense",
    note: "Football",
    amount: 800_000,
    currency: "LBP",
    skippedForMonth: null,
    tempOverride: null,
  },
  {
    id: "4",
    type: "income",
    note: "Salary / Expected",
    amount: 50,
    currency: "USD",
    skippedForMonth: null,
    tempOverride: null,
  },
];

let res = calculateProjectedBalances(
  currentBalances,
  sampleEstimates,
  targetMonth,
);
// Net USD: +50 - 10 - 7.5 = +32.5 -> Projected USD = 200 + 32.5 = 232.5
assert.equal(res.netUSD, 32.5);
assert.equal(res.projectedUSD, 232.5);
// Net LBP: -800,000 -> Projected LBP = 1,000,000 - 800,000 = 200,000
assert.equal(res.netLBP, -800_000);
assert.equal(res.projectedLBP, 200_000);

// 3. Live transaction impact: current USD drops by $50 to $150
const updatedCurrentBalances = { usd: 150, lbp: 1_000_000 };
res = calculateProjectedBalances(
  updatedCurrentBalances,
  sampleEstimates,
  targetMonth,
);
assert.equal(res.projectedUSD, 182.5);

// 4. Month-scoped Skip on Football (800,000 LBP)
sampleEstimates[2].skippedForMonth = targetMonth;
res = calculateProjectedBalances(
  updatedCurrentBalances,
  sampleEstimates,
  targetMonth,
);
assert.equal(res.projectedLBP, 1_000_000); // 800,000 LBP expense is skipped

// Unskip
sampleEstimates[2].skippedForMonth = null;
res = calculateProjectedBalances(
  updatedCurrentBalances,
  sampleEstimates,
  targetMonth,
);
assert.equal(res.projectedLBP, 200_000);

// 5. Temporary Edit override for upcoming month (Electricity $10 -> $15 for 2026-09)
sampleEstimates[0].tempOverride = { amount: 15, month: "2026-09" };
res = calculateProjectedBalances(
  updatedCurrentBalances,
  sampleEstimates,
  targetMonth,
);
// Net USD: +50 - 15 - 7.5 = +27.5 -> Projected USD = 150 + 27.5 = 177.5
assert.equal(res.projectedUSD, 177.5);

// Revert temp override
sampleEstimates[0].tempOverride = null;
res = calculateProjectedBalances(
  updatedCurrentBalances,
  sampleEstimates,
  targetMonth,
);
assert.equal(res.projectedUSD, 182.5);

console.log("All estimation unit checks passed successfully!");
