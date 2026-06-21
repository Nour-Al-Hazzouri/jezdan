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
