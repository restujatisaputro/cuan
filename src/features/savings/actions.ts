"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ambilPenggunaAtauGagal } from "@/lib/session";
import { galat, sukses, type FormState } from "@/features/auth/form-state";
import {
  contributionIdSchema,
  contributionSchema,
  goalIdSchema,
  goalStatusSchema,
  savingsGoalSchema,
} from "@/features/savings/schema";
import { formatRupiah } from "@/lib/money";

const SESI_HABIS = galat("Sesi berakhir. Muat ulang halaman lalu masuk kembali.");

function segarkan(id?: string): void {
  revalidatePath("/tabungan");
  if (id) revalidatePath(`/tabungan/${id}`);
  revalidatePath("/transaksi");
  revalidatePath("/akun");
  revalidatePath("/dasbor");
}

export async function simpanTargetAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const id = formData.get("id");
  const idLama = typeof id === "string" && id ? id : null;

  const hasil = savingsGoalSchema.safeParse({
    name: formData.get("name"),
    targetAmount: formData.get("targetAmount"),
    targetDate: formData.get("targetDate") ?? "",
    accountId: formData.get("accountId") ?? "",
  });

  if (!hasil.success) {
    return { galatField: z.flattenError(hasil.error).fieldErrors, gagal: true };
  }

  const data = hasil.data;
  const akun = await prisma.account.count({
    where: { id: data.accountId, userId: pengguna.id },
  });
  if (akun !== 1) return galat("Akun penampung tidak ditemukan.");

  if (idLama) {
    const lama = await prisma.savingsGoal.findFirst({
      where: { id: idLama, userId: pengguna.id },
      select: { id: true, _count: { select: { contributions: true } } },
    });
    if (!lama) return galat("Target tidak ditemukan.");

    // Akun penampung tidak boleh berpindah setelah ada setoran, karena setoran
    // lama sudah terlanjur masuk ke akun sebelumnya.
    if (lama._count.contributions > 0) {
      const akunSama = await prisma.savingsGoal.count({
        where: { id: idLama, accountId: data.accountId },
      });
      if (akunSama !== 1) {
        return galat(
          "Akun penampung tidak bisa diganti karena sudah ada setoran yang masuk ke akun sebelumnya.",
        );
      }
    }

    await prisma.savingsGoal.update({
      where: { id: idLama },
      data: {
        name: data.name,
        targetAmount: data.targetAmount,
        targetDate: data.targetDate,
        accountId: data.accountId,
      },
    });
    segarkan(idLama);
    return sukses(`Target ${data.name} diperbarui.`);
  }

  const dibuat = await prisma.savingsGoal.create({
    data: {
      userId: pengguna.id,
      name: data.name,
      targetAmount: data.targetAmount,
      targetDate: data.targetDate,
      accountId: data.accountId,
      status: "AKTIF",
    },
  });

  segarkan(dibuat.id);
  return sukses(`Target ${data.name} dibuat.`);
}

export async function ubahStatusTargetAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = goalStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!hasil.success) return galat("Permintaan tidak valid.");

  const target = await prisma.savingsGoal.findFirst({
    where: { id: hasil.data.id, userId: pengguna.id },
    select: { id: true, name: true },
  });
  if (!target) return galat("Target tidak ditemukan.");

  await prisma.savingsGoal.update({
    where: { id: target.id },
    data: { status: hasil.data.status },
  });

  segarkan(target.id);
  return sukses(
    hasil.data.status === "BATAL"
      ? `Target ${target.name} dibatalkan.`
      : `Target ${target.name} diaktifkan kembali.`,
  );
}

export async function hapusTargetAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = goalIdSchema.safeParse({ id: formData.get("id") });
  if (!hasil.success) return galat("Permintaan tidak valid.");

  const target = await prisma.savingsGoal.findFirst({
    where: { id: hasil.data.id, userId: pengguna.id },
    select: {
      id: true,
      name: true,
      contributions: { select: { transactionId: true } },
    },
  });
  if (!target) return galat("Target tidak ditemukan.");

  const idTransaksi = target.contributions
    .map((setoran) => setoran.transactionId)
    .filter((nilai): nilai is string => Boolean(nilai));

  // Setoran ikut terhapus lewat cascade; transaksi transfernya dihapus manual
  // agar saldo kedua akun kembali seperti semula.
  await prisma.$transaction([
    prisma.savingsGoal.delete({ where: { id: target.id } }),
    prisma.transaction.deleteMany({
      where: { id: { in: idTransaksi }, userId: pengguna.id },
    }),
  ]);

  segarkan();
  return sukses(`Target ${target.name} dan riwayat setorannya dihapus.`);
}

