import { z } from "zod";
import { penggunaDariPermintaan } from "@/lib/api-auth";
import {
  TIDAK_DIIZINKAN,
  galatApi,
  jsonApi,
  statusUntuk,
} from "@/lib/api-response";
import {
  hapusTransaksi,
  simpanTransaksi,
} from "@/features/transactions/commands";
import { transactionSchema } from "@/features/transactions/schema";

/** Menyunting dan menghapus satu transaksi. */

export const dynamic = "force-dynamic";

type Konteks = { params: Promise<{ id: string }> };

/** PUT /api/v1/transaksi/:id -- mengganti seluruh isi transaksi. */
export async function PUT(
  request: Request,
  { params }: Konteks,
): Promise<Response> {
  const pengguna = await penggunaDariPermintaan(request);
  if (!pengguna) return TIDAK_DIIZINKAN();

  const { id } = await params;

  let badan: unknown;
  try {
    badan = await request.json();
  } catch {
    return galatApi("BADAN_TIDAK_VALID", "Badan permintaan bukan JSON.", 400);
  }

  // Sengaja PUT, bukan PATCH: transactionSchema memvalidasi transaksi sebagai
  // satu kesatuan (transfer wajib berakun tujuan, pemasukan wajib berkategori).
  // Pembaruan sebagian akan melewati aturan silang itu.
  const hasil = transactionSchema.safeParse(badan);
  if (!hasil.success) {
    return galatApi(
      "VALIDASI",
      "Isian tidak valid.",
      422,
      z.flattenError(hasil.error).fieldErrors,
    );
  }

  const disimpan = await simpanTransaksi(pengguna.id, hasil.data, id);
  if (!disimpan.ok) {
    return galatApi(
      disimpan.kode,
      disimpan.pesan,
      statusUntuk(disimpan.kode),
      disimpan.galatField,
    );
  }

  return jsonApi({ id: disimpan.data.id });
}

/** DELETE /api/v1/transaksi/:id */
export async function DELETE(
  request: Request,
  { params }: Konteks,
): Promise<Response> {
  const pengguna = await penggunaDariPermintaan(request);
  if (!pengguna) return TIDAK_DIIZINKAN();

  const { id } = await params;

  const dihapus = await hapusTransaksi(pengguna.id, id);
  if (!dihapus.ok) {
    return galatApi(dihapus.kode, dihapus.pesan, statusUntuk(dihapus.kode));
  }

  return jsonApi({ id: dihapus.data.id });
}
