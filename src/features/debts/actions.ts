"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ambilPenggunaAtauGagal } from "@/lib/session";
import { galat, sukses, type FormState } from "@/features/auth/form-state";
import {
  debtIdSchema,
  debtPaymentSchema,
  debtSchema,
  paymentIdSchema,
} from "@/features/debts/schema";
import { alokasiPembayaran, hitungJadwal } from "@/lib/finance/amortization";
import { formatRupiah } from "@/lib/money";
import type { InterestType } from "@/lib/constants";

const SESI_HABIS = galat("Sesi berakhir. Muat ulang halaman lalu masuk kembali.");

function segarkan(id?: string): void {
  revalidatePath("/utang");
  if (id) revalidatePath(`/utang/${id}`);
  revalidatePath("/transaksi");
  revalidatePath("/akun");
  revalidatePath("/dasbor");
}

export async function simpanUtangAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const id = formData.get("id");
  const idLama = typeof id === "string" && id ? id : null;

  const hasil = debtSchema.safeParse({
    direction: formData.get("direction"),
    counterparty: formData.get("counterparty"),
    principal: formData.get("principal"),
    interestRateBps: formData.get("interestRateBps") ?? "",
    interestType: formData.get("interestType"),
    startDate: formData.get("startDate"),
    tenorMonths: formData.get("tenorMonths"),
    note: formData.get("note") ?? "",
  });

  if (!hasil.success) {
    return { galatField: z.flattenError(hasil.error).fieldErrors, gagal: true };
  }

  const data = hasil.data;
  // Jatuh tempo mengikuti angsuran terakhir pada jadwal.
  const jadwal = hitungJadwal({
    pokok: data.principal,
    bungaBps: data.interestRateBps,
    jenisBunga: data.interestType as InterestType,
    tenorBulan: data.tenorMonths,
    mulai: data.startDate,
  });
  const dueDate = jadwal[jadwal.length - 1]?.jatuhTempo ?? data.startDate;

  const isi = {
    direction: data.direction,
    counterparty: data.counterparty,
    principal: data.principal,
    interestRateBps: data.interestRateBps,
    interestType: data.interestType,
    startDate: data.startDate,
    dueDate,
    tenorMonths: data.tenorMonths,
    note: data.note || null,
  };

  if (idLama) {
    const lama = await prisma.debt.findFirst({
      where: { id: idLama, userId: pengguna.id },
      select: { id: true, _count: { select: { payments: true } } },
    });
    if (!lama) return galat("Catatan tidak ditemukan.");

    // Mengubah pokok, bunga, atau tenor akan membuat jadwal tidak lagi cocok
    // dengan pembayaran yang sudah tercatat.
    if (lama._count.payments > 0) {
      const hanyaKeterangan = await prisma.debt.findFirst({
        where: {
          id: idLama,
          principal: isi.principal,
          interestRateBps: isi.interestRateBps,
          interestType: isi.interestType,
          tenorMonths: isi.tenorMonths,
          startDate: isi.startDate,
        },
        select: { id: true },
      });
      if (!hanyaKeterangan) {
        return galat(
          `Sudah ada ${lama._count.payments} pembayaran tercatat. Pokok, bunga, tenor, dan tanggal mulai tidak bisa diubah lagi — hapus pembayarannya lebih dulu bila memang perlu.`,
        );
      }
    }

    await prisma.debt.update({ where: { id: idLama }, data: isi });
    segarkan(idLama);
    return sukses(`Catatan ${data.counterparty} diperbarui.`);
  }

  const dibuat = await prisma.debt.create({
    data: { ...isi, userId: pengguna.id, status: "AKTIF" },
  });
  segarkan(dibuat.id);
  return sukses(
    data.direction === "PAYABLE"
      ? `Utang kepada ${data.counterparty} dicatat.`
      : `Piutang dari ${data.counterparty} dicatat.`,
  );
}

export async function hapusUtangAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = debtIdSchema.safeParse({ id: formData.get("id") });
  if (!hasil.success) return galat("Permintaan tidak valid.");

  const utang = await prisma.debt.findFirst({
    where: { id: hasil.data.id, userId: pengguna.id },
    select: {
      id: true,
      counterparty: true,
      payments: { select: { transactionId: true } },
    },
  });
  if (!utang) return galat("Catatan tidak ditemukan.");

  const idTransaksi = utang.payments
    .map((bayar) => bayar.transactionId)
    .filter((nilai): nilai is string => Boolean(nilai));

  // Pembayaran ikut terhapus lewat cascade, tetapi transaksi kasnya harus
  // dihapus sendiri agar saldo akun kembali benar.
  await prisma.$transaction([
    prisma.debt.delete({ where: { id: utang.id } }),
    prisma.transaction.deleteMany({
      where: { id: { in: idTransaksi }, userId: pengguna.id },
    }),
  ]);

  segarkan();
  return sukses(`Catatan ${utang.counterparty} dan riwayatnya dihapus.`);
}