export async function catatSetoranAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = contributionSchema.safeParse({
    goalId: formData.get("goalId"),
    date: formData.get("date"),
    amount: formData.get("amount"),
    fromAccountId: formData.get("fromAccountId") ?? "",
    note: formData.get("note") ?? "",
  });

  if (!hasil.success) {
    return { galatField: z.flattenError(hasil.error).fieldErrors, gagal: true };
  }

  const data = hasil.data;

  const target = await prisma.savingsGoal.findFirst({
    where: { id: data.goalId, userId: pengguna.id },
    include: { contributions: { select: { amount: true } } },
  });
  if (!target) return galat("Target tidak ditemukan.");
  if (!target.accountId) {
    return galat("Target ini belum punya akun penampung.");
  }
  if (target.status === "BATAL") {
    return galat("Target ini sudah dibatalkan. Aktifkan lebih dulu.");
  }
  if (data.fromAccountId === target.accountId) {
    return {
      galatField: {
        fromAccountId: ["Akun sumber harus berbeda dari akun penampung"],
      },
      gagal: true,
    };
  }

  const akunSumber = await prisma.account.count({
    where: { id: data.fromAccountId, userId: pengguna.id },
  });
  if (akunSumber !== 1) return galat("Akun sumber tidak ditemukan.");

  const terkumpul = target.contributions.reduce(
    (jumlah, setoran) => jumlah + setoran.amount,
    0n,
  );
  const totalBaru = terkumpul + data.amount;

  // Setoran memindahkan uang antar akun sendiri, jadi dicatat sebagai TRANSFER
  // dan tidak muncul sebagai pengeluaran pada laporan arus kas.
  await prisma.$transaction(async (tx) => {
    const transaksi = await tx.transaction.create({
      data: {
        userId: pengguna.id,
        date: data.date,
        type: "TRANSFER",
        amount: data.amount,
        accountId: data.fromAccountId,
        toAccountId: target.accountId,
        note: data.note || `Setoran ${target.name}`,
        tags: "tabungan",
      },
    });

    await tx.savingsContribution.create({
      data: {
        goalId: target.id,
        date: data.date,
        amount: data.amount,
        transactionId: transaksi.id,
      },
    });

    await tx.savingsGoal.update({
      where: { id: target.id },
      data: { status: totalBaru >= target.targetAmount ? "TERCAPAI" : "AKTIF" },
    });
  });

  segarkan(target.id);
  const sisa = target.targetAmount - totalBaru;
  return sukses(
    sisa <= 0n
      ? `Setoran dicatat. Target ${target.name} tercapai!`
      : `Setoran dicatat. Kurang ${formatRupiah(sisa)} lagi.`,
  );
}

export async function hapusSetoranAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = contributionIdSchema.safeParse({ id: formData.get("id") });
  if (!hasil.success) return galat("Permintaan tidak valid.");

  const setoran = await prisma.savingsContribution.findFirst({
    where: { id: hasil.data.id, goal: { userId: pengguna.id } },
    include: { goal: { select: { id: true, targetAmount: true } } },
  });
  if (!setoran) return galat("Setoran tidak ditemukan.");

  await prisma.$transaction(async (tx) => {
    await tx.savingsContribution.delete({ where: { id: setoran.id } });
    if (setoran.transactionId) {
      await tx.transaction.deleteMany({
        where: { id: setoran.transactionId, userId: pengguna.id },
      });
    }
    const sisa = await tx.savingsContribution.aggregate({
      where: { goalId: setoran.goal.id },
      _sum: { amount: true },
    });
    const terkumpul = sisa._sum.amount ?? 0n;
    await tx.savingsGoal.update({
      where: { id: setoran.goal.id },
      data: {
        status: terkumpul >= setoran.goal.targetAmount ? "TERCAPAI" : "AKTIF",
      },
    });
  });

  segarkan(setoran.goal.id);
  return sukses("Setoran dan transfernya dihapus.");
}
