// Fixture values are illustrative USD-based estimates. These fixed reference
// factors are intentionally not described as live or cached exchange rates.
export const USD_PER_UNIT = Object.freeze({
  USD: 1,
  INR: 1 / 83,
  EUR: 1.08,
  GBP: 1.27,
  LKR: 1 / 300,
  THB: 1 / 35,
  JPY: 1 / 150,
  VND: 1 / 24500,
});

export function money(amount, currency = "USD") {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(safeAmount);
  } catch {
    return `${currency} ${Math.round(safeAmount)}`;
  }
}

export function displayMoney(usdAmount, currency = "USD") {
  const factor = USD_PER_UNIT[currency] || 1;
  return money(Number(usdAmount) / factor, currency);
}

export function convertBudget(amount, from, to) {
  const sourceFactor = USD_PER_UNIT[from] || 1;
  const targetFactor = USD_PER_UNIT[to] || 1;
  return Number(amount) * sourceFactor / targetFactor;
}
