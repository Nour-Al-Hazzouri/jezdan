# PRC: "Jezdan" — Dual-Currency Cash Tracker (PWA)

Use this prompt as-is in an AI IDE (Cursor, Windsurf, Bolt, v0, Replit AI, etc.) to scaffold the MVP.

---

## Prompt to paste

Build a Progressive Web App (PWA) called **"Jezdan"** — a dual-currency personal cash expense tracker designed specifically for people who handle daily transactions in both USD and Lebanese Lira (LBP), where change is often returned in a different currency than the one paid (e.g., pay $20, receive back $10 + 550,000 LBP).

### Core problem it solves

Standard expense trackers (e.g., Cashew) require splitting one real-world purchase into multiple manual entries (amount paid, amount returned, currency conversions) because they only support single-currency-per-transaction logging. Jezdan logs the entire real-world transaction — pay + change-back across one or two currencies — as ONE entry, and automatically updates two running cash balances (a USD wallet and an LBP wallet).

### Tech requirements

- Build as a PWA: installable via "Add to Home Screen," must work **100% offline** after first load (service worker caching all assets).
- All data stored **locally on-device** (IndexedDB or localStorage) — no backend, no account, no internet dependency required to function.
- Mobile-first responsive design, optimized for a phone screen (target: Android, e.g. screen ~720x1600).
- No external API calls required for core functionality (exchange rate is manually set, not fetched live).
- Tech stack suggestion: plain HTML/CSS/JS or a lightweight framework (e.g. Vite + vanilla JS, or Svelte) — keep it lightweight, avoid heavy frameworks that bloat offline caching.
- **Bundler note:** the build/bundler configuration (webpack, including `webpack-merge` for splitting common/dev/prod configs) is set up separately and is outside the scope of what you need to do. Write source code as clean, standard ES modules with conventional import/export structure, organized into clearly separated files/folders (e.g. `src/data/`, `src/ui/`, `src/utils/`) so it slots cleanly into a standard webpack entry/output setup without restructuring later. Do not generate any webpack config files.

### Code architecture — SOLID principles

