"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ambilPenggunaAtauGagal } from "@/lib/session";
import { galat, sukses, type FormState } from "@/features/auth/form-state";
import {
  recurringIdSchema,
  recurringSchema,
} from "@/features/recurring/schema";
import { jalankanAturanJatuhTempo } from "@/features/recurring/service";

const SESI_HABIS = galat("Sesi berakhir. Muat ulang halaman lalu masuk kembali.");

function segarkan(): void {
  revalidatePath("/berulang");
  revalidatePath("/transaksi");
  revalidatePath("/akun");
  revalidatePath("/dasbor");
}

export async function simpanAturanAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const id = formData.get("id");
  const idLama = typeof id === "string" && id ? id : null;

  const hasil = recurringSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    accountId: formData.get("accountId") ?? "",
    toAccountId: formData.get("toAccountId") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    frequency: formData.get("frequency"),
    interval: formData.get("interval") ?? "1",
    nextRunDate: formData.get("nextRunDate"),
    endDate: formData.get("endDate") ?? "",
    note: formData.get("note") ?? "",
    tags: formData.get("tags") ?? "",
  });

  if (!hasil.success) {
    return { galatField: z.flattenError(hasil.error).fieldErrors, gagal: true };
  }

  const data = hasil.data;
  const toAccountId = data.type === "TRANSFER" ? data.toAccountId : null;
  const categoryId = data.type === "TRANSFER" ? null : data.categoryId;

  // Kepemilikan akun dan kategori diverifikasi ulang di server.
  const idAkun = [data.accountId, toAccountId].filter(
    (nilai): nilai is string => Boolean(nilai),
  );
  const akunValid = await prisma.account.count({
    where: { id: { in: idAkun }, userId: pengguna.id },
  });
  if (akunValid !== idAkun.length) return galat("Akun tidak ditemukan.");

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
    name: data.name,
    type: data.type,
    amount: data.amount,
    accountId: data.accountId,
    toAccountId,
    categoryId,
    frequency: data.frequency,
    interval: data.interval,
    nextRunDate: data.nextRunDate,
    endDate: data.endDate,
    note: data.note || null,
    tags: data.tags || null,
  };

  if (idLama) {
    const milik = await prisma.recurringRule.count({
      where: { id: idLama, userId: pengguna.id },
    });
    if (milik !== 1) return galat("Aturan tidak ditemukan.");

    await prisma.recurringRule.update({ where: { id: idLama }, data: isi });
    segarkan();
    return sukses(`Aturan ${data.name} diperbarui.`);
  }

  await prisma.recurringRule.create({
    data: { ...isi, userId: pengguna.id, isActive: true },
  });
  segarkan();
  return sukses(`Aturan ${data.name} dibuat.`);
}

export async function ubahAktifAturanAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = recurringIdSchema.safeParse({ id: formData.get("id") });
  if (!hasil.success) return galat("Permintaan tidak valid.");

  const aturan = await prisma.recurringRule.findFirst({
    where: { id: hasil.data.id, userId: pengguna.id },
    select: { id: true, name: true, isActive: true },
  });
  if (!aturan) return galat("Aturan tidak ditemukan.");

  await prisma.recurringRule.update({
    where: { id: aturan.id },
    data: { isActive: !aturan.isActive },
  });

  segarkan();
  return sukses(
    aturan.isActive
      ? `Aturan ${aturan.name} dijeda.`
      : `Aturan ${aturan.name} diaktifkan kembali.`,
  );
}

export async function hapusAturanAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = recurringIdSchema.safeParse({ id: formData.get("id") });
  if (!hasil.success) return galat("Permintaan tidak valid.");

  const aturan = await prisma.recurringRule.findFirst({
    where: { id: hasil.data.id, userId: pengguna.id },
    select: { id: true, name: true },
  });
  if (!aturan) return galat("Aturan tidak ditemukan.");

  // Transaksi yang sudah terlanjur dibuat sengaja dibiarkan; yang dihapus
  // hanya aturannya, bukan riwayat keuangannya.
  await prisma.recurringRule.delete({ where: { id: aturan.id } });

  segarkan();
  return sukses(`Aturan ${aturan.name} dihapus. Transaksi yang sudah dibuat tetap ada.`);
}

export async function jalankanAturanAction(
  _prevState: FormState,
  _formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = await jalankanAturanJatuhTempo(pengguna.id);
  segarkan();

  if (hasil.transaksiDibuat === 0) {
    return sukses("Tidak ada aturan yang jatuh tempo.");
  }
  return sukses(
    `${hasil.transaksiDibuat} transaksi dibuat dari ${hasil.aturanDiproses} aturan.`,
  );
}
