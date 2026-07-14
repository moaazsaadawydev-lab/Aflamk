# syntax=docker/dockerfile:1
#
# One Dockerfile builds ANY app in this Nx monorepo.
# Pick which one with --build-arg APP_NAME=<nx project name>
# Valid values: Users | api-gateway | Notifications | Catalog | Payment | Booking
#
# Example (built by docker-compose automatically, or manually):
#   docker build --build-arg APP_NAME=Users -t booking/users .

ARG NODE_VERSION=22-alpine

# ---------- 1) deps: install all workspace dependencies once ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 2) build: compile the requested app with Nx ----------
FROM node:${NODE_VERSION} AS build
ARG APP_NAME
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx nx build ${APP_NAME}

# ---------- 3) runtime: minimal image, only what's needed to run ----------
FROM node:${NODE_VERSION} AS runtime
ARG APP_NAME
ENV APP_NAME=${APP_NAME}
ENV NODE_ENV=production
WORKDIR /app

# Full node_modules (kept simple/robust for now instead of the pruned
# per-app package.json Nx can generate, which currently drops the
# TypeORM "pg" driver since it's a dynamic require, not a static import).
COPY --from=deps /app/node_modules ./node_modules

# Compiled app (bundled main.js) for the requested service only
COPY --from=build /app/dist/apps/${APP_NAME} ./dist/apps/${APP_NAME}

# Proto files are read from disk at runtime (join(process.cwd(), 'libs/protos/...'))
COPY libs/protos ./libs/protos

# Run as a non-root user
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
USER nestjs

CMD node dist/apps/${APP_NAME}/main.js
