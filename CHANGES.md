# Changes

## [Task 1] Scaffold PWA Shell

- **Date**: 2026-06-21
- **Technical Summary**: Setup of the foundational PWA shell including service worker, manifest, and base ES modules.

### Technical Log

- **Modified**: `src/index.html` - Replaced placeholder with semantic tags, linked to manifest and theme color.
- **Modified**: `src/index.js` - Updated to import the correct stylesheet and added a block to register the service worker.
- **New**: `src/ui/styles.css` - Implemented the requested deep teal and gold color theme using CSS variables.
- **New**: `src/manifest.json` - Scaffolded the PWA configuration (name, theme color, icons placeholder).
- **New**: `src/sw.js` - Added a standard service worker that caches `index.html`, `main.js`, and the `manifest.json`.
- **Deleted**: `src/styles.css` - Moved to `src/ui/styles.css` to respect directory structure.
- **Why**: These changes provide the offline-capable skeleton (PWA shell) required before implementing the core transaction logic, respecting the `src/data/`, `src/ui/`, `src/utils/` structure.

### Plain English Summary

I have built the foundational skeleton for the Jezdan app. It now has the necessary setup to be "installable" on a phone (via a manifest file) and can theoretically work without an internet connection (via a service worker). The basic screen now uses the requested dark green and gold color scheme.

## [Deployment] Automate GitHub Pages Deployment

- **Date**: 2026-06-21
- **Technical Summary**: Created automated GitHub Actions pipeline and a local shell script to deploy the build outputs (dist folder) to the gh-pages branch.

### Technical Log

- **New**: `.github/workflows/deploy.yml` - Set up automated deploy workflow on pushes to main.
- **Modified**: `package.json` - Added `deploy` command to trigger the local deployment script.
- **Why**: Since the build output directory `dist` is gitignored, standard git subtrees don't work cleanly. This setup automates production builds and forces the output directory into the `gh-pages` branch.

### Plain English Summary

I have set up the deployment of your app to GitHub Pages. It will now build and update the site automatically whenever you push to GitHub.

## [Task 2] Data Layer

- **Date**: 2026-06-21
- **Technical Summary**: Implementation of local storage wrappers and pure currency calculation logic based on SOLID principles.

### Technical Log

- **New**: `src/data/calculation.js` - Implemented `calculateNetEffect` function to dynamically compute net transaction effects independent of specific currencies.
- **New**: `src/data/storage.js` - Added `localStorage` wrapper to handle transactions, opening balances, current balances, and exchange rate. Exposes specific storage APIs like `addTransaction()`, `getBalances()`, without revealing internal `localStorage` interactions.
- **Why**: To separate business logic (currency calculation) from persistence logic (storage), adhering to the Single Responsibility Principle. Treating currency as a dynamic parameter adheres to the Open/Closed Principle.

### Plain English Summary

I have built the core mathematical and storage engine for the app. The logic for determining how much a wallet goes up or down after a transaction is now implemented, correctly handling cases where you pay in one currency and receive change in another. I also added the underlying structure that will securely save your transactions and balances to your phone's local storage so nothing is lost when the app closes. No visual changes were made, as this is purely backend logic running on your device.

## [Deployment] Enable dev branch deployment and bundle data modules

- **Date**: 2026-06-21
- **Technical Summary**: Verified dev branch CI triggers and updated entry point index.js to prevent data modules from being tree-shaken out of the production bundle.

### Technical Log

- **Modified**: `src/index.js` - Imported `calculation.js` and `storage.js` and exposed them to `window.Jezdan` for console verification.
- **Why**: In Webpack, unimported files are tree-shaken and omitted from the build. Since the newly added data modules weren't referenced anywhere, the compiled outputs remained identical, preventing GitHub Actions from pushing deployment updates to `gh-pages`. Exposing them to `window` embeds them in the bundle and allows console-based testing.

### Plain English Summary

I resolved the issue where pushing to the development branch (`dev`) did not update your website. Because the new files we added in the previous task weren't linked anywhere, the build system omitted them, making the final output identical to what was already online. By linking the new code into the main application file (and making them testable from the browser console), the build output changed, prompting the automated deployment to update the site.

## [Task 3] Add Transaction screen

- **Date**: 2026-06-21
- **Technical Summary**: Implemented the Add Transaction modal UI, wiring it to the local storage data layer and updating the main layout to include it natively.

### Technical Log

- **Modified**: `src/index.html` - Added `<dialog>` containing the add transaction form with dynamic row support for multiple currencies.
- **Modified**: `src/ui/styles.css` - Styled the dialog, backdrop, and form inputs to match the deep teal and gold dark theme.
- **New**: `src/ui/addTransaction.js` - Handled form submission, dynamic DOM row creation/removal, and integrating with `storage.js`.
- **Modified**: `src/index.js` - Linked and initialized the `addTransaction.js` module.
- **Why**: Providing the core UX requested in Task 3. We used the native `<dialog>` element to avoid heavy modal abstractions, keeping it lightweight per the lazy dev philosophy (`ponytail.md`).

### Plain English Summary

I have built the "Add Transaction" screen. It is currently accessible via a floating "+" button. When you tap it, a popup appears allowing you to enter amounts you've paid and optional amounts you've received back as change. It fully supports mixing USD and LBP in a single transaction. When you hit Save, it securely saves to the storage engine we built in the previous step.

## [Task 4] Dashboard / Home Screen

