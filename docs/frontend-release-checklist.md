# Roamwise frontend release checklist

This checklist covers automated checks and a repeatable manual smoke test. It does **not** claim real-traveller validation.

## Automated
- [x] Validate destination and activity fixture relationships with `npm run validate:data`.
- [x] Build the production bundle with `npm run build` in GitHub Actions on pushes to `main` and pull requests.
- [x] Preserve a frontend-only architecture; no new live weather or exchange-rate API is added.
- [x] Provide a web app manifest and app-shell service worker for repeat visits/offline shell.
- [x] Keep a static curated-data fallback; live external maps and external links still require connectivity.

## Manual smoke test before merging
- [ ] Open the app at its deployed base path; confirm images can fail gracefully.
- [ ] Create a trip for each supported scope: India, Thailand, Japan, Vietnam, Europe and Sri Lanka.
- [ ] Change traveller styles, group, age range, pace and walking preference; confirm activity explanations respond.
- [ ] Change cities and trip duration; confirm itinerary days and activity lists update without duplicates.
- [ ] Use every day adjustment; reset it; save and reopen the trip; share the link in a fresh tab.
- [ ] Add, swap and skip activities; confirm the summary and budget react.
- [ ] Edit each budget assumption, change currency, save/reopen, and check that values persist.
- [ ] Download the text itinerary and use Print / Save as PDF.
- [ ] Test at 320px, 375px, tablet and desktop widths; keyboard-tab all controls and verify visible focus.
- [ ] Install the app, visit once online, then reload offline. Confirm the app shell loads and saved trip data is present. External maps and unsaved assets may not be available offline.
- [ ] Verify map disclosure, route link, theme toggle, no-saved-trips state, delete saved trip, and browser storage-disabled behaviour.
- [ ] Check the GitHub Actions run is green before merge.

## Not completed by this code change
- [ ] Test with real travellers and use their feedback to prioritise fixes.
- [ ] Add a live weather or currency API.
- [ ] Validate live opening hours, ticket prices, transit routes, accessibility and official travel advisories.

## Known limitations
- Saved trips use browser storage and are not synced between devices.
- Share URLs contain the trip payload. Anyone receiving the URL can read it; don't include private information.
- Budget and FX values are illustrative, not quotes. Map embeds and external directions require connectivity.
- Service worker caching provides an app shell and same-origin asset cache, not a guarantee that every external image or third-party map works offline.
