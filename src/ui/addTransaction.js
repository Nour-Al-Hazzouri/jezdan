import { addTransaction, getBalances } from "../data/storage.js";

export function initAddTransactionUI() {
  const dialog = document.getElementById("add-tx-dialog");
  const btnOpen = document.getElementById("btn-open-add-tx");
  const btnCancel = document.getElementById("btn-cancel-tx");
  const form = document.getElementById("add-tx-form");

  const paidRowsContainer = document.getElementById("paid-rows");
  const receivedRowsContainer = document.getElementById("received-rows");

  const btnAddPaid = document.getElementById("btn-add-paid-row");
  const btnAddReceived = document.getElementById("btn-add-received-row");

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

  function createRow(defaultCurrency, isRequired = false) {
    const row = document.createElement("div");
    row.className = "amount-row";

    const input = document.createElement("input");
    input.type = "number";
    input.inputMode = "decimal";
    input.className = "amount-input";
    input.placeholder = "0.00";
    input.step = "any";
    input.min = "0";
    if (isRequired) input.required = true;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "currency-toggle";
    btn.dataset.currency = defaultCurrency || getLastCurrency();
    btn.textContent = btn.dataset.currency;

    btn.addEventListener("click", () => toggleCurrency(btn));

    row.appendChild(input);
    row.appendChild(btn);
    return row;
  }

  function resetForm() {
    form.reset();
    paidRowsContainer.innerHTML = "";
    receivedRowsContainer.innerHTML = "";

    // Default 1 paid row (required)
    paidRowsContainer.appendChild(createRow(null, true));

    btnAddPaid.style.display = "inline-block";
    btnAddReceived.style.display = "inline-block";
  }

  btnOpen.addEventListener("click", () => {
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
      btnAddPaid.style.display = "none"; // Max 2 rows
    }
  });

  btnAddReceived.addEventListener("click", () => {
    if (receivedRowsContainer.children.length < 2) {
      receivedRowsContainer.appendChild(createRow());
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
          rows.push({ amount: parseFloat(amountVal), currency });
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

    addTransaction({
      paid,
      receivedChange,
      note,
      timestamp: Date.now(),
    });

    dialog.close();
    // ponytail: Verification hook until Dashboard (Task 4) is built
    console.log("Transaction Added! Current Balances:", getBalances());
  });
}
