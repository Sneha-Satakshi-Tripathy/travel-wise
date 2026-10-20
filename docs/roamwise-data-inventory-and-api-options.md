# Roamwise data inventory and API sourcing plan

Updated: 20 October 2026. Roamwise currently uses a React/Vite frontend, JSON fixtures and browser localStorage; there is no backend or live travel-data integration in this branch. This inventory describes the current code/data, not a promise that each value is correct for a specific travel date.

## Data currently hardcoded or fixture-driven

| Data point | Current source / where | Meaning | Reliability risk |
|---|---|---|---|
| Supported destination scopes | \`scopeOptions\` in \`src/App.jsx\` | India, Thailand, Japan, Vietnam, Europe, Sri Lanka | Manually curated coverage |
| City/destination catalog | \`src/data/destinations.json\` | IDs, names, country/region, copy, recommended days, cost, effort, travel hint, image URL | Manually maintained; may become stale |
| Activity catalog | \`src/data/activities.json\` | IDs, city, name, time slot, duration, cost, effort, notes | Manual descriptions and assumptions |
| Activity duration and time slot | \`activities.json\` | e.g. “2 hr”, Morning/Afternoon/Evening | Not venue-confirmed; no exact start/end times |
| Activity effort | \`activities.json\` | Low/Medium/High | Subjective; not measured walking distance or accessibility |
| Activity and destination costs | \`activities.json\`, \`destinations.json\` | Approximate USD-based values | Not current ticket prices, meal prices or quotes |
| Daily baseline budget | \`src/App.jsx\` total formula | Fixed $45 per day per traveller | Hardcoded, not destination-specific |
| Currency conversion | \`USD_PER_UNIT\` in \`src/App.jsx\` | Approximate USD conversion constants | Stale FX rates; not live conversion |
| Recommended stay length | Destination \`days\` + route allocator | Distributes days across selected places | Rule-based, not itinerary optimisation |
| Destination coordinates | \`placeCoordinates\` in \`src/App.jsx\` | Fixed latitude/longitude for selected city IDs | Manually embedded city-centre approximations |
| Map extent | \`mapBounds\` in \`src/App.jsx\` | Fixed map bounds per destination | Static extent, not a computed trip map |
| Seasonal guidance | \`climateTips\` in \`src/App.jsx\` | Broad best-season text and typical temperatures | General guidance, not forecast or official warnings |
| Images | Unsplash URLs in App and destination JSON | Hero, cards and destination imagery | Wrong/missing image risk; usage rights need checking |
| Traveller profile | Defaults + localStorage/shared URL | Style, group, age range, pace, walking preference | User-provided; not external data |
| Personalisation ranking | JavaScript effort/style heuristics | Reorders suggestions based on profile | Heuristic, not AI/live evidence |
| Transit between activities | New planning estimate | 20-minute allowance per transfer in a day | Explicitly approximate; no routing service |
| Breaks and overload warning | New local formula | 30–60 minute break allowance and 6/8-hour threshold | Heuristic, not safety/accessibility guarantee |
| Share/saved trips | URL-encoded trip/profile and localStorage | User-created itinerary state | Anyone with the link can see its payload; saves are browser-specific |

## API options by data point

Pricing/quotas below are provider-published figures checked 20 Oct 2026. They may change; verify before production. Prefer documented APIs and licensed datasets over scraping.

| Need | Options and free allowance | Fit / caveats |
|---|---|---|
| Weather forecast | **Open-Meteo** free API: under 10,000 calls/day, 5,000/hour, 600/minute for non-commercial use; CC BY 4.0 attribution and no uptime guarantee. Commercial use needs customer API/licence. | Good first weather integration if non-commercial terms fit; cache by coordinates/date and show forecast timestamp. [Terms](https://open-meteo.com/en/terms), [pricing](https://open-meteo.com/en/pricing). |
| Places, POIs, opening hours/categories | **Foursquare Places API**: pricing page advertises up to 10,000 select Pro endpoint calls for testing; separate pricing notice says 500 free Pro calls from 1 Jun 2026 for specified tiers/endpoints. Confirm the current endpoint-specific plan. | Structured POI source; hours/photos/details may be separately billed. [Pricing](https://foursquare.com/products/places-api/), [pricing changes](https://docs.foursquare.com/developer/reference/upcoming-changes). |
| Places, geocoding and routing | **Geoapify** free tier: 3,000 credits/day, up to 5 requests/sec; many simple geocoding/places/routing calls cost one credit, routing options and long routes can cost more. Commercial use allowed within quota with attribution. | Strong single-provider prototype choice for geocoding, POI discovery and route estimates. [Pricing](https://www.geoapify.com/pricing/), [routing costs](https://apidocs.geoapify.com/docs/routing/). |
| Maps, geocoding, places and routing | **Google Maps Platform**: per-SKU free usage caps, then pay-as-you-go; India pricing differs. Published India table shows 70,000 monthly free events for Routes Essentials and Geocoding, 35,000 for Places Nearby/Text Search Pro. SKU and billing terms apply. | Strong coverage, but costs can grow if called on every render. Cache, restrict keys, set quotas/budget alerts. [India price list](https://developers.google.com/maps/billing-and-pricing/pricing-india?hl=en), [pricing overview](https://developers.google.com/maps/billing-and-pricing/overview?hl=en). |
| Open map and geocoding | **OpenStreetMap + public Nominatim**: maximum 1 request/second and strict usage policy; no production SLA. | Don't use public Nominatim for bulk POI harvesting, autocomplete or systematic searches. Use a compliant hosted provider/own service for production and attribute OSM. [Policy](https://operations.osmfoundation.org/policies/nominatim/). |
| Tourism POI discovery | **OpenTripMap**: key and plan-dependent quota; confirm current plan. | Candidate source for tourist attractions; check coverage, photo rights, attribution and current quotas. [API](https://opentripmap.io/product). |
| Currency rates | **Frankfurter** (central-bank sourced open API) or **ExchangeRate-API** free plan (quota/terms apply). | Fetch daily server-side and cache. Display as indicative FX, not bank/card rates. [Frankfurter](https://frankfurter.dev/), [ExchangeRate-API](https://www.exchangerate-api.com/). |
| Images | **Wikimedia Commons API** or provider-supplied place photos. | Store licence and attribution metadata. Do not scrape or rehost photos without confirming rights. [Commons API](https://www.mediawiki.org/wiki/API:Main_page), [Unsplash licence](https://unsplash.com/license). |
| Opening hours, closures, ticket prices | Venue/attraction official APIs or official sites where terms allow; Places providers may supply hours. | No single safe global API covers every attraction. Use licensed fields or official links; show “verify before visit” if unknown. |
| Visa, entry rules, travel advisories | Official immigration, foreign ministry, embassy and destination authority pages/feeds where available. | No universal free global API guarantees complete visa rules. Avoid scraping against terms; source date and passport-specific caveats are essential. |
| Natural-disaster/severe-weather alerts | Official national weather and emergency feeds; USGS feeds for global earthquake events. | Provider depends on country/hazard. Timestamp alerts and link to official advice; no alert is not proof of safety. |
| Transit times | Geoapify Routing, Google Routes or licensed local transit APIs; OpenRouteService is another plan-based option. | Route from coordinates. Don't infer driving time from straight-line distance or the current 20-minute allowance. |
| Personalisation | Keep profile choices in-app; optional LLM later | No external API required. Don't let a model invent live hours, prices or accessibility details. |

## Suggested rollout

1. Keep the curated destination/activity catalog as a quality-controlled fallback.
2. Add Geoapify (or comparable provider) behind a small server-side proxy for POI search, geocoding and routing; cache responses and avoid unrestricted frontend API keys.
3. Add Open-Meteo only if the non-commercial licence fits; otherwise select a commercial plan/provider.
4. Replace fixed FX constants with a daily cached exchange-rate feed; keep estimates labelled.
5. Add verified opening hours only for displayed activities, with a source timestamp and “check official site” fallback.
6. Link official entry/advisory sources by destination and passport context.
7. Store image source, licence and attribution in the data model.

## Engineering and safety notes

- Prefer APIs, feeds and licensed datasets over scraping. Follow provider terms, attribution, retention and redistribution rules.
- Cache/deduplicate requests; never call APIs on every component render.
- Keep secret keys in a backend/serverless function; restrict browser keys by domain and API.
- Show last-updated timestamps and honest “not available” states.
- Transit is a planning estimate, not a guarantee. Activity effort is not step-free access or medical suitability.
- Keep personal names and sensitive traveller details out of third-party requests unless necessary and consented to.


## Interactive map implementation

- The itinerary map now loads Leaflet on demand from its public CDN and uses OpenStreetMap tiles with visible attribution.
- Selected cities with coordinates are numbered markers; selecting several cities draws a dashed connecting line and frames the route in view. This line is a geographic guide, not road routing or a travel-time estimate.
- The primary route action opens Google Maps directions for the selected cities. Map-library or tile failures show a fallback message rather than breaking itinerary planning.
- The map requires connectivity to load the library and map tiles. For higher production traffic, review OpenStreetMap tile usage policy and consider a hosted tile provider; use a routing API if turn-by-turn road geometry is required.
