import {
  getOpeningBalances,
  setOpeningBalances,
  exportData,
  importData,
  getTelegramConfig,
  setTelegramConfig,
} from "../data/storage.js";
import { sendTelegramMessage } from "../data/telegram.js";
import { renderDashboard } from "./dashboard.js";

// ── Custom themed confirm dialog (replaces window.confirm) ──
export function showConfirmDialog(title, message) {
  return new Promise((resolve) => {
    const dialog = document.getElementById("confirm-dialog");
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-message").textContent = message;

    const btnCancel = document.getElementById("confirm-cancel");
    const btnProceed = document.getElementById("confirm-proceed");

    function cleanup(result) {
      btnCancel.removeEventListener("click", onCancel);
      btnProceed.removeEventListener("click", onProceed);
      dialog.close();
      resolve(result);
    }
    function onCancel() {
      cleanup(false);
    }
    function onProceed() {
      cleanup(true);
    }

    btnCancel.addEventListener("click", onCancel);
    btnProceed.addEventListener("click", onProceed);
    dialog.showModal();
  });
}

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

  // Telegram elements
  const tgEnabled = document.getElementById("tg-enabled");
  const tgFields = document.getElementById("tg-fields");
  const tgBotToken = document.getElementById("tg-bot-token");
  const tgChatId = document.getElementById("tg-chat-id");
  const btnTgTest = document.getElementById("btn-tg-test");
  const tgStatus = document.getElementById("tg-test-status");
  const btnTgHelp = document.getElementById("btn-tg-help");
  const guideDialog = document.getElementById("telegram-guide-dialog");
  const btnCloseGuide = document.getElementById("btn-close-tg-guide");

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

  // ── Toggle Telegram fields visibility ──
  tgEnabled.addEventListener("change", () => {
    tgFields.style.display = tgEnabled.checked ? "block" : "none";
  });

  // ── Password show/hide toggles ──
  document.querySelectorAll(".btn-toggle-vis").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.textContent = isPassword ? "🔒" : "👁️";
    });
  });

  // ── Telegram Help Guide ──
  btnTgHelp.addEventListener("click", () => {
    guideDialog.showModal();
  });
  btnCloseGuide.addEventListener("click", () => {
    guideDialog.close();
  });

  // ── Test Connection ──
  btnTgTest.addEventListener("click", async () => {
    const token = tgBotToken.value.trim();
    const chatId = tgChatId.value.trim();
    if (!token || !chatId) {
      tgStatus.textContent = "⚠ Please enter both Bot Token and Chat ID.";
      tgStatus.className = "tg-status tg-error";
      tgStatus.style.display = "block";
      return;
    }
    tgStatus.textContent = "⏳ Testing...";
    tgStatus.className = "tg-status";
    tgStatus.style.display = "block";

    try {
      const result = await sendTelegramMessage(
        token,
        chatId,
        "✅ Jezdan is connected! Auto-backups are now active.",
      );
      if (result.ok) {
        tgStatus.textContent = "✅ Success! Check your Telegram.";
        tgStatus.className = "tg-status tg-success";
      } else {
        tgStatus.textContent = `❌ Failed: ${result.description || "Unknown error"}`;
        tgStatus.className = "tg-status tg-error";
      }
    } catch (e) {
      tgStatus.textContent = `❌ Network error: ${e.message}`;
      tgStatus.className = "tg-status tg-error";
    }
  });

  // ── Open Settings ──
  btnOpen.addEventListener("click", async () => {
    const opening = await getOpeningBalances();
    inputUsd.value = formatInput(opening.usd || 0);
    inputLbp.value = formatInput(opening.lbp || 0);

    // Load Telegram config
    const tgConfig = await getTelegramConfig();
    tgEnabled.checked = tgConfig.enabled || false;
    tgBotToken.value = tgConfig.botToken || "";
    tgChatId.value = tgConfig.chatId || "";
    tgFields.style.display = tgConfig.enabled ? "block" : "none";
    tgStatus.style.display = "none";

    dialog.showModal();
  });

  btnClose.addEventListener("click", () => {
    dialog.close();
  });

  // ── Save Settings (opening balances + Telegram config) ──
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const usdVal = parseFloat(inputUsd.value.replace(/,/g, "")) || 0;
    const lbpVal = parseFloat(inputLbp.value.replace(/,/g, "")) || 0;
    await setOpeningBalances(usdVal, lbpVal);

    await setTelegramConfig({
      enabled: tgEnabled.checked,
      botToken: tgBotToken.value.trim(),
      chatId: tgChatId.value.trim(),
    });

    dialog.close();
    await renderDashboard();
  });

  // ── Export ──
  btnExport.addEventListener("click", async () => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    // Shared counter with Telegram backups so both use the same YYYY-MM-DD-NNN sequence
    const counterKey = `jezdan_backup_counter_${dateStr}`;
    const n = parseInt(localStorage.getItem(counterKey) || "0", 10) + 1;
    localStorage.setItem(counterKey, n);
    const seq = String(n).padStart(3, "0");
    a.href = url;
    a.download = `jezdan-backup-${dateStr}-${seq}.json`;
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
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        const confirmed = await showConfirmDialog(
          "Restore Backup",
          `This will replace ALL current data with the backup from ${json.exportedAt || "unknown date"}. Are you sure?`,
        );
        if (!confirmed) return;
        await importData(json);
        dialog.close();
        await renderDashboard();
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
