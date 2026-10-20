import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Compass, Download, Heart, MapPin, Moon, Plus, Printer, Share2, Sparkles, Sun, Users } from "lucide-react";
import destinations from "./data/destinations.json";
import activities from "./data/activities.json";
import { USD_PER_UNIT, money, displayMoney, convertBudget } from "./lib/estimates.js";
import { activityDurationMinutes as activityMinutes, activityEffortLevel as effortLevel, isSuitableActivitySuggestion } from "./lib/profileRules.js";

const KEY = "roamwise-v1";

// Interactive, client-only map. Leaflet is loaded on demand so the planner still
// renders if the map CDN is unavailable. The connecting line is a visual itinerary
// guide between cities, not a road route or travel-time estimate.
function InteractiveRouteMap({ points }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    let cancelled = false;
    let mapInstance;
    const loadLeaflet = () => {
      if (window.L) return Promise.resolve(window.L);
      if (!window.__roamwiseLeafletPromise) {
        window.__roamwiseLeafletPromise = new Promise((resolve, reject) => {
          if (!document.querySelector('link[data-roamwise-leaflet]')) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
            link.dataset.roamwiseLeaflet = "true";
            document.head.appendChild(link);
          }
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.async = true;
          script.onload = () => window.L ? resolve(window.L) : reject(new Error("Map library did not load"));
          script.onerror = () => reject(new Error("Map library could not be reached"));
          document.head.appendChild(script);
        });
      }
      return window.__roamwiseLeafletPromise;
    };
    if (!points.length) { setStatus("empty"); return undefined; }
    loadLeaflet().then(L => {
      if (cancelled || !hostRef.current) return;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      mapInstance = L.map(hostRef.current, { scrollWheelZoom: false }).setView(points[0].coords, 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
      }).addTo(mapInstance);
      const linePoints = points.map(point => point.coords);
      if (linePoints.length > 1) {
        L.polyline(linePoints, { color: "#477b52", weight: 3, opacity: 0.85, dashArray: "7 7" }).addTo(mapInstance);
      }
      points.forEach((point, index) => {
        const icon = L.divIcon({
          className: "roamwise-map-marker-shell",
          html: '<span class="roamwise-map-marker">' + (index + 1) + '</span>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });
        L.marker(point.coords, { icon }).addTo(mapInstance)
          .bindPopup('<strong>' + point.name.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])) + '</strong><br/>' + point.country);
      });
      if (linePoints.length > 1) mapInstance.fitBounds(L.latLngBounds(linePoints).pad(0.18), { maxZoom: 7 });
      else mapInstance.setView(linePoints[0], 11);
      mapRef.current = mapInstance;
      setStatus("ready");
      window.setTimeout(() => mapInstance.invalidateSize(), 80);
    }).catch(() => { if (!cancelled) setStatus("unavailable"); });
    return () => {
      cancelled = true;
      if (mapInstance) mapInstance.remove();
      if (mapRef.current === mapInstance) mapRef.current = null;
    };
  }, [points.map(point => point.id + ":" + point.coords.join(",")).join("|")]);
  if (status === "empty") return <div className="interactive-map-fallback">Choose cities to see them on the map.</div>;
  return <div className="interactive-map-shell">
    <div ref={hostRef} className="interactive-route-map" role="region" aria-label="Interactive map of selected trip cities" />
    {status === "loading" && <div className="interactive-map-message">Loading interactive map…</div>}
    {status === "unavailable" && <div className="interactive-map-message map-error">Map tiles could not load. Check your connection or use the route planner below.</div>}
    <p className="map-route-note">Dashed line connects your selected cities as a visual guide; it is not a road route or travel-time estimate.</p>
  </div>;
}
const SAVED_TRIPS_KEY = "roamwise-saved-trips-v1";
const scopeOptions = ["India", "Thailand", "Japan", "Vietnam", "Europe", "Sri Lanka"];
const starterPlaces = {
  "Sri Lanka": { countries: [], places: ["kandy", "nuwara-eliya", "galle"], activities: ["temple", "lake", "market", "tea", "train", "fort", "sunset"] },
  India: { countries: [], places: ["jaipur", "agra", "delhi"], activities: ["jaipur-fort", "jaipur-food", "agra-taj", "agra-fort", "delhi-humayun", "delhi-qutub"] },
  Thailand: { countries: [], places: ["bangkok", "chiang-mai", "krabi"], activities: ["bangkok-temples", "bangkok-food", "chiang-temples", "chiang-market", "krabi-beach", "krabi-food"] },
  Japan: { countries: [], places: ["tokyo", "kyoto", "osaka"], activities: ["tokyo-neighbourhood","tokyo-food","kyoto-temples","kyoto-tea","osaka-market","osaka-food"] },
  Vietnam: { countries: [], places: ["hanoi", "hoi-an", "ho-chi-minh-city"], activities: ["hanoi-old-quarter", "hanoi-food", "hoi-an-old-town", "hoi-an-cooking", "hcmc-history", "hcmc-food"] },
  Europe: { countries: ["France", "Italy"], places: ["paris", "rome", "florence"], activities: ["paris-landmarks", "paris-cafe", "rome-ancient", "rome-food", "florence-art", "florence-food"] }
};
const defaultBudgetBreakdown = { accommodationPerNight: 0, foodPerDay: 25, localTransportPerDay: 15, extrasPerDay: 5 };
const defaults = { destination: "Japan", days: 7, travelers: 2, month: "Flexible dates", flexibleDates: true, startDate: "", endDate: "", budget: 200, currency: "USD", countries: starterPlaces.Japan.countries, places: starterPlaces.Japan.places, activities: starterPlaces.Japan.activities, budgetBreakdown: defaultBudgetBreakdown, title: "A little Japan adventure" };
// Broad historical seasonal guidance only; never a live forecast or guarantee.
const climateTips = {
  "Sri Lanka": { season: "December–April for the west and south coasts; January–April for the central highlands", temperature: "24–32°C on the coasts; around 12–22°C in the highlands", note: "Monsoons vary by coast and elevation, so choose the season for your selected region." },
  India: { season: "October–March for many popular north and west India routes", temperature: "18–30°C in many popular city routes; cooler nights are possible", note: "India varies widely by region; mountain, desert and southern-coastal trips need different timing." },
  Thailand: { season: "November–February for generally drier, more comfortable conditions", temperature: "24–32°C", note: "Rain patterns differ between the Andaman coast and the Gulf islands." },
  Japan: { season: "March–May for spring and September–November for autumn", temperature: "8–24°C across many popular city routes", note: "Cherry blossom and autumn foliage timing varies by region and year; summer is often hot and humid." },
  Vietnam: { season: "March–April or October–November for a broad north-to-south route", temperature: "20–30°C in many areas", note: "Vietnam spans several climate zones; central coast rainy seasons can differ from the north and south." },
  Europe: { season: "April–June and September–October for mild weather and fewer peak-season crowds", temperature: "12–24°C in many popular city routes", note: "Conditions vary substantially by country, altitude and latitude." }
};
const dateLabel = value => value ? new Date(value + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
const tripWhen = t => t.startDate && t.endDate ? dateLabel(t.startDate) + " – " + dateLabel(t.endDate) : t.startDate ? "From " + dateLabel(t.startDate) : (t.month || "Flexible dates");
const styles = ["Culture & history", "Slow living", "Adventure seeker", "Food-led explorer", "Sun & sea", "Nature lover"];
// Offline planning heuristics; never presented as live routing or verified accessibility data.
const activityFitReason = (activity, profile, place) => {
  const text = String(activity?.name || "") + " " + String(activity?.note || "");
  const styles = profile?.styles || [];
  const effort = activity?.effort || "Medium";
  let fit = "";
  if (styles.includes("Food-led explorer") && /food|market|cafe|café|tea|tasting|dinner|lunch|bite|culinary/i.test(text)) fit = "Matches your food-led travel style.";
  else if (styles.includes("Culture & history") && /temple|heritage|historic|fort|museum|architecture|palace|history|old.city/i.test(text)) fit = "Matches your interest in culture and history.";
  else if (styles.includes("Nature lover") && /nature|garden|lake|beach|mountain|scenic|tea estate|sunset|countryside/i.test(text)) fit = "Matches your interest in nature and scenery.";
  else if (styles.includes("Slow living") && /cafe|café|lake|sunset|slow|tasting|tea|beach|coffee|garden/i.test(text)) fit = "Leaves space for a slower, more unhurried experience.";
  else if (styles.includes("Adventure seeker") && /climb|hike|ride|adventure|fortress|trail|kayak|cycle/i.test(text)) fit = "Adds an active experience to your trip.";
  else if (styles.includes("Sun & sea") && /beach|sea|coast|swim|boat|sunset/i.test(text)) fit = "Fits your sun-and-sea preference.";
  if (!fit) fit = `A ${effort.toLowerCase()}-effort option in ${place?.name || "this destination"}.`;
  if (profile?.pace === "Relaxed" && effortLevel(activity) === 3) fit += " This is a higher-effort exception to your relaxed pace.";
  else if (profile?.pace === "Packed") fit += " Suits your preference for a fuller day.";
  else if (profile?.pace === "Relaxed") fit += " The plan leaves room to slow down.";
  if (profile?.walking === "Minimal walking" && effortLevel(activity) >= 3) fit += " Check stairs, terrain and access before committing; those details aren't verified here.";
  else if (profile?.walking === "Minimal walking") fit += " Lower-effort picks are prioritised, but walking distance isn't verified.";
  if ((profile?.travellingWith || []).some(x => /parents|older adults|mixed-age|children/i.test(x))) fit += " Kept as an editable option for your group; age alone doesn't guarantee accessibility.";
  return fit;
};
const adjustDayActivities = (items, mode) => {
  if (!mode || !items?.length) return items || [];
  const ranked = [...items].sort((a, b) => effortLevel(a) - effortLevel(b));
  if (mode === "gentler") return ranked.slice(0, Math.min(2, ranked.length)).sort((a, b) => items.indexOf(a) - items.indexOf(b));
  if (mode === "less-walking") {
    const low = items.filter(a => effortLevel(a) === 1);
    return (low.length ? low : ranked.slice(0, 1)).slice(0, 3);
  }
  if (mode === "food-culture") {
    const relevant = items.filter(a => /food|market|cafe|café|tea|tasting|dinner|lunch|bite|culinary|temple|heritage|historic|museum|palace/i.test(String(a.name) + " " + String(a.note || "")));
    return (relevant.length ? relevant : items).slice(0, 3);
  }
  if (mode === "running-late") return items.slice(0, 2).map((a, i) => ({ ...a, slot: i === 0 ? "Priority 1" : "Priority 2" }));
  return items;
};
const getDayWorkload = (day, profile) => {
  const items = day?.activities || [];
  const activityMins = items.reduce((sum, activity) => sum + activityMinutes(activity), 0);
  // This allowance is not a route API result.
  const transitMins = Math.max(0, items.length - 1) * 20;
  const breakMins = items.length >= 2 ? 60 : items.length === 1 ? 30 : 0;
  const totalMins = activityMins + transitMins + breakMins;
  return { activityMins, transitMins, breakMins, totalMins, hours: Math.round(totalMins / 6) / 10, overloaded: totalMins > 480 || (profile?.pace === "Relaxed" && totalMins > 360) };
};


// Add cities only when the selected trip length exceeds the recommended stay of the current route.
// Existing selections are preserved; new cities are chosen from the active country/region.
const ensureCitiesForDuration = (trip, days) => {
  const candidates = destinations.filter(d => trip.destination === "Europe"
    ? d.scope === "Europe" && (!trip.countries?.length || trip.countries.includes(d.country))
    : d.scope === trip.destination);
  const places = [...trip.places];
  const stayLength = () => places.reduce((sum, id) => sum + Math.max(1, destinations.find(d => d.id === id)?.days || 1), 0);
  for (const place of candidates) {
    if (stayLength() >= days) break;
    if (!places.includes(place.id)) places.push(place.id);
  }
  const validActivityIds = activities.filter(a => places.includes(a.place)).map(a => a.id);
  const selectedActivities = trip.activities.filter(id => validActivityIds.includes(id));
  for (const id of places.filter(id => !trip.places.includes(id))) {
    selectedActivities.push(...activities.filter(a => a.place === id).slice(0, 2).map(a => a.id));
  }
  return { ...trip, days, places, activities: [...new Set(selectedActivities)] };
};

const defaultProfile = () => ({
  name: "",
  styles: ["Culture & history", "Slow living"],
  travellingWith: ["Couple / partner"],
  ageGroup: "30–44",
  pace: "Balanced",
  walking: "Some walking is fine"
});
const getQueryParams = () => typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
const getShareToken = () => {
  if (typeof window === "undefined") return null;
  // Support older query-string links and newer fragment links (which static hosts won't route away).
  return getQueryParams().get("share") || new URLSearchParams(window.location.hash.replace(/^#/, "")).get("share");
};
const decodeSharePayload = encoded => {
  // Accept URL-safe and standard Base64, decoding UTF-8 correctly for non-ASCII text.
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = window.atob(normalized);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};
const readSharedPayload = () => {
  try {
    if (typeof window === "undefined") return null;
    const encoded = getShareToken();
    if (!encoded) return null;
    const payload = decodeSharePayload(encoded);
    if (!payload?.trip || !scopeOptions.includes(payload.trip.destination)) return null;
    if (!Array.isArray(payload.trip.places) || !Array.isArray(payload.trip.activities)) return null;
    return payload;
  } catch { return null; }
};
const getInitialTrip = () => {
  const shared = readSharedPayload();
  if (shared?.trip) {
    return {
      ...defaults,
      ...shared.trip,
      countries: Array.isArray(shared.trip.countries) ? shared.trip.countries : [],
      places: Array.isArray(shared.trip.places) ? shared.trip.places.filter(id => destinations.some(d => d.id === id)) : [...defaults.places],
      activities: Array.isArray(shared.trip.activities) ? shared.trip.activities.filter(id => activities.some(a => a.id === id)) : [...defaults.activities]
    };
  }
  try {
    const stored = JSON.parse(localStorage.getItem(KEY))?.trip || {};
    const query = getQueryParams();
    const destination = query.get("destination");
    if (!scopeOptions.includes(destination)) return { ...defaults, ...stored, flexibleDates: stored.flexibleDates ?? stored.month === "Flexible dates", startDate: stored.startDate || "", endDate: stored.endDate || "" };
    const starter = starterPlaces[destination] || starterPlaces.Japan;
    const names = { "Sri Lanka": "A little Sri Lankan magic", India: "An India escape", Thailand: "A Thailand adventure", Japan: "A little Japan adventure", Vietnam: "A Vietnam escape", Europe: "A little European grand tour" };
    const requestedDays = Number(query.get("days"));
    const days = Number.isFinite(requestedDays) && requestedDays >= 2 && requestedDays <= 21 ? requestedDays : 7;
    return ensureCitiesForDuration({
      ...defaults,
      destination,
      days,
      countries: [...starter.countries],
      places: [...starter.places],
      activities: [...starter.activities],
      title: names[destination],
      flexibleDates: true,
      month: "Flexible dates",
      startDate: "",
      endDate: ""
    }, days);
  } catch { return defaults; }
};
const getInitialProfile = () => {
  const base = defaultProfile();
  const shared = readSharedPayload();
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(KEY))?.profile || {}; } catch {}
  const profile = { ...base, ...(shared?.profile || stored) };
  const query = getQueryParams();
  if (query.get("travellingWith")) profile.travellingWith = [query.get("travellingWith")];
  if (query.get("ageGroup")) profile.ageGroup = query.get("ageGroup");
  if (query.get("pace")) profile.pace = query.get("pace");
  if (query.get("walking")) profile.walking = query.get("walking");
  if (!Array.isArray(profile.travellingWith)) profile.travellingWith = [profile.travellingWith || "Couple / partner"];
  if (!Array.isArray(profile.styles)) profile.styles = base.styles;
  return profile;
};

function DateRangePicker({ startDate, endDate, onChange, flexible, onFlexibleChange, legacyLabel }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => { const value = startDate || new Date().toISOString().slice(0, 10); const parsed = new Date(value + "T12:00:00"); return new Date(parsed.getFullYear(), parsed.getMonth(), 1); });
  const monthName = viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, i) => i - firstDay + 1);
  const iso = day => String(viewMonth.getFullYear()) + "-" + String(viewMonth.getMonth() + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  const pick = value => { if (!startDate || (startDate && endDate)) onChange(value, ""); else if (value < startDate) onChange(value, ""); else { onChange(startDate, value); setOpen(false); } onFlexibleChange(false); };
  const label = startDate && endDate ? dateLabel(startDate) + " – " + dateLabel(endDate) : startDate ? dateLabel(startDate) + " · choose return date" : (legacyLabel && legacyLabel !== "Flexible dates" && legacyLabel !== "Choose dates" ? legacyLabel : "Choose a date range");
  return <div className="date-range-control">
    <button type="button" className="date-range-trigger" onClick={() => setOpen(v => !v)} aria-expanded={open}><CalendarDays size={16} /><span>{flexible ? "Dates are flexible" : label}</span><ChevronDown size={15} /></button>
    {open && <div className="date-calendar"><div className="calendar-head"><button type="button" aria-label="Previous month" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}><ChevronLeft size={16} /></button><b>{monthName}</b><button type="button" aria-label="Next month" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}><ChevronRight size={16} /></button></div>
      <div className="calendar-grid">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => <span className="calendar-weekday" key={day}>{day}</span>)}
        {cells.map((day, i) => day < 1 || day > daysInMonth ? <span key={"blank-" + i} /> : <button type="button" key={day} className={"calendar-day " + (iso(day) === startDate ? "range-start " : "") + (iso(day) === endDate ? "range-end " : "") + (startDate && endDate && iso(day) > startDate && iso(day) < endDate ? "range-middle" : "")} onClick={() => pick(iso(day))}>{day}</button>)}</div>
      <p className="calendar-hint">{!startDate || endDate ? "Select your departure date" : "Now select your return date"}</p><button type="button" className="calendar-clear" onClick={() => { onChange("", ""); onFlexibleChange(true); setOpen(false); }}>Keep dates flexible instead</button></div>}
    <label className="flexible-date-toggle"><input type="checkbox" checked={flexible} onChange={e => { if (e.target.checked) onChange("", ""); onFlexibleChange(e.target.checked); }} /><span>I’m flexible on dates</span></label>
  </div>;
}
export default function App() {
  const [trip, setTrip] = useState(getInitialTrip);
  const [profile, setProfile] = useState(getInitialProfile);
  const [savedTrips, setSavedTrips] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_TRIPS_KEY)) || []; }
    catch { return []; }
  });
  const [currentTripId, setCurrentTripId] = useState(() => (readSharedPayload() || getQueryParams().has("destination")) ? null : (() => {
    try { return JSON.parse(localStorage.getItem(KEY))?.currentTripId || null; }
    catch { return null; }
  })());
  const [page, setPage] = useState(() => readSharedPayload() ? "trip" : getQueryParams().has("destination") ? "profile" : "home");
  const [step, setStep] = useState(() => getQueryParams().has("destination") ? 1 : 0);
  const [expanded, setExpanded] = useState(0);
  const [activeDay, setActiveDay] = useState(0);
  const [addingForDay, setAddingForDay] = useState(-1);
  const [swappingActivityId, setSwappingActivityId] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("roamwise-theme") === "dark" ? "dark" : "light"; }
    catch { return "light"; }
  });

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ trip, profile, currentTripId })); } catch { /* Keep the current session usable when browser storage is unavailable. */ } }, [trip, profile, currentTripId]);
  useEffect(() => { try { localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(savedTrips)); } catch { /* Current session remains usable if storage is unavailable. */ } }, [savedTrips]);
  useEffect(() => {
    if ("serviceWorker" in navigator && import.meta.env.PROD) navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  }, []);
  useEffect(() => {
    try { localStorage.setItem("roamwise-theme", theme); } catch {}
  }, [theme]);
  // Every page transition starts at the top; don’t preserve a previous page’s scroll offset.
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [page]);

  const chosen = destinations.filter(d => trip.places.includes(d.id));
  const selected = activities.filter(a => trip.activities.includes(a.id) && trip.places.includes(a.place));
  const budgetBreakdown = { ...defaultBudgetBreakdown, ...(trip.budgetBreakdown || {}) };
  const dailyExtras = budgetBreakdown.accommodationPerNight + budgetBreakdown.foodPerDay + budgetBreakdown.localTransportPerDay + budgetBreakdown.extrasPerDay;
  const total = (selected.reduce((s, a) => s + a.cost, 0) + chosen.reduce((s, d) => s + d.cost, 0) + trip.days * dailyExtras) * trip.travelers;
  const notify = message => { setToast(message); window.setTimeout(() => setToast(""), 2300); };
  const shareCurrentTrip = async () => {
    const payload = { trip, profile: { ...profile, name: "" } };
    const encoded = window.btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const url = new URL(window.location.href);
    // Use a fragment for new share links so static hosting and link previews don't
    // interpret the trip payload as a route. Keep query-string parsing for old links.
    url.search = "";
    url.hash = new URLSearchParams({ share: encoded }).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: trip.title || `My ${trip.destination} trip`, text: "Take a look at this Roamwise itinerary.", url: url.toString() });
        notify("Share sheet opened.");
      } else {
        await navigator.clipboard.writeText(url.toString());
        notify("Share link copied.");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url.toString());
        notify("Share link copied.");
      } catch {
        window.prompt("Copy your Roamwise trip link", url.toString());
      }
    }
  };
  const exportItinerary = () => {
    const lines = [
      trip.title || `Your ${trip.destination} escape`,
      `${trip.destination} · ${trip.days} days · ${trip.travelers} traveller(s) · ${tripWhen(trip)}`,
      `Travel style: ${(profile.styles || []).join(", ") || "Flexible"} | Pace: ${profile.pace || "Balanced"} | Walking: ${profile.walking || "Some walking is fine"}`,
      "", "PLACES", ...chosen.map((place, i) => `${i + 1}. ${place.name}, ${place.country}`),
      "", "DAY-BY-DAY PLAN",
      ...days.flatMap(day => [`\nDay ${day.n}: ${day.place?.name || "Open day"}`, ...(day.activities.length ? day.activities.map(activity => `- ${activity.slot}: ${activity.name} (${activity.duration}; ${displayMoney(activity.cost, trip.currency)} per person)\n  ${activity.note}`) : ["- No activities planned yet."])]),
      "", "BUDGET ESTIMATE",
      `Approximate total for the group: ${displayMoney(total, trip.currency)}`,
      `Accommodation: ${displayMoney(budgetBreakdown.accommodationPerNight * trip.days * trip.travelers, trip.currency)} (per person/night assumption)`,
      `Food: ${displayMoney(budgetBreakdown.foodPerDay * trip.days * trip.travelers, trip.currency)}`,
      `Local transport: ${displayMoney(budgetBreakdown.localTransportPerDay * trip.days * trip.travelers, trip.currency)}`,
      `Other daily allowance: ${displayMoney(budgetBreakdown.extrasPerDay * trip.days * trip.travelers, trip.currency)}`,
      "Fixture prices and currency conversion are estimates, not live quotes. Check venue hours, access, transport and local advisories before travel.",
      "", "Shared links contain the itinerary payload. Only share with people you trust."
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(trip.title || trip.destination + "-itinerary").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "roamwise-itinerary"}.txt`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    notify("Itinerary downloaded.");
  };
  const saveCurrentTrip = () => {
    const id = currentTripId || `trip-${Date.now()}`;
    const saved = { id, title: trip.title || `Your ${trip.destination} escape`, trip: JSON.parse(JSON.stringify(trip)), profile: JSON.parse(JSON.stringify(profile)), savedAt: new Date().toISOString() };
    const next = currentTripId ? savedTrips.map(item => item.id === id ? saved : item) : [saved, ...savedTrips];
    if (currentTripId && !savedTrips.some(item => item.id === currentTripId)) next.unshift(saved);
    setSavedTrips(next);
    let persisted = true;
    try { localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(next)); } catch { persisted = false; }
    setCurrentTripId(id);
    notify(persisted ? (currentTripId ? "Saved trip updated." : "Trip added to Your trips.") : "Saved for this session only; browser storage is unavailable.");
  };
  const openSavedTrip = saved => {
    setTrip({ ...defaults, ...saved.trip });
    setProfile({ ...defaultProfile(), ...(saved.profile || {}) });
    setCurrentTripId(saved.id);
    setPage("trip");
    setExpanded(0);
    setActiveDay(0);
    setAddingForDay(-1);
  };
  const startNewTrip = () => {
    setTrip({ ...defaults, countries: [...defaults.countries], places: [...defaults.places], activities: [...defaults.activities] });
    setProfile(defaultProfile());
    setCurrentTripId(null);
    setPage("profile");
    setStep(0);
  };
  const deleteSavedTrip = id => {
    const next = savedTrips.filter(item => item.id !== id);
    setSavedTrips(next);
    try { localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(next)); } catch { /* Removal still applies for this session. */ }
    if (currentTripId === id) setCurrentTripId(null);
    notify("Trip removed from your saved trips.");
  };

  const changeScope = scope => {
    const starter = starterPlaces[scope] || starterPlaces.Japan;
    const names = { "Sri Lanka": "A little Sri Lankan magic", India: "An India escape", Thailand: "A Thailand adventure", Japan: "A little Japan adventure", Vietnam: "A Vietnam escape", Europe: "A little European grand tour" };
    const recommendedDays = starter.places.reduce((sum, id) => sum + Math.max(1, destinations.find(d => d.id === id)?.days || 1), 0);
    setTrip(t => ({ ...t, destination: scope, days: recommendedDays, countries: [...starter.countries], places: [...starter.places], activities: [...starter.activities], title: names[scope], startDate: "", endDate: "", flexibleDates: true, month: "Flexible dates" }));
  };
  const toggleCountry = country => setTrip(t => {
    const removing = t.countries.includes(country);
    const countries = removing ? t.countries.filter(c => c !== country) : [...t.countries, country];
    const countryPlaces = destinations.filter(d => d.scope === "Europe" && d.country === country);
    const removedPlaces = countryPlaces.map(d => d.id);
    let places = removing ? t.places.filter(id => !removedPlaces.includes(id)) : [...t.places];
    if (!removing && !places.some(id => countryPlaces.some(d => d.id === id))) {
      const first = countryPlaces[0];
      if (first) places.push(first.id);
    }
    const validActivityIds = activities.filter(a => places.includes(a.place)).map(a => a.id);
    const next = { ...t, countries, places, activities: t.activities.filter(id => validActivityIds.includes(id)) };
    return ensureCitiesForDuration(next, t.days);
  });
  const togglePlace = id => setTrip(t => {
    const adding = !t.places.includes(id);
    const places = adding ? [...t.places, id] : t.places.filter(x => x !== id);
    const placeActivities = activities.filter(a => a.place === id).slice(0, 2).map(a => a.id);
    const nextActivities = adding ? [...new Set([...t.activities, ...placeActivities])] : t.activities.filter(x => !placeActivities.includes(x));
    return { ...t, places, activities: nextActivities };
  });
  const toggleActivity = id => setTrip(t => ({ ...t, activities: t.activities.includes(id) ? t.activities.filter(x => x !== id) : [...t.activities, id] }));

  const countries = useMemo(() => [...new Set(destinations.filter(d => d.scope === "Europe").map(d => d.country))].sort(), []);
  const visibleDestinations = destinations.filter(d => trip.destination === "Europe"
    ? d.scope === "Europe" && (!trip.countries.length || trip.countries.includes(d.country))
    : d.scope === trip.destination);
  const placeCoordinates = Object.fromEntries(destinations.filter(d => d.coordinates).map(d => [d.id, [d.coordinates.lat, d.coordinates.lon]]));
  const mapBounds = {
    "Sri Lanka": "79.65,5.75,81.95,9.95", India: "68.0,6.0,97.5,35.5", Thailand: "97.0,5.0,106.0,21.0",
    Japan: "129.0,30.0,146.0,46.0", Vietnam: "102.0,8.0,110.0,24.0", Europe: "-1.0,35.0,19.0,56.0"
  };
  const days = useMemo(() => {
    const route = trip.places.map(id => destinations.find(d => d.id === id)).filter(Boolean);
    if (!route.length) return Array.from({ length: trip.days }, (_, i) => ({ n: i + 1, place: null, activities: [] }));
    // Keep each selected city contiguous. Allocate days across the route, weighted by suggested stay length.
    const assigned = route.slice(0, Math.min(route.length, trip.days));
    const counts = assigned.map(() => 1);
    const remaining = trip.days - counts.length;
    const totalWeight = assigned.reduce((sum, place) => sum + Math.max(1, place.days || 1), 0);
    const extras = assigned.map((place, index) => {
      const exact = remaining * Math.max(1, place.days || 1) / totalWeight;
      const whole = Math.floor(exact);
      counts[index] += whole;
      return { index, remainder: exact - whole };
    });
    const allocated = counts.reduce((sum, count) => sum + count, 0);
    extras.sort((a, b) => b.remainder - a.remainder).slice(0, trip.days - allocated).forEach(item => { counts[item.index] += 1; });
    const plan = [];
    assigned.forEach((place, index) => {
      // Start with the user’s chosen activities, then use the destination catalogue to fill
      // longer stays. This prevents selected starter activities from leaving later days empty.
      const selectedIds = new Set(trip.activities);
      const effortRank = activity => {
        const effort = String(activity.effort || "Medium").toLowerCase();
        const rank = effort === "low" ? 0 : effort === "high" ? 2 : 1;
        const paceRank = profile.pace === "Packed" ? 2 - rank : profile.pace === "Balanced" ? Math.abs(rank - 1) : rank;
        const mobilityPenalty = profile.walking === "Minimal walking" && rank === 2 ? 4 : 0;
        return paceRank + mobilityPenalty - (selectedIds.has(activity.id) ? 1 : 0);
      };
      const placeActivities = activities
        .filter(activity => activity.place === place.id)
        .sort((a, b) => effortRank(a) - effortRank(b));
      for (let day = 0; day < counts[index]; day += 1) {
        // Proportional boundaries distribute remainder activities across days instead of
        // creating a blank final day due to ceil-based chunk sizes.
        const start = Math.floor(day * placeActivities.length / counts[index]);
        const end = Math.floor((day + 1) * placeActivities.length / counts[index]);
        let dayActivities = placeActivities.slice(start, end);
        // If the stay is longer than the catalogue, reuse one relevant option on a different
        // day rather than silently presenting a zero-activity day. Never duplicate within a day.
        if (!dayActivities.length && placeActivities.length) {
          dayActivities = [placeActivities[day % placeActivities.length]];
        }
        plan.push({ n: plan.length + 1, place, activities: dayActivities });
      }
    });
    return plan.map(day => {
      const mode = trip.dayAdjustments?.[day.n - 1];
      return { ...day, adjustment: mode || "", activities: adjustDayActivities(day.activities, mode) };
    });
  }, [trip.days, trip.places, selected, profile.pace, profile.walking, profile.ageGroup, profile.travellingWith, trip.dayAdjustments]);

  return <div className="app" data-theme={theme}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header>
      <button className="brand" onClick={() => setPage("home")}><span><Compass size={21} /></span>Roamwise<span className="dot">.</span></button>
      <nav aria-label="Main navigation"><button className={page === "home" ? "nav-active" : ""} aria-current={page === "home" ? "page" : undefined} onClick={() => setPage("home")}>Explore</button><button className={page === "discover" ? "nav-active" : ""} aria-current={page === "discover" ? "page" : undefined} onClick={() => setPage("discover")}>Destinations</button><button className={page === "trips" ? "nav-active" : ""} aria-current={page === "trips" ? "page" : undefined} onClick={() => setPage("trips")}>Your trips <span className="nav-count">{savedTrips.length}</span></button></nav>
      <button className="theme-toggle" type="button" onClick={() => setTheme(current => current === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} aria-pressed={theme === "dark"} title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}<span>{theme === "dark" ? "Light mode" : "Dark mode"}</span></button>
    </header>

    {page === "home" && <main id="main-content">
      <section className="hero"><div><small className="eyebrow"><Sparkles size={14} /> A MORE PERSONAL WAY TO GET AWAY</small><h1>Less planning.<br /><em>More feeling</em> there.</h1><p>A travel planner that gets your kind of adventure. Pick a country or explore across Europe, then shape each day around your pace.</p><div className="actions"><button className="primary" onClick={startNewTrip}>Plan my escape <ArrowRight size={16} /></button><button className="link" onClick={() => setPage("discover")}>Browse destinations <ArrowRight size={14} /></button></div><small className="proof">✦ Thoughtful trips, at your rhythm · Built around you</small></div><div className="hero-image"><img src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1300&q=85" alt="Mountain lake travel landscape" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1300&q=85"; }} /><div className="float"><b>Your pace, your way</b><small>Slow mornings are allowed.</small></div><span className="stamp">GO<br />GENTLY</span></div></section>
      <section className="inspiration"><div className="section-head"><div><small className="eyebrow">A LITTLE INSPIRATION</small><h2>Where could you <em>wander?</em></h2></div><button className="link" onClick={() => setPage("discover")}>Find my kind of place →</button></div><div className="inspiration-grid">
        {[{ name: "India", meta: "Heritage · food · coast", img: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=900&q=85" }, { name: "Thailand", meta: "Street food · temples · beaches", img: "https://images.unsplash.com/photo-1613672803979-a6edfc5a179b?auto=format&fit=crop&w=900&q=85" }, { name: "Europe", meta: "Multiple countries · iconic cities", img: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=900&q=85" }].map(x => <button className="inspiration-card" key={x.name} onClick={() => { changeScope(x.name); setPage("discover"); }}><img src={x.img} alt={x.name} /><span><b>{x.name}</b><small>{x.meta}</small></span></button>)}
      </div></section>
      <section className="guide-discovery"><div className="section-head"><div><small className="eyebrow">TRIP IDEAS THAT FIT REAL PEOPLE</small><h2>Start with a little <em>inspiration.</em></h2><p>Practical guides for choosing a pace, a route and the right kind of trip.</p></div></div><div className="guide-grid">
        <a className="guide-card" href="guides/8-day-japan-itinerary-for-couples.html"><span>JAPAN · 8 DAYS</span><b>Japan at your own pace</b><small>City highlights with room to breathe.</small><i>Explore the guide →</i></a>
        <a className="guide-card" href="guides/thailand-itinerary-for-parents.html"><span>THAILAND · FAMILY</span><b>Thailand with parents</b><small>Comfortable transfers and less rushed days.</small><i>Explore the guide →</i></a>
        <a className="guide-card" href="guides/international-trips-with-older-parents.html"><span>TRAVEL SMARTER</span><b>International trips with older parents</b><small>Plan around the people, not assumptions about age.</small><i>Explore the guide →</i></a>
      </div></section>
      <section className="steps">{["Tell us your vibe", "Pick your places", "Make it yours"].map((s, i) => <div key={s}><b>0{i + 1}</b><strong>{s}</strong><small>{["Not just where. How you like to travel.", "Pick cities in one country or across Europe.", "A flexible itinerary that feels right."][i]}</small></div>)}</section>
    </main>}

    {page === "profile" && <main id="main-content" className="form-page"><button className="link" onClick={() => setPage("home")}>← Back to explore</button><div className="form-card"><small className="eyebrow">YOUR TRAVEL DNA · STEP {step + 1} OF 2</small>{step === 0 ? <><h1>What makes a trip<br /><em>feel like you?</em></h1><p>Choose up to three things you love. There are no wrong answers.</p><div className="styles">{styles.map(s => <button key={s} className={profile.styles.includes(s) ? "style selected" : "style"} onClick={() => setProfile(p => ({ ...p, styles: p.styles.includes(s) ? p.styles.filter(x => x !== s) : p.styles.length < 3 ? [...p.styles, s] : p.styles }))}><Check size={15} />{s}</button>)}</div><section className="traveller-profile"><div className="profile-section-head"><b>Who’s coming?</b><small>Choose the group, then tune the plan to your real preferences.</small></div><div className="traveller-chips">{["Solo", "Couple / partner", "Friends", "Children", "Parents / older adults", "Mixed-age family"].map(option => <button type="button" key={option} className={(profile.travellingWith || []).includes(option) ? "traveller-chip selected" : "traveller-chip"} aria-pressed={(profile.travellingWith || []).includes(option)} onClick={() => setProfile(p => { const current = p.travellingWith || []; const next = current.includes(option) ? current.filter(item => item !== option) : [...current, option]; return { ...p, travellingWith: next.length ? next : [option] }; })}>{option}</button>)}</div><div className="traveller-fields"><label>Age range of the group<select value={profile.ageGroup || "30–44"} onChange={e => setProfile(p => ({ ...p, ageGroup: e.target.value }))}>{["Under 18", "18–29", "30–44", "45–54", "55–69", "70+", "Mixed ages"].map(option => <option key={option}>{option}</option>)}</select></label><label>Preferred pace<select value={profile.pace || "Balanced"} onChange={e => setProfile(p => ({ ...p, pace: e.target.value }))}>{["Relaxed", "Balanced", "Packed"].map(option => <option key={option}>{option}</option>)}</select></label><label>Walking preference<select value={profile.walking || "Some walking is fine"} onChange={e => setProfile(p => ({ ...p, walking: e.target.value }))}>{["Minimal walking", "Some walking is fine", "Active days are fine"].map(option => <option key={option}>{option}</option>)}</select></label></div><p className="profile-explainer">Age never decides your trip for you. Pace and walking preferences help Roamwise rank activity suggestions while keeping the itinerary editable.</p></section><label>Your name (optional)<input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="What should we call you?" /></label><button className="primary full" onClick={() => setStep(1)}>Next: trip details →</button></> : <><h1>Let's shape your<br /><em>little escape.</em></h1><div className="fields"><label>Trip destination<select value={trip.destination} onChange={e => changeScope(e.target.value)}>{scopeOptions.map(x => <option key={x}>{x}</option>)}</select></label><label>Trip length<select value={trip.days} onChange={e => setTrip(t => ensureCitiesForDuration(t, +e.target.value))}>{[2, 3, 4, 5, 6, 7, 8, 10, 14, 21].map(n => <option key={n}>{n}</option>)}</select><small className="field-hint">Suggested: {Math.max(1, chosen.reduce((sum, place) => sum + Math.max(1, place.days || 1), 0))} days for {trip.places.length} {trip.places.length === 1 ? "city" : "cities"} · change it anytime.</small></label><label>Travellers<input type="number" min="1" max="12" value={trip.travelers} onChange={e => setTrip(t => ({ ...t, travelers: Math.max(1, +e.target.value || 1) }))} /></label><div className="date-field"><span>When?</span><DateRangePicker startDate={trip.startDate || ""} endDate={trip.endDate || ""} flexible={!!trip.flexibleDates} legacyLabel={trip.month} onFlexibleChange={value => setTrip(t => ({ ...t, flexibleDates: value, month: value ? "Flexible dates" : (t.month === "Flexible dates" ? "" : t.month) }))} onChange={(startDate, endDate) => setTrip(t => { const days = startDate && endDate ? Math.max(1, Math.round((new Date(endDate + "T12:00:00") - new Date(startDate + "T12:00:00")) / 86400000) + 1) : t.days; return { ...ensureCitiesForDuration(t, days), startDate, endDate, flexibleDates: false, month: startDate && endDate ? dateLabel(startDate) + " – " + dateLabel(endDate) : "Choose dates" }; })} /></div><label>Daily budget per person (approximate)<input type="number" min="0" step="10" value={trip.budget} onChange={e => setTrip(t => ({ ...t, budget: Math.max(0, Number(e.target.value) || 0) }))} /></label><label>Currency<select value={trip.currency} onChange={e => setTrip(t => ({ ...t, budget: Math.round(convertBudget(t.budget, t.currency, e.target.value)), currency: e.target.value }))}>{["USD", "INR", "EUR", "GBP", "LKR", "THB", "JPY", "VND"].map(x => <option key={x}>{x}</option>)}</select></label></div><div className="form-actions"><button className="link" onClick={() => setStep(0)}>← Back</button><button className="primary" onClick={() => setPage("discover")}>Find my places →</button></div></>}</div></main>}

    {page === "discover" && <main id="main-content" className="discover"><div className="section-head"><div><small className="eyebrow">A SHORTLIST WITH SOUL</small><h1>Places that fit <em>your kind of trip.</em></h1><p>Pick a trip destination first, then add the cities you want to explore. Prices are illustrative planning estimates, not live hotel, meal or transport quotes. Currency uses fixed reference rates (not live or cached FX). No live weather or booking-price API is connected; seasonal guidance is not a forecast. Confirm actual prices and conditions before booking.</p></div><b className="count">{trip.places.length} cities picked</b></div>
      <div className="scope-switch" aria-label="Trip destination">{scopeOptions.map(scope => <button key={scope} className={trip.destination === scope ? "scope-chip active" : "scope-chip"} onClick={() => changeScope(scope)}>{scope}</button>)}</div>
      {trip.destination === "Europe" && <section className="country-picker"><div><b>Choose countries</b><small>Pick one country or combine several for a multi-country Europe trip.</small></div><div className="country-chips">{countries.map(country => <button key={country} className={trip.countries.includes(country) ? "country-chip active" : "country-chip"} onClick={() => toggleCountry(country)}>{trip.countries.includes(country) && <Check size={13} />}{country}</button>)}</div><small>{trip.countries.length ? `Showing cities in ${trip.countries.join(", ")}` : "No countries selected — showing cities across Europe."}</small></section>}
      <div className="cards">{visibleDestinations.map(d => <article className={trip.places.includes(d.id) ? "place-card selected-place" : "place-card"} key={d.id}><div className="place-img"><img src={d.image} alt={`${d.name} destination`} loading="lazy" onError={e => { const img = e.currentTarget; img.onerror = null; img.style.display = "none"; img.parentElement.classList.add("image-fallback"); }} /><span>{d.country} · {d.region}</span><button className={trip.places.includes(d.id) ? "place-select selected" : "place-select"} onClick={() => togglePlace(d.id)} aria-label={trip.places.includes(d.id) ? "Remove city" : "Add city"} aria-pressed={trip.places.includes(d.id)}>{trip.places.includes(d.id) ? <><Check size={15} /> Selected</> : <><Plus size={16} /> Add</>}</button></div><div className="place-content"><h3>{d.name}</h3><b>{d.tagline}</b><p>{d.why}</p><small><MapPin size={13} />{d.travel} · {d.effort} effort</small><div className="place-footer"><strong>~{displayMoney(d.cost, trip.currency)} <small>/ person</small></strong><button className="link" onClick={() => togglePlace(d.id)}>{trip.places.includes(d.id) ? "✓ Selected · Remove" : "＋ Add to trip"}</button></div></div></article>)}</div>
      <div className="sticky"><span><b>{trip.places.length} cities selected</b><small>Mix cities at your own pace. Add a city to include its starter activities.</small></span><button className="primary" disabled={!trip.places.length} onClick={() => { setPage("trip"); setExpanded(0); }}>Build my itinerary <ArrowRight size={16} /></button></div>
    </main>}

    {page === "trips" && <main id="main-content" className="saved-trips-page"><div className="section-head"><div><small className="eyebrow">YOUR TRAVEL COLLECTION</small><h1>Your trips, <em>your way.</em></h1><p>Only trips you explicitly save appear here. Your in-progress planning stays a draft until you save it.</p></div><button className="primary" onClick={startNewTrip}><Plus size={16} /> Plan another trip</button></div>
      {savedTrips.length === 0 ? <section className="empty-trips"><span className="empty-trips-icon"><Compass size={28} /></span><h2>Your next adventure starts here.</h2><p>You haven't saved any trips yet. Build an itinerary, then choose <b>Save this trip</b> to keep it in this collection.</p><button className="primary" onClick={startNewTrip}>Plan my first trip <ArrowRight size={16} /></button></section> : <div className="saved-trip-grid">{savedTrips.map(saved => { const t = saved.trip; const placeNames = destinations.filter(d => t.places.includes(d.id)).map(d => d.name); const image = destinations.find(d => t.places.includes(d.id))?.image; return <article className="saved-trip-card" key={saved.id}><div className="saved-trip-image">{image && <img src={image} alt={t.destination} onError={e => { e.currentTarget.style.display = "none"; }} />}<span>{t.destination}{t.destination === "Europe" && t.countries?.length ? ` · ${t.countries.join(" + ")}` : ""}</span></div><div className="saved-trip-content"><small className="eyebrow">{t.days} DAYS · {t.travelers} TRAVELLERS</small><h2>{saved.title || `Your ${t.destination} escape`}</h2><p>{placeNames.length ? placeNames.join(" · ") : "No cities selected yet"}</p><div className="saved-trip-meta"><span><MapPin size={14} /> {t.places.length} {t.places.length === 1 ? "city" : "cities"}</span><span><CalendarDays size={14} /> {tripWhen(t)}</span></div><div className="saved-trip-actions"><button className="primary" onClick={() => openSavedTrip(saved)}>Open itinerary <ArrowRight size={15} /></button><button className="delete-trip" onClick={() => deleteSavedTrip(saved.id)} aria-label={`Delete ${saved.title}`} title="Delete saved trip">Remove</button></div></div></article>; })}</div>}
    </main>}

    {page === "trip" && <main id="main-content" className="trip">
      <div className="trip-topline">
        <div className="trip-heading">
          <small className="eyebrow">YOUR ITINERARY</small>
          <h1>{trip.title || `Your ${trip.destination} escape`}</h1>
          <p><MapPin size={13} /> {trip.destination}{trip.destination === "Europe" && trip.countries.length ? ` · ${trip.countries.join(" + ")}` : ""} <span>·</span> <CalendarDays size={13} /> {trip.days} days <span>·</span> <Users size={13} /> {trip.travelers} travellers <span>·</span> {tripWhen(trip)}</p><p className="traveller-summary"><Users size={13} /> {(profile.travellingWith || []).join(" + ") || "Travellers"} · {profile.ageGroup || "Age flexible"} · {profile.pace || "Balanced"} pace · {profile.walking || "Some walking is fine"}</p>{profile.name.trim() && <p className="personal-note">Made for {profile.name.trim()}, around your kind of travel.</p>}
        </div>
        <div className="trip-top-actions"><button className="secondary" onClick={() => { setPage("profile"); setStep(0); }}>Edit traveller profile</button><button className="secondary" onClick={() => setProfile(p => ({ ...p, pace: "Relaxed", walking: "Minimal walking" }))}>Prefer gentler days</button><button className="secondary" onClick={shareCurrentTrip}><Share2 size={15} /> Share trip</button><button className="secondary" onClick={exportItinerary}><Download size={15} /> Export .txt</button><button className="secondary" onClick={() => window.print()}><Printer size={15} /> Print / PDF</button><button className="primary" onClick={saveCurrentTrip}><Check size={15} /> {currentTripId ? "Update saved trip" : "Save trip"}</button></div>
      </div>
      {trip.flexibleDates && <section className="climate-card"><div className="climate-icon"><Sparkles size={18} /></div><div><small className="eyebrow">A GOOD TIME TO GO</small><h2>Best time to visit {trip.destination}</h2><p><b>{climateTips[trip.destination]?.season}</b></p><p className="climate-temperature">Typical temperatures: {climateTips[trip.destination]?.temperature}</p><p>{climateTips[trip.destination]?.note} Seasonal guidance only · no live forecast is connected. Check official weather and local advisories close to departure.</p></div></section>}
      <section className="map-disclosure">
        <button className="map-disclosure-toggle" aria-expanded={showMap} onClick={() => setShowMap(v => !v)}>
          <span className="map-toggle-icon"><MapPin size={17} /></span><span><b>Map & locations</b><small>{chosen.length ? chosen.map(p => p.name).join(" · ") : "Choose places to see them here"}</small></span><span className="map-toggle-action">{showMap ? "Hide map" : "Explore map"} <ChevronDown size={15} /></span>
        </button>
        {showMap && <div className="map-disclosure-content">
          <div className="map-frame-wrap">
            <div className="map-route-actions">
              <a className="map-open-link" href={"https://www.google.com/maps/dir/?api=1" + (chosen.length ? "&origin=" + encodeURIComponent(chosen[0].name + ", " + chosen[0].country) : "") + (chosen.length > 1 ? "&destination=" + encodeURIComponent(chosen[chosen.length - 1].name + ", " + chosen[chosen.length - 1].country) : chosen.length === 1 ? "&destination=" + encodeURIComponent(chosen[0].name + ", " + chosen[0].country) : "") + (chosen.length > 2 ? "&waypoints=" + chosen.slice(1, -1).map(p => encodeURIComponent(p.name + ", " + p.country)).join("%7C") : "") + "&travelmode=driving"} target="_blank" rel="noreferrer">Plan this route in Google Maps <ArrowRight size={14} /></a>
              <small>Opens turn-by-turn directions in Google Maps</small>
            </div>
            <InteractiveRouteMap points={chosen.filter(place => placeCoordinates[place.id]).map(place => ({ id: place.id, name: place.name, country: place.country, coords: placeCoordinates[place.id] }))} />
          </div>
          <div className="map-location-list"><small className="eyebrow">YOUR PLACES</small>{chosen.length ? chosen.map((place, index) => { const planned = selected.filter(activity => activity.place === place.id); const nearby = activities.filter(activity => activity.place === place.id); return <div className="map-location" key={place.id}><span className="map-location-number">{String(index+1).padStart(2,"0")}</span><div><b>{place.name}</b><small>{place.country} · {planned.length} planned · {nearby.length} ideas</small><span>{nearby.slice(0,2).map(activity => activity.name).join(" · ") || place.tagline}</span></div></div>; }) : <p className="empty">Add places to your trip to see their locations and activity ideas.</p>}</div>
        </div>}
      </section>
      <div className="itinerary-layout">
        <section className="itinerary-main">
          <div className="section-head itinerary-title"><div><h2>The days, your way</h2><p>Swap, add or skip anything. This is a flexible starting point.</p></div><button className="link" onClick={() => setPage("discover")}>Change cities ↗</button></div>
          <p className="planning-disclaimer">Personalised planning suggestions and offline estimates. Transit allowances are not live routes; opening hours, accessibility and conditions need checking.</p>
          <div className="journey-strip" aria-label="Visual day-by-day route">
            <div className="journey-strip-head"><span className="eyebrow">YOUR JOURNEY</span><span>{days.length} days · {chosen.length} {chosen.length === 1 ? "stop" : "stops"}</span></div>
            <div className="journey-scroll">
              <div className="journey-path" style={{"--journey-count": days.length}}>
                <svg className="journey-road" viewBox={`0 0 ${Math.max(1,days.length-1)*180+100} 180`} preserveAspectRatio="none" aria-hidden="true">
                  <path d={`M 48 90 ${days.map((d,i)=>{const x=48+i*180;return i===0?"":`Q ${x-45} ${i%2===0?28:152} ${x} 90`;}).join(" ")}`} />
                </svg>
                {days.map((d,i)=><button key={d.n} className={`journey-stop journey-stop-${i%2===0?"top":"bottom"} ${activeDay===i?"journey-stop-active":""}`} aria-pressed={activeDay===i} onClick={()=>{setActiveDay(i);setAddingForDay(-1);}}>
                  <span className="journey-pin"><span>{String(d.n).padStart(2,"0")}</span></span>
                  <span className="journey-photo">{d.place?.image?<img src={d.place.image} alt={`${d.place.name} destination`} loading="lazy" onError={e=>{const img=e.currentTarget;img.onerror=null;img.style.display="none";img.parentElement.classList.add("journey-photo-fallback");}}/>:<span className="journey-photo-placeholder"><MapPin size={18}/></span>}</span>
                  <span className="journey-stop-copy"><b>{d.place?.name||"Open day"}</b><small>{d.activities.length} {d.activities.length===1?"activity":"activities"}</small></span>
                </button>)}
              </div>
            </div>
          </div><div className="day-tabs" role="tablist" aria-label="Itinerary days">
            {days.map((d, i) => <button key={d.n} role="tab" aria-selected={activeDay === i} className={activeDay === i ? "day-tab active" : "day-tab"} onClick={() => { setActiveDay(i); setAddingForDay(-1); }}><small>DAY</small><b>{String(d.n).padStart(2, "0")}</b><span>{d.place?.name || "Open day"}</span></button>)}
          </div>
          {days[activeDay] && (() => { const d = days[activeDay]; const candidates = (d.place ? activities.filter(a => a.place === d.place.id) : activities.filter(a => trip.places.includes(a.place))).filter(a => !trip.activities.includes(a.id) && isSuitableActivitySuggestion(a, profile)); return <article className="active-day-panel" key={d.n}>
            <div className="active-day-heading"><div><small className="eyebrow">DAY {d.n} · {(d.place?.name || "OPEN DAY").toUpperCase()}</small><h3>{!d.place ? "Leave room for a new discovery" : d.n === 1 ? "Arrive & find your rhythm" : d.n === trip.days ? "Leave room for one last memory" : d.place.tagline}</h3><p>{d.place ? `${d.place.country} · ${d.activities.length} activities planned` : "Choose a city to start your itinerary"}</p></div><span className="day-count">{d.activities.length} planned</span></div>
            <section className="day-adjustments" aria-label="Offline itinerary adjustments">
              <div className="day-adjustments-head"><b>Adjust this day</b><small>Offline planning rules · not live intelligence</small></div>
              <div className="adjustment-actions">
                {[["gentler","Gentler day"],["food-culture","More food & culture"],["less-walking","Less walking"],["running-late","Running late"]].map(([mode,label]) => <button type="button" key={mode} className={d.adjustment === mode ? "adjustment-chip active" : "adjustment-chip"} aria-pressed={d.adjustment === mode} onClick={() => { setTrip(t => { const next = { ...(t.dayAdjustments || {}) }; if (next[d.n - 1] === mode) delete next[d.n - 1]; else next[d.n - 1] = mode; return { ...t, dayAdjustments: next }; }); notify(d.adjustment === mode ? "Day adjustment cleared." : label + " applied."); }}>{label}</button>)}
                {d.adjustment && <button type="button" className="adjustment-reset" onClick={() => setTrip(t => { const next = { ...(t.dayAdjustments || {}) }; delete next[d.n - 1]; return { ...t, dayAdjustments: next }; })}>Reset</button>}
              </div>
            </section>
            <section className="day-fit-card">
              <small className="eyebrow">WHY THIS DAY WORKS FOR US</small>
              <p>{d.activities.length ? `Built around your ${(profile.styles || []).slice(0, 2).join(" and ").toLowerCase() || "travel"} preferences, a ${(profile.pace || "Balanced").toLowerCase()} pace and ${(profile.walking || "some walking is fine").toLowerCase()}.` : "Keep this day open or add an activity that suits your group."}</p>
              <div className="day-workload">
                <span><b>{getDayWorkload(d, profile).hours}h</b><small>estimated day block</small></span>
                <span><b>{Math.round(getDayWorkload(d, profile).activityMins / 60 * 10) / 10}h</b><small>activity time</small></span>
                <span><b>{Math.round(getDayWorkload(d, profile).transitMins)}m</b><small>transit allowance</small></span>
                <span><b>{getDayWorkload(d, profile).breakMins}m</b><small>meal/rest break</small></span>
              </div>
              <p className="workload-note">{getDayWorkload(d, profile).overloaded ? "This may be too packed for your selected pace. Remove a stop or choose a gentler adjustment." : "A rough workload estimate with room for breaks. Transit is a 20-minute-per-transfer planning allowance, not a route calculation."}</p>
            </section>
            {d.activities.length ? <div className="activity-list">{d.activities.map(a => <div className="activity activity-row" key={a.id}><div className="activity-time"><small>{a.slot}</small><span>{a.duration}</span></div><div className="activity-copy"><b>{a.name}</b><p>{a.note}</p><p className="activity-fit-reason"><strong>Why it fits:</strong> {activityFitReason(a, profile, d.place)}</p><small>{displayMoney(a.cost, trip.currency)} per person · {a.effort} effort · {activityMinutes(a)} min activity time</small></div><div className="activity-actions"><button className="inline-action" onClick={() => setSwappingActivityId(swappingActivityId === a.id ? null : a.id)} aria-expanded={swappingActivityId === a.id} title="Choose a replacement activity">Swap</button><button className="inline-action skip-action" onClick={() => { toggleActivity(a.id); setSwappingActivityId(null); notify("Activity skipped."); }} title="Skip this activity">Skip</button></div>{swappingActivityId === a.id && <div className="swap-options"><b>Choose an alternative</b>{activities.filter(x => x.place === a.place && x.id !== a.id && !trip.activities.includes(x.id) && isSuitableActivitySuggestion(x, profile)).length ? activities.filter(x => x.place === a.place && x.id !== a.id && !trip.activities.includes(x.id) && isSuitableActivitySuggestion(x, profile)).map(option => <button key={option.id} className="swap-option" onClick={() => { setTrip(t => ({ ...t, activities: [...t.activities.filter(id => id !== a.id), option.id] })); setSwappingActivityId(null); notify("Swapped in " + option.name + "."); }}><span><strong>{option.name}</strong><small>{option.slot} · {option.duration} · {option.effort} effort · {displayMoney(option.cost, trip.currency)}</small></span><ArrowRight size={15} /></button>) : <p className="empty">No unused alternatives yet for this city. Add an activity or skip this one.</p>}</div>}</div>)}</div> : <p className="empty-day">A little room to breathe. Add an activity below or choose another city.</p>}
            <div className="add-activity-area"><button className="add-activity-button" onClick={() => setAddingForDay(addingForDay === d.n ? -1 : d.n)}><Plus size={15} /> Add an activity <ChevronDown size={14} /></button>
              {addingForDay === d.n && <div className="activity-picker">{candidates.length ? candidates.slice(0, 8).map(a => <button key={a.id} className="activity-option" onClick={() => { toggleActivity(a.id); setAddingForDay(-1); notify(`${a.name} added to your plan.`); }}><span><b>{a.name}</b><small>{a.slot} · {a.duration} · {displayMoney(a.cost, trip.currency)}</small></span><Plus size={15} /></button>) : <p className="empty">No more suggested activities for this day. You can change cities to explore more options.</p>}</div>}
            </div>
          </article>; })()}
        </section>
        <aside className="itinerary-sidebar">
          <div className="itinerary-summary-card"><small className="eyebrow">TRIP SNAPSHOT</small><h3>Looking good.</h3><div className="sidebar-stats"><div><span>Cities</span><b>{trip.places.length}</b></div><div><span>Days</span><b>{trip.days}</b></div><div><span>Travellers</span><b>{trip.travelers}</b></div></div><div className="sidebar-budget"><div><span>Estimated total</span><b>{displayMoney(total, trip.currency)}</b></div><div className="budget-meter"><i style={{ width: `${Math.min(100, total / Math.max(trip.budget * trip.days * trip.travelers * (USD_PER_UNIT[trip.currency] || 1), 1) * 100)}%` }} /></div><small>{Math.min(100, Math.round(total / Math.max(trip.budget * trip.days * trip.travelers * (USD_PER_UNIT[trip.currency] || 1), 1) * 100))}% of your {money(trip.budget * trip.days * trip.travelers, trip.currency)} trip budget</small><small className="estimate-disclaimer">Planning estimate · fixed reference FX, not live rates or prices</small></div><details className="budget-editor"><summary>Edit cost assumptions</summary><p>Per person, in {trip.currency}. Zero accommodation means lodging is excluded.</p><div className="budget-editor-fields">{[["accommodationPerNight","Stay / night"],["foodPerDay","Food / day"],["localTransportPerDay","Local transport / day"],["extrasPerDay","Other / day"]].map(([key,label]) => <label key={key}>{label}<span className="budget-input-wrap"><span>{trip.currency}</span><input aria-label={label} type="number" min="0" step="5" value={Math.round((budgetBreakdown[key] / (USD_PER_UNIT[trip.currency] || 1)) * 100) / 100} onChange={e => setTrip(t => ({ ...t, budgetBreakdown: { ...defaultBudgetBreakdown, ...(t.budgetBreakdown || {}), [key]: Math.max(0, Number(e.target.value) || 0) * (USD_PER_UNIT[t.currency] || 1) } }))} /></span></label>)}</div><small className="estimate-disclaimer">Activity and destination amounts come from curated fixtures. Adjust these assumptions to reflect your plans.</small></details><div className="sidebar-note"><Check size={15} /><span>Your itinerary stays editable. Save when you're ready to keep it in Your trips.</span></div><button className="secondary sidebar-save" onClick={() => setPage("trips")}>Your trips ({savedTrips.length})</button></div>
        </aside>
      </div>
      <div className="save-banner"><div><small className="eyebrow">YOUR TRIP, READY WHEN YOU ARE</small><h2>Keep the plan. Keep the <em>possibility.</em></h2><p>{currentTripId ? "This trip is saved in Your trips. Update it whenever plans change." : "This is a draft until you choose to save it."}</p></div><div className="save-actions"><button className="secondary" onClick={() => setPage("trips")}>Your trips ({savedTrips.length})</button><button className="primary" onClick={saveCurrentTrip}>{currentTripId ? "Update saved trip" : "Save this trip"} <Check size={15} /></button></div></div>
    </main>}
    <footer><span><Compass size={15} /> Roamwise<span className="dot">.</span></span><small>Made for the way you wander.</small></footer>{toast && <div className="toast">{toast}</div>}
  </div>;
}
