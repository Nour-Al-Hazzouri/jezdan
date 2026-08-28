# PRC: "Jezdan" — Dual-Currency Cash Tracker (PWA)

Use this prompt as-is in an AI IDE (Cursor, Windsurf, Bolt, v0, Replit AI, etc.) to scaffold the MVP.

---

## Prompt to paste

Build a Progressive Web App (PWA) called **"Jezdan"** — a dual-currency personal cash expense tracker designed specifically for people who handle daily transactions in both USD and Lebanese Lira (LBP), where change is often returned in a different currency than the one paid (e.g., pay $20, receive back $10 + 550,000 LBP).

### Core problem it solves

Standard expense trackers (e.g., Cashew) require splitting one real-world purchase into multiple manual entries (amount paid, amount returned, currency conversions) because they only support single-currency-per-transaction logging. Jezdan logs the entire real-world transaction — pay + change-back across one or two currencies — as ONE entry, and automatically updates two running cash balances (a USD wallet and an LBP wallet).

### Tech requirements

- Build as a PWA: installable via "Add to Home Screen," must work **100% offline** after first load (service worker caching all assets).
- All data stored **locally on-device** (IndexedDB) — no backend, no account, no internet dependency required to function.
- Mobile-first responsive design, optimized for a phone screen (target: Android, e.g. screen ~720x1600).
- No external API calls required for core functionality.
- Tech stack suggestion: plain HTML/CSS/JS or a lightweight framework (e.g. Vite + vanilla JS, or Svelte) — keep it lightweight, avoid heavy frameworks that bloat offline caching.
- **Bundler note:** the build/bundler configuration (webpack, including `webpack-merge` for splitting common/dev/prod configs) is set up separately and is outside the scope of what you need to do. Write source code as clean, standard ES modules with conventional import/export structure, organized into clearly separated files/folders (e.g. `src/data/`, `src/ui/`, `src/utils/`) so it slots cleanly into a standard webpack entry/output setup without restructuring later. Do not generate any webpack config files.

### Code architecture — SOLID principles

Apply SOLID principles where they meaningfully fit a small app like this (don't over-engineer a simple PWA with unnecessary abstraction layers, but keep these boundaries clean):

- **Single Responsibility**: keep storage/persistence logic, currency calculation logic, and UI rendering in separate modules/files.
- **Open/Closed**: structure the transaction model so new transaction types or currencies could be added later without rewriting core calculation logic (treat currency as a parameter/value, not a structural assumption).
- **Liskov Substitution**: if a shared interface/shape is used for accounts (e.g. a generic "wallet" object for USD and LBP), both currency wallets should be interchangeable through that same interface.
- **Interface Segregation**: keep module APIs small and purpose-specific (e.g. the data layer should expose focused functions like `addTransaction()`, `getBalances()` rather than one large catch-all object/class).
- **Dependency Inversion**: UI components should depend on the data layer through its exposed functions/interface, not reach into storage internals directly.

### Data model

Two wallets/accounts:

- `usdBalance` (number, default 0, user sets opening balance in settings)
- `lbpBalance` (number, default 0, user sets opening balance)

Each transaction record stores:

- `id`, `timestamp`, `note` (optional free text, e.g. "minimarket")
- `paid`: array of `{ amount, currency }` (currency = "USD" or "LBP") — usually one entry, but support multiple if user paid in mixed currency too
- `receivedChange`: array of `{ amount, currency }` — zero, one, or two entries (e.g. $10 USD + 550,000 LBP)
- `type`: "expense" or "income"
- computed `netUSD` and `netLBP` (the actual net effect on each wallet, stored at creation time)

### Transaction entry form (the core UX — get this right)

Single form, opened via one prominent "+" button:

1. **Paid section**: amount + currency picker (USD/LBP toggle). Support adding a second "paid" row if the user paid in mixed currency (rare but possible).
2. **Received back section**: optional, starts collapsed/empty. User can add up to 2 rows, each with amount + currency picker (USD/LBP). This covers: no change, change in one currency, or change split across both currencies.
3. Optional note field and category-free for v1 (no categories/budgets in v1).
4. On submit, the app calculates:
   - Net USD effect = (USD paid) − (USD received back)
   - Net LBP effect = (LBP paid) − (LBP received back)
   - Subtracts these nets from `usdBalance` and `lbpBalance` respectively.
   - Example: paid $20, received back $10 + 550,000 LBP → netUSD = -$10, netLBP = +550,000.

### Main screens (v1 scope)

1. **Home/Dashboard**:
   - Two large balance cards: "USD Wallet" and "LBP Wallet" showing current balances.
   - Prominent "+" floating action button to add a new transaction.
   - Button to open the full Transaction History dialog.
2. **Add Transaction** (described above).
3. **Transaction History**: full scrollable list of all transactions grouped by month, each with Edit/Delete support.
4. **Settings**:
   - Set/edit opening balances for USD and LBP wallets.
   - Local JSON backup & restore export/import.
   - Optional Telegram Auto-Backup (Bot Token + Chat ID setup for instant cloud copy on every data mutation).
5. **Monthly Estimation**:
   - Secondary schedule button (📅) stacked above the "+" FAB.
   - Upcoming month balance projection for USD & LBP wallets dynamically linked to live balances.
   - Manage recurring income and expense items (supports single or mixed-currency entries).
   - Month-scoped Skip/Unskip, Temporary Edit overrides for next month only, and permanent Edit/Delete.

### Explicitly OUT of scope for v1 (do not build, keep it lean)

- No categories or budgets.
- No central backend servers, no live exchange rate API, no mandatory user accounts/login (optional Telegram Bot API allowed for zero-server cloud backups).
- No charts/analytics beyond the simple balance + history view.
- No recurring transactions.
- No exchange rate display/conversion.

### Design direction

- Name: **Jezdan**.
- Color theme: deep teal/emerald green as primary, paired with a warm gold/amber accent. Dark mode by default. Avoid generic finance-app blue.
- Typography: clean, legible sans-serif; numbers should be visually prominent.
- Keep interactions minimal: the entire "log a transaction" flow should be completable in well under 10 seconds.

### Deliverable

A working installable PWA (manifest.json + service worker + offline caching configured correctly) that can be tested locally and deployed to a static host (e.g. GitHub Pages) for real-device installation via "Add to Home Screen."

---

## Notes for you (not part of the prompt)

- You're setting up `webpack-merge` (common/dev/prod config split) yourself outside this prompt — the agent has been told to leave bundler config alone and just produce clean ES module source files.
- Once the IDE scaffolds this, the cheapest free host for a static PWA is **GitHub Pages** — push the build output to a repo, enable Pages in repo settings, visit the URL on your phone once (needs internet that one time), then "Add to Home Screen." After that it works fully offline.
- If you ever want a "real" installable APK instead of a PWA shortcut, the same codebase can later be wrapped with **Capacitor** (open-source, free) with minimal changes.
