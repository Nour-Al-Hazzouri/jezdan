import { getTransactions, deleteTransaction } from "../data/storage.js";
import { renderDashboard } from "./dashboard.js";

function formatMoney(amount, currency) {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  } else {
    return new Intl.NumberFormat("en-US").format(Math.round(amount)) + " LBP";
  }
}

function formatTxDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Group transactions by "YYYY-MM" key, newest month first
function groupByMonth(txs) {
  const groups = {};
  for (const tx of txs) {
    const d = new Date(tx.timestamp);
    // Zero-pad month: "2026-06"
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  }
  // Sort keys newest first
  return Object.keys(groups)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((key) => ({ key, txs: groups[key] }));
}

function monthLabel(key) {
  // key = "2026-06"
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function initHistoryUI() {
  const dialog = document.getElementById("history-dialog");
  const btnOpen = document.getElementById("btn-open-history");
  const btnClose = document.getElementById("btn-close-history");
  const listContainer = document.getElementById("full-history-list");

  if (!dialog || !btnOpen || !btnClose || !listContainer) return;

  function renderHistory() {
    const txs = getTransactions();

    if (txs.length === 0) {
      listContainer.innerHTML =
        '<li class="empty-state">No transactions yet</li>';
      btnOpen.style.display = "none";
      return;
    }

    btnOpen.style.display = "block";
    listContainer.innerHTML = "";

    const groups = groupByMonth(txs);

    for (const group of groups) {
      // ── Month totals ──
      let incomeUSD = 0,
        incomeLBP = 0,
        outcomeUSD = 0,
        outcomeLBP = 0;

      for (const tx of group.txs) {
        if (tx.netUSD > 0) incomeUSD += tx.netUSD;
        else outcomeUSD += tx.netUSD;
        if (tx.netLBP > 0) incomeLBP += tx.netLBP;
        else outcomeLBP += tx.netLBP;
      }

      // ── Month header ──
      const header = document.createElement("li");
      header.className = "tx-month-header";

      const titleEl = document.createElement("span");
      titleEl.className = "tx-month-title";
      titleEl.textContent = monthLabel(group.key);

      const totalsEl = document.createElement("div");
      totalsEl.className = "tx-month-totals";

      // Build totals string compactly
      const incomeParts = [];
      const outcomeParts = [];
      if (incomeUSD !== 0) incomeParts.push(formatMoney(incomeUSD, "USD"));
      if (incomeLBP !== 0) incomeParts.push(formatMoney(incomeLBP, "LBP"));
      if (outcomeUSD !== 0) outcomeParts.push(formatMoney(outcomeUSD, "USD"));
      if (outcomeLBP !== 0) outcomeParts.push(formatMoney(outcomeLBP, "LBP"));

      totalsEl.innerHTML =
        `<span class="tx-positive">▲ ${incomeParts.length ? incomeParts.join(" / ") : "—"}</span>` +
        `<span class="tx-negative">▼ ${outcomeParts.length ? outcomeParts.join(" / ") : "—"}</span>`;

      header.appendChild(titleEl);
      header.appendChild(totalsEl);
      listContainer.appendChild(header);

      // ── Transactions (newest first within month) ──
      const sorted = [...group.txs].sort((a, b) => b.timestamp - a.timestamp);

      for (const tx of sorted) {
        const li = document.createElement("li");
        li.className = "tx-item";

        const headerDiv = document.createElement("div");
        headerDiv.className = "tx-item-header";

        const infoDiv = document.createElement("div");
        infoDiv.className = "tx-info";

        const noteSpan = document.createElement("span");
        noteSpan.className = "tx-note";
        noteSpan.textContent = tx.note || "Transaction";

        const dateSpan = document.createElement("span");
        dateSpan.className = "tx-date";
        dateSpan.textContent = formatTxDate(tx.timestamp);

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

        headerDiv.appendChild(infoDiv);
        headerDiv.appendChild(amountsDiv);
        li.appendChild(headerDiv);

        // Actions
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "tx-actions";

        const btnEdit = document.createElement("button");
        btnEdit.type = "button";
        btnEdit.className = "btn-small btn-secondary";
        btnEdit.textContent = "Edit";
        btnEdit.addEventListener("click", () => {
          dialog.close();
          if (window.openEditTransaction) {
            window.openEditTransaction(tx);
          }
        });

        const btnDelete = document.createElement("button");
        btnDelete.type = "button";
        btnDelete.className = "btn-small btn-danger";
        btnDelete.textContent = "Delete";
        btnDelete.addEventListener("click", () => {
          if (
            confirm(
              "Are you sure you want to delete this transaction? Balances will be rolled back.",
            )
          ) {
            deleteTransaction(tx.id);
            renderHistory();
            renderDashboard();
          }
        });

        actionsDiv.appendChild(btnEdit);
        actionsDiv.appendChild(btnDelete);
        li.appendChild(actionsDiv);

        listContainer.appendChild(li);
      }
    }
  }

  btnOpen.addEventListener("click", () => {
    renderHistory();
    dialog.showModal();
  });

  btnClose.addEventListener("click", () => {
    dialog.close();
  });

  window.refreshHistoryUI = renderHistory;
}
