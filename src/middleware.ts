import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Proteksi rute di lapisan pertama. Callback `authorized` di auth.config.ts
 * yang menentukan siapa boleh mengakses apa. Setiap Server Action dan Route
 * Handler tetap memverifikasi sesi sendiri (pertahanan berlapis), karena token
 * di sini bisa saja belum mencerminkan perubahan peran/status terbaru.
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    // Semua rute kecuali aset statis, berkas gambar, endpoint Auth.js, dan
    // endpoint penjadwal yang memakai token bearer alih-alih sesi cookie.
    "/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

export default middleware;
