import {
  getBalances,
  getTransactions,
  getExchangeRate,
} from "../data/storage.js";

function formatMoney(amount, currency) {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  } else {
    // For LBP, usually no decimals
    return new Intl.NumberFormat("en-US").format(Math.round(amount)) + " LBP";
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function renderDashboard() {
  const balances = getBalances();
  const txs = getTransactions();
  const exchangeRate = getExchangeRate();

  // Render Balances
  const elUsdBalance = document.getElementById("usd-balance");
  const elLbpBalance = document.getElementById("lbp-balance");
  const elEstimated = document.getElementById("estimated-total");
  const elRecentTxList = document.getElementById("recent-tx-list");

  if (!elUsdBalance || !elLbpBalance || !elEstimated || !elRecentTxList) return;

  elUsdBalance.textContent = formatMoney(balances.usd, "USD");
  elLbpBalance.textContent = formatMoney(balances.lbp, "LBP").replace(
    " LBP",
    "",
  ); // We have the label above it

  // Estimated Total in USD
  const totalInUsd = balances.usd + balances.lbp / exchangeRate;
  elEstimated.textContent = formatMoney(totalInUsd, "USD");

  // Render Recent Transactions (Last 10)
  const recentTxs = [...txs].reverse().slice(0, 10);

  if (recentTxs.length === 0) {
    elRecentTxList.innerHTML =
      '<li class="empty-state">No transactions yet</li>';
  } else {
    elRecentTxList.innerHTML = "";
    for (const tx of recentTxs) {
      const li = document.createElement("li");
      li.className = "tx-item";

      const infoDiv = document.createElement("div");
      infoDiv.className = "tx-info";

      const noteSpan = document.createElement("span");
      noteSpan.className = "tx-note";
      noteSpan.textContent = tx.note || "Transaction";

      const dateSpan = document.createElement("span");
      dateSpan.className = "tx-date";
      dateSpan.textContent = formatDate(tx.timestamp);

      infoDiv.appendChild(noteSpan);
      infoDiv.appendChild(dateSpan);

      const amountsDiv = document.createElement("div");
      amountsDiv.className = "tx-amounts";

      if (tx.netUSD !== 0) {
        const usdSpan = document.createElement("span");
        usdSpan.className = "tx-net-usd";
        usdSpan.textContent =
          (tx.netUSD > 0 ? "+" : "") + formatMoney(tx.netUSD, "USD");
        if (tx.netUSD > 0) usdSpan.classList.add("tx-positive");
        if (tx.netUSD < 0) usdSpan.classList.add("tx-negative");
        amountsDiv.appendChild(usdSpan);
      }

      if (tx.netLBP !== 0) {
        const lbpSpan = document.createElement("span");
        lbpSpan.className = "tx-net-lbp";
        lbpSpan.textContent =
          (tx.netLBP > 0 ? "+" : "") + formatMoney(tx.netLBP, "LBP");
        if (tx.netLBP > 0) lbpSpan.classList.add("tx-positive");
        if (tx.netLBP < 0) lbpSpan.classList.add("tx-negative");
        amountsDiv.appendChild(lbpSpan);
      }

      const headerDiv = document.createElement("div");
      headerDiv.className = "tx-item-header";
      headerDiv.appendChild(infoDiv);
      headerDiv.appendChild(amountsDiv);

      li.appendChild(headerDiv);
      elRecentTxList.appendChild(li);
    }
  }

  const btnOpenHistory = document.getElementById("btn-open-history");
  if (btnOpenHistory) {
    btnOpenHistory.style.display = txs.length > 0 ? "block" : "none";
  }
}
