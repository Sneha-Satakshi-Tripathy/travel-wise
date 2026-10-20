import test from "node:test";
import assert from "node:assert/strict";
import { USD_PER_UNIT, money, displayMoney, convertBudget } from "../src/lib/estimates.js";

test("fixed reference factors cover every currency offered by the UI", () => {
  for (const currency of ["USD", "INR", "EUR", "GBP", "LKR", "THB", "JPY", "VND"]) {
    assert.ok(Number.isFinite(USD_PER_UNIT[currency]) && USD_PER_UNIT[currency] > 0, `${currency} factor must be positive`);
  }
});

test("USD is the identity reference and same-currency conversion is unchanged", () => {
  assert.equal(convertBudget(100, "USD", "USD"), 100);
  assert.equal(convertBudget(123, "INR", "INR"), 123);
});

test("conversion is reversible within floating-point tolerance", () => {
  const inr = convertBudget(100, "USD", "INR");
  assert.ok(Math.abs(convertBudget(inr, "INR", "USD") - 100) < 1e-9);
});

test("unknown currencies use the documented neutral factor rather than crashing", () => {
  assert.equal(convertBudget(20, "UNKNOWN", "UNKNOWN"), 20);
  assert.match(displayMoney(20, "UNKNOWN"), /UNKNOWN|20/);
});

test("formatting handles invalid amount without throwing", () => {
  assert.doesNotThrow(() => money(Number.NaN, "USD"));
  assert.match(money(10, "USD"), /10/);
});

test("display conversion applies the fixed factor", () => {
  assert.match(displayMoney(83, "INR"), /6,889/);
  assert.match(displayMoney(35, "THB"), /1,225/);
});
