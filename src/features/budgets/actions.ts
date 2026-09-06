"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ambilPenggunaAtauGagal } from "@/lib/session";
import { galat, sukses, type FormState } from "@/features/auth/form-state";
import {
  budgetIdSchema,
  budgetSchema,
  salinAnggaranSchema,
} from "@/features/budgets/schema";
import { geserPeriode, labelPeriode } from "@/features/dashboard/service";

const SESI_HABIS = galat("Sesi berakhir. Muat ulang halaman lalu masuk kembali.");

function segarkan(): void {
  revalidatePath("/anggaran");
  revalidatePath("/dasbor");
}

export async function simpanAnggaranAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = budgetSchema.safeParse({
    categoryId: formData.get("categoryId"),
    period: formData.get("period"),
    amount: formData.get("amount"),
  });

  if (!hasil.success) {
    return { galatField: z.flattenError(hasil.error).fieldErrors, gagal: true };
  }

  const kategori = await prisma.category.findFirst({
    where: { id: hasil.data.categoryId, userId: pengguna.id, kind: "EXPENSE" },
    select: { id: true, name: true },
  });
  if (!kategori) {
    return galat("Anggaran hanya bisa dipasang pada kategori pengeluaran.");
  }

  // Satu kategori hanya boleh punya satu anggaran per periode.
  await prisma.budget.upsert({
    where: {
      userId_categoryId_period: {
        userId: pengguna.id,
        categoryId: kategori.id,
        period: hasil.data.period,
      },
    },
    update: { amount: hasil.data.amount },
    create: {
      userId: pengguna.id,
      categoryId: kategori.id,
      period: hasil.data.period,
      amount: hasil.data.amount,
    },
  });

  segarkan();
  return sukses(`Anggaran ${kategori.name} disimpan.`);
}

export async function hapusAnggaranAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = budgetIdSchema.safeParse({ id: formData.get("id") });
  if (!hasil.success) return galat("Permintaan tidak valid.");

  const anggaran = await prisma.budget.findFirst({
    where: { id: hasil.data.id, userId: pengguna.id },
    include: { category: { select: { name: true } } },
  });
  if (!anggaran) return galat("Anggaran tidak ditemukan.");

  await prisma.budget.delete({ where: { id: anggaran.id } });
  segarkan();
  return sukses(`Anggaran ${anggaran.category.name} dihapus.`);
}

export async function salinAnggaranBulanLaluAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = salinAnggaranSchema.safeParse({ period: formData.get("period") });
  if (!hasil.success) return galat("Periode tidak valid.");

  const periodeTujuan = hasil.data.period;
  const periodeAsal = geserPeriode(periodeTujuan, -1);

  const sumber = await prisma.budget.findMany({
    where: { userId: pengguna.id, period: periodeAsal },
    select: { categoryId: true, amount: true },
  });
  if (sumber.length === 0) {
    return galat(`Tidak ada anggaran pada ${labelPeriode(periodeAsal, true)}.`);
  }

  // SQLite tidak mendukung skipDuplicates, jadi anggaran yang sudah ada pada
  // periode tujuan disaring lebih dulu agar nilainya tidak tertimpa.
  const sudahAda = await prisma.budget.findMany({
    where: { userId: pengguna.id, period: periodeTujuan },
    select: { categoryId: true },
  });
  const dilewati = new Set(sudahAda.map((item) => item.categoryId));
  const baru = sumber.filter((item) => !dilewati.has(item.categoryId));

  const dibuat = await prisma.budget.createMany({
    data: baru.map((item) => ({
      userId: pengguna.id,
      categoryId: item.categoryId,
      period: periodeTujuan,
      amount: item.amount,
    })),
  });

  segarkan();
  if (dibuat.count === 0) {
    return galat("Semua anggaran bulan lalu sudah ada di periode ini.");
  }
  return sukses(
    `${dibuat.count} anggaran disalin dari ${labelPeriode(periodeAsal, true)}.`,
  );
}
