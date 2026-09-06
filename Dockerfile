# syntax=docker/dockerfile:1

# --------------------------------------------------------------------------
# Tahap 1: dependensi
# --------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# openssl dibutuhkan Prisma untuk memilih engine yang cocok di Alpine.
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

# --------------------------------------------------------------------------
# Tahap 2: build
# --------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Nilai ini hanya dipakai agar Prisma bisa memuat skema saat build; basis data
# sungguhan disuntikkan lewat variabel lingkungan saat container berjalan.
ENV DATABASE_URL="file:../data/cuan.db"
RUN npm run build

# --------------------------------------------------------------------------
# Tahap 3: runtime
# --------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S cuan && adduser -S cuan -G cuan

# Keluaran standalone sudah memuat dependensi runtime yang diperlukan.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma CLI ikut disertakan supaya migrasi bisa dijalankan saat container naik.
COPY --from=builder /app/prisma ./prisma
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh \
  && mkdir -p /app/data /app/backup \
  && chown -R cuan:cuan /app

USER cuan
EXPOSE 3000

# Basis data disimpan pada volume agar tidak hilang saat image diperbarui.
VOLUME ["/app/data", "/app/backup"]

ENTRYPOINT ["./docker-entrypoint.sh"]
