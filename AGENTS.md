# Qrent deployment and data workflow

- Backend code, Docker and dependency changes go through a GitHub PR and merge. CI validates the commit, then calls `.github/workflows/cd.yml` to deploy the backend using the existing production/staging environment Secrets. Developers do not need routine SSH access to the deployment server.
- Deployment credentials belong to GitHub environment Secrets. Do not export their values to a workstation or fork, or treat empty local deployment fields as a reason to request the server password again.
- Backend and MySQL run on the deployment server. The crawler runs separately on the machine the project owner calls yibin's server, and updates property data through a database account. Data fixes can use the authorized private database connection directly; back up before DML and preserve existing schema, primary keys, users and favorites.
- Do not run schema pushes or data-loss migrations as application startup. Backend releases must preserve MySQL/Redis containers, database mounts and the live environment. Never stop the entire Compose project or prune volumes for a backend release.
- Crawler collection, enrichment and database publication are separate from backend deployment. Keep the existing request ledger, successful caches and failed/uncertain requests. Avoid repeating already successful model or address-campus calls. Recovery model spending is capped at CNY 50/month; other new API/proxy spending at USD 4/month, with no paid transit fallback.
- Never commit `.env`, credentials, raw databases or private deployment backups. A green PR is not proof of deployment: verify the production CD result, public API and rendered page.

The backend image override and private receipts live under the existing server project's `.deploy/` directory. Subsequent CI releases use the same Compose project and retain the previous image for rollback; do not replace this with a standalone Compose project pointed at fresh volumes.

Frontend changes also go through the original GitHub repository. Verify the original Vercel integration's production deployment and served pages separately from the backend CD. Frontend-only CI/test changes must not redeploy the backend unnecessarily.

SEO regressions live in `packages/frontend/test/seo/`; they are isolated from the older Vitest setup that uses a database. `seo-gate.config.json` configures the owner's `fisher-byte/site-audit-zyppy` toolkit. Audit canonical URLs on `https://www.qrent.rent`, actual published-language articles, and the link graph. Keep fixed school discovery paths separate from noindex filter/search URLs. Dynamic blog 404 initial HTML has a known upstream Next.js limitation (issue #100596); verify HTTP 404/noindex and real browser recovery separately, and do not claim a no-JS article-error page passed.

Published guides are versioned Chinese/English pairs in `packages/frontend/src/content/guides/`, exported from the ten public Notion source pages. Guide updates now require both full bodies in the same PR; Notion edits do not hot-publish to the website. Keep source IDs, body hashes and original publication dates; record the paired publication review time separately. CI checks pair coverage, body identity and stale translations. No request-time translation or paid model calls belong in the guide reader.

The original Redis container is now supervised by `qrent-account-store.service`.
Its Docker restart policy is `no`; the unit verifies the private Redis port guard
before attaching to the existing container. Use that service for Redis lifecycle
operations so the guard runs before startup. MySQL/n8n/Docker startup do not depend
on this Qrent guard. Its current rules cover the fixed host addresses; regenerate
and verify them before any future host-address change. Never expose port 6379 to
the public network.

Production recovery entry points are the manually dispatched
`account-store-recovery.yml`, `backend-control-recovery.yml`, `backend-inspect.yml`
and `backend-capacity.yml`, using the existing original-repository environment
Secrets. Start with their read-only plans. Keep permanent attempt markers and
private backup receipts; never replay an uncertain process/runtime repair. The
2026-10-31 stale runtime bundle is retained in the private `/run` quarantine; this
is temporary OCI metadata, separate from the original preserved Redis data volume.
Do not follow its `work` symlink or remove a runtime path containing active mounts.
Docker live restore is enabled; that alone never authorizes restarting Docker or
any business container without the checked recovery prerequisites.
