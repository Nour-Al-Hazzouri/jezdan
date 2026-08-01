# Changes

## [Feature] Telegram Auto-Backup + Custom Confirm Dialog

- **Date**: 2026-08-01
- **Technical Summary**: Added optional Telegram Bot API integration for automatic cloud backups on every data mutation, plus replaced the native `window.confirm()` for backup restore and transaction deletion with a custom themed `<dialog>`.

### Technical Log

- **New**: `src/data/telegram.js` — Telegram API helper module with `sendTelegramMessage` (for connection testing), `sendTelegramDocument` (uploads `.json` backup via `FormData`), and `triggerAutoBackup` (fire-and-forget wrapper that silently fails offline).
- **Modified**: `src/data/storage.js` — Added `TELEGRAM_CONFIG` storage key, `getTelegramConfig()` / `setTelegramConfig()` exports. Inserted `triggerAutoBackup()` calls inside `addTransaction`, `updateTransaction`, `deleteTransaction`, `setOpeningBalances`, and `importData`.
- **Modified**: `src/index.html` — Added Telegram Auto-Backup settings section (enable checkbox, password inputs with show/hide, test connection button, `?` help button), a `<dialog id="telegram-guide-dialog">` with A-to-Z setup instructions, and a `<dialog id="confirm-dialog">` for themed restore/delete confirmation.
- **Modified**: `src/ui/settings.js` — Wired Telegram toggle, password visibility buttons, test connection handler, guide modal, save/load of Telegram config. Replaced `window.confirm()` with exported `showConfirmDialog()` using the custom themed dialog.
- **Modified**: `src/ui/history.js` — Imported `showConfirmDialog` from `settings.js` to replace native `confirm()` in the delete transaction flow.
- **Modified**: `src/ui/styles.css` — Added styles for `.btn-help`, `.toggle-row`, `.password-row`, `.btn-toggle-vis`, `.tg-status`, `.guide-step`, `.step-number`, `.step-body`, and `#confirm-dialog`.
- **Modified**: `PRD.md` — Updated Settings scope to include optional Telegram Auto-Backup.
- **Modified**: `jezdan-task-breakdown.md` — Added Task 9 (Telegram Auto-Backup) and marked complete.
- **Polish**: Moved "Save Changes" button to the bottom of the Settings dialog. Unified manual backup filename format with Telegram backups: both use `jezdan-backup-YYYY-MM-DD-NNN.json` from a shared per-day counter.
- **Fix**: Added `-webkit-tap-highlight-color: transparent` to the global `*` reset to eliminate the blue mobile tap-highlight glitch on all buttons.
- **Fix**: Removed logic that hid the "View Transaction History" button when the transaction list was empty — the button now always stays visible.
- **Why**: IndexedDB data can still be wiped by a manual "Clear Site Data." Telegram Bot API provides free, permanent, zero-server cloud storage that users control entirely with their own bot credentials. The custom confirm dialog replaces the jarring browser-native `window.confirm()` which doesn't match the app's dark theme.

### Plain English Summary

You can now optionally connect Jezdan to a Telegram bot for automatic cloud backups. Every time you add, edit, or delete a transaction, the app silently sends an updated backup file to your private Telegram chat. If your browser data is ever wiped, you can download the latest `.json` file from Telegram and restore it. A step-by-step setup guide (with links to @BotFather and @userinfobot) is built right into the app. The restore and delete confirmation popups now match the app's dark teal/gold theme instead of using the browser's default dialog. Tapping buttons no longer shows an ugly blue highlight on mobile.

---

## [Storage] Migrate from localStorage to IndexedDB

- **Date**: 2026-08-01
- **Technical Summary**: Migrated the entire data persistence layer from `localStorage` to `IndexedDB` to bypass the 5MB storage limit and allow virtually unlimited transaction history.

### Technical Log