- **Date**: 2026-06-21
- **Technical Summary**: Implemented the main dashboard UI, integrating it with the storage layer to display real-time balances, an estimated combined total, and a list of recent transactions.

### Technical Log

- **Modified**: `src/index.html` - Replaced the placeholder `<main>` content with the dashboard structure (wallet cards, estimate row, recent transactions list).
- **Modified**: `src/ui/styles.css` - Added styling for the dashboard layout, wallet cards, and transaction list items. Adjusted the `body` layout to support scrolling.
- **New**: `src/ui/dashboard.js` - Created the logic to fetch data from `storage.js` and render the dashboard elements, including formatting currency and dates.
- **Modified**: `src/ui/addTransaction.js` - Updated the form submission to call `renderDashboard()` to provide immediate visual feedback upon saving a transaction.
- **Modified**: `src/index.js` - Initialized the dashboard on application load.
- **Why**: This fulfills Task 4, providing the user with an immediate overview of their finances. The approach emphasizes separation of concerns by placing the rendering logic in its own module (`dashboard.js`).

### Plain English Summary

I have built the main Dashboard for the Jezdan app. Now, when you open the app, you will immediately see your current balances for both USD and LBP in large, clear numbers. Below that, it shows an estimated total combining both currencies into a single USD amount. Finally, it displays a list of your 10 most recent transactions, showing the date, any notes you added, and the exact amounts paid or received. When you add a new transaction, the dashboard updates instantly without needing to reload the page.

## [Task 5] Transaction History Screen

- **Date**: 2026-06-21
- **Technical Summary**: Implemented the full transaction history screen with full support for deleting and editing past transactions, ensuring accurate balance rollbacks and updates.

### Technical Log

- **Modified**: `src/data/storage.js` - Added `updateTransaction(id, updatedTx)` to correctly calculate the net difference between an old and new transaction and apply that diff to the live balances.
- **Modified**: `src/index.html` - Added a new `<dialog>` for the History view and a "View All History" trigger button on the dashboard.
- **Modified**: `src/ui/styles.css` - Added styling for the full-screen history modal and the action buttons (Edit/Delete).
- **Modified**: `src/ui/addTransaction.js` - Refactored to expose `openEditTransaction()`, which pre-fills the form with existing data, and modified the submit handler to call `updateTransaction()` if an edit is active.
- **New**: `src/ui/history.js` - Created the rendering logic for the full scrollable history list and wired up the Edit and Delete button event handlers.
- **Modified**: `src/index.js` - Initialized the history UI on application load.
- **Why**: Fulfills Task 5 and the user's specific request to implement full Edit functionality, ensuring mistakes can be corrected without losing transaction chronological order, while maintaining mathematical correctness in the balances.

### Plain English Summary

I have implemented the Settings screen and cleaned up the Dashboard. The Dashboard no longer displays an "Estimated Total" or an inline list of recent transactions. Instead, it purely shows your live USD and LBP wallets, with a prominent button to open the full Transaction History dialog. I also added a gear icon to the top right of the screen; tapping it opens a Settings dialog where you can manually adjust your Opening Balances for both USD and LBP. Any changes made there instantly update your live dashboard without wiping any of your past transactions.

## [Task 7] Polish Pass

- **Date**: 2026-06-21
- **Technical Summary**: Final UX and visual pass: improved balance legibility, added micro-animations, focus rings, contrast fixes, and removed dead CSS.

### Technical Log

- **Modified**: `src/ui/styles.css` - Full rewrite of the CSS file:
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

I've polished the entire look and feel of the app for the final task. Your USD and LBP wallet numbers are now much larger and bolder — easy to read at a glance. Every button now has a subtle hover animation and the "+" FAB glows amber when you hover over it. All text inputs now highlight gold when you tap them (a focus ring), making it clear which field you are typing in. I also cleaned up leftover CSS that was no longer used, reducing file size.

## [Task 6] Settings Screen & Dashboard Refactor

- **Date**: 2026-06-21
- **Technical Summary**: Built the Settings screen to manage opening balances and refactored the dashboard to remove exchange rate dependencies and inline history lists per user feedback.

### Technical Log

- **Modified**: `src/index.html` - Removed the "Estimated Total" row and the inline "Recent Transactions" list from the dashboard. Added a gear icon to the header and a new Settings `<dialog>`.
- **Modified**: `src/ui/dashboard.js` - Removed logic for rendering the estimated total and recent transactions inline.
- **Modified**: `src/data/storage.js` - Added `getOpeningBalances()` helper to read current opening balances.
- **New**: `src/ui/settings.js` - Implemented logic to read/write opening balances to the data layer.
- **Modified**: `src/ui/styles.css` - Added styling for the header gear icon and removed obsolete estimate row styles.
- **Modified**: `src/index.js` - Initialized the Settings UI on load.
- **Why**: Implements Task 6 (Settings) while aggressively pruning features deemed unnecessary by the user (Exchange Rate) and cleaning up the dashboard layout so History remains strictly within its dedicated dialog.

### Plain English Summary

I have implemented the Settings screen and cleaned up the Dashboard. The Dashboard no longer displays an "Estimated Total" or an inline list of recent transactions. Instead, it purely shows your live USD and LBP wallets, with a prominent button to open the full Transaction History dialog. I also added a gear icon to the top right of the screen; tapping it opens a Settings dialog where you can manually adjust your Opening Balances for both USD and LBP. Any changes made there instantly update your live dashboard without wiping any of your past transactions.
