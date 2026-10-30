# QRent SEO surface refinement

The owner requests production-ready presentation of the recently added SEO
surfaces and explicit sentence breaks in the homepage introduction. Preserve
the existing blue/white brand, image, search, content facts and URL contracts.
Subscription, authentication and verification-code work belongs to a later phase.

Later subscription requirements from the owner: daily listing updates, account
sign-in and verification codes, a one-month per-person subscription limit and
eligibility conditions. Exact eligibility and renewal rules remain undecided;
do not invent them or add subscription UI/backend behavior in this refinement.

Use the incumbent layout with a restrained shared stylesheet: balanced headings,
bounded paragraph measure, separate comparison/school sentences, consistent
section spacing, school directory rows, a responsive area-link grid and readable
price/address rows. Keep real listing values and source links, loading/empty
recovery and keyboard focus. Do not add marketing claims or dependencies.

Restore the guide reader to the last deployed f516490 behavior before releasing
styles: the unserved #302 migration failed its original production build and
its logs are inaccessible. Preserve its reviewed implementation on the fork;
this is a rollback for release stability, not a claim that guide identities
have been corrected. Retain independently safe locale/asset and hreflang fixes.

The owner already authorized autonomous execution. Implement inline, run the
isolated SEO regressions and frontend build, then inspect desktop/mobile together.
Fix findings in one batch and confirm once. Use original GitHub CI/deployment;
no backend release, DML, crawler restart, model or transit calls.
