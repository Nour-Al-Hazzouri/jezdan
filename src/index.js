import "./ui/styles.css";
import * as storage from "./data/storage.js";
import * as calculation from "./data/calculation.js";
import { initAddTransactionUI } from "./ui/addTransaction.js";
import { renderDashboard } from "./ui/dashboard.js";
import { initHistoryUI } from "./ui/history.js";
import { initSettingsUI } from "./ui/settings.js";

// Expose data layer for console testing and verification
// ponytail: Attached to window to avoid dead code tree-shaking and enable manual verification in browser devtools.
window.Jezdan = { storage, calculation };

// Initialize UI
initAddTransactionUI();
initHistoryUI();
initSettingsUI();
renderDashboard();

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
