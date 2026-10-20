export function allocateDaysAcrossRoute(route, requestedDays) {
  const days = Math.max(1, Math.floor(Number(requestedDays) || 1));
  const assigned = (route || []).slice(0, Math.min((route || []).length, days));
  if (!assigned.length) return { assigned, counts: [] };
  const counts = assigned.map(() => 1);
  const remaining = days - counts.length;
  const totalWeight = assigned.reduce((sum, place) => sum + Math.max(1, Number(place.days) || 1), 0);
  const remainders = assigned.map((place, index) => {
    const exact = remaining * Math.max(1, Number(place.days) || 1) / totalWeight;
    const whole = Math.floor(exact);
    counts[index] += whole;
    return { index, remainder: exact - whole };
  });
  const allocated = counts.reduce((sum, count) => sum + count, 0);
  remainders.sort((a, b) => b.remainder - a.remainder).slice(0, days - allocated)
    .forEach(item => { counts[item.index] += 1; });
  return { assigned, counts };
}
