# QRent SEO and discovery recovery

The owner requests one accurate update notice, an audit following
`fisher-byte/site-audit-zyppy`, fixes to crawlability and internal navigation,
and feasible non-agent issues. Preserve the operating Sydney crawler first.

## Decisions

Keep Next.js, next-intl, the existing bilingual Notion content and the original
GitHub release path. Do not move hosting or expand collection. Use a small
rentals directory and three school pages, rather than indexing arbitrary
search/filter combinations or generating thin suburb pages. School pages link
to the actual search with its original school/area parameters and show a
bounded, cached, public API preview. No model, maps, paid API or DML is needed.

Make each indexable page self-canonical on `https://www.qrent.rent`, with
language alternates only for translations that exist. Render the document
language on the server. Keep filter/search, favorites and mobile duplicates
out of the index; allow crawlers to load CSS/JS. Only real published-language
article URLs belong in the sitemap. Article dates come from Notion, never the
audit clock. A missing article must return 404, with a useful recovery link.

Use one visible notice: updates resumed, rental prices from Real Estate and
Domain. Keep the original design. Link home, rental directory, school pages,
guides and related articles with descriptive bilingual anchors. JSON-LD must
match visible page information; never invent ratings, prices or listing dates.

## Alternatives

Metadata-only changes leave the CSR property discovery and weak internal graph
unresolved. Creating a page for every filter would multiply duplicate/thin
URLs. A bounded school directory addresses discoverability without changing
the crawler scope or promising whole-city coverage. This is the implementation
choice under the owner's authorization to proceed autonomously.

## Acceptance

Verify original cron and its actual last result, keep formal caches/ledgers and
budgets unchanged, and observe the next cycle if it occurs during the work.
Use public HTML, normal and bot UAs, sitemap status/canonical checks and a real
browser. Run offline regressions, production build and the supplied audit.
Release through an original-repository PR; green CI alone is not acceptance.
Verify actual frontend production deployment and served HTML/banner. Record
unverifiable Search Console, field CWV, ranking and backlink checks as unknown.

## Verified platform boundary and final routing choice

The first HTTP checks reproduced upstream Next.js #100596: a matched dynamic
route that calls notFound() returns 404/noindex, but its recovery UI appears
only after hydration. Boundary and metadata configuration experiments did not
resolve that upstream defect and were removed. Unmatched paths use the official
global-not-found document; the fixed school enum uses dynamicParams=false.
Those paths have full no-JS 404 documents and pass 6 HTTP checks. Missing blog
articles retain real 404/noindex and verified browser recovery, with the raw
HTML limitation reported explicitly rather than disguised as a passed check.
No unmerged framework patch or new dependency is installed.

Footer language links connect both language graphs. The homepage, school hubs,
guide index and full published guide directory provide crawlable paths; the
interactive filter combinations stay noindex.

## Deferred guide migration: source article collisions

PR #302 implemented the migration below, but its original production build
failed and its build logs are inaccessible to the current account. The layout
release restores the deployed f516490 reader; the reviewed migration remains on
the fork for later diagnosis. These paragraphs describe that deferred design,
not functionality currently accepted in production.

The original public Notion props contain ten published IDs but only seven
locale/slug pairs: multiple distinct articles reuse `before-renting`. The old
English URL actually serves a Chinese body, and copied English metadata is not
evidence of a translation. Correct these defects without writing the CMS:
inspect cached actual body text for strong language evidence, preserve dates
and source IDs, and assign stable unique paths to duplicate IDs. Pin the two
article identities verified at the legacy Chinese/English URLs; if an identity
moves to its actual language, redirect the legacy URL to that same identity.
Do not infer article hreflang from a matching slug. If no English guide body
exists, label links to Chinese content explicitly rather than inventing an
English translation. Free CMS reads use the existing ten-minute cache and
configured-provider failures abort the catalog refresh instead of publishing
partial data. No model or transit call is authorized by this implementation.

Keep the catalog and its article bodies in one atomic cached snapshot. Empty,
ambiguous or too-short bodies stay out of discovery until their language can be
verified. One malformed published source record fails the refresh; it must not
silently erase a portion of the directory. Chinese articles do not need a fake
English headline. Do not traverse child pages or child databases outside the
published article body. Preserve the source identity on legacy redirects.
