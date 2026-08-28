# Jezdan Build Plan — Task Tracker

## Status

All 10 tasks are complete and committed to the `dev` branch.

| Task                                 | Status  | Summary                                                               |
| ------------------------------------ | ------- | --------------------------------------------------------------------- |
| Task 1 — PWA Scaffold                | ✅ Done | Manifest, service worker, offline caching, teal/gold theme            |
| Task 2 — Data Layer                  | ✅ Done | `storage.js` + `calculation.js`, pure logic, no DOM                   |
| Task 3 — Add Transaction             | ✅ Done | Dialog form, mixed-currency rows, wired to data layer                 |
| Task 4 — Dashboard                   | ✅ Done | Wallet cards, FAB, live balance rendering                             |
| Task 5 — Transaction History         | ✅ Done | Full list, Edit/Delete with balance rollback                          |
| Task 6 — Settings                    | ✅ Done | Opening balances, data backup/restore JSON                            |
| Task 7 — Polish Pass                 | ✅ Done | Micro-animations, focus rings, legibility, contrast                   |
| Task 8 — Grouped History View        | ✅ Done | Month-grouped list with income/outcome totals per month               |
| Task 9 — Telegram Auto-Backup        | ✅ Done | Optional Telegram bot backup on every mutation, themed confirm dialog |
| Task 10 — Monthly Balance Estimation | ✅ Done | Upcoming month balance estimation, month-scoped skip & temp overrides |

---

## Bonus Changes (post-task)

| Change                        | Status  | Summary                                                                   |
| ----------------------------- | ------- | ------------------------------------------------------------------------- |
| IndexedDB Migration           | ✅ Done | Replaced localStorage with IndexedDB; automatic migration on first read   |
| Persistent Storage Request    | ✅ Done | `navigator.storage.persist()` called on startup                           |
| Numbered Backup Filenames     | ✅ Done | `YYYY-MM-DD-NNN` format, shared counter between manual & Telegram         |
| Mobile Tap Highlight Fix      | ✅ Done | `-webkit-tap-highlight-color: transparent` added globally                 |
| History Button Visibility Fix | ✅ Done | Button no longer hides when the transaction list is empty                 |
| Offline Backup Queue          | ✅ Done | Saves a localStorage flag on failure; retries on startup and online event |

---

## Task 8 — Grouped History View (Calendar-style)

**Status: ✅ Complete**

**Goal:** Replace the flat history list with a month-grouped view that shows income/outcome totals per month and day labels per transaction.

### What it looks like

```
── June 2026 ────────────────────────────────
   Income:  +$15 / +1,500,000 LBP   Outcome: -$125

   Mon Jun 21 · Minimarket                -$5
   Mon Jun 21 · Pharmacy                  -$8 / -150,000 LBP
   Sun Jun 20 · Salary             +$15 / +1,500,000 LBP

── May 2026 ─────────────────────────────────
   ...
```

### Files modified

- `src/ui/history.js` — Rewrote `renderHistory()` to group transactions by `YYYY-MM` and emit month-header rows with totals.
- `src/ui/styles.css` — Added month-group header styles.

---

## Task 9 — Optional Telegram Auto-Backup

**Status: ✅ Complete**

**Goal:** Allow users to optionally configure a Telegram Bot Token and Chat ID to automatically receive a `.json` backup file in their Telegram chat whenever data is created, edited, or deleted.

### What was built

- **Settings UI additions:**
  - Toggle switch to enable/disable Telegram Auto-Backup.
  - Password-style inputs for `Bot Token` and `Chat ID` with `👁️` show/hide buttons.
  - Help button `?` that opens an inline step-by-step modal guide (from A to Z) for non-technical users.
  - `Test Connection` button to verify credentials via `sendMessage` before saving.
  - `Save Changes` button moved to the bottom of the Settings dialog.
- **Data & Sync Layer (`src/data/telegram.js`):**
  - `sendTelegramMessage()` — test connection.
  - `sendTelegramDocument()` — uploads the `.json` backup file.
  - `triggerAutoBackup()` — fire-and-forget wrapper; silent fail on network error.
  - Backup filenames follow the same `YYYY-MM-DD-NNN` convention as manual exports, using a shared per-day counter.
- **Custom Confirm Dialog:**
  - `showConfirmDialog()` exported from `settings.js` and used by both the restore flow in settings and the delete flow in `history.js`.
  - Replaces all native `window.confirm()` calls with a custom-themed `<dialog>` matching the app's dark teal/gold aesthetic.
- **Security:**
  - Zero hard-coded tokens or keys. Credentials are provided solely by the user and stored in their local IndexedDB.

---

## Task 10 — Monthly Balance Estimation

**Status: ✅ Complete**

**Goal:** Provide an upcoming month balance estimation tool based on recurring/expected monthly income and expenses, dynamically linked to live wallet balances and supporting month-scoped skip and temporary edit overrides.

### What was built

- **Floating Schedule Button & Dialog:**
  - Added a secondary schedule FAB (`📅`) stacked above the `+` transaction button.
  - Custom full-height `<dialog id="estimate-dialog">` displaying target month projection, breakdown details, add/edit form, and items list.
- **Dynamic Live Balance Projection:**
  - Projected upcoming month balance is calculated on top of current live balances (`getBalances()`). Any real transaction added/edited/deleted instantly reflects in next month's projection.
- **Month-Scoped Skip & Temporary Edits:**
  - **Skip**: Toggling skip marks the item for the upcoming month (`skippedForMonth: "YYYY-MM"`), excluding it from the projection. Can be unskipped anytime before that month arrives; expires naturally when the calendar advances.
  - **Temporary Edit**: Users can override the expected amount for the upcoming month only (`tempOverride: { amount, month: "YYYY-MM" }`). Overrides can be undone or expire automatically after the month passes.
  - **Permanent Edit & Delete**: Full CRUD to edit base amounts, notes, currencies, or permanently remove recurring items.
- **Backup & Persistence Integration:**
  - Estimate rules are stored in IndexedDB under `jezdan_monthly_estimates`, backed up in JSON export/import and Telegram auto-backup.
