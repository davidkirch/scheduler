FROM oven/bun:1 AS build
WORKDIR /usr/src/app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile          # includes devDeps (drizzle-kit for the migrate service)
COPY . .
ENV NODE_ENV=production
RUN bun run build

# Nitro bundles every dependency into .output, so the runtime needs no node_modules.
FROM node:24-slim AS run
WORKDIR /usr/src/app
ENV NODE_ENV=production PORT=3000
COPY --from=build /usr/src/app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
