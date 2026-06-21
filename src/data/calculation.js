/**
 * Calculates the net effect of a transaction across any currencies involved.
 *
 * @param {Array<{amount: number, currency: string}>} paid - Amounts paid.
 * @param {Array<{amount: number, currency: string}>} receivedChange - Amounts received.
 * @returns {Object} Net effect per currency, e.g., { USD: -10, LBP: 550000 }
 *
 * ponytail: We keep this purely mathematical. It iterates given arrays and outputs an object
 * mapping currencies to their net change. No hardcoded 'USD' or 'LBP' paths here.
 */
export function calculateNetEffect(paid = [], receivedChange = []) {
  const nets = {};

  for (const p of paid) {
    if (!p || typeof p.amount !== "number") continue;
    nets[p.currency] = (nets[p.currency] || 0) - p.amount;
  }

  for (const r of receivedChange) {
    if (!r || typeof r.amount !== "number") continue;
    nets[r.currency] = (nets[r.currency] || 0) + r.amount;
  }

  return nets;
}

/*
Inline Test Cases for Verification (Run manually to test logic):

// Case 1: Pay $20, receive $10 + 550,000 LBP
// Expected: { USD: -10, LBP: 550000 }
console.assert(
  JSON.stringify(calculateNetEffect(
    [{ amount: 20, currency: 'USD' }], 
    [{ amount: 10, currency: 'USD' }, { amount: 550000, currency: 'LBP' }]
  )) === JSON.stringify({ USD: -10, LBP: 550000 }),
  "Test Case 1 Failed"
);

// Case 2: Pure single currency, paid $5, no change
// Expected: { USD: -5 }
console.assert(
  JSON.stringify(calculateNetEffect(
    [{ amount: 5, currency: 'USD' }], 
    []
  )) === JSON.stringify({ USD: -5 }),
  "Test Case 2 Failed"
);
*/
