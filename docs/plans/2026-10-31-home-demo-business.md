# Business-ready homepage preview

Keep `/home-demo` as a bilingual noindex preview and retain Qrent's blue/white
identity, harbour asset and real database connection. Refine the existing surface,
not the production homepage or the database schema.

Replace decorative, sparse preview cards with the information used to choose a
home: actual AUD weekly rent, complete address/unit, suburb, property/letting type,
bed/bath/parking, availability calendar date, record date, actual AI score out of
20, localized keywords, school commute, source and the real account favorite action.
Unknown dates/types/scores stay unknown. Availability before today is an advertised
date, not a guarantee that an application will be accepted. Format times in Sydney.

The original `publishedAt` column mixes source dates and ingestion fallback; it
must be labelled a property-record date, never a verified source-first-publication
or a completed-crawl timestamp. Show the actual time this page read its results
separately. Explain daily collection within the original school areas; do not claim
all Sydney inventory is newly verified, or that every visible row was updated today.

One applied filter state drives preview results, count, school/campus text, sorting,
full-search link and subscription draft. A compact primary filter row is followed by
expandable additional conditions. Invalid URL/form data cannot trigger a broad query.
Preserve filters on reload and locale changes. Loading, no-match and retry states
retain the user's conditions.

Place a subscription entry beside filtering. Build a useful inline preview of the
selected conditions, daily digest and 30-day term, including account/email readiness.
Save one versioned draft locally, with explicit browser-only and no-email status.
Do not activate outbound notifications, add mail billing, register a user, or pretend
that the existing property-favorite endpoint is a daily search subscription.

Validate date boundaries, missing data, filter consistency and malformed drafts with
offline checks. Use actual browser interactions for filters, sorting, login prompts,
draft save/reload/edit and 390px Chinese/English layouts. Build, independently review,
release through the original PR/CI integration and verify the served demo. No crawler,
model/maps/proxy requests, production DML or backend deployment belong to this change.
