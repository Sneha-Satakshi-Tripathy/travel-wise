# Roamwise growth measurement

This release adds search-friendly guide pages and shareable itinerary links. It does **not** silently send traveller data to an analytics provider.

## Recommended first metrics

| Event | Trigger | What it answers |
|---|---|---|
| `guide_view` | A guide page loads | Which search-intent pages attract people |
| `trip_started` | A visitor begins a new plan | Whether discovery leads into the planner |
| `traveller_profile_selected` | The profile step is completed | Which group, pace and walking preferences are common |
| `itinerary_generated` | A visitor reaches the itinerary | Whether people make it through planning |
| `activity_edited` | An activity is added, removed or swapped | Whether the plan is useful enough to personalise |
| `trip_saved` | A trip is saved in the browser | Planning intent (local saves are not cross-device) |
| `share_link_created` | Share is invoked successfully | Whether people are sharing plans |
| `shared_trip_opened` | A valid shared itinerary is opened | Whether sharing brings recipients back |
| `booking_link_clicked` | An outbound booking link is clicked | Commercial intent, if booking links are added later |

## Funnel to review weekly

1. Guide views → trip starts.
2. Trip starts → itinerary generated.
3. Itinerary generated → activity edited or trip saved.
4. Share links created → shared trip opened.
5. Return visits within 7 days, if the chosen analytics tool supports privacy-safe measurement.

Segment by **broad** group category, pace and walking preference. Do not send names, exact birth dates, free-text notes, full shared URLs or encoded trip payloads to analytics.

## Enable analytics deliberately

1. Pick one analytics tool (PostHog or GA4) and create a project for the deployed app.
2. Add a privacy notice and a clear analytics opt-in before collecting analytics. Confirm your applicable privacy obligations first.
3. Add the provider’s public project/measurement ID as a deployment environment variable. Never commit a private API key.
4. Instrument the events above, and verify them in the provider’s live event debugger before relying on the dashboard.
5. Add Search Console for search impressions, clicks, queries and indexing status; it is separate from product analytics.

## Important current limitations

- Roamwise currently stores saved trips in the browser. Those counts are not a reliable global user metric and do not sync across devices.
- Shared itinerary URLs encode the selected itinerary in the link itself. Anyone with the link can view its contents; do not put sensitive information into a trip. This release does not provide revocation or server-side sharing analytics.
- Search engines may take time to discover and index the static guide pages. Verify the deployed routes and use Search Console after publishing.
