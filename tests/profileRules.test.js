import test from "node:test";
import assert from "node:assert/strict";
import { activityDurationMinutes, activityEffortLevel, isSuitableActivitySuggestion } from "../src/lib/profileRules.js";

test("parses minutes and hours into consistent durations", () => {
  assert.equal(activityDurationMinutes({ duration: "45 min" }), 45);
  assert.equal(activityDurationMinutes({ duration: "1.5 hr" }), 90);
  assert.equal(activityDurationMinutes({ duration: "2 hours" }), 120);
  assert.equal(activityDurationMinutes({ duration: "4–6 hr" }), 300);
});

test("unknown duration safely uses a conservative one-hour estimate", () => {
  assert.equal(activityDurationMinutes({ duration: "unknown" }), 60);
});

test("minimal-walking suggestions exclude high-effort activities", () => {
  assert.equal(isSuitableActivitySuggestion({ effort: "High", duration: "2 hr" }, { walking: "Minimal walking" }), false);
  assert.equal(isSuitableActivitySuggestion({ effort: "Low", duration: "2 hr" }, { walking: "Minimal walking" }), true);
});

test("child-group suggestions avoid high-effort activities by default", () => {
  assert.equal(isSuitableActivitySuggestion({ effort: "High", duration: "1 hr" }, { travellingWith: ["Children"] }), false);
  assert.equal(isSuitableActivitySuggestion({ effort: "Low", duration: "1 hr" }, { travellingWith: ["Children"] }), true);
});

test("relaxed pace avoids long high-effort suggestions", () => {
  assert.equal(isSuitableActivitySuggestion({ effort: "High", duration: "3 hr" }, { pace: "Relaxed" }), false);
  assert.equal(isSuitableActivitySuggestion({ effort: "High", duration: "1 hr" }, { pace: "Relaxed" }), true);
});

test("balanced and active profiles retain normal suggestions", () => {
  assert.equal(isSuitableActivitySuggestion({ effort: "High", duration: "3 hr" }, { pace: "Balanced", walking: "Active days are fine" }), true);
  assert.equal(activityEffortLevel({ effort: "Medium" }), 2);
});
