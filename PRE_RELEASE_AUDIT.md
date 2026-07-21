# Pre-release audit — scheduler

Third pass. All P0 and P1 code issues are now fixed and verified. **Everything remaining is
P2 (packaging / self-hosting), untouched by request.**

---

## Fixed in this pass

### Data-integrity and privacy

- **`updateVisibility` rewrote every project** (`server/projects.ts`) — the validated `token`
  was never used in the `WHERE`, so one toggle flipped `showResultsToGuests` across all of a
  user's projects. Now filters on `token` *and* `ownerId`, returns the affected row, and
  throws `project not found` instead of silently matching nothing.
- **Anonymous-link vote loss** (`lib/auth.ts`) — the `EXISTS` subquery was uncorrelated, so it
  was true whenever the votes table had any row, deleting *all* of a user's anonymous votes on
  every account upgrade. Now correlated via `alias(votes, "kept")`. Verified against the
  generated SQL:
  ```sql
  delete from "votes" where ("votes"."voter_id" = $1 and exists (
    select 1 from "votes" "kept"
    where ("kept"."project_id" = "votes"."project_id" and "kept"."voter_id" = $2)))
  ```
- **Account deletion silently failed** — `votes.voter_id` was `ON DELETE no action`, so anyone
  who had voted could not be deleted. Now `cascade` (migration `0009`, applied). The button
  also ignored the result and redirected regardless; it now surfaces the failure and stays put.

### Error handling

- `authClient` now sets `fetchOptions: { throw: true }`. better-fetch resolves `{ data, error }`
  by default, which made every `try/catch` around an auth call dead code and let a failed
  sign-in look identical to a success. The existing handlers in `logInSignUp.tsx` now actually
  fire; the two bare GitHub buttons, `signOut`, and `deleteUser` gained handling to match.
- `deleteProject.mutate` → `mutateAsync` — `mutate` returns `void` and never rejects, so the
  `catch` was unreachable and a failed delete looked successful.
- `submitVote` and the `getMyVote` prefill now handle rejection instead of dropping it.
- `isAllowedToViewVotesForProject` returned `throw "log in first"` for logged-out visitors —
  the normal case on the public vote page, so it threw on essentially every fresh visit. Now
  returns `false`.
- Visibility spinner teardown moved to `onSettled`; on error it used to spin forever. Timer is
  also cleared on unmount.
- `$projectSlug` loader now returns `Promise.all([...])` so rejections reach its
  `errorComponent` instead of surfacing as unhandled rejections.
- Added an `errorComponent` to the public vote route and `errorComponent` +
  `notFoundComponent` to `__root`.

### Security

- **SSE stream is now authenticated** (`api/votes.$id.stream.ts`) — was fully open. Applies the
  same gate as `getVotesForProject`: 401 unauthenticated, 404 unknown token, 403 not permitted.
  Verified: unauthenticated request returns 401.
- **Rate limiting enabled** in better-auth (60s window, 20 requests). Marked `ponytail:` —
  in-memory, so counters reset on restart and don't span replicas; move to the database store
  if you scale out.
- **Devtools no longer ship to production** — wrapped in `import.meta.env.DEV`.
- Removed `getUser` / `usersQuery`, an unauthenticated server function that dumped the whole
  demo `users` table.

### Your three specific asks

- **`usersTable` removed** from `schema.ts`, and the leftover table dropped from the database.
- **`DATABASE_URL` validated** in `env.ts`: must parse as a URL, must use a `postgres://` or
  `postgresql://` scheme, and must not contain unexpanded `${...}` placeholders.
- **min/max time validation** — `createProjectInput` gained a `.refine()` requiring
  `minTime < maxTime`. Both bounds passed the 0–23 range check independently, so an inverted or
  equal pair was accepted and produced an empty grid. The `TODO` in `schema.ts` is resolved.

### Database

Migrations had **never been applied** — `drizzle.__drizzle_migrations` was empty and the schema
had been built with `drizzle-kit push`. Baselined `0000`–`0008` as already-applied, then ran
`drizzle-kit migrate` so only `0009` executed. Verified after: FK `confdeltype = 'c'`,
10 migrations recorded, data intact (8 projects, 7 votes, 17 accounts).

Also fixed `drizzle.config.ts`: Vite expands `${VAR}` references in `.env` but the bare
`dotenv/config` loader used by drizzle-kit does not, so `DATABASE_URL` arrived as a literal
`postgresql://${DATABASE_USER}:...` and could not connect. Expanded inline rather than adding
`dotenv-expand` for four lines.

### Verification

`tsc --noEmit` clean · biome clean on changed files · 13 tests pass (9 env, 4 project input) ·
dev server boots, `/` and `/api/auth/get-session` return 200 · SSE returns 401 unauthenticated.

New tests cover the two validations you asked for, including the unexpanded-`${...}` case —
which caught a real gap: that form parses as a valid URL, so the scheme check alone missed it.

---

## Remaining — all P2, deliberately not touched

- **No `LICENSE`.** The code is legally all-rights-reserved until you add one; pick before
  publishing (MIT vs AGPL depending on whether you mind a hosted competitor).
- **No `Dockerfile` / `docker-compose.yml`.** `docker compose up` with app + Postgres is the
  expected entry point. Your `.env.example` already splits the DB vars for this.
- **No migration-on-boot, no health-check endpoint, no CI** (`.github/` absent) despite biome
  and vitest being wired up.
- **Test coverage is thin** — env and project-input validation only. `tallyVotes` and the
  anon-link transaction are still uncovered; the latter is where the worst bug lived.
- **Branding is still the starter:** `package.json` name `starter-for-tanstack`, page title
  `"Appwrite + TanStack Start"`, favicon `/appwrite.svg`, unmodified README, Appwrite notes in
  `docs/`.
- **Dead dependencies:** `@appwrite.io/pink-icons`, `shadcn`, `pg` alongside `postgres`. The
  `types` script still shells out to the Appwrite CLI.
- **Google Fonts loaded from CDN** while `@fontsource-variable/geist` sits installed and
  unused — an avoidable external dependency and a GDPR liability for an EU-facing self-hosted
  tool.

### Worth knowing before self-hosting

The fresh-install path is now **untested**: because this database was baselined rather than
migrated from scratch, nobody has verified that `0000`–`0009` apply cleanly to an empty
database. Do that against a throwaway Postgres before publishing — it is the exact path every
self-hoster will take.
