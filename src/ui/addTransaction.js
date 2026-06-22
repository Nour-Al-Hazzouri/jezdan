import { addTransaction, updateTransaction } from "../data/storage.js";
import { renderDashboard } from "./dashboard.js";

export function initAddTransactionUI() {
  const dialog = document.getElementById("add-tx-dialog");
  const btnOpen = document.getElementById("btn-open-add-tx");
  const btnCancel = document.getElementById("btn-cancel-tx");
  const form = document.getElementById("add-tx-form");

  const paidRowsContainer = document.getElementById("paid-rows");
  const receivedRowsContainer = document.getElementById("received-rows");

  const btnAddPaid = document.getElementById("btn-add-paid-row");
  const btnAddReceived = document.getElementById("btn-add-received-row");

  let editingTx = null;

  // Load last used currency
  const getLastCurrency = () =>
    localStorage.getItem("jezdan_last_currency") || "USD";
  const setLastCurrency = (c) =>
    localStorage.setItem("jezdan_last_currency", c);

  function toggleCurrency(btn) {
    const current = btn.dataset.currency;
    const next = current === "USD" ? "LBP" : "USD";
    btn.dataset.currency = next;
    btn.textContent = next;
    setLastCurrency(next);
  }

  function createRow(defaultCurrency, isRequired = false, defaultAmount = "") {
    const row = document.createElement("div");
    row.className = "amount-row";

    const currentCurrency = defaultCurrency || getLastCurrency();

    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.className = "amount-input";
    input.placeholder = "0.00";
    if (isRequired) input.required = true;

    const formatInput = (val) => {
      let raw = val.toString().replace(/[^\d.]/g, "");
      const dotIndex = raw.indexOf(".");
      if (dotIndex !== -1) {
        raw =
          raw.slice(0, dotIndex + 1) +
          raw.slice(dotIndex + 1).replace(/\./g, "");
      }
      const parts = raw.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return parts.join(".");
    };

    if (defaultAmount !== "") {
      input.value = formatInput(defaultAmount);
    }

    input.addEventListener("input", function () {
      const cursorPosition = this.selectionStart;
      const oldLength = this.value.length;

      const formatted = formatInput(this.value);
      this.value = formatted;

      try {
        const newCursor = cursorPosition + (formatted.length - oldLength);
        this.setSelectionRange(newCursor, newCursor);
      } catch (e) {
        // some browsers throw error on setSelectionRange
      }
    });

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "currency-toggle";
    btn.dataset.currency = currentCurrency;
    btn.textContent = currentCurrency;

    btn.addEventListener("click", () => toggleCurrency(btn));

    row.appendChild(input);
    row.appendChild(btn);
    return row;
  }

  function updateToggles(container) {
    const rows = container.children;
    if (rows.length === 2) {
      const firstBtn = rows[0].querySelector(".currency-toggle");
      const secondBtn = rows[1].querySelector(".currency-toggle");

      const expectedSecond =
        firstBtn.dataset.currency === "USD" ? "LBP" : "USD";

      if (secondBtn.dataset.currency !== expectedSecond) {
        secondBtn.dataset.currency = expectedSecond;
        secondBtn.textContent = expectedSecond;
      }

      firstBtn.disabled = true;
      secondBtn.disabled = true;
      firstBtn.style.opacity = "0.7";
      secondBtn.style.opacity = "0.7";
    } else if (rows.length === 1) {
      const firstBtn = rows[0].querySelector(".currency-toggle");
      firstBtn.disabled = false;
      firstBtn.style.opacity = "1";
    }
  }

  function resetForm() {
    form.reset();
    paidRowsContainer.innerHTML = "";
    receivedRowsContainer.innerHTML = "";

    // Default 1 paid row (required)
    paidRowsContainer.appendChild(createRow(null, true));
    updateToggles(paidRowsContainer);
    updateToggles(receivedRowsContainer);

    btnAddPaid.style.display = "inline-block";
    btnAddReceived.style.display = "inline-block";
  }

  btnOpen.addEventListener("click", () => {
    editingTx = null;
    resetForm();
    dialog.showModal();
    // Focus the first input for fast interaction
    setTimeout(() => {
      const firstInput = paidRowsContainer.querySelector("input");
      if (firstInput) firstInput.focus();
    }, 10);
  });

  btnCancel.addEventListener("click", () => {
    dialog.close();
  });

  btnAddPaid.addEventListener("click", () => {
    if (paidRowsContainer.children.length < 2) {
      const firstCurrency =
        paidRowsContainer.children[0].querySelector(".currency-toggle").dataset
          .currency;
      paidRowsContainer.appendChild(
        createRow(firstCurrency === "USD" ? "LBP" : "USD"),
      );
      updateToggles(paidRowsContainer);
      btnAddPaid.style.display = "none"; // Max 2 rows
    }
  });

  btnAddReceived.addEventListener("click", () => {
    if (receivedRowsContainer.children.length < 2) {
      const firstCurrency =
        receivedRowsContainer.children.length === 1
          ? receivedRowsContainer.children[0].querySelector(".currency-toggle")
              .dataset.currency
          : null;
      receivedRowsContainer.appendChild(
        createRow(
          firstCurrency ? (firstCurrency === "USD" ? "LBP" : "USD") : null,
        ),
      );
      updateToggles(receivedRowsContainer);
      if (receivedRowsContainer.children.length === 2) {
        btnAddReceived.style.display = "none"; // Max 2 rows
      }
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const getRowData = (container) => {
      const rows = [];
      for (const row of container.children) {
        const amountVal = row.querySelector(".amount-input").value;
        const currency = row.querySelector(".currency-toggle").dataset.currency;
        if (amountVal) {
          let amount = parseFloat(amountVal.replace(/,/g, ""));
          if (isNaN(amount)) continue;
          rows.push({ amount, currency });
        }
      }
      return rows;
    };

    const paid = getRowData(paidRowsContainer);
    const receivedChange = getRowData(receivedRowsContainer);
    const note = document.getElementById("tx-note").value.trim();

    if (paid.length === 0) {
      return; // Form validation should catch this, but just in case
    }

    if (editingTx) {
      updateTransaction(editingTx.id, {
        ...editingTx,
        paid,
        receivedChange,
        note,
      });
    } else {
      addTransaction({
        paid,
        receivedChange,
        note,
        timestamp: Date.now(),
      });
    }

    dialog.close();
    renderDashboard();
  });

  // Expose edit function to the window or as a callback
  window.openEditTransaction = (tx) => {
    editingTx = tx;
    form.reset();
    paidRowsContainer.innerHTML = "";
    receivedRowsContainer.innerHTML = "";

    if (tx.paid && tx.paid.length > 0) {
      tx.paid.forEach((p) =>
        paidRowsContainer.appendChild(createRow(p.currency, true, p.amount)),
      );
    } else {
      paidRowsContainer.appendChild(createRow(null, true));
    }
    updateToggles(paidRowsContainer);
    btnAddPaid.style.display =
      paidRowsContainer.children.length < 2 ? "inline-block" : "none";

    if (tx.receivedChange && tx.receivedChange.length > 0) {
      tx.receivedChange.forEach((r) =>
        receivedRowsContainer.appendChild(
          createRow(r.currency, false, r.amount),
        ),
      );
    }
    updateToggles(receivedRowsContainer);
    btnAddReceived.style.display =
      receivedRowsContainer.children.length < 2 ? "inline-block" : "none";

    document.getElementById("tx-note").value = tx.note || "";

    dialog.showModal();
  };
}
