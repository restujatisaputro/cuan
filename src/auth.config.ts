import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

/**
 * Konfigurasi Auth.js yang aman dijalankan di runtime Edge (dipakai middleware).
 * Tidak boleh mengimpor Prisma maupun bcrypt di berkas ini.
 */

/** Halaman yang boleh diakses tanpa login. */
const RUTE_PUBLIK = ["/masuk", "/daftar"];

/**
 * Berkas yang harus terbuka untuk SIAPA PUN, masuk maupun tidak.
 *
 * Berbeda dari RUTE_PUBLIK yang memantulkan pengguna terautentikasi ke dasbor
 * -- perlakuan itu akan merusak berkas ini:
 *
 * - /manifest.webmanifest  Chrome mengambilnya sebelum pengguna sempat masuk.
 * - /sw.js                 Kalau dijawab HTML pengalihan, pendaftaran gagal.
 * - /offline               Justru dipakai ketika sesi tak bisa diverifikasi.
 * - /.well-known/assetlinks.json
 *                          Diambil perangkat Android tanpa cookie sama sekali;
 *                          kalau gagal, TWA jatuh kembali jadi tab Chrome
 *                          lengkap dengan bilah alamat.
 */
const BERKAS_TERBUKA = [
  "/sw.js",
  "/manifest.webmanifest",
  "/offline",
  "/.well-known/assetlinks.json",
];

/** Awalan rute yang hanya boleh diakses ADMIN. */
const RUTE_ADMIN = ["/admin"];

const TIGA_PULUH_HARI = 60 * 60 * 24 * 30;

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/masuk",
    error: "/masuk",
  },
  session: {
    strategy: "jwt",
    maxAge: TIGA_PULUH_HARI,
  },
  // Cookie sesi: httpOnly agar tidak terbaca JavaScript, sameSite=lax untuk
  // menahan CSRF lintas situs, dan secure saat berjalan di produksi (HTTPS).
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname, search } = request.nextUrl;
      const sudahMasuk = auth?.user != null;

      // Dicek paling awal: tidak boleh dipantulkan ke mana pun, apa pun sesinya.
      if (BERKAS_TERBUKA.includes(pathname)) return true;

      const rutePublik = RUTE_PUBLIK.some(
        (rute) => pathname === rute || pathname.startsWith(`${rute}/`),
      );

      if (rutePublik) {
        // Pengguna yang sudah masuk tidak perlu melihat halaman login lagi.
        if (sudahMasuk) {
          return NextResponse.redirect(new URL("/dasbor", request.nextUrl));
        }
        return true;
      }

      if (!sudahMasuk) {
        const tujuan = new URL("/masuk", request.nextUrl);
        if (pathname !== "/") {
          tujuan.searchParams.set("lanjut", `${pathname}${search}`);
        }
        return NextResponse.redirect(tujuan);
      }

      const ruteAdmin = RUTE_ADMIN.some(
        (rute) => pathname === rute || pathname.startsWith(`${rute}/`),
      );
      if (ruteAdmin && auth?.user.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dasbor", request.nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
