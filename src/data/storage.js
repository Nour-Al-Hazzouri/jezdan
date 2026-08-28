import { calculateNetEffect } from "./calculation.js";
import { triggerAutoBackup } from "./telegram.js";

const KEYS = {
  TRANSACTIONS: "jezdan_transactions",
  BALANCES: "jezdan_balances",
  OPENING_BALANCES: "jezdan_opening_balances",
  EXCHANGE_RATE: "jezdan_exchange_rate",
  TELEGRAM_CONFIG: "jezdan_telegram_config",
  MONTHLY_ESTIMATES: "jezdan_monthly_estimates",
};

const DB_NAME = "jezdan_db";
const STORE_NAME = "keyval";

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
    });
  }
  return dbPromise;
}

// ponytail: Basic IndexedDB wrapper. Includes automatic migration from old localStorage if data exists.
async function readData(key, defaultVal) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result === undefined) {
          // Attempt migration from localStorage
          const old = localStorage.getItem(key);
          if (old) {
            try {
              const parsed = JSON.parse(old);
              writeData(key, parsed); // Async migrate
              resolve(parsed);
            } catch (e) {
              resolve(defaultVal);
            }
          } else {
            resolve(defaultVal);
          }
        } else {
          resolve(request.result);
        }
      };
    });
  } catch (e) {
    console.error(`Error reading ${key}:`, e);
    return defaultVal;
  }
}

async function writeData(key, val) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(val, key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (e) {
    console.error(`Error writing ${key}:`, e);
  }
}

const generateId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15);

async function recalculateBalances() {
  const opening = await readData(KEYS.OPENING_BALANCES, { usd: 0, lbp: 0 });
  const txs = await getTransactions();

  let currentUSD = opening.usd;
  let currentLBP = opening.lbp;

  for (const tx of txs) {
    currentUSD += tx.netUSD || 0;
    currentLBP += tx.netLBP || 0;
  }

  await writeData(KEYS.BALANCES, { usd: currentUSD, lbp: currentLBP });
}

export async function getBalances() {
  return await readData(KEYS.BALANCES, { usd: 0, lbp: 0 });
}

export async function getOpeningBalances() {
  return await readData(KEYS.OPENING_BALANCES, { usd: 0, lbp: 0 });
}

export async function setOpeningBalances(usd, lbp) {
  await writeData(KEYS.OPENING_BALANCES, {
    usd: Number(usd) || 0,
    lbp: Number(lbp) || 0,
  });
  await recalculateBalances();
  triggerAutoBackup();
}

export async function getTransactions() {
  return await readData(KEYS.TRANSACTIONS, []);
}

export async function addTransaction(tx) {
  const netEffect = calculateNetEffect(tx.paid || [], tx.receivedChange || []);

  const newTx = {
    id: generateId(),
    timestamp: tx.timestamp || Date.now(),
    note: tx.note || "",
    paid: tx.paid || [],
    receivedChange: tx.receivedChange || [],
    type: tx.type || "expense",
    netUSD: netEffect.USD || 0,
    netLBP: netEffect.LBP || 0,
  };

  const txs = await getTransactions();
  txs.push(newTx);
  await writeData(KEYS.TRANSACTIONS, txs);

  // Update balances incrementally to avoid O(n) recalculation on every add
  const balances = await getBalances();
  balances.usd += newTx.netUSD;
  balances.lbp += newTx.netLBP;
  await writeData(KEYS.BALANCES, balances);

  triggerAutoBackup();
  return newTx;
}

export async function updateTransaction(id, updatedTx) {
  let txs = await getTransactions();
  const oldTxIndex = txs.findIndex((t) => t.id === id);
  if (oldTxIndex === -1) return null;

  const oldTx = txs[oldTxIndex];
  const netEffect = calculateNetEffect(
    updatedTx.paid || [],
    updatedTx.receivedChange || [],
  );

  const newTx = {
    ...oldTx,
    note: updatedTx.note !== undefined ? updatedTx.note : oldTx.note,
    paid: updatedTx.paid || oldTx.paid,
    receivedChange: updatedTx.receivedChange || oldTx.receivedChange,
    type: updatedTx.type || oldTx.type,
    netUSD: netEffect.USD || 0,
    netLBP: netEffect.LBP || 0,
  };

  txs[oldTxIndex] = newTx;
  await writeData(KEYS.TRANSACTIONS, txs);

  // Update balances by the difference
  const diffUSD = newTx.netUSD - oldTx.netUSD;
  const diffLBP = newTx.netLBP - oldTx.netLBP;

  const balances = await getBalances();
  balances.usd += diffUSD;
  balances.lbp += diffLBP;
  await writeData(KEYS.BALANCES, balances);

  triggerAutoBackup();
  return newTx;
}

export async function deleteTransaction(id) {
  let txs = await getTransactions();
  const txToDelete = txs.find((t) => t.id === id);
  if (!txToDelete) return;

  txs = txs.filter((t) => t.id !== id);
  await writeData(KEYS.TRANSACTIONS, txs);

  // Update balances incrementally (roll back)
  const balances = await getBalances();
  balances.usd -= txToDelete.netUSD;
  balances.lbp -= txToDelete.netLBP;
  await writeData(KEYS.BALANCES, balances);
  triggerAutoBackup();
}

export async function getExchangeRate() {
  return await readData(KEYS.EXCHANGE_RATE, 90000);
}

export async function setExchangeRate(rate) {
  await writeData(KEYS.EXCHANGE_RATE, Number(rate));
}

// ── Monthly Estimates (Upcoming Month Projection) ──