export async function catatPembayaranAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = debtPaymentSchema.safeParse({
    debtId: formData.get("debtId"),
    date: formData.get("date"),
    amount: formData.get("amount"),
    accountId: formData.get("accountId") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    note: formData.get("note") ?? "",
  });

  if (!hasil.success) {
    return { galatField: z.flattenError(hasil.error).fieldErrors, gagal: true };
  }

  const data = hasil.data;

  const utang = await prisma.debt.findFirst({
    where: { id: data.debtId, userId: pengguna.id },
    include: { payments: { select: { principalPortion: true } } },
  });
  if (!utang) return galat("Catatan tidak ditemukan.");

  const akun = await prisma.account.count({
    where: { id: data.accountId, userId: pengguna.id },
  });
  if (akun !== 1) return galat("Akun tidak ditemukan.");

  if (data.categoryId) {
    const kategori = await prisma.category.count({
      where: { id: data.categoryId, userId: pengguna.id },
    });
    if (kategori !== 1) return galat("Kategori tidak ditemukan.");
  }

  const pokokTerbayar = utang.payments.reduce(
    (jumlah, bayar) => jumlah + bayar.principalPortion,
    0n,
  );
  const sisaPokok = utang.principal - pokokTerbayar;
  if (sisaPokok <= 0n) {
    return galat("Catatan ini sudah lunas.");
  }

  // Bunga yang jatuh tempo diambil dari baris jadwal yang sedang berjalan.
  const jadwal = hitungJadwal({
    pokok: utang.principal,
    bungaBps: utang.interestRateBps,
    jenisBunga: utang.interestType as InterestType,
    tenorBulan: utang.tenorMonths,
    mulai: utang.startDate,
  });
  const barisBerjalan = jadwal.find((baris) => baris.sisaPokok < sisaPokok);
  const bungaJatuhTempo = barisBerjalan?.bunga ?? 0n;

  const alokasi = alokasiPembayaran(data.amount, bungaJatuhTempo, sisaPokok);
  if (alokasi.kelebihan > 0n) {
    return galat(
      `Nominal melebihi sisa tagihan. Maksimal ${formatRupiah(sisaPokok + bungaJatuhTempo)}.`,
    );
  }

  const membayarUtang = utang.direction === "PAYABLE";
  const catatan =
    data.note ||
    (membayarUtang
      ? `Cicilan ${utang.counterparty}`
      : `Pelunasan dari ${utang.counterparty}`);

  // Transaksi kas dan catatan pembayaran dibuat bersama supaya tidak pernah
  // ada pembayaran tanpa mutasi kas, atau sebaliknya.
  await prisma.$transaction(async (tx) => {
    const transaksi = await tx.transaction.create({
      data: {
        userId: pengguna.id,
        date: data.date,
        // Membayar utang mengurangi kas; menerima pelunasan piutang menambahnya.
        type: membayarUtang ? "EXPENSE" : "INCOME",
        amount: data.amount,
        accountId: data.accountId,
        categoryId: data.categoryId,
        note: catatan,
        tags: membayarUtang ? "cicilan" : "piutang",
      },
    });

    await tx.debtPayment.create({
      data: {
        debtId: utang.id,
        date: data.date,
        amount: data.amount,
        principalPortion: alokasi.porsiPokok,
        interestPortion: alokasi.porsiBunga,
        transactionId: transaksi.id,
      },
    });

    const sisaBaru = sisaPokok - alokasi.porsiPokok;
    await tx.debt.update({
      where: { id: utang.id },
      data: { status: sisaBaru <= 0n ? "LUNAS" : "AKTIF" },
    });
  });

  segarkan(utang.id);
  const sisaBaru = sisaPokok - alokasi.porsiPokok;
  return sukses(
    sisaBaru <= 0n
      ? `Pembayaran dicatat. ${utang.counterparty} lunas.`
      : `Pembayaran dicatat. Sisa pokok ${formatRupiah(sisaBaru)}.`,
  );
}

export async function hapusPembayaranAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = paymentIdSchema.safeParse({ id: formData.get("id") });
  if (!hasil.success) return galat("Permintaan tidak valid.");

  const pembayaran = await prisma.debtPayment.findFirst({
    where: { id: hasil.data.id, debt: { userId: pengguna.id } },
    include: { debt: { select: { id: true, principal: true } } },
  });
  if (!pembayaran) return galat("Pembayaran tidak ditemukan.");

  await prisma.$transaction(async (tx) => {
    await tx.debtPayment.delete({ where: { id: pembayaran.id } });
    if (pembayaran.transactionId) {
      await tx.transaction.deleteMany({
        where: { id: pembayaran.transactionId, userId: pengguna.id },
      });
    }
    // Menghapus pembayaran bisa membuat catatan yang tadinya lunas jadi aktif.
    const sisa = await tx.debtPayment.aggregate({
      where: { debtId: pembayaran.debt.id },
      _sum: { principalPortion: true },
    });
    const pokokTerbayar = sisa._sum.principalPortion ?? 0n;
    await tx.debt.update({
      where: { id: pembayaran.debt.id },
      data: {
        status:
          pembayaran.debt.principal - pokokTerbayar <= 0n ? "LUNAS" : "AKTIF",
      },
    });
  });

  segarkan(pembayaran.debt.id);
  return sukses("Pembayaran dan transaksi kasnya dihapus.");
}
