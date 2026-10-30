# Backend release through the existing GitHub deployment

The production environment already holds DEPLOY_SERVER_HOST, DEPLOY_SERVER_USERNAME and DEPLOY_SERVER_PASSWORD. Use those secrets inside the original repository's workflow; never retrieve their values or copy them to a workstation or fork. The crawler continues writing property data through its existing restricted database account.

Base: wiperi/qrent main, 9850e68. Keep this release separate from the broader scraper recovery branch. The user has now explicitly confirmed the permanent workflow and authorized continuation: prepare a minimal PR, pass checks, merge in the original repository and let CI/CD deploy. This supersedes the earlier fork-only publication boundary; do not merge the broader scraper recovery branch.

## Release contract

- Keep the existing production/staging environments. Deploy only after CI succeeds for a push in the original repository, using the reusable CD workflow; never from a fork or pull-request event.
- Package tracked backend/shared sources and dependency manifests. Use a separate build directory; keep the live .env and Compose project directory unchanged.
- Build first, then replace only backend with --no-deps and --no-build. Preserve the previous image for rollback; never stop MySQL/Redis, prune volumes, regenerate credentials or push a database schema.
- Generate Prisma Client at build time. The old image's rollback command also generates only its client and bypasses its legacy schema-push startup.
- Verify /echo and date-first legacy search. Check that the database/Redis container IDs and database mounts remain unchanged. Save a receipt without credentials. Failed verification restores the previous backend image.

## Implementation

- [x] Reuse the already verified backend sorting/startup patch and its seven isolated regressions.
- [x] Add executable deployment tests for build failure, health failure/rollback, unchanged dependency containers, missing configuration and concurrent deployment.
- [x] Replace the destructive CD steps; run isolated backend/deployment checks in CI. Validate workflow syntax and relevant local builds.
- [ ] Push only a dedicated fork branch, create/attach a reviewable PR and collect actual CI results.
- [ ] Merge after required checks using the user's latest explicit authorization, then obtain the actual CD receipt and public API/page evidence. A PR or green CI alone does not mean deployed.

## Local verification

- Original backend: 2 regressions failed / 5 passed; fixed backend: 7 passed. TypeScript build passed after generating the local Prisma client with a placeholder URL. No database connection was used.
- Original inline CD: all 7 deployment regressions failed, including intercepted project shutdown and volume cleanup. New deployment runner: 8 passed. Node health verifier: 6 passed. Workflow syntax passed official actionlint 1.7.7, verified against its release checksum; repository formatting passed.
- Independent review found two Important health false positives. Both were reproduced and fixed: rollback now checks actual DB-backed searches, and the default search page is compared to an explicit date/score reference, allowing tied ordering keys. New regressions failed before the fixes and all 21 relevant tests now pass. The reviewer did not inspect production or secrets; actual Docker build, CI/CD and live-page results remain required.
- CI also builds the backend Docker image and checks the generated client without network access before allowing a production deployment.
