"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ambilPenggunaAtauGagal } from "@/lib/session";
import { galat, sukses, type FormState } from "@/features/auth/form-state";
import {
  hapusTransaksi,
  simpanTransaksi,
  type HasilPerintah,
} from "@/features/transactions/commands";
import {
  transactionIdSchema,
  transactionSchema,
} from "@/features/transactions/schema";

/**
 * Adaptor web untuk modul transaksi.
 *
 * Aturannya sendiri ada di commands.ts supaya dipakai bersama /api/v1. Di sini
 * tinggal tiga hal: membaca FormData, memanggil perintah, lalu mengubah
 * hasilnya jadi FormState.
 */

const SESI_HABIS = galat("Sesi berakhir. Muat ulang halaman lalu masuk kembali.");

function segarkan(): void {
  revalidatePath("/transaksi");
  revalidatePath("/akun");
  revalidatePath("/dasbor");
}

/** Menerjemahkan kegagalan perintah jadi pesan form. */
function keFormState(
  hasil: Extract<HasilPerintah<never>, { ok: false }>,
): FormState {
  if (hasil.galatField) {
    return { galatField: hasil.galatField, gagal: true };
  }
  return galat(hasil.pesan);
}

export async function simpanTransaksiAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const id = formData.get("id");
  const idLama = typeof id === "string" && id ? id : null;

  const hasil = transactionSchema.safeParse({
    type: formData.get("type"),
    date: formData.get("date"),
    amount: formData.get("amount"),
    accountId: formData.get("accountId") ?? "",
    toAccountId: formData.get("toAccountId") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    note: formData.get("note") ?? "",
    tags: formData.get("tags") ?? "",
  });

  if (!hasil.success) {
    return { galatField: z.flattenError(hasil.error).fieldErrors, gagal: true };
  }

  const disimpan = await simpanTransaksi(pengguna.id, hasil.data, idLama);
  if (!disimpan.ok) return keFormState(disimpan);

  segarkan();
  return sukses(
    disimpan.data.dibuat ? "Transaksi dicatat." : "Transaksi diperbarui.",
  );
}

export async function hapusTransaksiAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = transactionIdSchema.safeParse({ id: formData.get("id") });
  if (!hasil.success) return galat("Permintaan tidak valid.");

  const dihapus = await hapusTransaksi(pengguna.id, hasil.data.id);
  if (!dihapus.ok) return keFormState(dihapus);

  segarkan();
  return sukses("Transaksi dihapus.");
}
