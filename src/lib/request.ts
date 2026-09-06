import { headers } from "next/headers";

/**
 * Alamat IP klien.
 *
 * Aplikasi berada di belakang Cloudflare Tunnel, jadi urutan pemeriksaan
 * dimulai dari header milik Cloudflare, lalu proksi umum. Nilai ini hanya
 * dipakai untuk pembatas laju, bukan untuk otorisasi.
 */
export async function getClientIp(): Promise<string> {
  const daftar = await headers();
  const kandidat = [
    daftar.get("cf-connecting-ip"),
    daftar.get("x-real-ip"),
    daftar.get("x-forwarded-for")?.split(",")[0]?.trim(),
  ];
  for (const nilai of kandidat) {
    if (nilai) return nilai;
  }
  return "tidak-diketahui";
}
