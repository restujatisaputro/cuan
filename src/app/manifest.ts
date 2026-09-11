import type { MetadataRoute } from "next";

/**
 * Manifest PWA sekaligus sumber kebenaran untuk pembungkus TWA di Android.
 *
 * Berkas ini wajib bisa diambil tanpa sesi login. Chrome mengambil manifest
 * sebelum pengguna sempat masuk, dan Bubblewrap membacanya saat membangun APK.
 * Pengecualiannya diatur di RUTE_PUBLIK pada auth.config.ts.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cuan — Catatan Keuangan Pribadi",
    short_name: "Cuan",
    description:
      "Pencatatan keuangan pribadi: arus kas, utang, tabungan, dan investasi dalam satu tempat.",
    lang: "id",
    dir: "ltr",
    start_url: "/dasbor",
    // Dibuka langsung ke dasbor, bukan "/", supaya yang sudah masuk tidak
    // melewati satu redirect tambahan setiap kali membuka aplikasi.
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1c1c1c",
    theme_color: "#1c1c1c",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/ikon/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/ikon/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Ikon maskable dipisah karena peluncur Android memotongnya jadi bentuk
      // apa pun; isi pentingnya sudah ditarik ke lingkaran aman 80% di tengah.
      {
        src: "/ikon/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/ikon/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Catat transaksi",
        short_name: "Transaksi",
        url: "/transaksi",
      },
      { name: "Laporan", short_name: "Laporan", url: "/laporan" },
    ],
  };
}
