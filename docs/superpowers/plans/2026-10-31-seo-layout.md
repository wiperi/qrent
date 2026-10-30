# QRent SEO layout implementation plan

> Implement inline; review the final source independently before release.

**Goal:** Refine homepage and discovery-page presentation without changing
listing data, collection scope or search behavior.

**Architecture:** Existing Next/React routes plus one scoped CSS module.
**Tech Stack:** Next.js, next-intl, React, CSS modules, isolated Node tests.
**Spec:** `docs/superpowers/specs/2026-10-31-seo-layout-design.md`

## Constraints and review focus

No new subscriptions, dependencies, provider calls, DML or backend deployment.
Keep indexable links, real prices, locale metadata, the existing school/area
mapping, long-title wrapping, mobile touch targets and visible keyboard focus.
The #302 guide migration remains deferred, never reported as deployed.

- [x] Restore the known deployed guide reader while preserving safe UI fixes.
- [x] Refine HeroSection/messages, RentalLinks, rentals directory/school routes
      and the added guide-directory links with shared responsive styles.
- [x] Run existing isolated SEO tests, TypeScript, build and built HTTP checks;
      run the Impeccable detector once. No class-mirroring tests.
- [x] Batch real desktop/mobile visual and interaction checks, fix material
      findings once, and perform one final confirmation.
- [ ] Review the final source, submit/attach the original PR and verify CI,
      original frontend production deployment and served pages.

## Candidate evidence

14 isolated regressions, TypeScript, root format checks, production build and
six built HTTP checks passed. The one Impeccable scan returned no findings.
Real browser widths 1440/768/390 had no horizontal overflow; school area targets
were 48px tall, keyboard focus had a visible 2px outline, and Eastgardens kept
the original school/area query. English introduction sentences are separate
paragraphs. Mobile menu images loaded. Independent review found no remaining
Critical/Important issue and confirmed the reader/preview/mapping match f516490.
