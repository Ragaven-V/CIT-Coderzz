/**
 * Formats a given number into Indian currency style (e.g. ₹6,20,000).
 */
export function formatIndianCurrency(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
}
