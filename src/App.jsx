import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronDown, Compass, Heart, MapPin, Plus, RotateCcw, Sparkles, Users } from "lucide-react";
import destinations from "./data/destinations.json";
import activities from "./data/activities.json";

const KEY = "roamwise-v1";
const scopeOptions = ["Sri Lanka", "India", "Thailand", "Japan", "Vietnam", "Europe"];
const starterPlaces = {
  "Sri Lanka": { countries: [], places: ["kandy", "nuwara-eliya", "galle"], activities: ["temple", "lake", "market", "tea", "train", "fort", "sunset"] },
  India: { countries: [], places: ["jaipur", "goa", "kochi"], activities: ["jaipur-fort", "jaipur-food", "goa-beach", "goa-old-town", "kochi-fort", "kochi-food"] },
  Thailand: { countries: [], places: ["bangkok", "chiang-mai", "krabi"], activities: ["bangkok-temples", "bangkok-food", "chiang-temples", "chiang-market", "krabi-beach", "krabi-food"] },
  Japan: { countries: [], places: ["tokyo", "kyoto", "osaka"], activities: ["tokyo-neighbourhood", "tokyo-food", "kyoto-temples", "kyoto-tea", "osaka-market", "osaka-food"] },
  Vietnam: { countries: [], places: ["hanoi", "hoi-an", "ho-chi-minh-city"], activities: ["hanoi-old-quarter", "hanoi-food", "hoi-an-old-town", "hoi-an-cooking", "hcmc-history", "hcmc-food"] },
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
  const [profile, setProfile] = useState({ name: "", styles: ["Culture & history", "Slow living"] });
  const [page, setPage] = useState("home");
  const [step, setStep] = useState(0);
  const [expanded, setExpanded] = useState(0);
  const [toast, setToast] = useState("");

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify({ trip, profile })); }, [trip, profile]);

  const chosen = destinations.filter(d => trip.places.includes(d.id));
  const selected = activities.filter(a => trip.activities.includes(a.id) && trip.places.includes(a.place));
  const total = (selected.reduce((s, a) => s + a.cost, 0) + chosen.reduce((s, d) => s + d.cost, 0) + trip.days * 45) * trip.travelers;
  const notify = message => { setToast(message); window.setTimeout(() => setToast(""), 2300); };

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
  const days = useMemo(() => Array.from({ length: trip.days }, (_, i) => {
    const place = trip.places.length ? destinations.find(d => d.id === trip.places[i % trip.places.length]) : null;
    return { n: i + 1, place, activities: place ? selected.filter(a => a.place === place.id) : [] };
  }), [trip.days, trip.places, selected]);

  return <div className="app">
    <header>
      <button className="brand" onClick={() => setPage("home")}><span><Compass size={21} /></span>roamwise<span className="dot">.</span></button>
      <nav><button onClick={() => setPage("home")}>Explore</button><button onClick={() => setPage("discover")}>Destinations</button><button onClick={() => setPage("trip")}>My trip</button></nav>
    </header>

    {page === "home" && <main>
      <section className="hero"><div><small className="eyebrow"><Sparkles size={14} /> YOUR NEXT CHAPTER STARTS HERE</small><h1>Less planning.<br /><em>More feeling</em> there.</h1><p>A travel planner that gets your kind of adventure. Pick a country or explore across Europe, then shape each day around your pace.</p><div className="actions"><button className="primary" onClick={() => { setPage("profile"); setStep(0); }}>Plan my escape <ArrowRight size={16} /></button><button className="link" onClick={() => setPage("trip")}>Explore the demo ↗</button></div><small className="proof">✦ Thoughtful trips, at your rhythm · Built around you</small></div><div className="hero-image"><img src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1300&q=85" alt="Mountain lake travel landscape" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1300&q=85"; }} /><div className="float"><b>Your pace, your way</b><small>Slow mornings are allowed.</small></div><span className="stamp">GO<br />GENTLY</span></div></section>
      <section className="inspiration"><div className="section-head"><div><small className="eyebrow">A LITTLE INSPIRATION</small><h2>Where could you <em>wander?</em></h2></div><button className="link" onClick={() => setPage("discover")}>Find my kind of place →</button></div><div className="inspiration-grid">
        {[{ name: "India", meta: "Heritage · food · coast", img: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=900&q=85" }, { name: "Thailand", meta: "Street food · temples · beaches", img: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=900&q=85" }, { name: "Europe", meta: "Multiple countries · iconic cities", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=85" }].map(x => <button className="inspiration-card" key={x.name} onClick={() => { changeScope(x.name); setPage("discover"); }}><img src={x.img} alt={x.name} /><span><b>{x.name}</b><small>{x.meta}</small></span></button>)}
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

    {page === "trip" && <main className="trip"><div className="section-head"><div><small className="eyebrow">YOUR TRIP CANVAS · DEMO DATA</small><h1>{trip.title || `Your ${trip.destination} escape`}</h1><p><MapPin size={13} /> {trip.destination}{trip.destination === "Europe" && trip.countries.length ? ` · ${trip.countries.join(" + ")}` : ""}　·　<CalendarDays size={13} /> {trip.days} days · {trip.month}　·　<Users size={13} /> {trip.travelers} travellers</p></div><button className="secondary" onClick={() => { setPage("profile"); setStep(1); }}>Edit trip</button></div>
      <section className="summary"><img onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=85"; }} src={trip.destination === "India" ? "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=85" : trip.destination === "Thailand" ? "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=85" : trip.destination === "Japan" ? "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=85" : trip.destination === "Vietnam" ? "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=85" : trip.destination === "Europe" ? "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=85" : "https://images.unsplash.com/photo-1588598198321-9735fd5f4f4b?auto=format&fit=crop&w=1200&q=85"} alt={trip.destination} /><div className="summary-stats"><div><small>Cities to explore</small><b>{trip.places.length}</b></div><div><small>Days to wander</small><b>{trip.days}</b></div><div><small>Rough estimate</small><b>{money(total, trip.currency)}</b></div><div className="budget"><span>Budget snapshot</span><b>{Math.min(100, Math.round(total / Math.max(trip.budget * trip.travelers, 1) * 100))}%</b><div className="meter"><i style={{ width: `${Math.min(100, total / Math.max(trip.budget * trip.travelers, 1) * 100)}%` }} /></div></div></div></section>
      <div className="trip-grid"><section><div className="section-head"><div><h2>The days, your way</h2><p>Swap, add or skip anything. This is a flexible starting point.</p></div><button className="link" onClick={() => setPage("discover")}>Change cities ↗</button></div>{days.map((d, i) => <article className="day" key={d.n}><button className="day-head" onClick={() => setExpanded(expanded === i ? -1 : i)}><span className="day-num">{String(d.n).padStart(2, "0")}</span><span><small>DAY {d.n} · {(d.place?.name || "OPEN DAY").toUpperCase()}</small><b>{!d.place ? "Leave room for a new discovery" : i === 0 ? "Arrive & find your rhythm" : i === trip.days - 1 ? "Leave room for one last memory" : d.place.tagline}</b><small>{d.place ? `${d.place.country} · ${d.activities.length} moments planned` : "Choose a city to start your itinerary"}</small></span><ChevronDown size={18} /></button>{expanded === i && <div className="day-activities">{d.activities.length ? d.activities.map(a => <div className="activity" key={a.id}><div><small>{a.slot} · {a.duration}</small><b>{a.name}</b><p>{a.note}</p><small>{money(a.cost, trip.currency)} per person · {a.effort} effort</small></div><button onClick={() => toggleActivity(a.id)} className={trip.activities.includes(a.id) ? "activity-on" : "activity-toggle"}>{trip.activities.includes(a.id) ? <Check size={15} /> : <Plus size={15} />}</button></div>) : <p className="empty">A little room to breathe. Add a city or choose activities for this day.</p>}<button className="link" onClick={() => setPage("discover")}>+ Find more things to do</button></div>}</article>)}</section>
        <aside><div className="aside-card"><small className="eyebrow">MADE FOR YOUR RHYTHM</small><h3>Your trip, thoughtfully.</h3><p>Based on your love of {profile.styles.join(" & ") || "exploring"} and a balanced pace.</p><ul><li>Plan one country or combine countries across Europe.</li><li>Effort and estimated cost shown upfront.</li><li>Activities can change without starting over.</li></ul></div><div className="warning"><b>Prototype note</b><p>Prices, routes and activity details are illustrative. Check official sources before travelling.</p></div><button className="link" onClick={() => { localStorage.removeItem(KEY); setTrip(defaults); setProfile({ name: "", styles: ["Culture & history", "Slow living"] }); setPage("home"); setStep(0); notify("Demo reset — ready for a fresh start."); }}><RotateCcw size={14} /> Reset demo</button></aside></div>
      <div className="save-banner"><div><small className="eyebrow">A TRIP THAT FEELS LIKE YOU</small><h2>Keep the plan. Keep the <em>possibility.</em></h2><p>Your plan is saved locally on this device.</p></div><button className="primary" onClick={() => notify("Your trip is saved locally on this device.")}>Save this trip <Check size={15} /></button></div>
    </main>}
    <footer><span><Compass size={15} /> roamwise<span className="dot">.</span></span><small>Made for the way you wander.</small><small>Prototype · no live travel data</small></footer>{toast && <div className="toast">{toast}</div>}
  </div>;
}
