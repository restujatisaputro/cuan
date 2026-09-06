#!/bin/sh
# Menjalankan migrasi lebih dulu, lalu menyalakan server.
# Migrasi bersifat idempoten sehingga aman dijalankan setiap container naik.
set -e

echo "[cuan] menjalankan migrasi basis data..."
node migrator/node_modules/prisma/build/index.js migrate deploy --schema=prisma/schema.prisma

echo "[cuan] menyalakan server pada porta ${PORT:-3000}..."
exec node server.js
