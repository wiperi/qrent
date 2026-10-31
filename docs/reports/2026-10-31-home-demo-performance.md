# Homepage design demo and image performance

## Delivered scope

The bilingual `/zh/home-demo` and `/en/home-demo` routes retain the original logo,
Sydney harbour photo, blue and white palette, navigation and rental search. The
preview uses the existing public database endpoint, with no fabricated prices,
source labels, commute times or inventory totals. It is `noindex, follow`, outside
the sitemap. The existing homepage keeps its composition for owner review.

The demo separates photo and text, shortens the introduction, places search before
the inventory, moves card details below the photo and groups area links by the
original three Sydney universities. On narrow screens the search uses two columns;
the decorative harbour photo is hidden and lazy loaded, so it is not eagerly fetched.
The original account and favourite navigation remain available. Preview cards link
directly to their actual source; they do not pretend to implement a new subscription
system.

## Image evidence

| Asset | Previous bytes | New bytes | Check |
| --- | ---: | ---: | --- |
| Header logo | 940,545 | 2,594 | Identical rendered RGBA pixels; 99.72% smaller |
| Harbour photo, 1920px | 289,794 | 203,931 | Existing served WebP q75 vs pre-encoded AVIF q48; 29.63% smaller |
| Harbour photo, 960px AVIF | — | 66,469 | Responsive source selected by viewport and device pixel ratio |
| Harbour photo, 640px AVIF | — | 29,700 | Original photo and aspect ratio retained |

The 2,024,129-byte original photograph remains in source control. The previous
homepage already used Next image optimization; comparing only against the original
JPEG would exaggerate the browser improvement. WebP fallback is retained. Versioned
`/media/` assets use a one-year immutable cache; the production-mode local response
confirmed that header. No new image service, paid API, map request or model request
is introduced. Remote listing images retain their signed URLs and existing image
pipeline, with grid-appropriate `sizes` to avoid oversized desktop requests.

These figures measure asset bytes, not browser LCP, INP or field Core Web Vitals.
Remote property image origin latency is still an external dependency. The repeatable
offline check is `node packages/frontend/scripts/audit-home-media.mjs`.

## Verification

- Production build and TypeScript passed; 19 SEO and 13 account regressions passed.
- Chinese and English layouts inspected at 1280px and in actual 390px iframe
  viewports. The latter verifies responsive CSS, not a physical iPhone device.
- UNSW, USYD and UTS return actual previews. Selecting a university updates both
  the preview and the search selector.
- Searching UTS with AUD 900/week, 40 minutes and exactly two bedrooms preserved
  all parameters and returned 121 results during this check; both Domain and
  Real Estate source links were present. This is a query sample, not a new crawl.
- Advanced filters open with the selected university. Area and guide destinations
  retain the existing routes. Both preview pages emit `noindex, follow`.
- Loading, empty, API failure and missing-photo states are implemented; normal
  loaded and loading transitions were observed. Failure states were reviewed in
  code rather than induced against production.

No crawler schedule, enrichment ledger, database schema/data, backend deployment,
DNS or paid account settings are changed by this release. Production deployment
and served assets are checked separately from the local build and PR CI.