Apply SOLID principles where they meaningfully fit a small app like this (don't over-engineer a simple PWA with unnecessary abstraction layers, but keep these boundaries clean):

- **Single Responsibility**: keep storage/persistence logic, currency calculation logic, and UI rendering in separate modules/files. A function that calculates net currency effect should not also touch the DOM or storage directly.
- **Open/Closed**: structure the transaction model so new transaction types or currencies could be added later without rewriting core calculation logic (e.g. don't hardcode "USD" and "LBP" as special-cased branches everywhere — treat currency as a parameter/value, not a structural assumption, even though only two currencies exist today).
- **Liskov Substitution**: if a shared interface/shape is used for accounts (e.g. a generic "wallet" object for USD and LBP), both currency wallets should be interchangeable through that same interface with no special-case behavior required by callers.
- **Interface Segregation**: keep module APIs small and purpose-specific (e.g. the data layer should expose focused functions like `addTransaction()`, `getBalances()` rather than one large catch-all object/class mixing unrelated responsibilities).
- **Dependency Inversion**: UI components should depend on the data layer through its exposed functions/interface, not reach into storage internals (localStorage/IndexedDB calls) directly. This keeps the storage mechanism swappable later without touching UI code.

### Data model

Two wallets/accounts:

- `usdBalance` (number, default 0, user sets opening balance in onboarding/settings)
- `lbpBalance` (number, default 0, user sets opening balance)

Each transaction record stores:

- `id`, `timestamp`, `note` (optional free text, e.g. "minimarket")
- `paid`: array of `{ amount, currency }` (currency = "USD" or "LBP") — usually one entry, but support multiple if user paid in mixed currency too
- `receivedChange`: array of `{ amount, currency }` — zero, one, or two entries (e.g. $10 USD + 550,000 LBP)
- `type`: "expense" or "income" (income works as the inverse — money received, optionally with "change given back" if relevant, but expense is the primary use case)
- computed `netUSD` and `netLBP` (the actual net effect on each wallet, stored at creation time for historical accuracy even if exchange rate later changes)

### Transaction entry form (the core UX — get this right)

Single form, opened via one prominent "+" button:

1. **Paid section**: amount + currency picker (USD/LBP toggle). Support adding a second "paid" row if the user paid in mixed currency (rare but possible).
2. **Received back section**: optional, starts collapsed/empty. User can add up to 2 rows, each with amount + currency picker (USD/LBP). This covers: no change, change in one currency, or change split across both currencies.
3. Optional note field and category-free for v1 (no categories/budgets in v1 — keep it simple, just transaction log + balances).
4. On submit, the app calculates:
   - Net USD effect = (USD paid) − (USD received back)
   - Net LBP effect = (LBP paid) − (LBP received back)
   - Subtracts these nets from `usdBalance` and `lbpBalance` respectively.
   - Example: paid $20, received back $10 + 550,000 LBP → netUSD = -$10 (wallet decreases by $10), netLBP = +550,000 (LBP wallet increases by 550,000, since they received more LBP than they paid in LBP — they paid 0 LBP, received 550,000 LBP back).
   - Another example, pure single currency: paid $5, no change → netUSD = -$5, netLBP = 0.

### Exchange rate handling

- Settings screen lets the user set a fixed exchange rate (e.g. 1 USD = 90,000 LBP), editable anytime.
- This rate is used ONLY for display purposes: showing a combined "total net worth in USD equivalent" or "total in LBP equivalent" summary, and for any reports. It does NOT affect the actual per-currency wallet balances, which are tracked as real, separate amounts.
- Store the rate used at the time of each combined-total calculation isn't necessary for v1 — always use the current rate from settings for display conversions.

### Main screens (v1 scope)

1. **Home/Dashboard**:
   - Two large balance cards: "USD Wallet" and "LBP Wallet" showing current balances.
   - A combined estimated total (in USD or LBP, user's choice) using the fixed exchange rate, clearly labeled as an estimate.
   - Recent transactions list (most recent first), each showing: note/date, paid amount(s), received amount(s), and net effect per currency.
   - Prominent "+" floating action button to add a new transaction.
2. **Add Transaction** (described above).
3. **Transaction History**: full scrollable list of all transactions, each tappable to view/edit/delete.
4. **Settings**:
   - Set/edit exchange rate.
   - Set/edit opening balances for USD and LBP wallets (for initial setup or corrections).
   - Choose preferred display currency for the combined total (USD or LBP).

### Explicitly OUT of scope for v1 (do not build, keep it lean)

- No categories or budgets.
- No bank sync, no live exchange rate API, no cloud sync, no accounts/login.
- No charts/analytics beyond the simple balance + history view (can be added later).
- No recurring transactions.

### Design direction

- Name: **Jezdan**.
- Color theme: deep teal/emerald green as primary (evokes both currency/money and a calm, trustworthy feel), paired with a warm gold/amber accent for the LBP wallet card and highlights (subtle nod to Lebanese visual identity without being kitschy). Dark mode by default or as an easy toggle, since it's a daily-use utility app — should feel fast, clean, and unobtrusive, not flashy. Avoid generic finance-app blue; avoid Cashew's exact look.
- Typography: clean, legible sans-serif, numbers should be visually prominent (large balance figures front and center).
- Keep interactions minimal: the entire "log a transaction" flow should be completable in well under 10 seconds of typing/tapping, since this is meant to replace a multi-step process with a faster one.

### Deliverable

A working installable PWA (manifest.json + service worker + offline caching configured correctly) that can be tested locally and deployed to a static host (e.g. GitHub Pages, Netlify, Vercel) for real-device installation via "Add to Home Screen."

---

## Notes for you (not part of the prompt)

- You're setting up `webpack-merge` (common/dev/prod config split) yourself outside this prompt — the agent has been told to leave bundler config alone and just produce clean ES module source files, so your webpack setup should be able to point at the agent's output without conflicts.
- Once the IDE scaffolds this, the cheapest free host for a static PWA is **GitHub Pages** — push the build output to a repo, enable Pages in repo settings, visit the URL on your phone once (needs internet that one time), then "Add to Home Screen." After that it works fully offline.
- If you ever want a "real" installable APK instead of a PWA shortcut, the same codebase can later be wrapped with **Capacitor** (open-source, free) with minimal changes — worth keeping in mind but not needed for the MVP.
