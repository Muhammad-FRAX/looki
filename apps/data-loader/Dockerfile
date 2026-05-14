FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/data-loader/package.json ./apps/data-loader/

RUN npm ci --workspace=@looki/data-loader --include-workspace-root

COPY tsconfig.json ./
COPY apps/data-loader/tsconfig.json ./apps/data-loader/
COPY apps/data-loader/src ./apps/data-loader/src

RUN npm run build -w @looki/data-loader

FROM node:20-alpine AS production

ENV NODE_ENV=production

RUN addgroup -S looki && adduser -S looki -G looki

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/data-loader/package.json ./apps/data-loader/

RUN npm ci --workspace=@looki/data-loader --include-workspace-root --omit=dev

COPY --from=builder /app/apps/data-loader/dist ./apps/data-loader/dist

RUN chown -R looki:looki /app
USER looki

CMD ["node", "apps/data-loader/dist/index.js"]
