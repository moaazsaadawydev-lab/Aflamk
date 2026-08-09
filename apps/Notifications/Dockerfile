FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx nx build Notifications --configuration=production

FROM node:20-slim AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist/apps/Notifications ./dist/apps/Notifications
COPY libs/protos ./libs/protos
COPY libs/Templates ./libs/Templates

ENV NODE_ENV=docker-development
CMD ["node", "dist/apps/Notifications/main.js"]
