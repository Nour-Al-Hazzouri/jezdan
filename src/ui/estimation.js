import {
  getEstimatedBalances,
  getMonthlyEstimates,
  addMonthlyEstimate,
  updateMonthlyEstimate,
  deleteMonthlyEstimate,
  toggleSkipMonthlyEstimate,
  setMonthlyEstimateTempOverride,
  clearMonthlyEstimateTempOverride,
  getUpcomingMonthKey,
} from "../data/storage.js";

function formatMoney(amount, currency) {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US").format(Math.round(amount)) + " LBP";
}

function formatTargetMonthName(monthKey) {
  const [yyyy, mm] = monthKey.split("-");
  const date = new Date(Number(yyyy), Number(mm) - 1, 1);
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function formatInputCommas(val) {
  let raw = val.toString().replace(/[^\d.]/g, "");
  const dotIndex = raw.indexOf(".");
  if (dotIndex !== -1) {
    raw =
      raw.slice(0, dotIndex + 1) + raw.slice(dotIndex + 1).replace(/\./g, "");
  }
  const parts = raw.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function getItemAmountsList(item) {
  if (Array.isArray(item.amounts) && item.amounts.length > 0) {
    return item.amounts;
  }
  if (item.amount !== undefined && item.currency) {
    return [{ amount: Number(item.amount) || 0, currency: item.currency }];
  }
  return [];
}

export function initEstimationUI() {
  const dialog = document.getElementById("estimate-dialog");
  const btnOpen = document.getElementById("btn-open-estimate");
  const btnClose = document.getElementById("btn-close-estimate");
  const form = document.getElementById("estimate-form");

  const formTitle = document.getElementById("estimate-form-title");
  const btnCancelEdit = document.getElementById("btn-cancel-edit-est");
  const inputEditId = document.getElementById("estimate-edit-id");
  const inputEditMode = document.getElementById("estimate-edit-mode");
  const inputNote = document.getElementById("estimate-note");
  const amountsContainer = document.getElementById("estimate-amounts-rows");
  const btnAddCurrRow = document.getElementById("btn-add-est-curr-row");
  const btnSubmit = document.getElementById("btn-save-estimate-item");
  const typeToggles = form.querySelectorAll(".btn-type-toggle");

  const listContainer = document.getElementById("estimate-items-list");

  let currentType = "expense";

  function setType(type) {
    currentType = type;
    typeToggles.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.type === type);
    });
  }

  typeToggles.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (inputEditMode.value === "temp") return;
      setType(btn.dataset.type);
    });
  });

  function toggleRowCurrency(btn) {
    const current = btn.dataset.currency;
    const next = current === "USD" ? "LBP" : "USD";
    btn.dataset.currency = next;
    btn.textContent = next;
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

  function createAmountRow(
    defaultCurrency = "USD",
    isRequired = false,
    defaultAmount = "",
  ) {
    const row = document.createElement("div");
    row.className = "amount-row";

    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.className = "amount-input";
    input.placeholder = "0.00";
    if (isRequired) input.required = true;

    if (defaultAmount !== "") {
      input.value = formatInputCommas(defaultAmount);
    }

    input.addEventListener("input", function () {
      const cursorPosition = this.selectionStart;
      const oldLength = this.value.length;
      const formatted = formatInputCommas(this.value);
      this.value = formatted;
      try {
        const newCursor = cursorPosition + (formatted.length - oldLength);
        this.setSelectionRange(newCursor, newCursor);
      } catch (e) {}
    });

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "currency-toggle";
    btn.dataset.currency = defaultCurrency;
    btn.textContent = defaultCurrency;

    btn.addEventListener("click", () => {
      if (inputEditMode.value === "temp") return;
      toggleRowCurrency(btn);
    });

    row.appendChild(input);
    row.appendChild(btn);
    return row;
  }

  function resetForm() {
    form.reset();
    inputEditId.value = "";
    inputEditMode.value = "permanent";
    setType("expense");
    inputNote.disabled = false;
    typeToggles.forEach((b) => (b.disabled = false));
    formTitle.textContent = "Add Expected Monthly Item";
    btnSubmit.textContent = "+ Add Monthly Item";
    btnCancelEdit.style.display = "none";

    amountsContainer.innerHTML = "";
    amountsContainer.appendChild(createAmountRow("USD", true));
    updateToggles(amountsContainer);
    btnAddCurrRow.style.display = "inline-block";
  }

  btnAddCurrRow.addEventListener("click", () => {
    if (amountsContainer.children.length < 2) {
      const firstCurr =
        amountsContainer.children[0].querySelector(".currency-toggle").dataset
          .currency;
      const secondCurr = firstCurr === "USD" ? "LBP" : "USD";
      amountsContainer.appendChild(createAmountRow(secondCurr, false));
      updateToggles(amountsContainer);
      btnAddCurrRow.style.display = "none";
    }
  });

  btnCancelEdit.addEventListener("click", () => {
    resetForm();
  });

  btnOpen.addEventListener("click", async () => {
    resetForm();
    await renderEstimationDialog();
    dialog.showModal();
  });

  btnClose.addEventListener("click", () => {
    dialog.close();
  });

  function getFormAmounts() {
    const results = [];
    for (const row of amountsContainer.children) {
      const input = row.querySelector(".amount-input");
      const btn = row.querySelector(".currency-toggle");
      if (input && input.value) {
        const val = parseFloat(input.value.replace(/,/g, ""));
        if (!isNaN(val) && val > 0) {
          results.push({
            amount: val,
            currency: btn.dataset.currency || "USD",
          });
        }
      }
    }
    return results;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const note = inputNote.value.trim();
    const amounts = getFormAmounts();
    if (amounts.length === 0) return;

    const editId = inputEditId.value;
    const editMode = inputEditMode.value;

    if (!editId) {
      // Create new permanent item
      await addMonthlyEstimate({
        type: currentType,
        note,
        amounts,
      });
    } else if (editMode === "temp") {
      // Month-scoped override
      await setMonthlyEstimateTempOverride(editId, amounts);
    } else {
      // Permanent update
      await updateMonthlyEstimate(editId, {
        type: currentType,
        note,
        amounts,
      });
    }

    resetForm();
    await renderEstimationDialog();
  });

  // Event delegation on list actions
  listContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.dataset.id;
    if (!id) return;

    const action = btn.dataset.action;

    if (action === "skip") {
      await toggleSkipMonthlyEstimate(id);
      await renderEstimationDialog();
    } else if (action === "revert-temp") {
      await clearMonthlyEstimateTempOverride(id);
      await renderEstimationDialog();
    } else if (action === "temp-edit") {
      const estimates = await getMonthlyEstimates();
      const item = estimates.find((i) => i.id === id);
      if (!item) return;

      const targetMonth = getUpcomingMonthKey();
      let activeAmounts = [];
      if (item.tempOverride && item.tempOverride.month === targetMonth) {
        activeAmounts = item.tempOverride.amounts || [
          {
            amount: item.tempOverride.amount,
            currency: item.amounts?.[0]?.currency || item.currency || "USD",
          },
        ];
      } else {
        activeAmounts = getItemAmountsList(item);
      }

      inputEditId.value = item.id;
      inputEditMode.value = "temp";
      inputNote.value = item.note;
      inputNote.disabled = true;
      setType(item.type);
      typeToggles.forEach((b) => (b.disabled = true));

      amountsContainer.innerHTML = "";
      activeAmounts.forEach((a, idx) => {
        amountsContainer.appendChild(
          createAmountRow(a.currency, idx === 0, a.amount),
        );
      });
      updateToggles(amountsContainer);
      btnAddCurrRow.style.display =
        amountsContainer.children.length < 2 ? "inline-block" : "none";

      formTitle.textContent = `⚡ Next Month Temp Edit (${formatTargetMonthName(targetMonth)})`;
      btnSubmit.textContent = "Save Temp Override";
      btnCancelEdit.style.display = "inline-block";

      const firstInput = amountsContainer.querySelector("input");
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    } else if (action === "edit") {
      const estimates = await getMonthlyEstimates();
      const item = estimates.find((i) => i.id === id);
      if (!item) return;

      const baseAmounts = getItemAmountsList(item);

      inputEditId.value = item.id;
      inputEditMode.value = "permanent";
      inputNote.value = item.note;
      inputNote.disabled = false;
      setType(item.type);
      typeToggles.forEach((b) => (b.disabled = false));

      amountsContainer.innerHTML = "";
      if (baseAmounts.length > 0) {
        baseAmounts.forEach((a, idx) => {
          amountsContainer.appendChild(
            createAmountRow(a.currency, idx === 0, a.amount),
          );
        });
      } else {
        amountsContainer.appendChild(createAmountRow("USD", true));
      }
      updateToggles(amountsContainer);
      btnAddCurrRow.style.display =
        amountsContainer.children.length < 2 ? "inline-block" : "none";

      formTitle.textContent = "Edit Permanent Monthly Item";
      btnSubmit.textContent = "Update Permanent Item";
      btnCancelEdit.style.display = "inline-block";

      inputNote.focus();
    } else if (action === "delete") {
      await deleteMonthlyEstimate(id);
      await renderEstimationDialog();
    }
  });
}

