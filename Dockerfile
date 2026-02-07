# ─────────────────────────────────────────────
# OPTKAS Platform — Dashboard Container
# Multi-stage build. Minimal production image.
# ─────────────────────────────────────────────

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY config/ config/
COPY packages/ packages/
COPY apps/dashboard/ apps/dashboard/

RUN npm ci --ignore-scripts
RUN npx tsc -p apps/dashboard/tsconfig.json

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/config/ config/
COPY --from=builder /app/packages/ packages/
COPY --from=builder /app/apps/dashboard/package.json apps/dashboard/
COPY --from=builder /app/apps/dashboard/dist/ apps/dashboard/dist/

RUN npm ci --ignore-scripts --omit=dev && npm cache clean --force

RUN addgroup -g 1001 -S optkas && \
    adduser -S optkas -u 1001 -G optkas
USER optkas

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "apps/dashboard/dist/server.js"]
