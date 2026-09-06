# syntax=docker/dockerfile:1

# --------------------------------------------------------------------------
# Tahap 1: dependensi
# --------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# openssl dibutuhkan Prisma untuk memilih engine yang cocok di Alpine.
RUN apk add --no-cache openssl

# Skema Prisma disalin lebih dulu karena skrip postinstall menjalankan
# "prisma generate", yang membutuhkan berkas skema sudah ada.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# --------------------------------------------------------------------------
# Tahap 2: CLI migrasi
# --------------------------------------------------------------------------
# Prisma CLI dipasang di folder terpisah supaya dependensi transitifnya ikut
# lengkap, tanpa harus membawa seluruh node_modules pengembangan ke image akhir.
FROM node:22-alpine AS migrator
WORKDIR /migrator
RUN apk add --no-cache openssl
# package.json sengaja ditaruh di luar folder kerja: bila ada di dalamnya, npm
# ikut memasang seluruh dependensi aplikasi, bukan hanya Prisma CLI.
COPY package.json /tmp/package.json
RUN npm install --no-save --omit=dev       "prisma@$(node -p "require('/tmp/package.json').devDependencies.prisma")"   && rm -f /tmp/package.json

# --------------------------------------------------------------------------
# Tahap 3: build
# --------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Meminta Next.js menghasilkan bundel mandiri untuk image ini.
ENV NEXT_OUTPUT_STANDALONE=1
# Nilai ini hanya dipakai agar Prisma bisa memuat skema saat build; basis data
# sungguhan disuntikkan lewat variabel lingkungan saat container berjalan.
ENV DATABASE_URL="file:../data/cuan.db"
RUN npm run build

# --------------------------------------------------------------------------
# Tahap 4: runtime
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
COPY --from=builder --chown=cuan:cuan /app/public ./public
COPY --from=builder --chown=cuan:cuan /app/.next/standalone ./
COPY --from=builder --chown=cuan:cuan /app/.next/static ./.next/static

# Skema dan klien Prisma yang sudah di-generate.
COPY --from=builder --chown=cuan:cuan /app/prisma ./prisma
COPY --from=deps --chown=cuan:cuan /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps --chown=cuan:cuan /app/node_modules/@prisma ./node_modules/@prisma

# CLI migrasi beserta dependensinya, dipakai sekali saat container naik.
COPY --from=migrator --chown=cuan:cuan /migrator/node_modules ./migrator/node_modules

COPY --chown=cuan:cuan docker-entrypoint.sh ./docker-entrypoint.sh

# sed membuang CR bila berkas ter-checkout dengan akhir baris Windows: skrip
# ber-CRLF ditolak kernel Linux pada baris shebang.
# Kepemilikan berkas lain sudah diatur lewat --chown pada tiap COPY; chown -R
# di sini akan menyalin ulang seluruh isi image menjadi satu lapisan baru.
RUN sed -i 's/\r$//' ./docker-entrypoint.sh \
  && chmod +x ./docker-entrypoint.sh \
  && mkdir -p /app/data /app/backup \
  && chown cuan:cuan /app/data /app/backup

USER cuan
EXPOSE 3000

# Basis data disimpan pada volume agar tidak hilang saat image diperbarui.
VOLUME ["/app/data", "/app/backup"]

ENTRYPOINT ["./docker-entrypoint.sh"]
