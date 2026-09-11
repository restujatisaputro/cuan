import type { NextConfig } from "next";

/**
 * Header keamanan yang berlaku untuk seluruh respons.
 *
 * Content-Security-Policy masih memuat 'unsafe-inline' untuk skrip karena
 * Next.js menyisipkan skrip bootstrap dan data RSC secara inline; menghapusnya
 * memerlukan nonce per permintaan yang tidak sepadan untuk aplikasi mandiri
 * seperti ini. Sumber luar tetap ditutup rapat: hanya berkas dari domain
 * sendiri yang boleh dimuat.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  // Service worker dan manifest keduanya dari domain sendiri. Sebenarnya sudah
  // tercakup default-src, tapi ditulis eksplisit agar niatnya terbaca.
  "worker-src 'self'",
  "manifest-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const headerKeamanan = [
  { key: "Content-Security-Policy", value: CSP },
  // Menolak aplikasi ditanam di dalam iframe situs lain (anti clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // HSTS hanya bermakna di produksi yang sudah memakai HTTPS.
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Bundel mandiri hanya dipakai saat membangun image Docker; di mesin sendiri
  // "next start" tetap dipakai seperti biasa (keduanya tidak bisa digabung).
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: headerKeamanan },
      {
        // Service worker tidak boleh di-cache peramban. Kalau tersimpan lama,
        // perbaikan pada sw.js baru sampai ke pengguna berhari-hari kemudian.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
    ];
  },
};

export default nextConfig;
