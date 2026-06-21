import { getBalances, getTransactions } from "../data/storage.js";

function formatMoney(amount, currency) {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  } else {
    // For LBP, usually no decimals
    return new Intl.NumberFormat("en-US").format(Math.round(amount)) + " LBP";
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function renderDashboard() {
  const balances = getBalances();

  // Render Balances
  const elUsdBalance = document.getElementById("usd-balance");
  const elLbpBalance = document.getElementById("lbp-balance");

  if (!elUsdBalance || !elLbpBalance) return;

  elUsdBalance.textContent = formatMoney(balances.usd, "USD");
  elLbpBalance.textContent = formatMoney(balances.lbp, "LBP").replace(
    " LBP",
    "",
  ); // We have the label above it
}
