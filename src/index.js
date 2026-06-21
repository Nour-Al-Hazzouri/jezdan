import "./ui/styles.css";
import * as storage from "./data/storage.js";
import * as calculation from "./data/calculation.js";

// Expose data layer for console testing and verification
// ponytail: Attached to window to avoid dead code tree-shaking and enable manual verification in browser devtools.
window.Jezdan = { storage, calculation };

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