- **Modified**: `src/data/storage.js` — Replaced synchronous `localStorage.getItem`/`setItem` with an asynchronous IndexedDB wrapper. The wrapper automatically migrates existing `localStorage` data into IndexedDB on the first read. All exported functions were made `async`. No external dependencies were added.
- **Modified**: `src/ui/dashboard.js`, `src/ui/history.js`, `src/ui/settings.js`, `src/ui/addTransaction.js` — Updated all UI components that read from or write to the data layer to correctly `await` the new asynchronous IndexedDB calls.
- **Why**: `localStorage` has a strict ~5MB quota limit. If a user accumulates years of daily transactions, the app would hit this limit and crash when saving new entries. `IndexedDB` shares the browser's global disk quota (typically 60% of free device space), effectively making storage infinite for a text-based ledger.

### Plain English Summary

The app's underlying storage engine has been significantly upgraded. Previously, Jezdan used a storage system that had a strict 5MB size limit (enough for a few years, but potentially risky). It now uses the browser's modern IndexedDB system, which allows it to use available space on your device, meaning you can record millions of transactions without ever running out of room. Existing data is migrated automatically behind the scenes.

---

## [Storage] Persistent Storage Request + Numbered Backup Filenames

- **Date**: 2026-07-31
- **Technical Summary**: Added `navigator.storage.persist()` on app load and changed backup export filenames from `YYYY-MM-DD` to `YYYY-MM-DD-NNN` sequential numbering.

### Technical Log

- **Modified**: `src/index.js` — Added `navigator.storage.persist()` call after service worker registration. If granted (expected silently on an installed PWA in Brave/Chrome), the browser will not automatically evict app data under storage pressure. Does not protect against manual "Clear site data."
- **Modified**: `src/ui/settings.js` — Backup export filenames now follow `jezdan-backup-YYYY-MM-DD-NNN.json` format (e.g. `jezdan-backup-2026-07-31-003.json`). A per-day counter is stored in `localStorage` under `jezdan_backup_counter_YYYY-MM-DD` and increments on each export. Counter resets naturally when the date changes.
- **Why**: `persist()` adds a zero-cost layer of protection against OS/browser-driven auto-eviction. Numbered backup filenames let you distinguish multiple exports made on the same day and know at a glance which is the latest.

### Plain English Summary

The app now asks the browser to mark its storage as "important" so it won't be automatically deleted when your phone is low on space. Backup files you download now include a sequential number at the end of the filename (e.g. `-001`, `-002`) so you can manage multiple backups from the same day without confusion.

---

## [Feature] Amount Input Auto-Comma Formatting

- **Date**: 2026-06-22
- **Technical Summary**: Added auto-comma formatting for all amount inputs.

### Technical Log

- **Modified**: `src/ui/addTransaction.js` — Changed `.amount-input` to `type="text"` to allow custom formatting. Implemented a `formatInput` function listening on the `input` event to automatically inject commas for thousands, while preserving decimal points and cursor position. `getRowData` strips commas before parsing.
- **Modified**: `src/index.html` — Changed `setting-open-usd` and `setting-open-lbp` to `type="text"` and `inputmode="decimal"`.
- **Modified**: `src/ui/settings.js` — Added the same comma formatting logic (`formatInput`) for the opening balance fields.
- **Why**: Typing large numbers like 1000000 is error-prone; auto-commas vastly improve readability.

---

## [UI] Transaction Currency Constraints

- **Date**: 2026-06-21
- **Technical Summary**: Enforced opposite currencies and disabled toggling when multiple inputs are added to Paid or Received sections.

### Technical Log

- **Modified**: `src/ui/addTransaction.js` — Added `updateToggles()` logic. When adding a second currency row in either the Paid or Received sections, the second currency is strictly set to the opposite of the first (e.g. if row 1 is USD, row 2 is LBP). Furthermore, the currency toggle buttons on both rows are disabled, preventing meaningless combinations like paying 2 separate amounts in USD.
- **Why**: Prevent user error and simplify the UI logic. Splitting a payment into two rows of the same currency offers no functional benefit, so the UI now correctly restricts the second row to only handle the cross-currency component.

### Plain English Summary

When adding a transaction, if you add a second input row for what you paid or what you received back, the app now automatically ensures that one input is for USD and the other is for LBP. It also locks the currency buttons so you can't accidentally select USD for both inputs or LBP for both inputs.

