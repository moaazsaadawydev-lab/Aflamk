FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx nx build api-gateway --configuration=production

FROM node:20-slim AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist/apps/api-gateway ./dist/apps/api-gateway
COPY libs/protos ./libs/protos
COPY libs/Templates ./libs/Templates

ENV NODE_ENV=docker-development
EXPOSE 3000
CMD ["node", "dist/apps/api-gateway/main.js"]
