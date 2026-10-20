import fs from "node:fs";
import assert from "node:assert/strict";
import { validateDestinationData } from "../src/lib/dataQuality.js";

const destinations = JSON.parse(fs.readFileSync(new URL("../src/data/destinations.json", import.meta.url), "utf8"));
const activities = JSON.parse(fs.readFileSync(new URL("../src/data/activities.json", import.meta.url), "utf8"));
const errors = validateDestinationData(destinations, activities);
assert.deepEqual(errors, [], `Destination/activity data audit failed:\n- ${errors.join("\n- ")}`);
console.log(`Data validation passed: ${destinations.length} destinations, ${activities.length} activities; required fields, coordinates, image URLs, descriptions, durations, effort labels, references and duplicate names checked.`);
