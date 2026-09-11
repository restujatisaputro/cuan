/**
 * Digital Asset Links untuk pembungkus TWA di Android.
 *
 * Perangkat Android mengambil berkas ini TANPA cookie untuk membuktikan bahwa
 * APK dan domain cuan.restujati.uk dimiliki pihak yang sama. Bila verifikasi
 * gagal, aplikasi tetap terbuka tetapi memunculkan bilah alamat Chrome di
 * atas layar -- tanda paling umum bahwa berkas ini salah atau tak terjangkau.
 *
 * Sidik jari diisi lewat variabel lingkungan, bukan ditulis di kode, supaya
 * sertifikat penandatanganan bisa diganti tanpa membangun ulang image.
 * Ambil nilainya dengan:
 *
 *   keytool -list -v -keystore cuan.keystore -alias cuan
 */
export const dynamic = "force-static";

export function GET(): Response {
  const paket = process.env.TWA_PACKAGE_NAME;
  const sidikJari = process.env.TWA_SHA256_FINGERPRINT;

  // Selama belum dikonfigurasi, jawab dengan senarai kosong yang tetap sah
  // sebagai JSON. Android akan menyimpulkan "belum terverifikasi" alih-alih
  // menemui 404 yang membuat galat lebih sulit dibaca.
  const isi =
    paket && sidikJari
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: paket,
              sha256_cert_fingerprints: sidikJari
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            },
          },
        ]
      : [];

  return Response.json(isi, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
