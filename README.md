# scheduler

A small, self-hostable "when can everyone meet?" tool. You create a project with a set of
candidate dates and a daily time window, share a link, and everyone paints the slots they're
available in. The owner watches the overlap fill in live.

> Live-Demo: [https://scheduler.davidstech.de](https://scheduler.davidstech.de)

<img width="2482" height="1326" alt="image" src="https://github.com/user-attachments/assets/600df786-e063-432e-a7ca-1fd9e4673cd9" />

<img width="2533" height="582" alt="image" src="https://github.com/user-attachments/assets/10b8b1cf-a4d3-4bdd-b1b8-0f7dc65e638b" />

<img width="2530" height="749" alt="image" src="https://github.com/user-attachments/assets/f255678a-c762-4cfb-b946-7dc7e4a1781f" />


## What it does

- **Create a project** — pick a name, the candidate dates, a daily time window (e.g. 08–22),
  and slot granularity (1h, 30 min or 15 min).
- **Share a link** — each project gets a random token; the vote page lives at
  `/project/<token>/vote`.
- **Vote** — participants drag across a grid to mark when they're free. One vote per person per
  project; voting again updates it, and their previous selection is pre-filled.
- **Live results** — the owner sees a heatmap of overlapping availability that updates in real
  time as votes come in.
- **Guest visibility** — the owner can toggle whether voters may see the results too.
- **Accounts** — email/password, optional GitHub login, or continue anonymously. If an
  anonymous user later creates an account, their projects and votes move over with them.
- **Account deletion** — deleting an account removes its projects and votes.

## Stack

| Layer      | Choice                                                           |
| ---------- | ---------------------------------------------------------------- |
| Framework  | [TanStack Start](https://tanstack.com/start) (React 19, SSR, Vite) |
| Routing    | TanStack Router (file-based, `src/routes`)                       |
| Data       | TanStack Query + TanStack Start server functions                 |
| Database   | PostgreSQL via [Drizzle ORM](https://orm.drizzle.team) (`postgres` driver) |
| Auth       | [better-auth](https://better-auth.com) (email/password, GitHub, anonymous) |
| UI         | [Astryx](https://www.npmjs.com/package/@astryxdesign/core) components + Tailwind CSS 4 |
| Validation | Zod                                                              |
| Tooling    | Vitest, Biome, TypeScript                                        |
| Runtime    | Bun (install/build), Node 24 + Nitro (server)                    |
| Deploy     | Docker Compose: app, Postgres, Caddy (Cloudflare DNS-01 TLS)     |

## Architecture

```
browser ──► TanStack Start (single Node process)
              ├─ routes/            SSR pages + client navigation
              ├─ server/*.ts        server functions (RPC, Zod-validated, auth-checked)
              ├─ routes/api/auth/$  better-auth handler
              └─ routes/api/votes/$id/stream   SSE: live vote updates
                        │
                        ▼
                    PostgreSQL ── LISTEN/NOTIFY "votes" channel
```

- **One process, no separate API.** Pages and data live in the same app. Components call
  server functions in `src/server/` (`projects.ts`, `votes.ts`) through TanStack Query; each
  function validates input with Zod and checks the better-auth session before touching the DB.
- **Live updates use Postgres itself.** Submitting a vote issues `NOTIFY votes, <token>`. The
  SSE endpoint `LISTEN`s on one shared connection and pushes an event to every subscribed
  owner, whose client then refetches. No Redis or websocket server needed. The stream applies
  the same permission check as the results query.
- **Data model** (`src/db/schema.ts`): `projects` (token, owner, dates, time window, slot size,
  guest visibility) and `votes` (project, voter, chosen slots; unique per project + voter).
  better-auth owns its tables in `src/db/auth-schema.ts`. Both cascade on user deletion.
- **Config fails fast.** `src/env.ts` validates environment variables at boot and exits with a
  readable message if anything is missing or malformed.
- **Theme.** `src/themes/theme.source.ts` is the source; `bun run theme:build` generates the
  Astryx CSS/JS next to it. `dev` and `build` run it automatically.

### Layout

```
src/
  routes/       pages: / (login), /project (dashboard), /project/$slug (results),
                /project/$slug/vote (voting), api/ (auth + SSE)
  server/       server functions + tests
  components/   schedule grid, results grid, calendar, auth UI
  db/           Drizzle client and schema
  lib/          auth setup, date helpers, anonymous-account linking
  themes/       Astryx theme source and generated output
drizzle/        SQL migrations
```

## Running it

Copy `.env.example` to `.env` and fill it in:

| Variable                 | Required | Notes                                         |
| ------------------------ | -------- | --------------------------------------------- |
| `DATABASE_URL`           | yes      | `postgres://` or `postgresql://` URL          |
| `BETTER_AUTH_URL`        | yes      | public URL of the app                         |
| `BETTER_AUTH_SECRET`     | yes      | ≥ 32 chars, `openssl rand -base64 32`         |
| `GITHUB_CLIENT_ID/SECRET`| no       | set both to enable GitHub login               |

```bash
bun install
bunx drizzle-kit migrate  # apply migrations
bun run dev               # http://localhost:3000
```

Other scripts: `bun run test`, `bun run build`, `bun run check` (Biome).

### Deploying with Docker Compose

`compose.yml` runs the whole stack: Postgres, a one-shot `migrate` job, the app, and Caddy
(`caddybuilds/caddy-cloudflare`) which gets a certificate via Cloudflare DNS-01 and is the only
published port (443). Fill in the "Docker compose deployment" block of `.env.example`, plus
`BETTER_AUTH_SECRET`, then:

```bash
docker compose up -d --build
```

Migrations run automatically before the app starts. Caddy trusts `X-Forwarded-For` only from
`100.64.0.0/10` (NetBird's reverse proxy) and forwards the resolved client IP, which better-auth's
rate limiter needs. Adjust `trusted_proxies` if a different proxy sits in front.
