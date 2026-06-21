# Jezdan Build Plan — Task Tracker

## Completed Tasks

All 7 original tasks are done and committed to the `dev` branch.

| Task                         | Status  | Summary                                                    |
| ---------------------------- | ------- | ---------------------------------------------------------- |
| Task 1 — PWA Scaffold        | ✅ Done | Manifest, service worker, offline caching, teal/gold theme |
| Task 2 — Data Layer          | ✅ Done | `storage.js` + `calculation.js`, pure logic, no DOM        |
| Task 3 — Add Transaction     | ✅ Done | Dialog form, mixed-currency rows, wired to data layer      |
| Task 4 — Dashboard           | ✅ Done | Wallet cards, FAB, live balance rendering                  |
| Task 5 — Transaction History | ✅ Done | Full list, Edit/Delete with balance rollback               |
| Task 6 — Settings            | ✅ Done | Opening balances, backup/restore JSON, label fix           |
| Task 7 — Polish Pass         | ✅ Done | Micro-animations, focus rings, legibility, contrast        |
| Bonus — Backup/Import        | ✅ Done | Full JSON export/import in Settings dialog                 |

---

## Task 8 — Grouped History View (Calendar-style)

**Goal:** Replace the flat history list with a month-grouped view that shows income/outcome totals per month and day labels per transaction.

**Design decision (ponytail rule):** No grid calendar. A grouped scrollable list gives all the information (which day, which month, which year, monthly totals) with zero extra state, zero extra navigation, and zero extra dialogs. This is the correct minimal solution.

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

### Files to modify

- `src/ui/history.js` — Rewrite `renderHistory()` to group transactions by `YYYY-MM` and emit month-header rows with totals.
- `src/ui/styles.css` — Add ~15 lines of month-group header styles.
- Everything else — untouched.

### Scope boundary

- **In:** Month groups, weekday + date labels, income/outcome totals per month (USD and LBP separately).
- **Out:** Grid calendar, tap-to-expand day cells, month navigation arrows, charts/bars. These can be added later if needed, but they are not minimal.

### Verify

1. Open Transaction History dialog.
2. Transactions are grouped under month headers (newest month first).
3. Each month header shows correct sum of positive `netUSD`/`netLBP` (income) and sum of negative (outcome).
4. Individual transaction rows show weekday + date.
5. Edit/Delete still work identically.

---

## How to run new sessions

- Point the agent at `src/ui/history.js`, `src/ui/styles.css`, and this file.
- Tell it: _"We're on Task 8. Rewrite `renderHistory()` in `history.js` to group transactions by month with income/outcome totals in the header. Don't modify any other files unless strictly necessary."_
- After task, commit before moving to anything new.
