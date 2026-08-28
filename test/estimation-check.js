import assert from "node:assert/strict";

// Helper from storage logic
function getUpcomingMonthKey(date = new Date()) {
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function getItemAmounts(item) {
  if (Array.isArray(item.amounts) && item.amounts.length > 0) {
    return item.amounts;
  }
  if (item.amount !== undefined && item.currency) {
    return [{ amount: Number(item.amount) || 0, currency: item.currency }];
  }
  return [];
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

    let effectiveAmounts = [];
    if (est.tempOverride && est.tempOverride.month === targetMonth) {
      if (Array.isArray(est.tempOverride.amounts)) {
        effectiveAmounts = est.tempOverride.amounts;
      } else if (est.tempOverride.amount !== undefined) {
        effectiveAmounts = [
          {
            amount: est.tempOverride.amount,
            currency: est.amounts?.[0]?.currency || est.currency || "USD",
          },
        ];
      }
    } else {
      effectiveAmounts = getItemAmounts(est);
    }

    for (const a of effectiveAmounts) {
      const amt = Number(a.amount) || 0;
      if (a.currency === "USD") {
        if (est.type === "income") {
          incomeUSD += amt;
        } else {
          expenseUSD += amt;
        }
      } else if (a.currency === "LBP") {
        if (est.type === "income") {
          incomeLBP += amt;
        } else {
          expenseLBP += amt;
        }
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

// 2. Base projection calculation with single and mixed currency items
const currentBalances = { usd: 200, lbp: 1_000_000 };
const targetMonth = "2026-09";
const sampleEstimates = [
  {
    id: "1",
    type: "expense",
    note: "Electricity & Fuel",
    amounts: [
      { amount: 10, currency: "USD" },
      { amount: 500_000, currency: "LBP" },
    ],
    skippedForMonth: null,
    tempOverride: null,
  },
  {
    id: "2",
    type: "expense",
    note: "Internet",
    amounts: [{ amount: 7.5, currency: "USD" }],
    skippedForMonth: null,
    tempOverride: null,
  },
  {
    id: "3",
    type: "expense",
    note: "Football",
    amounts: [{ amount: 300_000, currency: "LBP" }],
    skippedForMonth: null,
    tempOverride: null,
  },
  {
    id: "4",
    type: "income",
    note: "Salary & Bonus",
    amounts: [
      { amount: 50, currency: "USD" },
      { amount: 1_000_000, currency: "LBP" },
    ],
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
// Net LBP: +1,000,000 - 500,000 - 300,000 = +200,000 -> Projected LBP = 1,000,000 + 200,000 = 1,200,000
assert.equal(res.netLBP, 200_000);
assert.equal(res.projectedLBP, 1_200_000);

// 3. Mixed Currency Temp Override on item 1: override to $15 + 400,000 LBP
sampleEstimates[0].tempOverride = {
  amounts: [
    { amount: 15, currency: "USD" },
    { amount: 400_000, currency: "LBP" },
  ],
  month: "2026-09",
};
res = calculateProjectedBalances(currentBalances, sampleEstimates, targetMonth);
// Net USD: +50 - 15 - 7.5 = +27.5 -> Projected USD = 227.5
assert.equal(res.projectedUSD, 227.5);
// Net LBP: +1,000,000 - 400,000 - 300,000 = +300,000 -> Projected LBP = 1,300,000
assert.equal(res.projectedLBP, 1_300_000);

// Revert temp override
sampleEstimates[0].tempOverride = null;

// 4. Month-scoped Skip on mixed item 1
sampleEstimates[0].skippedForMonth = targetMonth;
res = calculateProjectedBalances(currentBalances, sampleEstimates, targetMonth);
// Net USD without item 1: +50 - 7.5 = +42.5 -> Projected USD = 242.5
assert.equal(res.projectedUSD, 242.5);
// Net LBP without item 1: +1,000,000 - 300,000 = +700,000 -> Projected LBP = 1,700,000
assert.equal(res.projectedLBP, 1_700_000);

console.log("All mixed-currency estimation unit checks passed successfully!");
