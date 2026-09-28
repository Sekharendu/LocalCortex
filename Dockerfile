# Builds the API and the chat UI for `docker compose --profile app up`.
# Development doesn't use this: run `pnpm dev` / `pnpm dev:web` against the infra containers.

FROM node:26-slim AS build
WORKDIR /app
# Node 25+ no longer ships corepack, so pnpm is installed at the version package.json pins.
RUN npm install -g pnpm@11.17.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/
COPY site/package.json site/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm build:web

# API: apply pending migrations, then serve. tsx (a dev dependency) runs the migrate script.
FROM build AS api
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "pnpm db:migrate && node dist/server.js"]

# Chat UI: the static build behind nginx, which also proxies /api to the API.
FROM nginx:alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html
