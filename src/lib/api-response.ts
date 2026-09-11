import type { KodeGalat } from "@/features/transactions/commands";

/**
 * Bentuk jawaban seragam untuk /api/v1.
 *
 * Klien Android hanya boleh perlu membaca dua hal: kode status HTTP, dan
 * medan `kode` pada badan galat. Pesan berbahasa Indonesia disertakan untuk
 * ditampilkan apa adanya, tetapi tidak boleh dipakai sebagai penentu cabang
 * logika -- teksnya bisa berubah kapan saja.
 */

/**
 * Nominal disimpan sebagai BigInt rupiah penuh, dan JSON.stringify menolak
 * BigInt dengan melempar TypeError. Diubah jadi string, bukan number, supaya
 * bilangan di atas 2^53 tidak kehilangan digit saat dibaca klien.
 */
function ganti(_kunci: string, nilai: unknown): unknown {
  return typeof nilai === "bigint" ? nilai.toString() : nilai;
}

export function jsonApi(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, ganti), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Data keuangan per pengguna; jangan pernah singgah di cache bersama.
      "Cache-Control": "no-store",
    },
  });
}

export type KodeGalatApi =
  | KodeGalat
  | "TIDAK_DIIZINKAN"
  | "BADAN_TIDAK_VALID"
  | "METODE_SALAH";

export function galatApi(
  kode: KodeGalatApi,
  pesan: string,
  status: number,
  galatField?: Record<string, string[]>,
): Response {
  return jsonApi({ kode, pesan, galatField }, status);
}

/** Status HTTP yang mewakili tiap sebab kegagalan perintah. */
export function statusUntuk(kode: KodeGalat): number {
  switch (kode) {
    case "TIDAK_DITEMUKAN":
      return 404;
    case "VALIDASI":
      return 422;
    case "TERKAIT_MODUL_LAIN":
      // Permintaannya sah, keadaan barisnya yang menolak -- bukan 400.
      return 409;
  }
}

export const TIDAK_DIIZINKAN = (): Response =>
  galatApi(
    "TIDAK_DIIZINKAN",
    "Token tidak sah, sudah dicabut, atau kedaluwarsa.",
    401,
  );
