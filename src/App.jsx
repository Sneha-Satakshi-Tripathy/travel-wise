import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronDown, Compass, Heart, MapPin, Plus, Sparkles, Users } from "lucide-react";
import destinations from "./data/destinations.json";
import activities from "./data/activities.json";

const KEY = "roamwise-v1";
const SAVED_TRIPS_KEY = "roamwise-saved-trips-v1";
const scopeOptions = ["India", "Thailand", "Japan", "Vietnam", "Europe", "Sri Lanka"];
const starterPlaces = {
  "Sri Lanka": { countries: [], places: ["kandy", "nuwara-eliya", "galle"], activities: ["temple", "lake", "market", "tea", "train", "fort", "sunset"] },
  India: { countries: [], places: ["jaipur", "goa", "kochi"], activities: ["jaipur-fort", "jaipur-food", "goa-beach", "goa-old-town", "kochi-fort", "kochi-food"] },
  Thailand: { countries: [], places: ["bangkok", "chiang-mai", "krabi"], activities: ["bangkok-temples", "bangkok-food", "chiang-temples", "chiang-market", "krabi-beach", "krabi-food"] },
  Japan: { countries: [], places: ["tokyo", "kyoto", "osaka"], activities: ["tokyo-neighbourhood", "tokyo-food", "kyoto-temples", "kyoto-tea", "osaka-market", "osaka-food"] },
  Vietnam: { countries: [], places: ["hanoi", "ninh-binh", "ha-long-bay", "da-nang", "hoi-an", "ho-chi-minh-city"], activities: ["hanoi-old-quarter", "hanoi-food", "ninh-binh-boat", "ninh-binh-cycling", "halong-cruise", "halong-kayak", "danang-beach", "danang-marble", "hoi-an-old-town", "hoi-an-cooking", "hcmc-history", "hcmc-food"] },
  Europe: { countries: ["France", "Italy"], places: ["paris", "rome", "florence"], activities: ["paris-landmarks", "paris-cafe", "rome-ancient", "rome-food", "florence-art", "florence-food"] }
};
const defaults = { destination: "Sri Lanka", days: 5, travelers: 2, month: "Flexible dates", budget: 1800, currency: "USD", countries: starterPlaces["Sri Lanka"].countries, places: starterPlaces["Sri Lanka"].places, activities: starterPlaces["Sri Lanka"].activities, title: "A little Sri Lankan magic" };
const styles = ["Culture & history", "Slow living", "Adventure seeker", "Food-led explorer", "Sun & sea", "Nature lover"];
const money = (n, c = "USD") => {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n); }
  catch { return `${c} ${Math.round(n)}`; }
};

