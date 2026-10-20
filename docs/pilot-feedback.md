# Roamwise pilot feedback

## Recommended collection method

Use a Google Form for the first pilot. It is quick to set up, works on mobile, supports anonymous responses, and sends answers to a spreadsheet without requiring a Roamwise backend. Keep email collection off unless you specifically need follow-up and tell testers why you are asking.

After creating the form, copy its responder URL into `VITE_FEEDBACK_FORM_URL` in your deployment environment and rebuild/redeploy the static app. The app only displays the footer link when the value is a valid HTTPS URL. Feedback is submitted directly to Google Forms; Roamwise does not receive or store the responses itself.

## Suggested form title

**Roamwise pilot — tell us how trip planning felt**

Description: “Thanks for trying Roamwise. This should take about 3 minutes. We want honest feedback, including confusing, inaccurate or unhelpful parts. Please do not include passport numbers, booking references, health details or other sensitive personal information.”

## Questions to add

1. **What kind of trip did you plan?** (Multiple choice: solo, couple, friends, family with children, trip with parents/older adults, other)
2. **Did you finish creating an itinerary?** (Yes on my own / Yes with help / No)
3. **How easy was it to create and edit the itinerary?** (Linear scale 1–5)
4. **What was most useful?** (Checkboxes: destination shortlist, day-by-day plan, activity swaps, pace/walking guidance, budget estimate, map, share/print, other)
5. **Did anything feel inaccurate or untrustworthy?** (Paragraph; include examples if possible)
6. **Were any activities unsuitable for your group, mobility or preferred pace?** (Yes / No / Not sure; optional details)
7. **Did any photo, map, price estimate or section fail to load?** (Yes / No / Not sure; optional details)
8. **What frustrated you or took longer than expected?** (Paragraph)
9. **What is the one change that would make Roamwise more useful?** (Paragraph)
10. **How likely are you to use Roamwise for your next trip?** (Scale 0–10)
11. **May we contact you for a short follow-up?** (Optional email field; do not make required)

## Pilot operating tips

- Ask 5–8 people to plan a real or realistic trip, ideally with different group types and budgets.
- Observe the first attempt before explaining how controls work; note where they hesitate.
- Ask them to share the feedback form after trying the itinerary, not before.
- Record bugs and inaccurate content separately from feature requests.
- Do not treat a high rating as proof that estimates or travel advice are accurate. Ask testers to identify concrete errors.
- Review the spreadsheet after each 2–3 testers and fix critical trust issues before inviting more people.
