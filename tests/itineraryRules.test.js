import test from "node:test";
import assert from "node:assert/strict";
import { allocateDaysAcrossRoute } from "../src/lib/itineraryRules.js";

const route = [{ id: "long", days: 4 }, { id: "medium", days: 2 }, { id: "short", days: 1 }];

test("allocates exactly the requested days with at least one day per selected city", () => {
  const { assigned, counts } = allocateDaysAcrossRoute(route, 7);
  assert.equal(assigned.length, 3);
  assert.equal(counts.reduce((sum, count) => sum + count, 0), 7);
  assert.ok(counts.every(count => count >= 1));
});

test("weights extra days toward destinations with longer suggested stays", () => {
  const { counts } = allocateDaysAcrossRoute(route, 10);
  assert.equal(counts.reduce((sum, count) => sum + count, 0), 10);
  assert.ok(counts[0] >= counts[1] && counts[1] >= counts[2]);
});

test("does not assign more cities than available days", () => {
  const { assigned, counts } = allocateDaysAcrossRoute(route, 2);
  assert.equal(assigned.length, 2);
  assert.deepEqual(counts, [1, 1]);
});

test("handles empty routes and invalid day values safely", () => {
  assert.deepEqual(allocateDaysAcrossRoute([], 7), { assigned: [], counts: [] });
  const { counts } = allocateDaysAcrossRoute(route, 0);
  assert.equal(counts.reduce((sum, count) => sum + count, 0), 1);
});

test("every generated day count is a positive integer", () => {
  for (let days = 1; days <= 21; days += 1) {
    const { counts } = allocateDaysAcrossRoute(route, days);
    assert.ok(counts.every(count => Number.isInteger(count) && count > 0));
    assert.equal(counts.reduce((sum, count) => sum + count, 0), days);
  }
});
