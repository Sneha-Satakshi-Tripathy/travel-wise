import fs from "node:fs";
import assert from "node:assert/strict";

const destinations = JSON.parse(fs.readFileSync(new URL("../src/data/destinations.json", import.meta.url), "utf8"));
const activities = JSON.parse(fs.readFileSync(new URL("../src/data/activities.json", import.meta.url), "utf8"));

const unique = (items, label) => {
  const ids = items.map(item => item.id);
  assert.equal(ids.length, new Set(ids).size, `${label} IDs must be unique`);
};
const required = (item, fields, label) => {
  for (const field of fields) assert.ok(item[field] !== undefined && item[field] !== null && item[field] !== "", `${label} missing ${field}`);
};

unique(destinations, "Destination");
unique(activities, "Activity");
assert.ok(destinations.length > 0, "At least one destination is required");
assert.ok(activities.length > 0, "At least one activity is required");

const destinationIds = new Set(destinations.map(item => item.id));
const activitiesByPlace = new Map();
for (const destination of destinations) {
  required(destination, ["id", "name", "region", "country", "scope", "tagline", "days", "cost", "effort", "image", "why", "travel"], `Destination ${destination.id}`);
  assert.ok(Number.isFinite(destination.days) && destination.days > 0, `${destination.id} days must be positive`);
  assert.ok(Number.isFinite(destination.cost) && destination.cost >= 0, `${destination.id} cost must be non-negative`);
  assert.match(destination.image, /^https:\/\//, `${destination.id} image must use HTTPS`);
}
for (const activity of activities) {
  required(activity, ["id", "place", "name", "slot", "duration", "cost", "effort", "note"], `Activity ${activity.id}`);
  assert.ok(destinationIds.has(activity.place), `${activity.id} references unknown destination ${activity.place}`);
  assert.ok(Number.isFinite(activity.cost) && activity.cost >= 0, `${activity.id} cost must be non-negative`);
  activitiesByPlace.set(activity.place, (activitiesByPlace.get(activity.place) || 0) + 1);
  assert.ok(!/local neighbourhood walk|local food and market stop|check local opening times and seasonal conditions before setting out/i.test(`${activity.name} ${activity.note}`), `${activity.id} looks like generic filler`);
}
for (const destination of destinations) {
  assert.ok((activitiesByPlace.get(destination.id) || 0) >= 4, `${destination.id} needs at least four activities`);
}
console.log(`Data validation passed: ${destinations.length} destinations, ${activities.length} activities, unique IDs, valid references, required fields, costs, images and activity coverage.`);
