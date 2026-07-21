FROM oven/bun:1 AS build
WORKDIR /usr/src/app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile          # includes devDeps 
COPY . .
ENV NODE_ENV=production
RUN bun run build

FROM node:25-slim AS run
WORKDIR /usr/src/app
ENV NODE_ENV=production PORT=3000
COPY --from=build /usr/src/app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server/server.js"]