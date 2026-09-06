"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ambilPenggunaAtauGagal } from "@/lib/session";
import { galat, sukses, type FormState } from "@/features/auth/form-state";
import {
  transactionIdSchema,
  transactionSchema,
} from "@/features/transactions/schema";

const SESI_HABIS = galat("Sesi berakhir. Muat ulang halaman lalu masuk kembali.");

function segarkan(): void {
  revalidatePath("/transaksi");
  revalidatePath("/akun");
  revalidatePath("/dasbor");
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

  const data = hasil.data;
  // Transfer tidak berkategori; pemasukan/pengeluaran tidak punya akun tujuan.
  const toAccountId = data.type === "TRANSFER" ? data.toAccountId : null;
  const categoryId = data.type === "TRANSFER" ? null : data.categoryId;

  // Setiap referensi diverifikasi kepemilikannya sebelum dipakai.
  const idAkun = [data.accountId, toAccountId].filter(
    (nilai): nilai is string => Boolean(nilai),
  );
  const akunValid = await prisma.account.count({
    where: { id: { in: idAkun }, userId: pengguna.id },
  });
  if (akunValid !== idAkun.length) {
    return galat("Akun tidak ditemukan.");
  }

  if (categoryId) {
    const kategori = await prisma.category.findFirst({
      where: { id: categoryId, userId: pengguna.id },
      select: { kind: true },
    });
    if (!kategori) return galat("Kategori tidak ditemukan.");
    if (kategori.kind !== data.type) {
      return {
        galatField: {
          categoryId: [
            data.type === "INCOME"
              ? "Pilih kategori pemasukan"
              : "Pilih kategori pengeluaran",
          ],
        },
        gagal: true,
      };
    }
  }

  const isi = {
    date: data.date,
    type: data.type,
    amount: data.amount,
    accountId: data.accountId,
    toAccountId,
    categoryId,
    note: data.note || null,
    tags: data.tags || null,
  };

  if (idLama) {
    const lama = await prisma.transaction.findFirst({
      where: { id: idLama, userId: pengguna.id },
      select: {
        id: true,
        debtPayment: { select: { id: true } },
        savingsContribution: { select: { id: true } },
        investmentTx: { select: { id: true } },
      },
    });
    if (!lama) return galat("Transaksi tidak ditemukan.");
    if (lama.debtPayment || lama.savingsContribution || lama.investmentTx) {
      return galat(
        "Transaksi ini dibuat oleh modul lain (utang, tabungan, atau investasi). Ubah dari modul tersebut.",
      );
    }

    await prisma.transaction.update({ where: { id: idLama }, data: isi });
    segarkan();
    return sukses("Transaksi diperbarui.");
  }

  await prisma.transaction.create({
    data: { ...isi, userId: pengguna.id },
  });
  segarkan();
  return sukses("Transaksi dicatat.");
}

export async function hapusTransaksiAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = transactionIdSchema.safeParse({ id: formData.get("id") });
  if (!hasil.success) return galat("Permintaan tidak valid.");

  const transaksi = await prisma.transaction.findFirst({
    where: { id: hasil.data.id, userId: pengguna.id },
    select: {
      id: true,
      debtPayment: { select: { id: true } },
      savingsContribution: { select: { id: true } },
      investmentTx: { select: { id: true } },
    },
  });
  if (!transaksi) return galat("Transaksi tidak ditemukan.");
  if (
    transaksi.debtPayment ||
    transaksi.savingsContribution ||
    transaksi.investmentTx
  ) {
    return galat(
      "Transaksi ini terkait modul lain. Hapus dari modul utang, tabungan, atau investasi.",
    );
  }

  await prisma.transaction.delete({ where: { id: transaksi.id } });
  segarkan();
  return sukses("Transaksi dihapus.");
}
