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
    // Semua rute kecuali aset statis, berkas gambar, endpoint Auth.js,
    // endpoint penjadwal dan /api/v1 yang memakai token bearer alih-alih sesi
    // cookie, serta berkas PWA/TWA yang wajib terbuka tanpa sesi (lihat
    // BERKAS_TERBUKA pada auth.config.ts -- keduanya sengaja dijaga,
    // pertahanan berlapis).
    //
    // /api/v1 harus berada di luar matcher, bukan sekadar diizinkan callback
    // authorized: klien bearer tidak mengirim cookie, jadi middleware akan
    // memantulkannya ke /masuk dengan 307 berisi HTML, sedangkan yang
    // dibutuhkan klien Android adalah 401 berisi JSON. Setiap handler di sana
    // memverifikasi tokennya sendiri lewat penggunaDariPermintaan().
    "/((?!api/auth|api/cron|api/v1|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

export default middleware;
