# Pre-release audit — scheduler

Scope: full repo scan of error paths, data security, and deployment maturity, with an eye
toward shipping this as a self-hostable open-source service.

Verdict: the data model and authorization logic are in decent shape. What blocks release is
a **missing auth secret**, one **data-loss bug**, and a systemic pattern of **silently
swallowed errors** in the UI. Self-hostability is currently near zero — there is no
container, no license, and the deployment URL is compiled into the bundle.

---

## P0 — blocks deployment

### 1. `BETTER_AUTH_SECRET` is not set

`.env` and `.env.example` define `DATABASE_URL`, the GitHub OAuth pair, and the Vite URL
vars — but no `BETTER_AUTH_SECRET`. `src/lib/auth.ts:8` never passes `secret` either.

better-auth uses that secret to sign session tokens. Without it you get a development
fallback, which means session cookies are forgeable and every self-hoster who copies your
`.env.example` inherits the same one. That is a full authentication bypass.

Fix: add `secret: process.env.BETTER_AUTH_SECRET` to the config, add the key to
`.env.example`, and make the server refuse to boot without it in production.

### 2. Account deletion is broken *and* reports success

Three defects stack on the same path:

- `src/db/schema.ts:51` — `votes.voterId` references `user.id` with no `onDelete` rule.
  Migration `drizzle/0002_cute_the_call.sql:22` confirms `ON DELETE no action`. Any user who
  has ever voted cannot be deleted; Postgres raises a foreign-key violation.
- `src/components/deleteAccountButton.tsx:84-87` — the confirmation dialog promises "votes
  you cast on other people's projects go too." The schema cannot honor that.
- `src/components/deleteAccountButton.tsx:27-35` — `handleDelete` ignores the return value
  and unconditionally redirects to `/`. better-auth's client returns `{ data, error }`
  rather than throwing, so a failed deletion looks identical to a successful one.

This is a GDPR-relevant path: the user is told their data is gone, and it is not.

Fix: `onDelete: "cascade"` on `votes.voterId` (+ migration), then check the `error` field
before redirecting.

### 3. Anonymous-account linking deletes votes it should keep

`src/lib/auth.ts:36-46`:

```ts
await tx.delete(votes).where(
  and(
    eq(votes.voterId, from),
    exists(tx.select().from(votes).as("v")),  // ← no correlation predicate
  ),
);
```

The `exists` subquery is an uncorrelated `SELECT * FROM votes`. It is true whenever the
votes table contains *any* row. The trailing comment describes the intended predicate
(`v.project_id = votes.project_id AND v.voter_id = to`) but the code does not implement it.

Effect: every time an anonymous user upgrades to a real account, **all** of their anonymous
votes are deleted, not just the ones that would collide — and then the `update` on line 48
finds nothing to reassign. Silent, unrecoverable vote loss on a routine path.

Fix: correlate the subquery against the outer row, or sidestep it entirely — reassign with
`onConflictDoNothing` and delete the leftovers afterward.

---

## P1 — fix before inviting users

### 4. Errors in the UI are swallowed

A consistent pattern, not isolated slips:

| Location | Problem |
|---|---|
| `src/routes/project/index.tsx:97` | `await deleteProject.mutate(...)` — react-query's `mutate` returns `void` and never throws. The surrounding `try/catch` is dead code; the `catch` can never run, and `setToDelete(null)` fires on failure. Use `mutateAsync`. |
| `src/routes/project/$projectSlug_.vote.tsx:57-64` | `submitVote` is awaited with no `try/catch`. A failure rejects unhandled, the success toast never fires, and the user gets no feedback on the app's primary action. |
| `src/routes/project/$projectSlug_.vote.tsx:31` | `getMyVote(...).then(...)` with no `.catch` — unhandled rejection. |
| `src/components/logInSignUp.tsx:69,100,151` | Same shape as #2: better-auth client calls resolve with `{ error }` instead of throwing, so these `try/catch` blocks never fire and `successAction?.()` runs even on a wrong password. **Worth confirming by hand** — sign in with a bad password and watch what the form does. |

### 5. The public vote route has no error boundary

`$projectSlug.tsx:15` has an `errorComponent`. `$projectSlug_.vote.tsx` — the page you send
to everyone you're scheduling with — has none, and neither does `__root.tsx`. Its loader
throws a bare `Error("project not found")` for any bad token, so a mistyped link renders
TanStack's fallback error screen instead of anything useful.

Add an `errorComponent` to the vote route and a catch-all on the root.

### 6. Loader promises are not awaited

`$projectSlug.tsx:11-14` calls `ensureQueryData` twice without `await` or `return`. The
loader resolves immediately; `useSuspenseQuery` in the component papers over it, but a
rejection surfaces as an unhandled rejection rather than routing to the `errorComponent`
defined directly below it. Return `Promise.all([...])`.