---

## [PWA Updates] Service Worker Stale-While-Revalidate

- **Date**: 2026-06-21
- **Technical Summary**: Replaced Cache-First strategy with Stale-While-Revalidate and added skipWaiting/clients.claim for automatic PWA updates.

### Technical Log

- **Modified**: `src/sw.js` — Updated `CACHE_NAME` to `jezdan-cache-v2`. Added `self.skipWaiting()` to the `install` event to activate immediately. Added `activate` event listener with `self.clients.claim()` and cache deletion logic. Changed the `fetch` event listener to use a stale-while-revalidate pattern instead of a strict cache-first fallback.
- **Why**: Previously, updates to app files wouldn't load until the user manually cleared the cache because the service worker remained on Cache-First. With Stale-While-Revalidate, the cache provides instant offline loading, but silently fetches updates in the background. The next time the user visits, they get the updated app without losing their data or having to manually clear cache.

### Plain English Summary

The app now updates automatically in the background. When you open Jezdan while online, it instantly loads the app from its cache (so it's fast and works offline), but it secretly checks the server for updates behind the scenes. If it finds new updates, it downloads them silently so they are ready for the next time you use the app. You no longer need to manually clear your cache to get new features, and your transaction data remains perfectly safe.

---

## [Backup & Import] Data Backup / Restore + Label Fix

- **Date**: 2026-06-21
- **Technical Summary**: Added full JSON export/import for data backup, and fixed currency label alignment in the Settings dialog.

### Technical Log

- **Modified**: `src/ui/styles.css` — Added `display: flex; align-items: center; justify-content: center;` to `.currency-toggle` so static label spans center correctly inside `.amount-row`.
- **Modified**: `src/data/storage.js` — Added `exportData()` (returns full snapshot: transactions, opening balances, balances, timestamp) and `importData(json)` (validates structure, does a full replace, then calls `recalculateBalances()` to ensure consistency).
- **Modified**: `src/ui/settings.js` — Wired `btn-export-data` to trigger a dated `.json` file download via `Blob` + `URL.createObjectURL`. Wired `btn-import-data` to trigger a hidden `<input type="file">`, reads the file via `FileReader`, shows a themed confirmation dialog before overwriting, then calls `importData()` and refreshes the dashboard.
- **Modified**: `src/index.html` — Added "Backup Data" button, "Restore from Backup" button, and a hidden file input inside the Settings dialog under a new "Data Backup" section.
- **Why**: `IndexedDB` data is lost if the user clears browser storage. A manual JSON backup/restore ensures data survives across browser resets with no server dependency.

### Plain English Summary

The Settings screen now has a "Data Backup" section with two buttons. "Backup Data" downloads your entire transaction history and opening balances as a `.json` file to your device. "Restore from Backup" lets you pick a previously downloaded `.json` file — after a themed confirmation prompt, it completely replaces all current app data with the contents of the backup.

---

## [Task 7] Polish Pass

- **Date**: 2026-06-21
- **Technical Summary**: Final UX and visual pass: improved balance legibility, added micro-animations, focus rings, contrast fixes, and removed dead CSS.

### Technical Log

- **Modified**: `src/ui/styles.css` — Full rewrite of the CSS file:
  - Wallet balance numbers increased to `2.2rem` / `font-weight: 700` for legibility.
  - Added `--transition` and `--radius` CSS variables for consistency.
  - Added `:focus` gold outline + box-shadow on all inputs (accessibility).
  - Added `transition` + `hover` states on all buttons (FAB, primary, secondary, icon, close, danger).
  - FAB now has an amber glow `box-shadow` and scales up on hover.
  - Removed dead `.dashboard-cleanup` comment and unused `.estimate-row` / `.recent-transactions` rules.
  - Tightened dialog backdrop to `0.85` opacity and `blur(3px)` for better depth.
  - Improved `tx-item` contrast by switching background to `--primary-color` with a faint border.
- **Why**: Task 7 final pass — the goal is a premium feel where every touchpoint has a micro-response and balances are immediately readable at arm's length on a phone screen.

### Plain English Summary

The entire look and feel of the app has been polished. Your USD and LBP wallet numbers are now much larger and bolder — easy to read at a glance. Every button now has a subtle hover animation and the "+" FAB glows amber when you hover over it. All text inputs now highlight gold when you tap them (a focus ring), making it clear which field you are typing in. Leftover CSS was cleaned up, reducing file size.

---

## [Task 6] Settings Screen & Dashboard Refactor

- **Date**: 2026-06-21
- **Technical Summary**: Built the Settings screen to manage opening balances and refactored the dashboard to remove exchange rate dependencies and inline history lists per user feedback.

### Technical Log

- **Modified**: `src/index.html` — Removed the "Estimated Total" row and the inline "Recent Transactions" list from the dashboard. Added a gear icon to the header and a new Settings `<dialog>`.
- **Modified**: `src/ui/dashboard.js` — Removed logic for rendering the estimated total and recent transactions inline.
- **Modified**: `src/data/storage.js` — Added `getOpeningBalances()` helper to read current opening balances.
- **New**: `src/ui/settings.js` — Implemented logic to read/write opening balances to the data layer.
- **Modified**: `src/ui/styles.css` — Added styling for the header gear icon and removed obsolete estimate row styles.
- **Modified**: `src/index.js` — Initialized the Settings UI on load.
- **Why**: Implements Task 6 (Settings) while aggressively pruning features deemed unnecessary by the user (Exchange Rate) and cleaning up the dashboard layout so History remains strictly within its dedicated dialog.

### Plain English Summary

The Dashboard no longer displays an "Estimated Total" or an inline list of recent transactions. Instead, it purely shows your live USD and LBP wallets, with a prominent button to open the full Transaction History dialog. A gear icon in the top right opens a Settings dialog where you can manually adjust your Opening Balances for both USD and LBP.

---

## [Task 5] Transaction History Screen

- **Date**: 2026-06-21
- **Technical Summary**: Implemented the full transaction history screen with full support for deleting and editing past transactions, ensuring accurate balance rollbacks and updates.

### Technical Log

- **Modified**: `src/data/storage.js` — Added `updateTransaction(id, updatedTx)` to correctly calculate the net difference between an old and new transaction and apply that diff to the live balances.
- **Modified**: `src/index.html` — Added a new `<dialog>` for the History view and a "View All History" trigger button on the dashboard.
- **Modified**: `src/ui/styles.css` — Added styling for the full-screen history modal and the action buttons (Edit/Delete).
- **Modified**: `src/ui/addTransaction.js` — Refactored to expose `openEditTransaction()`, which pre-fills the form with existing data, and modified the submit handler to call `updateTransaction()` if an edit is active.
- **New**: `src/ui/history.js` — Created the rendering logic for the full scrollable history list and wired up the Edit and Delete button event handlers.
- **Modified**: `src/index.js` — Initialized the history UI on application load.
- **Why**: Fulfills Task 5 and the user's specific request to implement full Edit functionality, ensuring mistakes can be corrected without losing transaction chronological order, while maintaining mathematical correctness in the balances.

### Plain English Summary

The Transaction History screen now shows a full scrollable list of all transactions. Each entry has Edit and Delete buttons. Deleting correctly rolls back balances. Editing pre-fills the form with the existing transaction data and updates balances by the net difference.

---

## [Task 4] Dashboard / Home Screen

- **Date**: 2026-06-21
- **Technical Summary**: Implemented the main dashboard UI, integrating it with the storage layer to display real-time balances and a list of recent transactions.

### Technical Log

- **Modified**: `src/index.html` — Replaced the placeholder `<main>` content with the dashboard structure (wallet cards, recent transactions list).
- **Modified**: `src/ui/styles.css` — Added styling for the dashboard layout, wallet cards, and transaction list items.
- **New**: `src/ui/dashboard.js` — Created the logic to fetch data from `storage.js` and render the dashboard elements, including formatting currency and dates.
- **Modified**: `src/ui/addTransaction.js` — Updated the form submission to call `renderDashboard()` to provide immediate visual feedback upon saving a transaction.
- **Modified**: `src/index.js` — Initialized the dashboard on application load.
- **Why**: Fulfills Task 4, providing the user with an immediate overview of their finances.

### Plain English Summary

When you open the app, you immediately see your current balances for both USD and LBP in large, clear numbers. When you add a new transaction, the dashboard updates instantly without needing to reload the page.

---

## [Task 3] Add Transaction Screen

- **Date**: 2026-06-21
- **Technical Summary**: Implemented the Add Transaction modal UI, wiring it to the local storage data layer and updating the main layout to include it natively.

### Technical Log

- **Modified**: `src/index.html` — Added `<dialog>` containing the add transaction form with dynamic row support for multiple currencies.
- **Modified**: `src/ui/styles.css` — Styled the dialog, backdrop, and form inputs to match the deep teal and gold dark theme.
- **New**: `src/ui/addTransaction.js` — Handled form submission, dynamic DOM row creation/removal, and integrating with `storage.js`.
- **Modified**: `src/index.js` — Linked and initialized the `addTransaction.js` module.
- **Why**: Provides the core UX requested in Task 3. Used the native `<dialog>` element to avoid heavy modal abstractions, keeping it lightweight per the lazy dev philosophy.

### Plain English Summary

The "Add Transaction" screen is accessible via a floating "+" button. When you tap it, a popup appears allowing you to enter amounts you've paid and optional amounts you've received back as change. It fully supports mixing USD and LBP in a single transaction.

---

## [Task 2] Data Layer

- **Date**: 2026-06-21
- **Technical Summary**: Implementation of local storage wrappers and pure currency calculation logic based on SOLID principles.

### Technical Log

- **New**: `src/data/calculation.js` — Implemented `calculateNetEffect` function to dynamically compute net transaction effects independent of specific currencies.
- **New**: `src/data/storage.js` — Added `localStorage` wrapper to handle transactions, opening balances, current balances, and exchange rate.
- **Why**: Separate business logic (currency calculation) from persistence logic (storage), adhering to the Single Responsibility Principle.

### Plain English Summary

The core mathematical and storage engine for the app is implemented. The logic for determining how much a wallet goes up or down after a transaction correctly handles cases where you pay in one currency and receive change in another.

---

## [Task 1] Scaffold PWA Shell

- **Date**: 2026-06-21
- **Technical Summary**: Setup of the foundational PWA shell including service worker, manifest, and base ES modules.

### Technical Log

- **Modified**: `src/index.html` — Replaced placeholder with semantic tags, linked to manifest and theme color.
- **Modified**: `src/index.js` — Updated to import the correct stylesheet and added a block to register the service worker.
- **New**: `src/ui/styles.css` — Implemented the requested deep teal and gold color theme using CSS variables.
- **New**: `src/manifest.json` — Scaffolded the PWA configuration (name, theme color, icons placeholder).
- **New**: `src/sw.js` — Added a standard service worker that caches `index.html`, `main.js`, and the `manifest.json`.
- **Deleted**: `src/styles.css` — Moved to `src/ui/styles.css` to respect directory structure.
- **Why**: Provides the offline-capable skeleton (PWA shell) required before implementing the core transaction logic.

### Plain English Summary

The foundational skeleton for the Jezdan app is built. It now has the necessary setup to be "installable" on a phone and can work without an internet connection. The basic screen uses the requested dark green and gold color scheme.

---

## [Deployment] Automate GitHub Pages Deployment

- **Date**: 2026-06-21
- **Technical Summary**: Created automated GitHub Actions pipeline to deploy the build outputs (dist folder) to the gh-pages branch.

### Technical Log

- **New**: `.github/workflows/deploy.yml` — Set up automated deploy workflow on pushes to main.
- **Modified**: `package.json` — Added `deploy` command.
- **Why**: Since the build output directory `dist` is gitignored, standard git subtrees don't work cleanly. This setup automates production builds and forces the output directory into the `gh-pages` branch.

### Plain English Summary

The deployment to GitHub Pages is now automated. It will build and update the site automatically whenever you push to the main branch.
