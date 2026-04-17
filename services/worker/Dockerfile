FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY services/worker/package.json ./services/worker/
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/worker/node_modules ./services/worker/node_modules
COPY . .
RUN pnpm --filter @medconnect/worker run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 workeruser

COPY --from=builder --chown=workeruser:nodejs /app/services/worker/dist ./dist
COPY --from=builder --chown=workeruser:nodejs /app/services/worker/package.json ./

USER workeruser
CMD ["node", "dist/index.js"]