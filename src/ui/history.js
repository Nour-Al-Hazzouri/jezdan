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

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initHistoryUI() {
  const dialog = document.getElementById("history-dialog");
  const btnOpen = document.getElementById("btn-open-history");
  const btnClose = document.getElementById("btn-close-history");
  const listContainer = document.getElementById("full-history-list");

  if (!dialog || !btnOpen || !btnClose || !listContainer) return;

  function renderHistory() {
    const txs = getTransactions();
    const sortedTxs = [...txs].sort((a, b) => b.timestamp - a.timestamp);

    if (sortedTxs.length === 0) {
      listContainer.innerHTML =
        '<li class="empty-state">No transactions yet</li>';
      btnOpen.style.display = "none";
      return;
    }

    // Show the button on the dashboard if there are transactions
    btnOpen.style.display = "block";

    listContainer.innerHTML = "";

    for (const tx of sortedTxs) {
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

  btnOpen.addEventListener("click", () => {
    renderHistory();
    dialog.showModal();
  });

  btnClose.addEventListener("click", () => {
    dialog.close();
  });

  // Attach to window so Dashboard rendering can trigger the button visibility check
  window.refreshHistoryUI = renderHistory;
}
