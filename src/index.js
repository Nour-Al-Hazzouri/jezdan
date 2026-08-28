import "./ui/styles.css";
import * as storage from "./data/storage.js";
import * as calculation from "./data/calculation.js";
import { initAddTransactionUI } from "./ui/addTransaction.js";
import { renderDashboard } from "./ui/dashboard.js";
import { initHistoryUI } from "./ui/history.js";
import { initSettingsUI } from "./ui/settings.js";
import { initEstimationUI } from "./ui/estimation.js";

import { processOfflineBackupQueue } from "./data/telegram.js";

// Expose data layer for console testing and verification
// ponytail: Attached to window to avoid dead code tree-shaking and enable manual verification in browser devtools.
window.Jezdan = { storage, calculation };

// Initialize UI
initAddTransactionUI();
initHistoryUI();
initSettingsUI();
initEstimationUI();
renderDashboard();

// Process any pending backups from offline usage
processOfflineBackupQueue();
window.addEventListener("online", processOfflineBackupQueue);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then((registration) => {
        console.log(
          "Service Worker registered with scope:",
          registration.scope,
        );
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}

// Request persistent storage so the browser won't auto-evict app data under
// storage pressure. Granted silently on installed PWAs in Brave/Chrome.
// ponytail: does NOT protect against manual "Clear site data" — only auto-eviction.
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then((granted) => {
    console.log(`Persistent storage granted: ${granted}`);
  });
}
