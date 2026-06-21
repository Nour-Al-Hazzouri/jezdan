# Jezdan Build Plan — Phased Tasks for AI IDE Agents

## Why split this up

A single prompt asking an AI coding agent to build the entire app (PWA scaffold + service worker + offline caching + data layer + 4 screens + form logic + styling) in one shot risks context overflow or sloppy output once the agent is juggling too many files and decisions at once. Realistically, the full Jezdan MVP is **small-to-medium**: roughly 8-12 files (HTML/JS/CSS, manifest, service worker, a few JS modules), maybe 600-1000 lines total — even accounting for the extra module separation SOLID asks for. That's not huge, but agents lose coherence faster than you'd expect once a conversation accumulates multiple file edits, debugging back-and-forth, and design decisions in one thread.

**Rule of thumb**: one task = one clear deliverable the agent can finish and you can verify, before starting a fresh conversation/session for the next task. Don't carry all prior chat history forward — instead, carry forward only the actual code files (the agent should read the existing files from disk each session, not rely on remembering the conversation). Each task below assumes the agent has access to the full `PRC.md` for overall product context, plus whatever files already exist from prior tasks.

---

## Task 1 — Project scaffold + PWA shell (no business logic yet)

**Goal:** Empty but installable, offline-capable PWA shell.

Prompt the agent to:

- Set up the project (Vite + vanilla JS, or plain HTML/CSS/JS — agent's choice, keep it lightweight).
- Note: the webpack build configuration (including `webpack-merge` for common/dev/prod splits) is being set up separately by you, outside the agent's task — tell the agent to write standard ES module source files organized into clear folders (`src/data/`, `src/ui/`, `src/utils/`) and to not generate any webpack config files.
- Create `manifest.json` (name: Jezdan, theme colors as specified, icons placeholder).
- Create a service worker that caches all static assets for offline use.
- Create a basic `index.html` with a placeholder "Jezdan" home screen and a working dark teal/gold theme (just colors + typography, no real content yet).
- Verify: app loads, installs via "Add to Home Screen," and works with network disabled (airplane mode test).

**Stop here and test before continuing.** This is the foundation — if offline caching is broken, every later task inherits the bug.

---

## Task 2 — Data layer (storage + wallet logic, no UI)

**Goal:** Pure logic, testable independent of any screen.

Prompt the agent to:

- Implement local storage (IndexedDB or localStorage — agent's choice, localStorage is fine for this data size) with functions: `getBalances()`, `setOpeningBalances(usd, lbp)`, `getTransactions()`, `addTransaction(tx)`, `deleteTransaction(id)`, `getExchangeRate()`, `setExchangeRate(rate)`.
- Implement the core net-effect calculation function: given `paid[]` and `receivedChange[]` arrays (each `{amount, currency}`), return `{netUSD, netLBP}`.
- Apply SOLID boundaries here specifically: storage/persistence logic and currency calculation logic must live in separate modules (Single Responsibility). Calculation logic should treat currency as a plain parameter rather than hardcoded USD/LBP branches, so a third currency could be added later without rewriting the function (Open/Closed). The storage module should expose only the focused functions listed above as its public interface — no internal storage details (raw localStorage calls) exposed to callers (Interface Segregation / Dependency Inversion).
- Write this as a standalone module with no DOM dependencies, and include a few inline test cases in comments (e.g. the $20 paid / $10+550,000 LBP change example) so correctness is verifiable before any UI exists.
- Verify: paste test inputs, confirm calculated nets match expected values by hand.

---

## Task 3 — Add Transaction screen (the core UX)

**Goal:** The single most important screen — must be fast and correct.

Reference Task 2's data module (point the agent to the existing file, don't re-explain the logic from scratch).

Prompt the agent to:

- Build the Add Transaction form: Paid section (amount + USD/LBP toggle, with optional second row), Received Back section (optional, up to 2 rows, same amount+currency pattern), optional note field.
- Wire submit button to call the Task 2 `addTransaction()` function and update balances — the form should only ever call the data layer's exposed functions, never touch storage directly (Dependency Inversion).
- Keep the interaction fast: minimal taps, numeric keyboard auto-shown for amount fields, sensible defaults (currency toggle defaults to last used).
- Verify: log the worked example by hand in the running app, confirm wallet balances update correctly.

---

## Task 4 — Dashboard / Home screen

**Goal:** Display wallets + recent activity.

Prompt the agent to:

- Two balance cards (USD wallet, LBP wallet) reading live from the data layer.
- Combined estimated total using the stored exchange rate, clearly labeled "estimate."
- Recent transactions list (last 5-10), each showing paid/received/net.
- Floating "+" button linking to the Task 3 Add Transaction screen.
- Verify: balances and recent list update immediately after adding a transaction.

---

## Task 5 — Transaction History screen

**Goal:** Full list + edit/delete.

Prompt the agent to:

- Full scrollable transaction list, newest first.
- Tap a transaction to view details, with edit and delete actions.
- Deleting/editing must correctly re-adjust wallet balances (not just remove the record).
- Verify: delete a transaction, confirm balances roll back correctly.

---

## Task 6 — Settings screen

**Goal:** Exchange rate + opening balances + display currency preference.

Prompt the agent to:

- Editable exchange rate field (default 90,000, persisted).
- Editable opening balances for USD/LBP (for initial setup or manual correction).
- Toggle for preferred display currency on the dashboard's combined total (USD or LBP).
- Verify: changing the rate updates the dashboard's combined estimate immediately; opening balance edits don't wipe transaction history.

---

## Task 7 — Polish pass

**Goal:** Final UX/visual pass once everything works functionally.

Prompt the agent to:

- Review spacing, contrast, dark-mode consistency across all screens.
- Confirm large/legible balance numbers on the dashboard.
- Confirm the full "add transaction" flow is completable in well under 10 seconds.
- Re-test offline mode end-to-end (airplane mode: add a transaction, close app, reopen, confirm data persisted).

---

## How to run this across sessions

- Treat each task as its **own AI IDE session/conversation** where possible. Start by telling the agent: _"Here is the existing project [point to folder/repo]. We're now working on Task X: [paste that task's text]. Don't modify files unrelated to this task unless necessary."_
- After each task, **commit the working code** (git commit, even if just local) before moving to the next task — gives you a rollback point if a later task's agent breaks something.
- If an agent's context starts feeling sluggish or it starts forgetting earlier file structure mid-task, that's the signal to end the session and start fresh, explicitly re-pointing it at the current state of the files rather than continuing the same chat.
