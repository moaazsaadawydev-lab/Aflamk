FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx nx build Users --configuration=production

FROM node:20-slim AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist/apps/Users ./dist/apps/Users
COPY libs/protos ./libs/protos
COPY libs/Templates ./libs/Templates

ENV NODE_ENV=docker-development
EXPOSE 50051
CMD ["node", "dist/apps/Users/main.js"]