export function getUpcomingMonthKey(date = new Date()) {
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

export async function getMonthlyEstimates() {
  return await readData(KEYS.MONTHLY_ESTIMATES, []);
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

export async function addMonthlyEstimate(estimate) {
  const amounts =
    Array.isArray(estimate.amounts) && estimate.amounts.length > 0
      ? estimate.amounts.map((a) => ({
          amount: Number(a.amount) || 0,
          currency: a.currency || "USD",
        }))
      : [
          {
            amount: Number(estimate.amount) || 0,
            currency: estimate.currency || "USD",
          },
        ];

  const newEst = {
    id: generateId(),
    type: estimate.type || "expense",
    note: estimate.note || "",
    amounts,
    amount: amounts[0]?.amount || 0,
    currency: amounts[0]?.currency || "USD",
    skippedForMonth: null,
    tempOverride: null, // { amounts: [{ amount, currency }], month: string }
  };

  const list = await getMonthlyEstimates();
  list.push(newEst);
  await writeData(KEYS.MONTHLY_ESTIMATES, list);
  triggerAutoBackup();
  return newEst;
}

export async function updateMonthlyEstimate(id, updated) {
  const list = await getMonthlyEstimates();
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) return null;

  const amounts =
    Array.isArray(updated.amounts) && updated.amounts.length > 0
      ? updated.amounts.map((a) => ({
          amount: Number(a.amount) || 0,
          currency: a.currency || "USD",
        }))
      : updated.amount !== undefined
        ? [
            {
              amount: Number(updated.amount) || 0,
              currency: updated.currency || list[idx].currency || "USD",
            },
          ]
        : list[idx].amounts || [
            {
              amount: Number(list[idx].amount) || 0,
              currency: list[idx].currency || "USD",
            },
          ];

  list[idx] = {
    ...list[idx],
    type: updated.type || list[idx].type,
    note: updated.note !== undefined ? updated.note : list[idx].note,
    amounts,
    amount: amounts[0]?.amount || 0,
    currency: amounts[0]?.currency || "USD",
  };

  await writeData(KEYS.MONTHLY_ESTIMATES, list);
  triggerAutoBackup();
  return list[idx];
}

export async function setMonthlyEstimateTempOverride(id, tempAmounts) {
  const list = await getMonthlyEstimates();
  const item = list.find((e) => e.id === id);
  if (!item) return null;

  const targetMonth = getUpcomingMonthKey();
  const amounts = Array.isArray(tempAmounts)
    ? tempAmounts.map((a) => ({
        amount: Number(a.amount) || 0,
        currency: a.currency || "USD",
      }))
    : [
        {
          amount: Number(tempAmounts) || 0,
          currency: item.amounts?.[0]?.currency || item.currency || "USD",
        },
      ];

  item.tempOverride = {
    amounts,
    amount: amounts[0]?.amount || 0,
    month: targetMonth,
  };

  await writeData(KEYS.MONTHLY_ESTIMATES, list);
  triggerAutoBackup();
  return item;
}

export async function clearMonthlyEstimateTempOverride(id) {
  const list = await getMonthlyEstimates();
  const item = list.find((e) => e.id === id);
  if (!item) return null;

  item.tempOverride = null;
  await writeData(KEYS.MONTHLY_ESTIMATES, list);
  triggerAutoBackup();
  return item;
}

export async function toggleSkipMonthlyEstimate(id) {
  const list = await getMonthlyEstimates();
  const item = list.find((e) => e.id === id);
  if (!item) return null;

  const targetMonth = getUpcomingMonthKey();
  if (item.skippedForMonth === targetMonth) {
    item.skippedForMonth = null;
  } else {
    item.skippedForMonth = targetMonth;
  }

  await writeData(KEYS.MONTHLY_ESTIMATES, list);
  triggerAutoBackup();
  return item;
}

export async function deleteMonthlyEstimate(id) {
  let list = await getMonthlyEstimates();
  list = list.filter((e) => e.id !== id);
  await writeData(KEYS.MONTHLY_ESTIMATES, list);
  triggerAutoBackup();
}

export async function getEstimatedBalances() {
  const currentBalances = await getBalances();
  const estimates = await getMonthlyEstimates();
  const targetMonth = getUpcomingMonthKey();

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

  const projectedUSD = currentBalances.usd + netUSD;
  const projectedLBP = currentBalances.lbp + netLBP;

  return {
    currentBalances,
    projectedBalances: { usd: projectedUSD, lbp: projectedLBP },
    upcomingMonthKey: targetMonth,
    totals: {
      incomeUSD,
      expenseUSD,
      netUSD,
      incomeLBP,
      expenseLBP,
      netLBP,
    },
  };
}

export async function exportData() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: await getTransactions(),
    openingBalances: await getOpeningBalances(),
    balances: await getBalances(),
    monthlyEstimates: await getMonthlyEstimates(),
  };
}

export async function importData(json) {
  if (!json || !Array.isArray(json.transactions)) {
    throw new Error("Invalid backup file.");
  }
  // Full replace: wipe then restore
  await writeData(KEYS.TRANSACTIONS, json.transactions);
  await writeData(
    KEYS.OPENING_BALANCES,
    json.openingBalances || { usd: 0, lbp: 0 },
  );
  if (Array.isArray(json.monthlyEstimates)) {
    await writeData(KEYS.MONTHLY_ESTIMATES, json.monthlyEstimates);
  }
  // Recalculate from scratch to ensure balances are consistent
  await recalculateBalances();
  triggerAutoBackup();
}

export async function getTelegramConfig() {
  return await readData(KEYS.TELEGRAM_CONFIG, {
    enabled: false,
    botToken: "",
    chatId: "",
  });
}

export async function setTelegramConfig(config) {
  await writeData(KEYS.TELEGRAM_CONFIG, config);
}
