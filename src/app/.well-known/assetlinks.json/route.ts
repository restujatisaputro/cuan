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
 *
 * Wajib "force-dynamic". Dengan "force-static", Next.js menjalankan handler ini
 * sekali saja saat `next build` -- dan tahap builder di Dockerfile tidak punya
 * TWA_PACKAGE_NAME maupun TWA_SHA256_FINGERPRINT, sehingga hasil kosong "[]"
 * ikut terpanggang ke dalam image dan .env saat runtime tidak lagi berpengaruh.
 * Verifikasi TWA lalu gagal tanpa pesan galat apa pun.
 */
export const dynamic = "force-dynamic";

/**
 * Membuang spasi dan tanda kutip pembungkus dari nilai .env.
 *
 * `env_file` pada docker compose melucuti tanda kutip, tetapi
 * `docker run --env-file` TIDAK -- nilainya sampai ke sini sebagai
 * `"uk.restujati.cuan"` lengkap dengan kutipnya. Sidik jari berkutip tidak akan
 * pernah cocok dengan sertifikat APK, dan kegagalannya sunyi total: berkas ini
 * tetap menjawab 200 dengan JSON yang tampak benar, Android sekadar menolak
 * memverifikasi dan memunculkan bilah alamat Chrome tanpa pesan apa pun.
 */
function bersihkan(nilai: string | undefined): string | undefined {
  const rapi = nilai?.trim().replace(/^["']|["']$/g, "").trim();
  return rapi ? rapi : undefined;
}

export function GET(): Response {
  const paket = bersihkan(process.env.TWA_PACKAGE_NAME);
  const sidikJari = bersihkan(process.env.TWA_SHA256_FINGERPRINT);

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
