import { z } from "zod";
import { penggunaDariPermintaan } from "@/lib/api-auth";
import {
  TIDAK_DIIZINKAN,
  galatApi,
  jsonApi,
  statusUntuk,
} from "@/lib/api-response";
import { simpanTransaksi } from "@/features/transactions/commands";
import { ambilDaftarTransaksi } from "@/features/transactions/service";
import {
  filterSchema,
  transactionSchema,
} from "@/features/transactions/schema";

/**
 * Daftar dan pencatatan transaksi untuk klien bearer.
 *
 * Aturan tulisnya tidak ada di sini -- semuanya dipanggil dari
 * features/transactions/commands.ts, sumber yang sama yang dipakai Server
 * Action pada antarmuka web. Berkas ini hanya menerjemahkan HTTP ke perintah
 * dan hasilnya kembali ke HTTP.
 */

export const dynamic = "force-dynamic";

/** GET /api/v1/transaksi?tipe=&akun=&kategori=&dari=&sampai=&hal= */
export async function GET(request: Request): Promise<Response> {
  const pengguna = await penggunaDariPermintaan(request);
  if (!pengguna) return TIDAK_DIIZINKAN();

  const url = new URL(request.url);
  // filterSchema memakai .catch() pada tiap medan, jadi query yang aneh
  // menghasilkan nilai bawaan alih-alih galat -- perilaku yang sama dengan web.
  const filter = filterSchema.parse(
    Object.fromEntries(url.searchParams.entries()),
  );

  const hasil = await ambilDaftarTransaksi(pengguna.id, filter);

  return jsonApi({
    baris: hasil.baris,
    halaman: hasil.halaman,
    totalHalaman: hasil.totalHalaman,
    total: hasil.total,
    ringkasan: hasil.ringkasan,
  });
}

/** POST /api/v1/transaksi -- mencatat transaksi baru. */
export async function POST(request: Request): Promise<Response> {
  const pengguna = await penggunaDariPermintaan(request);
  if (!pengguna) return TIDAK_DIIZINKAN();

  let badan: unknown;
  try {
    badan = await request.json();
  } catch {
    return galatApi("BADAN_TIDAK_VALID", "Badan permintaan bukan JSON.", 400);
  }

  const hasil = transactionSchema.safeParse(badan);
  if (!hasil.success) {
    return galatApi(
      "VALIDASI",
      "Isian tidak valid.",
      422,
      z.flattenError(hasil.error).fieldErrors,
    );
  }

  const disimpan = await simpanTransaksi(pengguna.id, hasil.data);
  if (!disimpan.ok) {
    return galatApi(
      disimpan.kode,
      disimpan.pesan,
      statusUntuk(disimpan.kode),
      disimpan.galatField,
    );
  }

  return jsonApi({ id: disimpan.data.id }, 201);
}
