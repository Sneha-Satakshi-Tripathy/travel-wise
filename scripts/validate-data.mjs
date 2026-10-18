import fs from "node:fs";
import assert from "node:assert/strict";

const destinations = JSON.parse(fs.readFileSync(new URL("../src/data/destinations.json", import.meta.url), "utf8"));
const activities = JSON.parse(fs.readFileSync(new URL("../src/data/activities.json", import.meta.url), "utf8"));
const unique = (items, label) => {
  const ids = items.map(item => item.id);
  assert.equal(ids.length, new Set(ids).size, `${label} IDs must be unique`);
};
unique(destinations, "Destination");
unique(activities, "Activity");
const destinationIds = new Set(destinations.map(item => item.id));
for (const destination of destinations) {
  for (const key of ["id", "name", "region", "country", "scope", "tagline", "days", "cost", "effort", "image", "why", "travel"]) {
    assert.ok(destination[key] !== undefined && destination[key] !== null && destination[key] !== "", `${destination.id} missing ${key}`);
  }
  assert.ok(Number.isFinite(destination.days) && destination.days > 0, `${destination.id} days must be positive`);
  assert.ok(Number.isFinite(destination.cost) && destination.cost >= 0, `${destination.id} cost must be non-negative`);
  assert.match(destination.image, /^https:\/\//, `${destination.id} image must use HTTPS`);
}
const perDestination = new Map();
for (const activity of activities) {
  for (const key of ["id", "place", "name", "slot", "duration", "cost", "effort", "note"]) {
    assert.ok(activity[key] !== undefined && activity[key] !== null && activity[key] !== "", `${activity.id} missing ${key}`);
  }
  assert.ok(destinationIds.has(activity.place), `${activity.id} references unknown destination ${activity.place}`);
  assert.ok(Number.isFinite(activity.cost) && activity.cost >= 0, `${activity.id} cost must be non-negative`);
  perDestination.set(activity.place, (perDestination.get(activity.place) || 0) + 1);
}
for (const destination of destinations) assert.ok((perDestination.get(destination.id) || 0) >= 4, `${destination.id} needs at least four activities`);
assert.ok(destinations.filter(destination => destination.scope === "India").length >= 10, "India should have at least ten destinations");
console.log(`Data validation passed: ${destinations.length} destinations, ${activities.length} activities.`);
