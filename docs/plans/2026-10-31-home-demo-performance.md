# Homepage demo and image performance

## Scope and design

Preserve the Qrent blue and white identity, original logo, Sydney harbour photograph,
navigation, search parameters and listing data. The demo is a separate bilingual
`/[locale]/home-demo` route with `noindex`; the production homepage composition stays
unchanged while the owner reviews the design.

Three options considered: cosmetic spacing fixes alone would retain the oversized
photo/search stack; a full marketing redesign would delay the actual housing search;
a compact search-first composition retains the useful assets and makes real listings
visible earlier. Use the third option: a short two-line introduction, harbour photo,
clear search controls, university tabs, readable photo cards, compact areas and guides.
Use the existing Tailwind/component stack, light theme and blue accent. Design variance
5, motion intensity 2, visual density 5. Motion is limited to focus/hover feedback.

## Observed performance baseline

- Public logo: 940,545 bytes, almost all embedded design-editor colour profiles.
- Original harbour photo: 2,024,129 bytes, 4021 x 2491 pixels.
- Existing Next image at 1920/q75: 289,794 bytes WebP on a warm Vercel cache.
- Existing card sizes declare 33vw on desktop although home/favourites show four columns.

These are file/request measurements, not browser LCP measurements. Do not claim a
Core Web Vitals improvement without actual browser timing evidence.

## Implementation and verification

1. Remove unused logo metadata and verify identical rendered pixels. Pre-encode
   responsive WebP versions of the original harbour photo and serve immutable,
   versioned static assets without a new image service or runtime transformations.
2. Use accurate card sizes for each existing grid. Preserve signed source image URLs.
3. Build a working demo with public database previews, original search semantics,
   real prices/provenance/commutes and honest loading/error/empty states. Do not invoke
   a model, map API, paid proxy or new provider.
4. Check Chinese/English, desktop/mobile, search, university selection and source links.
   Run scoped SEO/auth regression checks and a production build. Save visual evidence.
5. Publish through the original repository CI integration; separately verify the served
   preview route and asset responses. No crawler, database, backend or DNS changes.
