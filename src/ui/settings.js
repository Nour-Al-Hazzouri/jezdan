import { getOpeningBalances, setOpeningBalances } from "../data/storage.js";
import { renderDashboard } from "./dashboard.js";

export function initSettingsUI() {
  const dialog = document.getElementById("settings-dialog");
  const btnOpen = document.getElementById("btn-open-settings");
  const btnClose = document.getElementById("btn-close-settings");
  const form = document.getElementById("settings-form");

  const inputUsd = document.getElementById("setting-open-usd");
  const inputLbp = document.getElementById("setting-open-lbp");

  if (!dialog || !btnOpen || !btnClose || !form) return;

  btnOpen.addEventListener("click", () => {
    const opening = getOpeningBalances();
    inputUsd.value = opening.usd || 0;
    inputLbp.value = opening.lbp || 0;
    dialog.showModal();
  });

  btnClose.addEventListener("click", () => {
    dialog.close();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    setOpeningBalances(inputUsd.value, inputLbp.value);

    dialog.close();
    renderDashboard();
  });
}
