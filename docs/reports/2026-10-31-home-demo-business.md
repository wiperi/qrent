# Business homepage preview

The bilingual `/home-demo` now follows an actual rental-search flow. It remains
noindex and outside the sitemap. The production homepage, crawler, online schema,
database data, provider budgets and account configuration are unchanged.

## Listing and date contract

Cards use the existing public search response for the full street/unit address,
suburb, AUD weekly rent, property and letting type, beds/baths/parking, advertised
availability date, school transit time, real AI score out of 20, localized keywords,
source link and account favorite flag. The favorite button uses the existing
protected property subscribe/unsubscribe methods, not an invented local favorite.
It opens login for visitors, guards duplicate writes, uses a 10-second timeout,
discards stale-session feedback and refreshes favorite/search caches.

The legacy `publishedAt` field can hold a platform date or an ingestion fallback.
It is labelled **record date**, with year and Sydney timezone, rather than a
verified first-publication or crawl-completion timestamp. The newest date among
the displayed records is distinct from the actual query-read time. The interface
explains this boundary and the older inventory. A past availability date says
the date has been reached and needs source/agent confirmation; it never promises
that the property is still available. Unknown availability, scores and types do
not receive plausible defaults. Unit numbers and numeric street ranges survive.

The original scraper cron was read-only verified as `0 2 * * *`. This confirms
the configured daily schedule, not that every displayed row was verified today
or that an entire batch has finished. No new collection or enrichment was started.

## Filters, sorting and alert draft

One applied URL state controls results, counts, campus, the complete-search link,
sorting and the alert preview. The primary form handles school, rent, commute and
bedrooms. More conditions include type, areas, available-by date, score and ranges.
The existing full-search page honors an explicit sort parameter, while its previous
default is unchanged. Multiword area values follow the established API/search
encoding. The legacy API's zero upper-bound omission is blocked before a demo
query; the preview does not expose an unsupported Studio-only filter.

The inline alert plan shows selected conditions, one daily new-listing digest, a
30-day term and signed-in/verified-email readiness. It saves one validated,
versioned browser-only draft, restores it after refresh and can reopen the matching
search in either language. A compact disclosure keeps saved drafts from pushing
inventory down the page. Invalid storage or disabled browser storage is handled.
There is **no email activation, account sync, automatic expiry job or outbound
message** in this preview. Those remain explicit requirements for the later backend
subscription work; no mail service or billing is enabled here.

## Validation

- Next.js production build passed, including TypeScript.
- 29 SEO/content/filter checks and 13 account regressions passed. New cases cover
  matching query/link/draft filters, sorting, invalid and zero-bound queries,
  malformed drafts, Sydney midnight/date handling and intact unit/street numbers.
- Browser interactions used real read-only inventory. UTS with AUD 900/week,
  40-minute transit and exactly two bedrooms returned 121 matches at inspection;
  both platform sources appeared. This is a live query sample, not a new crawl.
- Browser checks exercised form submission, lower-rent sorting, draft save/reload,
  zero-budget blocking, no displayable results, Chinese/English visitor favorite
  login prompts and 390px layouts. Forms use 16px inputs; the document remained
  390px wide. No user account was registered and no production favorite was changed.
- The Impeccable mechanical scan returned no findings. This is not a substitute
  for browser checks or a claim about field Core Web Vitals.

The original GitHub PR/CI and production integration are used for release. CI and
served-page receipts are verified separately and retained privately in the primary
checkout's ignored `home-demo-business-20261031` output folder. This frontend
release must skip backend deployment and adds no model, map, proxy or mail API calls.
