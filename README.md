# Jezdan — Dual-Currency Cash Tracker

Jezdan (Arabic for "wallet") is a lightweight, offline-first Progressive Web App (PWA) designed to track daily cash expenses and balances in dual-currency economies. It is built specifically to address the unique cash-handling dynamics in Lebanon, where transactions regularly mix US Dollars (USD) and Lebanese Lira (LBP).

---

## 💡 The Inspiration

In Lebanon, daily cash transactions are dual-currency. You might pay for a purchase using a $20 bill and receive your change as a combination of $10 USD and 550,000 LBP.

Standard personal finance apps (like Cashew, YNAB, or pocket trackers) are not built for this. Logging a single purchase requires manually splitting the transaction into multiple entries, performing currency conversions on the fly, and recording them separately.

**Jezdan** was built to solve this friction. It logs the entire real-world transaction—what you paid and the mixed change you received back—as **one single entry**, updating both your USD and LBP wallets automatically.

---

## ✨ Features

- **Single-Entry Mixed Currency Logging:** Log payments and received change across USD and LBP simultaneously in one entry.
- **Dual Wallet Tracking:** Automatically maintains and updates running balances for both your USD and LBP wallets.
- **Enforced UI Constraints:** Intelligently prevents duplicate currency rows (e.g. locks currency inputs to ensure you choose one USD and one LBP row when recording mixed entries).
- **Calendar & Monthly View:** Organizes transactions month-by-month with a simple calendar interface and automatically calculates monthly income vs. outcome.
- **Offline-First PWA:** Works 100% offline via Service Worker caching. Installable directly to your phone's home screen.
- **Local-Only Privacy:** 100% client-side. All data is saved on-device via `localStorage`—no servers, no accounts, and no tracking.
- **Data Export & Import:** Backup your entire database to a JSON file to prevent data loss or transfer it to another device.

---

## 🛠️ Technology Stack

Jezdan is built with a minimal, modern, and lightweight tech stack to optimize performance and offline-caching efficiency:

- **Core Structure & Logic:** Semantic HTML5, Vanilla JavaScript (ES Modules), and modern CSS3 (using custom properties, HSL color palettes, and responsive CSS Grid/Flexbox layouts).
- **Service Worker & PWA:** Custom service worker (`sw.js`) with cache-busting and stale-while-revalidate caching strategies for reliable offline capabilities.
- **Data Storage:** Local browser storage (`localStorage`) for local-only, zero-latency persistence.
- **Build/Bundling Pipeline:** Webpack and `webpack-merge` for environment configuration splits (development, production, common).

---

## 🎨 Visual Design

The UI is optimized for mobile screens (Android/iOS) with a sleek dark-mode-first aesthetic:

- **Primary Color:** Deep emerald green/teal, representing money and security.
- **Accent Color:** Warm amber/gold, a subtle nod to Lebanese visual identity.
- **Typography:** Modern, clean sans-serif typography with large, legible financial figures front and center.
