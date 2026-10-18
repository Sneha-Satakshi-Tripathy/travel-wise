# Travel wise

A responsive, frontend-only travel-planning prototype built with React and Vite. Travel wise helps you choose a trip scope, shortlist cities, assemble a flexible day-by-day itinerary, and see illustrative budget estimates.

## Current prototype

- **Trip scopes:** Sri Lanka, India, Thailand, Japan, Vietnam, and Europe.
- **Hierarchical planning:** choose India, Thailand, Japan or Vietnam as a country-level trip; choose Europe as a multi-country region, select one or more countries, then shortlist cities within those countries.
- **Seeded city catalog:** Sri Lanka (Sigiriya, Kandy, Nuwara Eliya, Galle Fort, Mirissa); India (Jaipur, Goa, Kochi, Udaipur, Varanasi); Thailand (Bangkok, Chiang Mai, Krabi, Phuket, Ayutthaya); Japan (Tokyo, Kyoto, Osaka); Vietnam (Hanoi, Hoi An, Ho Chi Minh City); Europe (France, Italy, Switzerland, Spain, Netherlands).
- **Itinerary editing:** starter activities are added when a city is selected; activities can be toggled in the itinerary.
- **Trip preferences:** travel style, trip length, travellers, date window, budget, and display currency.
- **Local persistence:** trip and profile state are saved in the browser's `localStorage`; use **Reset demo** to clear the saved demo.
- **Responsive layout:** designed for desktop and mobile widths.

## Run in a browser-based environment

No local installation is required if you use GitHub Codespaces:

1. Open this repository on GitHub and switch to the feature branch or the branch you want to preview.
2. Click **Code → Codespaces → Create codespace**.
3. In the Codespaces terminal, run:

   ```bash
   npm install
   npm run dev
   ```

4. When port **5173** appears in the **Ports** panel, open it in the browser.

You can also import the repository into a browser IDE such as StackBlitz. A local development setup uses the same commands after installing Node.js.

## Project structure

```text
src/
  App.jsx                 Main React screens and trip state
  styles.css              Responsive application styling
  data/
    destinations.json     City/place fixtures and their parent scope/country
    activities.json       Illustrative activity fixtures keyed by city ID
```

## Data model

Each entry in `src/data/destinations.json` represents a selectable city/place and includes:

- `id`: stable key used by the itinerary
- `name`, `region`, `country`, `scope`: place name and hierarchy
- `tagline`, `why`: display copy
- `days`, `cost`, `effort`, `travel`: planning hints
- `image`: image URL

Each activity in `src/data/activities.json` has a stable `id` and a `place` value matching a destination ID, plus time slot, duration, cost, effort, and a note.

To add a city, add its destination fixture and at least one activity using the same city ID. For a new Europe country, add cities with `scope: "Europe"` and the country's exact name in `country`. For another country-level trip scope, add it to the scope selector and starter-place configuration in `src/App.jsx`.

## Important limitations

- This is a **demo with hardcoded fixture data**. Destination descriptions, images, costs, durations, and travel times are illustrative and may be inaccurate or out of date.
- There are no live flight/hotel/activity APIs, route calculations, booking flows, user accounts, backend, or database.
- The budget is a rough prototype estimate, not a quote. Currency selection changes display formatting only; it does not perform exchange-rate conversion.
- Always verify current prices, opening hours, transport, entry rules, and safety advice with official sources before travelling.

## Tech stack

- React 18
- Vite 6
- Lucide React icons
- Plain CSS
- JSON fixtures and browser `localStorage`

## Development scripts

- `npm run dev` — start the Vite development server
- `npm run build` — build the production bundle
- `npm run preview` — preview a production build

## Data quality and estimate limits

Roamwise currently ships with static JSON fixtures in `src/data/`; it does not fetch live travel data.

- Destination and activity costs are rough **USD-based planning estimates**, not quotations, official entrance fees, or guaranteed daily budgets. Currency display uses approximate reference conversion factors in `src/App.jsx`; it is not live foreign-exchange data.
- Seasonal guidance is broad climate context, not a forecast. Check official meteorological services, local authorities, attraction operators, and travel advisories near departure.
- Entry and visa requirements depend on passport nationality, trip purpose, duration, and current rules. Do not infer visa eligibility from a destination card; verify with the destination government's official immigration source.
- Travel times are indicative and vary by route, transport mode, traffic, timetable, and service disruptions. The UI should not present them as live ETAs.
- Attraction access, opening hours, tickets, and image URLs have not been independently verified in real time. Verify before booking or departure.

### Validate the fixture data

Run:

```bash
npm run validate:data
npm run build
```

The validator checks unique IDs, required fields, destination/activity references, non-negative numeric costs, HTTPS image URL format, at least four activities per destination, and common generic placeholder text. It does not verify live image availability, attraction opening hours, prices, transit timetables, visa rules, or factual claims against official sources.
