# ── builder ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --workspace=@looki/api --workspace=@looki/shared --include-workspace-root

COPY tsconfig.json ./
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/src ./apps/api/src

RUN npm run build -w @looki/shared
RUN npm run build -w @looki/api

# ── dev stage (hot reload) ────────────────────────────────────────────────────
FROM node:20-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --workspace=@looki/api --workspace=@looki/shared --include-workspace-root

COPY tsconfig.json ./
EXPOSE 3000
CMD ["npx", "tsx", "apps/api/src/index.ts"]

# ── production ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

ENV NODE_ENV=production

RUN addgroup -S looki && adduser -S looki -G looki

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --workspace=@looki/api --workspace=@looki/shared --include-workspace-root --omit=dev

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY apps/api/src/db/migrations ./apps/api/dist/db/migrations

RUN chown -R looki:looki /app
USER looki

EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
