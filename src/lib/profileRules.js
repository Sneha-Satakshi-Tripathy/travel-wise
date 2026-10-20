export function activityDurationMinutes(activity) {
  const match = String(activity?.duration || "").match(/([0-9]+(?:\.[0-9]+)?)(?:\s*[-–]\s*([0-9]+(?:\.[0-9]+)?))?\s*(hr|hour|min)/i);
  if (!match) return 60;
  const amount = match[2] ? (Number(match[1]) + Number(match[2])) / 2 : Number(match[1]);
  return Math.round(amount * (/min/i.test(match[3]) ? 1 : 60));
}

export function activityEffortLevel(activity) {
  const effort = String(activity?.effort || "Medium").toLowerCase();
  return effort === "low" ? 1 : effort === "high" ? 3 : 2;
}

// Used only to rank/add suggested activities; people can still keep or explicitly
// select an activity already in their itinerary. Accessibility is never inferred.
export function isSuitableActivitySuggestion(activity, profile = {}) {
  const effort = activityEffortLevel(activity);
  const walking = profile.walking || "Some walking is fine";
  const companions = profile.travellingWith || [];
  const relaxed = profile.pace === "Relaxed";
  if (walking === "Minimal walking" && effort >= 3) return false;
  if (companions.some(value => /children/i.test(value)) && effort >= 3) return false;
  if (relaxed && effort >= 3 && activityDurationMinutes(activity) > 120) return false;
  return true;
}
