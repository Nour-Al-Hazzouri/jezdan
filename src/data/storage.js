import { calculateNetEffect } from "./calculation.js";

const KEYS = {
  TRANSACTIONS: "jezdan_transactions",
  BALANCES: "jezdan_balances",
  OPENING_BALANCES: "jezdan_opening_balances",
  EXCHANGE_RATE: "jezdan_exchange_rate",
};

// ponytail: Basic localStorage wrappers. If size exceeds limits, upgrade to IndexedDB.
const readData = (key, defaultVal) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultVal;
  } catch (e) {
    console.error(`Error reading ${key}:`, e);
    return defaultVal;
  }
};

const writeData = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(`Error writing ${key}:`, e);
  }
};

const generateId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15);

function recalculateBalances() {
  const opening = readData(KEYS.OPENING_BALANCES, { usd: 0, lbp: 0 });
  const txs = getTransactions();

  let currentUSD = opening.usd;
  let currentLBP = opening.lbp;

  for (const tx of txs) {
    currentUSD += tx.netUSD || 0;
    currentLBP += tx.netLBP || 0;
  }

  writeData(KEYS.BALANCES, { usd: currentUSD, lbp: currentLBP });
}

export function getBalances() {
  return readData(KEYS.BALANCES, { usd: 0, lbp: 0 });
}

export function setOpeningBalances(usd, lbp) {
  writeData(KEYS.OPENING_BALANCES, {
    usd: Number(usd) || 0,
    lbp: Number(lbp) || 0,
  });
  recalculateBalances();
}

export function getTransactions() {
  return readData(KEYS.TRANSACTIONS, []);
}

export function addTransaction(tx) {
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

  const txs = getTransactions();
  txs.push(newTx);
  writeData(KEYS.TRANSACTIONS, txs);

  // Update balances incrementally to avoid O(n) recalculation on every add
  const balances = getBalances();
  balances.usd += newTx.netUSD;
  balances.lbp += newTx.netLBP;
  writeData(KEYS.BALANCES, balances);

  return newTx;
}

export function updateTransaction(id, updatedTx) {
  let txs = getTransactions();
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
  writeData(KEYS.TRANSACTIONS, txs);

  // Update balances by the difference
  const diffUSD = newTx.netUSD - oldTx.netUSD;
  const diffLBP = newTx.netLBP - oldTx.netLBP;

  const balances = getBalances();
  balances.usd += diffUSD;
  balances.lbp += diffLBP;
  writeData(KEYS.BALANCES, balances);

  return newTx;
}

export function deleteTransaction(id) {
  let txs = getTransactions();
  const txToDelete = txs.find((t) => t.id === id);
  if (!txToDelete) return;

  txs = txs.filter((t) => t.id !== id);
  writeData(KEYS.TRANSACTIONS, txs);

  // Update balances incrementally (roll back)
  const balances = getBalances();
  balances.usd -= txToDelete.netUSD;
  balances.lbp -= txToDelete.netLBP;
  writeData(KEYS.BALANCES, balances);
}

export function getExchangeRate() {
  return readData(KEYS.EXCHANGE_RATE, 90000);
}

export function setExchangeRate(rate) {
  writeData(KEYS.EXCHANGE_RATE, Number(rate));
}
