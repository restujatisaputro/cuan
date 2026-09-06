"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ambilPenggunaAtauGagal } from "@/lib/session";
import { galat, sukses, type FormState } from "@/features/auth/form-state";
import { accountIdSchema, accountSchema } from "@/features/accounts/schema";

const SESI_HABIS = galat("Sesi berakhir. Muat ulang halaman lalu masuk kembali.");

function segarkan(): void {
  revalidatePath("/akun");
  revalidatePath("/transaksi");
  revalidatePath("/dasbor");
}

export async function simpanAkunAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const id = formData.get("id");
  const hasil = accountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    openingBalance: formData.get("openingBalance") ?? "0",
  });

  if (!hasil.success) {
    return { galatField: z.flattenError(hasil.error).fieldErrors, gagal: true };
  }

  // Nama akun harus unik per pengguna agar tidak membingungkan saat memilih.
  const bentrok = await prisma.account.findFirst({
    where: {
      userId: pengguna.id,
      name: hasil.data.name,
      ...(typeof id === "string" && id ? { NOT: { id } } : {}),
    },
    select: { id: true },
  });
  if (bentrok) {
    return {
      galatField: { name: ["Sudah ada akun dengan nama ini"] },
      gagal: true,
    };
  }

  if (typeof id === "string" && id) {
    const milik = await prisma.account.count({ where: { id, userId: pengguna.id } });
    if (milik !== 1) return galat("Akun tidak ditemukan.");

    await prisma.account.update({
      where: { id },
      data: hasil.data,
    });
    segarkan();
    return sukses(`Akun ${hasil.data.name} diperbarui.`);
  }

  await prisma.account.create({
    data: { ...hasil.data, userId: pengguna.id },
  });
  segarkan();
  return sukses(`Akun ${hasil.data.name} ditambahkan.`);
}

export async function ubahArsipAkunAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = accountIdSchema.safeParse({ id: formData.get("id") });
  if (!hasil.success) return galat("Permintaan tidak valid.");

  const akun = await prisma.account.findFirst({
    where: { id: hasil.data.id, userId: pengguna.id },
    select: { id: true, name: true, isArchived: true },
  });
  if (!akun) return galat("Akun tidak ditemukan.");

  await prisma.account.update({
    where: { id: akun.id },
    data: { isArchived: !akun.isArchived },
  });
  segarkan();
  return sukses(
    akun.isArchived
      ? `Akun ${akun.name} diaktifkan kembali.`
      : `Akun ${akun.name} diarsipkan.`,
  );
}

export async function hapusAkunAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = accountIdSchema.safeParse({ id: formData.get("id") });
  if (!hasil.success) return galat("Permintaan tidak valid.");

  const akun = await prisma.account.findFirst({
    where: { id: hasil.data.id, userId: pengguna.id },
    select: { id: true, name: true },
  });
  if (!akun) return galat("Akun tidak ditemukan.");

  // Menghapus akun ikut menghapus transaksinya (cascade), jadi tolak selama
  // masih ada transaksi. Pengguna diarahkan memakai arsip.
  const terpakai = await prisma.transaction.count({
    where: {
      userId: pengguna.id,
      OR: [{ accountId: akun.id }, { toAccountId: akun.id }],
    },
  });
  if (terpakai > 0) {
    return galat(
      `Akun ${akun.name} masih dipakai ${terpakai} transaksi. Arsipkan saja agar riwayatnya tetap utuh.`,
    );
  }

  const dipakaiTabungan = await prisma.savingsGoal.count({
    where: { userId: pengguna.id, accountId: akun.id },
  });
  if (dipakaiTabungan > 0) {
    return galat(`Akun ${akun.name} masih dipakai target tabungan.`);
  }

  await prisma.account.delete({ where: { id: akun.id } });
  segarkan();
  return sukses(`Akun ${akun.name} dihapus.`);
}
