# ── builder ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --workspace=@looki/web --workspace=@looki/shared --include-workspace-root

COPY tsconfig.json ./
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY apps/web ./apps/web

RUN npm run build -w @looki/shared
RUN npm run build -w @looki/web

# ── dev stage ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --workspace=@looki/web --workspace=@looki/shared --include-workspace-root

COPY apps/web ./apps/web
EXPOSE 5173
CMD ["npm", "run", "dev", "-w", "@looki/web"]

# ── production (nginx) ────────────────────────────────────────────────────────
FROM nginx:alpine AS production

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
