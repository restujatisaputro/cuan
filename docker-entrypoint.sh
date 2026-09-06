#!/bin/sh
# Menjalankan migrasi lebih dulu, lalu menyalakan server.
# Migrasi bersifat idempoten sehingga aman dijalankan setiap container naik.
set -e

echo "[cuan] menjalankan migrasi basis data..."
node node_modules/prisma/build/index.js migrate deploy

echo "[cuan] menyalakan server pada porta ${PORT:-3000}..."
exec node server.js