export default function App() {
  const [trip, setTrip] = useState(() => {
    try { return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY))?.trip || {}) }; }
    catch { return defaults; }
  });
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY))?.profile || { name: "", styles: ["Culture & history", "Slow living"] }; }
    catch { return { name: "", styles: ["Culture & history", "Slow living"] }; }
  });
  const [savedTrips, setSavedTrips] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_TRIPS_KEY)) || []; }
    catch { return []; }
  });
  const [currentTripId, setCurrentTripId] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY))?.currentTripId || null; }
    catch { return null; }
  });
  const [page, setPage] = useState("home");
  const [step, setStep] = useState(0);
  const [expanded, setExpanded] = useState(0);
  const [activeDay, setActiveDay] = useState(0);
  const [addingForDay, setAddingForDay] = useState(-1);
  const [showMap, setShowMap] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify({ trip, profile, currentTripId })); }, [trip, profile, currentTripId]);
  useEffect(() => { localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(savedTrips)); }, [savedTrips]);

  const chosen = destinations.filter(d => trip.places.includes(d.id));
  const selected = activities.filter(a => trip.activities.includes(a.id) && trip.places.includes(a.place));
  const total = (selected.reduce((s, a) => s + a.cost, 0) + chosen.reduce((s, d) => s + d.cost, 0) + trip.days * 45) * trip.travelers;
  const notify = message => { setToast(message); window.setTimeout(() => setToast(""), 2300); };
  const saveCurrentTrip = () => {
    const id = currentTripId || `trip-${Date.now()}`;
    const saved = { id, title: trip.title || `Your ${trip.destination} escape`, trip: JSON.parse(JSON.stringify(trip)), profile: JSON.parse(JSON.stringify(profile)), savedAt: new Date().toISOString() };
    const next = currentTripId ? savedTrips.map(item => item.id === id ? saved : item) : [saved, ...savedTrips];
    if (currentTripId && !savedTrips.some(item => item.id === currentTripId)) next.unshift(saved);
    setSavedTrips(next);
    localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(next));
    setCurrentTripId(id);
    notify(currentTripId ? "Saved trip updated." : "Trip added to Your trips.");
  };
  const openSavedTrip = saved => {
    setTrip({ ...defaults, ...saved.trip });
    setProfile(saved.profile || { name: "", styles: ["Culture & history", "Slow living"] });
    setCurrentTripId(saved.id);
    setPage("trip");
    setExpanded(0);
    setActiveDay(0);
    setAddingForDay(-1);
  };
  const startNewTrip = () => {
    setTrip({ ...defaults, countries: [...defaults.countries], places: [...defaults.places], activities: [...defaults.activities] });
    setProfile({ name: "", styles: ["Culture & history", "Slow living"] });
    setCurrentTripId(null);
    setPage("profile");
    setStep(0);
  };
  const deleteSavedTrip = id => {
    const next = savedTrips.filter(item => item.id !== id);
    setSavedTrips(next);
    localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(next));
    if (currentTripId === id) setCurrentTripId(null);
    notify("Trip removed from your saved trips.");
  };

  const changeScope = scope => {
    const starter = starterPlaces[scope] || starterPlaces["Sri Lanka"];
    const names = { "Sri Lanka": "A little Sri Lankan magic", India: "An India escape", Thailand: "A Thailand adventure", Japan: "A little Japan adventure", Vietnam: "A Vietnam escape", Europe: "A little European grand tour" };
    setTrip(t => ({ ...t, destination: scope, countries: [...starter.countries], places: [...starter.places], activities: [...starter.activities], title: names[scope] }));
  };
  const toggleCountry = country => setTrip(t => {
    const countries = t.countries.includes(country) ? t.countries.filter(c => c !== country) : [...t.countries, country];
    const removedPlaces = destinations.filter(d => d.scope === "Europe" && d.country === country).map(d => d.id);
    const places = t.countries.includes(country) ? t.places.filter(id => !removedPlaces.includes(id)) : t.places;
    const validActivityIds = activities.filter(a => places.includes(a.place)).map(a => a.id);
    return { ...t, countries, places, activities: t.activities.filter(id => validActivityIds.includes(id)) };
  });
  const togglePlace = id => setTrip(t => {
    const adding = !t.places.includes(id);
    const places = adding ? [...t.places, id] : t.places.filter(x => x !== id);
    const placeActivities = activities.filter(a => a.place === id).map(a => a.id);
    const nextActivities = adding ? [...new Set([...t.activities, ...placeActivities])] : t.activities.filter(x => !placeActivities.includes(x));
    return { ...t, places, activities: nextActivities };
  });
  const toggleActivity = id => setTrip(t => ({ ...t, activities: t.activities.includes(id) ? t.activities.filter(x => x !== id) : [...t.activities, id] }));

  const countries = useMemo(() => [...new Set(destinations.filter(d => d.scope === "Europe").map(d => d.country))].sort(), []);
  const visibleDestinations = destinations.filter(d => trip.destination === "Europe"
    ? d.scope === "Europe" && (!trip.countries.length || trip.countries.includes(d.country))
    : d.scope === trip.destination);
  const placeCoordinates = {
    kandy: [7.2906, 80.6337], "nuwara-eliya": [6.9497, 80.7891], galle: [6.0535, 80.221], sigiriya: [7.957, 80.7603], mirissa: [5.9483, 80.4716],
    jaipur: [26.9124, 75.7873], goa: [15.2993, 74.124], kochi: [9.9312, 76.2673], udaipur: [24.5854, 73.7125], varanasi: [25.3176, 82.9739],
    bangkok: [13.7563, 100.5018], "chiang-mai": [18.7883, 98.9853], krabi: [8.0863, 98.9063], phuket: [7.8804, 98.3923], ayutthaya: [14.3532, 100.5689],
    tokyo: [35.6762, 139.6503], kyoto: [35.0116, 135.7681], osaka: [34.6937, 135.5023],
    hanoi: [21.0278, 105.8342], "ninh-binh": [20.2506, 105.9745], "ha-long-bay": [20.9101, 107.1839], "da-nang": [16.0544, 108.2022], "hoi-an": [15.8801, 108.338], hue: [16.4637, 107.5909], "da-lat": [11.9404, 108.4583], "phong-nha": [17.5916, 106.283], "ho-chi-minh-city": [10.8231, 106.6297],
    paris: [48.8566, 2.3522], nice: [43.7102, 7.262], lyon: [45.764, 4.8357], rome: [41.9028, 12.4964], florence: [43.7696, 11.2558], venice: [45.4408, 12.3155],
    zurich: [47.3769, 8.5417], lucerne: [47.0502, 8.3093], barcelona: [41.3874, 2.1686], madrid: [40.4168, -3.7038], amsterdam: [52.3676, 4.9041]
  };
  const mapBounds = {
    "Sri Lanka": "79.65,5.75,81.95,9.95", India: "68.0,6.0,97.5,35.5", Thailand: "97.0,5.0,106.0,21.0",
    Japan: "129.0,30.0,146.0,46.0", Vietnam: "102.0,8.0,110.0,24.0", Europe: "-1.0,35.0,19.0,56.0"
  };
  const days = useMemo(() => Array.from({ length: trip.days }, (_, i) => {
    const place = trip.places.length ? destinations.find(d => d.id === trip.places[i % trip.places.length]) : null;
    return { n: i + 1, place, activities: place ? selected.filter(a => a.place === place.id) : [] };
  }), [trip.days, trip.places, selected]);

  return <div className="app">
    <header>
      <button className="brand" onClick={() => setPage("home")}><span><Compass size={21} /></span>Travel wise<span className="dot">.</span></button>
      <nav aria-label="Main navigation"><button className={page === "home" ? "nav-active" : ""} aria-current={page === "home" ? "page" : undefined} onClick={() => setPage("home")}>Explore</button><button className={page === "discover" ? "nav-active" : ""} aria-current={page === "discover" ? "page" : undefined} onClick={() => setPage("discover")}>Destinations</button><button className={page === "trips" ? "nav-active" : ""} aria-current={page === "trips" ? "page" : undefined} onClick={() => setPage("trips")}>Your trips <span className="nav-count">{savedTrips.length}</span></button></nav>
    </header>

    {page === "home" && <main>
      <section className="hero"><div><small className="eyebrow"><Sparkles size={14} /> A MORE PERSONAL WAY TO GET AWAY</small><h1>Less planning.<br /><em>More feeling</em> there.</h1><p>A travel planner that gets your kind of adventure. Pick a country or explore across Europe, then shape each day around your pace.</p><div className="actions"><button className="primary" onClick={startNewTrip}>Plan my escape <ArrowRight size={16} /></button><button className="link" onClick={() => setPage("discover")}>Browse destinations <ArrowRight size={14} /></button></div><small className="proof">✦ Thoughtful trips, at your rhythm · Built around you</small></div><div className="hero-image"><img src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1300&q=85" alt="Mountain lake travel landscape" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1300&q=85"; }} /><div className="float"><b>Your pace, your way</b><small>Slow mornings are allowed.</small></div><span className="stamp">GO<br />GENTLY</span></div></section>
      <section className="inspiration"><div className="section-head"><div><small className="eyebrow">A LITTLE INSPIRATION</small><h2>Where could you <em>wander?</em></h2></div><button className="link" onClick={() => setPage("discover")}>Find my kind of place →</button></div><div className="inspiration-grid">
        {[{ name: "India", meta: "Heritage · food · coast", img: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=900&q=85" }, { name: "Thailand", meta: "Street food · temples · beaches", img: "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=900&q=85" }, { name: "Europe", meta: "Multiple countries · iconic cities", img: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=900&q=85" }].map(x => <button className="inspiration-card" key={x.name} onClick={() => { changeScope(x.name); setPage("discover"); }}><img src={x.img} alt={x.name} /><span><b>{x.name}</b><small>{x.meta}</small></span></button>)}
      </div></section>
      <section className="steps">{["Tell us your vibe", "Pick your places", "Make it yours"].map((s, i) => <div key={s}><b>0{i + 1}</b><strong>{s}</strong><small>{["Not just where. How you like to travel.", "Pick cities in one country or across Europe.", "A flexible itinerary that feels right."][i]}</small></div>)}</section>
    </main>}

    {page === "profile" && <main className="form-page"><button className="link" onClick={() => setPage("home")}>← Back to explore</button><div className="form-card"><small className="eyebrow">YOUR TRAVEL DNA · STEP {step + 1} OF 2</small>{step === 0 ? <><h1>What makes a trip<br /><em>feel like you?</em></h1><p>Choose up to three things you love. There are no wrong answers.</p><div className="styles">{styles.map(s => <button key={s} className={profile.styles.includes(s) ? "style selected" : "style"} onClick={() => setProfile(p => ({ ...p, styles: p.styles.includes(s) ? p.styles.filter(x => x !== s) : p.styles.length < 3 ? [...p.styles, s] : p.styles }))}><Check size={15} />{s}</button>)}</div><label>Your name (optional)<input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="What should we call you?" /></label><button className="primary full" onClick={() => setStep(1)}>Next: trip details →</button></> : <><h1>Let's shape your<br /><em>little escape.</em></h1><div className="fields"><label>Trip destination<select value={trip.destination} onChange={e => changeScope(e.target.value)}>{scopeOptions.map(x => <option key={x}>{x}</option>)}</select></label><label>Trip length<select value={trip.days} onChange={e => setTrip(t => ({ ...t, days: +e.target.value }))}>{[2, 3, 4, 5, 6, 7, 8, 10, 14, 21].map(n => <option key={n}>{n}</option>)}</select></label><label>Travellers<input type="number" min="1" max="12" value={trip.travelers} onChange={e => setTrip(t => ({ ...t, travelers: Math.max(1, +e.target.value || 1) }))} /></label><label>When?<select value={trip.month} onChange={e => setTrip(t => ({ ...t, month: e.target.value }))}>{["Flexible dates", "January–March", "April–June", "July–September", "October–December"].map(x => <option key={x}>{x}</option>)}</select></label><label>Budget per person<input type="number" value={trip.budget} onChange={e => setTrip(t => ({ ...t, budget: Math.max(100, +e.target.value || 100) }))} /></label><label>Currency<select value={trip.currency} onChange={e => setTrip(t => ({ ...t, currency: e.target.value }))}>{["USD", "INR", "EUR", "GBP", "LKR", "THB"].map(x => <option key={x}>{x}</option>)}</select></label></div><div className="form-actions"><button className="link" onClick={() => setStep(0)}>← Back</button><button className="primary" onClick={() => setPage("discover")}>Find my places →</button></div></>}</div></main>}

    {page === "discover" && <main className="discover"><div className="section-head"><div><small className="eyebrow">A SHORTLIST WITH SOUL</small><h1>Places that fit <em>your kind of trip.</em></h1><p>Pick a trip destination first, then add the cities you want to explore. Costs and travel times are illustrative, not live data.</p></div><b className="count">{trip.places.length} cities picked</b></div>
      <div className="scope-switch" aria-label="Trip destination">{scopeOptions.map(scope => <button key={scope} className={trip.destination === scope ? "scope-chip active" : "scope-chip"} onClick={() => changeScope(scope)}>{scope}</button>)}</div>
      {trip.destination === "Europe" && <section className="country-picker"><div><b>Choose countries</b><small>Pick one country or combine several for a multi-country Europe trip.</small></div><div className="country-chips">{countries.map(country => <button key={country} className={trip.countries.includes(country) ? "country-chip active" : "country-chip"} onClick={() => toggleCountry(country)}>{trip.countries.includes(country) && <Check size={13} />}{country}</button>)}</div><small>{trip.countries.length ? `Showing cities in ${trip.countries.join(", ")}` : "No countries selected — showing cities across Europe."}</small></section>}
      <div className="cards">{visibleDestinations.map(d => <article className={trip.places.includes(d.id) ? "place-card selected-place" : "place-card"} key={d.id}><div className="place-img"><img src={d.image} alt={d.name} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=85"; }} /><span>{d.country} · {d.region}</span><button className={trip.places.includes(d.id) ? "place-select selected" : "place-select"} onClick={() => togglePlace(d.id)} aria-label={trip.places.includes(d.id) ? "Remove city" : "Add city"} aria-pressed={trip.places.includes(d.id)}>{trip.places.includes(d.id) ? <><Check size={15} /> Selected</> : <><Plus size={16} /> Add</>}</button></div><div className="place-content"><h3>{d.name}</h3><b>{d.tagline}</b><p>{d.why}</p><small><MapPin size={13} />{d.travel} · {d.effort} effort</small><div className="place-footer"><strong>~{money(d.cost, trip.currency)} <small>/ person</small></strong><button className="link" onClick={() => togglePlace(d.id)}>{trip.places.includes(d.id) ? "✓ Selected · Remove" : "＋ Add to trip"}</button></div></div></article>)}</div>
      <div className="sticky"><span><b>{trip.places.length} cities selected</b><small>Mix cities at your own pace. Add a city to include its starter activities.</small></span><button className="primary" disabled={!trip.places.length} onClick={() => { setPage("trip"); setExpanded(0); }}>Build my itinerary <ArrowRight size={16} /></button></div>
    </main>}

    {page === "trips" && <main className="saved-trips-page"><div className="section-head"><div><small className="eyebrow">YOUR TRAVEL COLLECTION</small><h1>Your trips, <em>your way.</em></h1><p>Only trips you explicitly save appear here. Your in-progress planning stays a draft until you save it.</p></div><button className="primary" onClick={startNewTrip}><Plus size={16} /> Plan another trip</button></div>
      {savedTrips.length === 0 ? <section className="empty-trips"><span className="empty-trips-icon"><Compass size={28} /></span><h2>Your next adventure starts here.</h2><p>You haven't saved any trips yet. Build an itinerary, then choose <b>Save this trip</b> to keep it in this collection.</p><button className="primary" onClick={startNewTrip}>Plan my first trip <ArrowRight size={16} /></button></section> : <div className="saved-trip-grid">{savedTrips.map(saved => { const t = saved.trip; const placeNames = destinations.filter(d => t.places.includes(d.id)).map(d => d.name); const image = destinations.find(d => t.places.includes(d.id))?.image; return <article className="saved-trip-card" key={saved.id}><div className="saved-trip-image">{image && <img src={image} alt={t.destination} onError={e => { e.currentTarget.style.display = "none"; }} />}<span>{t.destination}{t.destination === "Europe" && t.countries?.length ? ` · ${t.countries.join(" + ")}` : ""}</span></div><div className="saved-trip-content"><small className="eyebrow">{t.days} DAYS · {t.travelers} TRAVELLERS</small><h2>{saved.title || `Your ${t.destination} escape`}</h2><p>{placeNames.length ? placeNames.join(" · ") : "No cities selected yet"}</p><div className="saved-trip-meta"><span><MapPin size={14} /> {t.places.length} {t.places.length === 1 ? "city" : "cities"}</span><span><CalendarDays size={14} /> {t.month}</span></div><div className="saved-trip-actions"><button className="primary" onClick={() => openSavedTrip(saved)}>Open itinerary <ArrowRight size={15} /></button><button className="delete-trip" onClick={() => deleteSavedTrip(saved.id)} aria-label={`Delete ${saved.title}`} title="Delete saved trip">Remove</button></div></div></article>; })}</div>}
    </main>}

    {page === "trip" && <main className="trip">
      <div className="trip-topline">
        <div className="trip-heading">
          <small className="eyebrow">YOUR ITINERARY</small>
          <h1>{trip.title || `Your ${trip.destination} escape`}</h1>
          <p><MapPin size={13} /> {trip.destination}{trip.destination === "Europe" && trip.countries.length ? ` · ${trip.countries.join(" + ")}` : ""} <span>·</span> <CalendarDays size={13} /> {trip.days} days <span>·</span> <Users size={13} /> {trip.travelers} travellers <span>·</span> {trip.month}</p>
        </div>
        <div className="trip-top-actions"><button className="secondary" onClick={() => { setPage("profile"); setStep(1); }}>Edit trip</button><button className="primary" onClick={saveCurrentTrip}><Check size={15} /> {currentTripId ? "Update saved trip" : "Save trip"}</button></div>
      </div>
      <section className="map-disclosure">
        <button className="map-disclosure-toggle" aria-expanded={showMap} onClick={() => setShowMap(v => !v)}>
          <span className="map-toggle-icon"><MapPin size={17} /></span><span><b>Map & locations</b><small>{chosen.length ? chosen.map(p => p.name).join(" · ") : "Choose places to see them here"}</small></span><span className="map-toggle-action">{showMap ? "Hide map" : "Explore map"} <ChevronDown size={15} /></span>
        </button>
        {showMap && <div className="map-disclosure-content">
          <div className="map-frame-wrap">
            {(() => { const first = chosen[0]; const coords = placeCoordinates[first?.id] || (trip.destination === "Sri Lanka" ? [7.8,80.7] : trip.destination === "India" ? [20.6,78.9] : trip.destination === "Thailand" ? [15.8,101] : trip.destination === "Japan" ? [36.2,138.2] : trip.destination === "Vietnam" ? [16.0,107.5] : [46.0,10.0]); return <iframe title={"Map of " + trip.destination + " trip locations"} loading="lazy" src={"https://www.openstreetmap.org/export/embed.html?bbox=" + (mapBounds[trip.destination] || mapBounds["Sri Lanka"]) + "&layer=mapnik&marker=" + coords[0] + "," + coords[1]} />; })()}
            <a className="map-open-link" href={"https://www.google.com/maps/dir/" + chosen.map(p => encodeURIComponent(p.name + ", " + p.country)).join("/")} target="_blank" rel="noreferrer">Open route in Google Maps ↗</a>
          </div>
          <div className="map-location-list"><small className="eyebrow">YOUR PLACES</small>{chosen.length ? chosen.map((place, index) => { const planned = selected.filter(activity => activity.place === place.id); const nearby = activities.filter(activity => activity.place === place.id); return <div className="map-location" key={place.id}><span className="map-location-number">{String(index+1).padStart(2,"0")}</span><div><b>{place.name}</b><small>{place.country} · {planned.length} planned · {nearby.length} ideas</small><span>{nearby.slice(0,2).map(activity => activity.name).join(" · ") || place.tagline}</span></div></div>; }) : <p className="empty">Add places to your trip to see their locations and activity ideas.</p>}</div>
        </div>}
      </section>
      <div className="itinerary-layout">
        <section className="itinerary-main">
          <div className="section-head itinerary-title"><div><h2>The days, your way</h2><p>Swap, add or skip anything. This is a flexible starting point.</p></div><button className="link" onClick={() => setPage("discover")}>Change cities ↗</button></div>
          <div className="journey-strip" aria-label="Visual day-by-day route">
            <div className="journey-strip-head"><span className="eyebrow">YOUR JOURNEY</span><span>{days.length} days · {chosen.length} {chosen.length === 1 ? "stop" : "stops"}</span></div>
            <div className="journey-scroll">
              <div className="journey-path" style={{"--journey-count": days.length}}>
                <svg className="journey-road" viewBox={`0 0 ${Math.max(1,days.length-1)*180+100} 180`} preserveAspectRatio="none" aria-hidden="true">
                  <path d={`M 48 90 ${days.map((d,i)=>{const x=48+i*180;return i===0?"":`Q ${x-45} ${i%2===0?28:152} ${x} 90`;}).join(" ")}`} />
                </svg>
                {days.map((d,i)=><button key={d.n} className={`journey-stop journey-stop-${i%2===0?"top":"bottom"} ${activeDay===i?"journey-stop-active":""}`} aria-pressed={activeDay===i} onClick={()=>{setActiveDay(i);setAddingForDay(-1);}}>
                  <span className="journey-pin"><span>{String(d.n).padStart(2,"0")}</span></span>
                  <span className="journey-photo">{d.place?.image?<img src={d.place.image} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display="none";}}/>:<span className="journey-photo-placeholder"><MapPin size={18}/></span>}</span>
                  <span className="journey-stop-copy"><b>{d.place?.name||"Open day"}</b><small>{d.activities.length} {d.activities.length===1?"activity":"activities"}</small></span>
                </button>)}
              </div>
            </div>
          </div><div className="day-tabs" role="tablist" aria-label="Itinerary days">
            {days.map((d, i) => <button key={d.n} role="tab" aria-selected={activeDay === i} className={activeDay === i ? "day-tab active" : "day-tab"} onClick={() => { setActiveDay(i); setAddingForDay(-1); }}><small>DAY</small><b>{String(d.n).padStart(2, "0")}</b><span>{d.place?.name || "Open day"}</span></button>)}
          </div>
          {days[activeDay] && (() => { const d = days[activeDay]; const candidates = d.place ? activities.filter(a => a.place === d.place.id && !trip.activities.includes(a.id)) : activities.filter(a => trip.places.includes(a.place) && !trip.activities.includes(a.id)); return <article className="active-day-panel" key={d.n}>
            <div className="active-day-heading"><div><small className="eyebrow">DAY {d.n} · {(d.place?.name || "OPEN DAY").toUpperCase()}</small><h3>{!d.place ? "Leave room for a new discovery" : d.n === 1 ? "Arrive & find your rhythm" : d.n === trip.days ? "Leave room for one last memory" : d.place.tagline}</h3><p>{d.place ? `${d.place.country} · ${d.activities.length} activities planned` : "Choose a city to start your itinerary"}</p></div><span className="day-count">{d.activities.length} planned</span></div>
            {d.activities.length ? <div className="activity-list">{d.activities.map(a => <div className="activity activity-row" key={a.id}><div className="activity-time"><small>{a.slot}</small><span>{a.duration}</span></div><div className="activity-copy"><b>{a.name}</b><p>{a.note}</p><small>{money(a.cost, trip.currency)} per person · {a.effort} effort</small></div><div className="activity-actions"><button className="inline-action" onClick={() => { const options = activities.filter(x => x.place === a.place && !trip.activities.includes(x.id)); if (options.length) { setTrip(t => ({ ...t, activities: [...t.activities.filter(id => id !== a.id), options[0].id] })); notify(`Swapped in ${options[0].name}.`); } else { setTrip(t => ({ ...t, activities: t.activities.filter(id => id !== a.id) })); notify("Activity skipped — add another when you like."); } }} title="Replace with another activity">Swap</button><button className="inline-action skip-action" onClick={() => { toggleActivity(a.id); notify("Activity skipped."); }} title="Skip this activity">Skip</button></div></div>)}</div> : <p className="empty-day">A little room to breathe. Add an activity below or choose another city.</p>}
            <div className="add-activity-area"><button className="add-activity-button" onClick={() => setAddingForDay(addingForDay === d.n ? -1 : d.n)}><Plus size={15} /> Add an activity <ChevronDown size={14} /></button>
              {addingForDay === d.n && <div className="activity-picker">{candidates.length ? candidates.slice(0, 8).map(a => <button key={a.id} className="activity-option" onClick={() => { toggleActivity(a.id); setAddingForDay(-1); notify(`${a.name} added to your plan.`); }}><span><b>{a.name}</b><small>{a.slot} · {a.duration} · {money(a.cost, trip.currency)}</small></span><Plus size={15} /></button>) : <p className="empty">No more suggested activities for this day. You can change cities to explore more options.</p>}</div>}
            </div>
          </article>; })()}
        </section>
        <aside className="itinerary-sidebar">
          <div className="itinerary-summary-card"><small className="eyebrow">TRIP SNAPSHOT</small><h3>Looking good.</h3><div className="sidebar-stats"><div><span>Cities</span><b>{trip.places.length}</b></div><div><span>Days</span><b>{trip.days}</b></div><div><span>Travellers</span><b>{trip.travelers}</b></div></div><div className="sidebar-budget"><div><span>Estimated total</span><b>{money(total, trip.currency)}</b></div><div className="budget-meter"><i style={{ width: `${Math.min(100, total / Math.max(trip.budget * trip.travelers, 1) * 100)}%` }} /></div><small>{Math.min(100, Math.round(total / Math.max(trip.budget * trip.travelers, 1) * 100))}% of your {money(trip.budget * trip.travelers, trip.currency)} total budget</small></div><div className="sidebar-note"><Check size={15} /><span>Your itinerary stays editable. Save when you're ready to keep it in Your trips.</span></div><button className="secondary sidebar-save" onClick={() => setPage("trips")}>Your trips ({savedTrips.length})</button></div>
        </aside>
      </div>
      <div className="save-banner"><div><small className="eyebrow">YOUR TRIP, READY WHEN YOU ARE</small><h2>Keep the plan. Keep the <em>possibility.</em></h2><p>{currentTripId ? "This trip is saved in Your trips. Update it whenever plans change." : "This is a draft until you choose to save it."}</p></div><div className="save-actions"><button className="secondary" onClick={() => setPage("trips")}>Your trips ({savedTrips.length})</button><button className="primary" onClick={saveCurrentTrip}>{currentTripId ? "Update saved trip" : "Save this trip"} <Check size={15} /></button></div></div>
    </main>}
    <footer><span><Compass size={15} /> Travel wise<span className="dot">.</span></span><small>Made for the way you wander.</small></footer>{toast && <div className="toast">{toast}</div>}
  </div>;
}
