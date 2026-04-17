FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY services/realtime/package.json ./services/realtime/
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/realtime/node_modules ./services/realtime/node_modules
COPY . .
RUN pnpm --filter @medconnect/realtime run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 realtimeuser

COPY --from=builder --chown=realtimeuser:nodejs /app/services/realtime/dist ./dist
COPY --from=builder --chown=realtimeuser:nodejs /app/services/realtime/package.json ./

USER realtimeuser
EXPOSE 3002
EXPOSE 9091
CMD ["node", "dist/index.js"]