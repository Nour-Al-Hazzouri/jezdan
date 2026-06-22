import {
  getOpeningBalances,
  setOpeningBalances,
  exportData,
  importData,
} from "../data/storage.js";
import { renderDashboard } from "./dashboard.js";

export function initSettingsUI() {
  const dialog = document.getElementById("settings-dialog");
  const btnOpen = document.getElementById("btn-open-settings");
  const btnClose = document.getElementById("btn-close-settings");
  const form = document.getElementById("settings-form");

  const inputUsd = document.getElementById("setting-open-usd");
  const inputLbp = document.getElementById("setting-open-lbp");

  const btnExport = document.getElementById("btn-export-data");
  const btnImport = document.getElementById("btn-import-data");
  const fileInput = document.getElementById("import-file-input");

  if (!dialog || !btnOpen || !btnClose || !form) return;

  const formatInput = (val) => {
    let raw = val.toString().replace(/[^\d.]/g, "");
    const dotIndex = raw.indexOf(".");
    if (dotIndex !== -1) {
      raw =
        raw.slice(0, dotIndex + 1) + raw.slice(dotIndex + 1).replace(/\./g, "");
    }
    const parts = raw.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const handleInputFormat = function () {
    const cursorPosition = this.selectionStart;
    const oldLength = this.value.length;

    const formatted = formatInput(this.value);
    this.value = formatted;

    try {
      const newCursor = cursorPosition + (formatted.length - oldLength);
      this.setSelectionRange(newCursor, newCursor);
    } catch (e) {}
  };

  inputUsd.addEventListener("input", handleInputFormat);
  inputLbp.addEventListener("input", handleInputFormat);

  btnOpen.addEventListener("click", () => {
    const opening = getOpeningBalances();
    inputUsd.value = formatInput(opening.usd || 0);
    inputLbp.value = formatInput(opening.lbp || 0);
    dialog.showModal();
  });

  btnClose.addEventListener("click", () => {
    dialog.close();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const usdVal = parseFloat(inputUsd.value.replace(/,/g, "")) || 0;
    const lbpVal = parseFloat(inputLbp.value.replace(/,/g, "")) || 0;
    setOpeningBalances(usdVal, lbpVal);
    dialog.close();
    renderDashboard();
  });

  // ── Export ──
  btnExport.addEventListener("click", () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `jezdan-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // ── Import ──
  btnImport.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        const confirmed = window.confirm(
          `This will replace ALL current data with the backup from ${json.exportedAt || "unknown date"}.\n\nAre you sure?`,
        );
        if (!confirmed) return;
        importData(json);
        dialog.close();
        renderDashboard();
      } catch {
        alert(
          "Failed to read backup file. Make sure it is a valid Jezdan backup.",
        );
      } finally {
        fileInput.value = ""; // reset so the same file can be re-picked
      }
    };
    reader.readAsText(file);
  });
}
