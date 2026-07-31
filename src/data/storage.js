import { calculateNetEffect } from "./calculation.js";

const KEYS = {
  TRANSACTIONS: "jezdan_transactions",
  BALANCES: "jezdan_balances",
  OPENING_BALANCES: "jezdan_opening_balances",
  EXCHANGE_RATE: "jezdan_exchange_rate",
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
}

export async function getExchangeRate() {
  return await readData(KEYS.EXCHANGE_RATE, 90000);
}

export async function setExchangeRate(rate) {
  await writeData(KEYS.EXCHANGE_RATE, Number(rate));
}

export async function exportData() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: await getTransactions(),
    openingBalances: await getOpeningBalances(),
    balances: await getBalances(),
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
  // Recalculate from scratch to ensure balances are consistent
  await recalculateBalances();
}
