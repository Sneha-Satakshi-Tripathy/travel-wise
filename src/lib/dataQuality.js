const requiredDestinationFields = ["id", "name", "region", "country", "scope", "tagline", "days", "cost", "effort", "image", "why", "travel", "coordinates"];
const requiredActivityFields = ["id", "place", "name", "slot", "duration", "cost", "effort", "note"];
const validEfforts = new Set(["Low", "Medium", "High"]);
const durationPattern = /^\s*\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?\s*(?:min|mins|minutes?|hr|hrs|hours?)\s*$/i;

export function validateDestinationData(destinations, activities) {
  const errors = [];
  const checkUniqueIds = (items, label) => {
    const seen = new Set();
    for (const item of items) {
      if (seen.has(item.id)) errors.push(`${label} ID is duplicated: ${item.id}`);
      seen.add(item.id);
    }
  };
  checkUniqueIds(destinations, "Destination");
  checkUniqueIds(activities, "Activity");
  const destinationIds = new Set(destinations.map(item => item.id));
  const activityNames = new Set();

  for (const d of destinations) {
    for (const key of requiredDestinationFields) {
      if (d[key] === undefined || d[key] === null || d[key] === "") errors.push(`${d.id || "unknown destination"} missing ${key}`);
    }
    if (!Number.isFinite(d.days) || d.days < 1 || d.days > 21) errors.push(`${d.id} days must be between 1 and 21`);
    if (!Number.isFinite(d.cost) || d.cost < 0) errors.push(`${d.id} cost must be non-negative`);
    if (!validEfforts.has(d.effort)) errors.push(`${d.id} has invalid effort: ${d.effort}`);
    try {
      const image = new URL(d.image);
      if (image.protocol !== "https:" || !image.hostname) errors.push(`${d.id} image must be a valid HTTPS URL`);
    } catch {
      errors.push(`${d.id} image must be a valid HTTPS URL`);
    }
    const lat = d.coordinates?.lat;
    const lon = d.coordinates?.lon;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      errors.push(`${d.id} coordinates must be valid latitude/longitude values`);
    }
    if (typeof d.why !== "string" || d.why.trim().length < 20) errors.push(`${d.id} needs a useful destination description`);
  }

  const activityCounts = new Map();
  for (const a of activities) {
    for (const key of requiredActivityFields) {
      if (a[key] === undefined || a[key] === null || a[key] === "") errors.push(`${a.id || "unknown activity"} missing ${key}`);
    }
    if (!destinationIds.has(a.place)) errors.push(`${a.id} references unknown destination ${a.place}`);
    if (!Number.isFinite(a.cost) || a.cost < 0) errors.push(`${a.id} cost must be non-negative`);
    if (!validEfforts.has(a.effort)) errors.push(`${a.id} has invalid effort: ${a.effort}`);
    if (typeof a.duration !== "string" || !durationPattern.test(a.duration)) errors.push(`${a.id} duration must include a sensible unit (min/hr)`);
    if (typeof a.note !== "string" || a.note.trim().length < 12) errors.push(`${a.id} needs a useful activity description`);
    const duplicateKey = `${a.place}::${String(a.name).trim().toLocaleLowerCase()}`;
    if (activityNames.has(duplicateKey)) errors.push(`Duplicate activity name for ${a.place}: ${a.name}`);
    activityNames.add(duplicateKey);
    activityCounts.set(a.place, (activityCounts.get(a.place) || 0) + 1);
  }
  for (const d of destinations) {
    if ((activityCounts.get(d.id) || 0) < 2) errors.push(`${d.id} needs at least two activities`);
  }
  if (destinations.filter(d => d.scope === "India").length < 10) errors.push("India should have at least ten destinations");
  return errors;
}