export async function renderEstimationDialog() {
  const data = await getEstimatedBalances();
  const estimates = await getMonthlyEstimates();

  const elTargetMonth = document.getElementById("estimate-target-month");
  const elProjUSD = document.getElementById("est-projected-usd");
  const elProjLBP = document.getElementById("est-projected-lbp");
  const elDetailUSD = document.getElementById("est-detail-usd");
  const elDetailLBP = document.getElementById("est-detail-lbp");
  const elCount = document.getElementById("estimate-items-count");
  const listContainer = document.getElementById("estimate-items-list");

  if (!elTargetMonth || !listContainer) return;

  const targetMonthName = formatTargetMonthName(data.upcomingMonthKey);
  elTargetMonth.textContent = `PROJECTION FOR ${targetMonthName.toUpperCase()}`;

  // Projected USD
  elProjUSD.textContent = formatMoney(data.projectedBalances.usd, "USD");
  const netUSDStr =
    data.totals.netUSD >= 0
      ? `+${formatMoney(data.totals.netUSD, "USD")}`
      : `-${formatMoney(Math.abs(data.totals.netUSD), "USD")}`;
  elDetailUSD.textContent = `Live ${formatMoney(data.currentBalances.usd, "USD")} | Net ${netUSDStr}`;

  // Projected LBP
  elProjLBP.textContent = formatMoney(data.projectedBalances.lbp, "LBP");
  const netLBPStr =
    data.totals.netLBP >= 0
      ? `+${formatMoney(data.totals.netLBP, "LBP")}`
      : `-${formatMoney(Math.abs(data.totals.netLBP), "LBP")}`;
  elDetailLBP.textContent = `Live ${formatMoney(data.currentBalances.lbp, "LBP")} | Net ${netLBPStr}`;

  // Items count
  elCount.textContent = `${estimates.length} ${estimates.length === 1 ? "item" : "items"}`;

  // List Rendering
  listContainer.innerHTML = "";
  if (estimates.length === 0) {
    listContainer.innerHTML = `<li class="empty-state">No monthly recurring items added yet.<br>Add expected bills or income above to estimate next month.</li>`;
    return;
  }

  estimates.forEach((item) => {
    const isSkipped = item.skippedForMonth === data.upcomingMonthKey;
    const hasTempOverride =
      item.tempOverride && item.tempOverride.month === data.upcomingMonthKey;

    let activeAmounts = [];
    if (hasTempOverride) {
      activeAmounts = item.tempOverride.amounts || [
        {
          amount: item.tempOverride.amount,
          currency: item.amounts?.[0]?.currency || item.currency || "USD",
        },
      ];
    } else {
      activeAmounts = getItemAmountsList(item);
    }

    const baseAmounts = getItemAmountsList(item);

    const li = document.createElement("li");
    li.className = `tx-item estimate-item ${isSkipped ? "item-skipped" : ""} ${hasTempOverride ? "item-temp-override" : ""}`;

    const amountPrefix = item.type === "income" ? "+" : "-";
    const amountClass = item.type === "income" ? "tx-positive" : "tx-negative";

    let badgeHtml = "";
    if (isSkipped) {
      badgeHtml = `<span class="est-badge est-badge-skipped">🚫 Skipped for ${targetMonthName}</span>`;
    } else if (hasTempOverride) {
      const baseStr = baseAmounts
        .map((a) => formatMoney(a.amount, a.currency))
        .join(" + ");
      badgeHtml = `<span class="est-badge est-badge-temp">⚡ Temp for ${targetMonthName} (Base: ${baseStr})</span>`;
    }

    const amountsHtml = activeAmounts
      .map((a) => {
        const cls = a.currency === "USD" ? "tx-net-usd" : "tx-net-lbp";
        return `<span class="${cls} ${amountClass}">${amountPrefix}${formatMoney(a.amount, a.currency)}</span>`;
      })
      .join("");

    li.innerHTML = `
      <div class="tx-item-header">
        <div class="tx-info">
          <div class="est-title-row">
            <span class="tx-note">${escapeHtml(item.note)}</span>
            <span class="est-type-tag ${item.type}">${item.type.toUpperCase()}</span>
          </div>
          ${badgeHtml}
        </div>
        <div class="tx-amounts">
          ${amountsHtml}
        </div>
      </div>
      <div class="tx-actions est-actions">
        <button type="button" class="btn-secondary btn-small" data-action="skip" data-id="${item.id}">
          ${isSkipped ? "↩ Unskip" : "⏭ Skip"}
        </button>
        ${
          hasTempOverride
            ? `<button type="button" class="btn-secondary btn-small" data-action="revert-temp" data-id="${item.id}">
                Undo Temp
              </button>`
            : `<button type="button" class="btn-secondary btn-small" data-action="temp-edit" data-id="${item.id}">
                ⚡ Temp Edit
              </button>`
        }
        <button type="button" class="btn-secondary btn-small" data-action="edit" data-id="${item.id}">
          ✏️ Edit
        </button>
        <button type="button" class="btn-danger btn-small" data-action="delete" data-id="${item.id}">
          🗑 Delete
        </button>
      </div>
    `;

    listContainer.appendChild(li);
  });
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
