import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionType } from "@/lib/constants";
import {
  UKURAN_HALAMAN,
  type FilterTransaksi,
} from "@/features/transactions/schema";

export type BarisTransaksi = {
  id: string;
  date: Date;
  type: TransactionType;
  amount: bigint;
  note: string | null;
  tags: string | null;
  accountId: string;
  accountName: string;
  toAccountId: string | null;
  toAccountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  /** true bila transaksi ini dibuat modul lain (utang/tabungan/investasi). */
  terkaitModulLain: boolean;
};

export type HasilDaftarTransaksi = {
  baris: BarisTransaksi[];
  total: number;
  halaman: number;
  totalHalaman: number;
  ringkasan: { pemasukan: bigint; pengeluaran: bigint; transfer: bigint };
};

/** Menyusun klausa where dari filter, selalu dikunci pada userId. */
function susunWhere(
  userId: string,
  filter: FilterTransaksi,
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { userId };

  if (filter.tipe !== "SEMUA") {
    where.type = filter.tipe;
  }

  if (filter.akun) {
    // Transfer keluar maupun masuk sama-sama menyangkut akun tersebut.
    where.OR = [{ accountId: filter.akun }, { toAccountId: filter.akun }];
  }

  if (filter.kategori) {
    where.categoryId = filter.kategori;
  }

  if (filter.dari || filter.sampai) {
    where.date = {};
    if (filter.dari) where.date.gte = new Date(`${filter.dari}T00:00:00.000Z`);
    if (filter.sampai) where.date.lte = new Date(`${filter.sampai}T00:00:00.000Z`);
  }

  if (filter.q) {
    // SQLite tanpa ekstensi hanya mendukung LIKE; cukup untuk pencarian kata
    // kunci sederhana pada catatan dan tag.
    where.AND = [
      {
        OR: [
          { note: { contains: filter.q } },
          { tags: { contains: filter.q } },
        ],
      },
    ];
  }

  return where;
}

/** Mengambil daftar transaksi terfilter beserta ringkasan dan paginasi. */
export async function ambilDaftarTransaksi(
  userId: string,
  filter: FilterTransaksi,
): Promise<HasilDaftarTransaksi> {
  const where = susunWhere(userId, filter);

  const [total, ringkasanMentah] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({
      by: ["type"],
      where,
      _sum: { amount: true },
    }),
  ]);

  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));
  const halaman = Math.min(Math.max(1, filter.hal), totalHalaman);

  const data = await prisma.transaction.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    skip: (halaman - 1) * UKURAN_HALAMAN,
    take: UKURAN_HALAMAN,
    select: {
      id: true,
      date: true,
      type: true,
      amount: true,
      note: true,
      tags: true,
      accountId: true,
      toAccountId: true,
      categoryId: true,
      account: { select: { name: true } },
      toAccount: { select: { name: true } },
      category: { select: { name: true, color: true } },
      debtPayment: { select: { id: true } },
      savingsContribution: { select: { id: true } },
      investmentTx: { select: { id: true } },
    },
  });

  const ringkasan = { pemasukan: 0n, pengeluaran: 0n, transfer: 0n };
  for (const baris of ringkasanMentah) {
    const jumlah = baris._sum.amount ?? 0n;
    if (baris.type === "INCOME") ringkasan.pemasukan += jumlah;
    else if (baris.type === "EXPENSE") ringkasan.pengeluaran += jumlah;
    else ringkasan.transfer += jumlah;
  }

  return {
    total,
    halaman,
    totalHalaman,
    ringkasan,
    baris: data.map((item) => ({
      id: item.id,
      date: item.date,
      type: item.type as TransactionType,
      amount: item.amount,
      note: item.note,
      tags: item.tags,
      accountId: item.accountId,
      accountName: item.account.name,
      toAccountId: item.toAccountId,
      toAccountName: item.toAccount?.name ?? null,
      categoryId: item.categoryId,
      categoryName: item.category?.name ?? null,
      categoryColor: item.category?.color ?? null,
      terkaitModulLain:
        item.debtPayment !== null ||
        item.savingsContribution !== null ||
        item.investmentTx !== null,
    })),
  };
}
