# QRent account, contact and domain maintenance

Goal: remove the fictitious office, keep copyright current, repair the existing
account lifecycle, and establish the real DNS/mail deployment boundaries.

Architecture: retain the existing Express/tRPC, Prisma/MySQL user IDs, sessions
and favorites. Borrow lifecycle behavior from the local ShipAny account template
without introducing its Drizzle/Better Auth schema into the production database.
Use the existing Redis for atomic rate limits and expiring single-use codes.

User authorization: the owner asked to handle these details directly. Execute in
the existing managed worktree and release through the original GitHub CI/CD.

## Constraints and design choices

- No schema changes, production secret export, paid service, model/maps request,
  DNS provider move or nameserver modification.
- Preserve old users, password hashes, sessions, favorites and crawler caches.
- Existing valid sessions remain usable; revoked or expired sessions fail.
- Only explicit safe profile fields may leave the backend. Registration accepts
  only known fields and cannot set IDs, verification state or relations.
- Normalize account email input to lowercase/trimmed, retaining the existing
  database's 50-character limit. Login accepts existing six-character passwords;
  newly set passwords require eight characters and at most 72 UTF-8 bytes.
- Verification codes use crypto randomness, expire, have retry/send limits and
  are consumed once. No human CAPTCHA is presented as active without configured
  server-side validation. Email delivery must never be faked.
- SendGrid currently authenticates the domain but reports remain=0, total=0 and
  a stale next_reset. Quota checks fail closed, reserve included credits atomically
  in Redis, retain uncertain reservations and never enable overage or buy a plan.
- Auth restoration does not delete storage before hydration, invalidate a valid
  session after a transient network error, leak another account's query cache or
  leave a rejected/expired token appearing signed in.
- The existing bearer/localStorage transport remains a documented migration gap;
  a later Better Auth/HttpOnly migration needs a separately tested compatibility
  plan rather than a hidden database replacement.

## Execution

- [x] Contact: remove office/address and unverified office hours in both locales;
      replace the non-delivering success form with an explicit email draft flow.
      Copyright interpolates the current UTC year, including 2026 now.
- [x] Backend boundaries: add shared auth input schemas, explicit profile select,
      safe registration allowlist, neutral login errors and atomic Redis limits.
      Cover REST and tRPC with the same service validation.
- [x] Session/code lifecycle: validate JWT plus an unexpired existing session,
      add real logout/revocation, preserve verified status for profile-only edits,
      and consume cryptographically generated email codes once with rate limits.
- [x] Frontend: unify token storage/hydration/cross-tab events and account cache
      invalidation. Add a basic account page for existing email verification and a
      capability check that disables mail-dependent actions when unavailable.
- [ ] Offline verification: mock Prisma, Redis and mail; test mass assignment,
      profile output, revoked/expired sessions, rate caps, wrong/expired/reused codes,
      storage hydration and switching accounts. Run scoped regressions, type checks,
      build and phone/desktop interactions. No production test database operations.
- [ ] Domain: capture public authoritative NS, A/CNAME, MX/SPF/DMARC, HTTPS and
      registrar expiry evidence. Document Cloudflare as current DNS authority and
      mail authentication/OAuth callback requirements for a later template migration.
- [ ] Release through a GitHub PR, required CI and production deployment receipts;
      verify public pages, anonymous authorization and account capability endpoints.
      Check the already-running crawler independently without restarting it.

## Review focus

Old long-lived sessions, storage-disabled browsers, stale profile responses
after switching accounts, simultaneous verification attempts, and unavailable
Redis/mail must fail without false success or production data loss.

ShipAny reference (read-only):
`/Users/zhiyang/Desktop/新项目集合/shipany-账户支付模板/shipany-tanstack/src/core/auth/`.
