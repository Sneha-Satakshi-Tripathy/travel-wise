import test from "node:test";
import assert from "node:assert/strict";
import { validateDestinationData } from "../src/lib/dataQuality.js";
import destinations from "../src/data/destinations.json" with { type: "json" };
import activities from "../src/data/activities.json" with { type: "json" };

test("all seeded destination and activity fixtures pass the data-quality contract", () => {
  assert.deepEqual(validateDestinationData(destinations, activities), []);
});

const validDestination = () => ({ id: "x", name: "Example", region: "R", country: "C", scope: "India", tagline: "A place", days: 2, cost: 20, effort: "Low", image: "https://example.com/image.jpg", why: "A useful destination description with enough detail.", travel: "1 hour", coordinates: { lat: 10, lon: 20 } });
const validActivity = (overrides = {}) => ({ id: "a", place: "x", name: "Example activity", slot: "Morning", duration: "1.5 hr", cost: 10, effort: "Low", note: "A useful activity note.", ...overrides });

test("rejects missing destination coordinates and invalid coordinate bounds", () => {
  const d = validDestination();
  d.coordinates = { lat: 95, lon: 20 };
  assert.ok(validateDestinationData([d], [validActivity(), validActivity({ id: "b", name: "Second activity" })]).some(e => e.includes("coordinates")));
});

test("rejects invalid image URL schemes", () => {
  const d = validDestination();
  d.image = "http://example.com/image.jpg";
  assert.ok(validateDestinationData([d], [validActivity(), validActivity({ id: "b", name: "Second activity" })]).some(e => e.includes("valid HTTPS URL")));
});

test("rejects unparseable durations and non-useful descriptions", () => {
  const errors = validateDestinationData([validDestination()], [validActivity({ duration: "a while", note: "ok" }), validActivity({ id: "b", name: "Second activity" })]);
  assert.ok(errors.some(e => e.includes("duration")));
  assert.ok(errors.some(e => e.includes("useful activity description")));
});

test("rejects duplicate activity names within one destination", () => {
  const errors = validateDestinationData([validDestination()], [validActivity(), validActivity({ id: "b", name: "EXAMPLE ACTIVITY" })]);
  assert.ok(errors.some(e => e.includes("Duplicate activity name")));
});

test("rejects activities linked to unknown destinations and invalid effort levels", () => {
  const errors = validateDestinationData([validDestination()], [validActivity({ place: "missing", effort: "Extreme" }), validActivity({ id: "b", name: "Second activity" })]);
  assert.ok(errors.some(e => e.includes("unknown destination")));
  assert.ok(errors.some(e => e.includes("invalid effort")));
});

test("rejects duplicate IDs, missing fields and negative costs", () => {
  const errors = validateDestinationData([validDestination(), validDestination()], [validActivity({ cost: -1 }), validActivity({ id: "a", name: "Second activity" })]);
  assert.ok(errors.some(e => e.includes("ID is duplicated")));
  assert.ok(errors.some(e => e.includes("cost must be non-negative")));
});
