import { exportData } from "./storage.js";

const TG_API = "https://api.telegram.org/bot";

/**
 * Send a test message to verify bot token + chat ID.
 * @returns {Promise<{ok: boolean, description?: string}>}
 */
export async function sendTelegramMessage(token, chatId, text) {
  const res = await fetch(`${TG_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return res.json();
}

/**
 * Send a .json backup file as a Telegram document.
 * @returns {Promise<{ok: boolean, description?: string}>}
 */
export async function sendTelegramDocument(token, chatId, dataObject) {
  const json = JSON.stringify(dataObject, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const dateStr = new Date().toISOString().slice(0, 10);
  const counterKey = `jezdan_backup_counter_${dateStr}`;
  const n = parseInt(localStorage.getItem(counterKey) || "0", 10) + 1;
  localStorage.setItem(counterKey, n);
  const seq = String(n).padStart(3, "0");
  const filename = `jezdan-backup-${dateStr}-${seq}.json`;

  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("document", blob, filename);
  form.append("caption", `Jezdan auto-backup · ${new Date().toLocaleString()}`);

  const res = await fetch(`${TG_API}${token}/sendDocument`, {
    method: "POST",
    body: form,
  });
  return res.json();
}

/**
 * If Telegram auto-backup is enabled, silently send a full backup.
 * Never throws — failures are logged but don't interrupt the app.
 */
export async function triggerAutoBackup() {
  try {
    // ponytail: import lazily to avoid circular dependency at module load time.
    const { getTelegramConfig } = await import("./storage.js");
    const config = await getTelegramConfig();
    if (!config || !config.enabled || !config.botToken || !config.chatId)
      return;
    const data = await exportData();
    const result = await sendTelegramDocument(
      config.botToken,
      config.chatId,
      data,
    );
    if (result && result.ok) {
      localStorage.removeItem("jezdan_pending_backup");
    } else {
      localStorage.setItem("jezdan_pending_backup", "true");
    }
  } catch (e) {
    // Silent fail — user may be offline, that's fine
    console.warn("Telegram auto-backup failed:", e.message);
    localStorage.setItem("jezdan_pending_backup", "true");
  }
}

/**
 * If there is a pending backup from an offline mutation, trigger it now.
 */
export async function processOfflineBackupQueue() {
  if (localStorage.getItem("jezdan_pending_backup") === "true") {
    if (navigator.onLine === false) return;
    console.log("Jezdan: Retrying pending offline backup...");
    await triggerAutoBackup();
  }
}
