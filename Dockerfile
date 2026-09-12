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

# Membuang mesin kueri WASM untuk basis data yang tidak dipakai Cuan.
#
# @prisma/client mengirim mesin kueri dan kompiler kueri untuk SETIAP basis data
# yang didukung dalam bentuk WASM base64 -- CockroachDB, PostgreSQL, MySQL, SQL
# Server, dan SQLite -- masing-masing digandakan sebagai .js dan .mjs. Totalnya
# 53 MB. Cuan hanya memakai SQLite, jadi empat basis data lainnya adalah beban
# mati sekitar 42 MB.
#
# Varian SQLite sengaja DIPERTAHANKAN meskipun runtime memakai engine native
# (libquery_engine-linux-musl-*.so.node): "prisma generate" memuat berkas itu
# saat build dan berhenti dengan "Cannot find module ...
# query_engine_bg.sqlite.wasm-base64.js" bila ia tidak ada. Ini sudah dicoba.
#
# Pemangkasan dilakukan DI SINI, bukan di tahap runner, karena lapisan Docker
# bersifat menumpuk: menghapus berkas setelah COPY hanya menambah lapisan baru
# sementara datanya tetap utuh di lapisan sebelumnya.
RUN find node_modules/@prisma/client/runtime -name '*wasm-base64*' ! -name '*sqlite*' -delete \
  && find node_modules/@prisma/client/runtime -name '*react-native*' -delete

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

# "prisma migrate deploy" hanya memakai schema-engine. Paket @prisma/engines
# turut membawa libquery_engine (16,7 MB) yang di image ini sudah ada dua kali
# lagi -- di .prisma/client dan di node_modules/@prisma milik aplikasi. Salinan
# ketiga di sini tidak pernah dimuat.
RUN rm -f node_modules/@prisma/engines/libquery_engine-*.so.node

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

# Membersihkan keluaran standalone dari berkas yang tidak dipakai saat runtime.
#
# next build menelusuri impor untuk memutuskan apa yang ikut, dan penelusuran
# itu menyapu lebih luas daripada yang benar-benar dieksekusi:
#
# - typescript (8,7 MB) ikut terbawa lewat rantai impor peralatan build.
#   Tidak ada TypeScript yang dikompilasi saat container berjalan.
# - sharp mengirim libvips untuk glibc DAN musl, masing-masing sekitar 18 MB.
#   Image ini Alpine, jadi hanya varian musl yang bisa dimuat; varian glibc
#   tidak akan pernah tersentuh.
RUN rm -rf .next/standalone/node_modules/typescript \
  .next/standalone/node_modules/@img/sharp-libvips-linux-x64 \
  .next/standalone/node_modules/@img/sharp-linux-x64 \
  .next/standalone/node_modules/@img/sharp-wasm32

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