### 7. The SSE stream is unauthenticated

`src/routes/api/votes.$id.stream.ts` performs no session check. Anyone can open a stream for
any project token and observe vote activity in real time. The payload is only `changed`, so
this leaks timing rather than content — but it is also an unauthenticated, unbounded,
long-lived connection endpoint, which is a cheap resource-exhaustion target on a
self-hosted box.

Gate it on the same check `getVotesForProject` already does, and cap concurrent streams.

### 8. Devtools ship to production

`__root.tsx:78-88` mounts `TanStackDevtools` unconditionally. Wrap in
`import.meta.env.DEV`.

### 9. No rate limiting

Nothing throttles login, signup, project creation, or voting. better-auth has built-in rate
limiting — turn it on explicitly, and be aware that anonymous sign-in lets an attacker mint
unlimited user rows.

---

## P2 — self-hosting readiness

This is the weakest area. Right now nobody else can realistically run this.

- **No `LICENSE`.** Without one the code is legally all-rights-reserved and technically not
  open source. Pick one before publishing — MIT or AGPL depending on whether you mind
  someone running a hosted competitor.
- **The deploy URL is baked into the build.** `$projectSlug.tsx:46` builds share links from
  `import.meta.env.VITE_PROTOCOL` / `VITE_BASE_URL`. Vite inlines these at *build* time, so
  a self-hoster cannot configure their domain — they must rebuild the image. This is the
  single biggest self-hosting blocker. Derive the origin from the incoming request, or read
  it from a server-side runtime env var.
- **No `Dockerfile` / `docker-compose.yml`.** The expected deliverable for a self-hosted
  service is `docker compose up` with app + Postgres. Add both.
- **No migration step on boot.** Document or automate `drizzle-kit migrate` — otherwise
  first run hits an empty database.
- **No health-check endpoint** for container orchestration.
- **No CI.** No `.github/workflows`. You have `biome` and `vitest` wired up but nothing runs
  them.
- **No tests at all.** Zero `*.test.ts` files despite vitest being configured. At minimum
  cover `tallyVotes` and the anon-linking transaction from #3 — that bug would have been
  caught by one test.
- **README is the unmodified TanStack starter.** Also: `package.json` name is
  `starter-for-tanstack`, the page title is `"Appwrite + TanStack Start"`, the favicon points
  at `/appwrite.svg`, and `docs/` still holds Appwrite integration notes. Leftover
  scaffolding from a stack you no longer use.
- **Dead dependencies.** `@appwrite.io/pink-icons`, `shadcn` and `biome` (the wrong package —
  you correctly use `@biomejs/biome` in devDependencies), `pg` alongside `postgres`,
  `styled-components`. The `types` script still shells out to the Appwrite CLI.
- **Google Fonts is loaded from the CDN** (`__root.tsx:43-46`) while `@fontsource-variable/geist`
  sits installed and unused. For a self-hosted, EU-facing tool this is both an avoidable
  external dependency and a GDPR complaint waiting to happen. Serve fonts locally.

---

## Also worth knowing

- **`getUser` is an unauthenticated table dump.** `src/server/projects.ts:10-12` selects every
  row of `usersTable` with no session check, exposed as a callable server function. It appears
  unused by any component — but it is still a live endpoint. The table itself
  (`schema.ts:14-19`, with `name`/`age`/`email`) looks like leftover demo scaffolding
  unrelated to the better-auth `user` table. Delete both.
- **Token entropy is fine.** `crypto.randomUUID().slice(0, 32)` (`projects.ts:101`) keeps
  ~106 bits. Not a weakness — but note these tokens are the *only* thing protecting a
  project, so keep them out of logs and referrer headers.
- **`showResultsToGuests` semantics.** `getProject` (`projects.ts:40-43`) lets any
  authenticated user read a project with that flag set. That looks intentional; just be
  clear in the UI that "guests" means anyone with the link, not a curated list.
- **`minTime` / `maxTime` are unvalidated relative to each other.** The `TODO` at
  `schema.ts:30` is real: `createProjectInput` bounds each to 0–23 independently, so
  `minTime > maxTime` is accepted and produces an empty grid.

---

## Suggested order

1. `BETTER_AUTH_SECRET` — one line, closes an auth bypass.
2. The `exists` bug in `auth.ts` — actively destroying data.
3. Vote FK cascade + honest delete-account feedback.
4. Sweep the swallowed-error pattern (#4) and add the missing error boundaries (#5).
5. Auth the SSE endpoint, hide devtools, enable rate limiting.
6. Then self-hosting: license, runtime-configurable URL, Dockerfile, README rewrite, CI.

Items 1–3 are small, surgical diffs. The self-hosting work in step 6 is the larger project.
