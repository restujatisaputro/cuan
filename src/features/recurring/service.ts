import "server-only";
import { prisma } from "@/lib/prisma";
import { rencanaJalan } from "@/lib/finance/recurrence";
import type { Frequency, TransactionType } from "@/lib/constants";

export type RingkasanAturan = {
  id: string;
  name: string;
  type: TransactionType;
  amount: bigint;
  accountId: string;
  akun: string;
  toAccountId: string | null;
  akunTujuan: string | null;
  categoryId: string | null;
  kategori: string | null;
  frequency: Frequency;
  interval: number;
  nextRunDate: Date;
  endDate: Date | null;
  lastRunAt: Date | null;
  isActive: boolean;
  note: string | null;
  tags: string | null;
  /** true bila jadwalnya sudah lewat dan menunggu dijalankan. */
  tertunggak: boolean;
};

/** Seluruh aturan berulang milik pengguna. */
export async function ambilDaftarAturan(
  userId: string,
): Promise<RingkasanAturan[]> {
  const daftar = await prisma.recurringRule.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { nextRunDate: "asc" }],
    include: {
      account: { select: { name: true } },
      toAccount: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  const sekarang = Date.now();

  return daftar.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type as TransactionType,
    amount: item.amount,
    accountId: item.accountId,
    akun: item.account.name,
    toAccountId: item.toAccountId,
    akunTujuan: item.toAccount?.name ?? null,
    categoryId: item.categoryId,
    kategori: item.category?.name ?? null,
    frequency: item.frequency as Frequency,
    interval: item.interval,
    nextRunDate: item.nextRunDate,
    endDate: item.endDate,
    lastRunAt: item.lastRunAt,
    isActive: item.isActive,
    note: item.note,
    tags: item.tags,
    tertunggak: item.isActive && item.nextRunDate.getTime() <= sekarang,
  }));
}

export type HasilJalan = {
  aturanDiproses: number;
  transaksiDibuat: number;
};

/**
 * Menjalankan seluruh aturan yang sudah jatuh tempo.
 *
 * Dipanggil dari tombol "Jalankan sekarang" maupun endpoint terjadwal. Aman
 * dipanggil berkali-kali: setiap aturan hanya membuat transaksi untuk tanggal
 * yang belum terlewati, lalu jadwal berikutnya dimajukan dalam transaksi yang
 * sama sehingga tidak pernah dobel.
 */
export async function jalankanAturanJatuhTempo(
  userId: string,
  sampai: Date = new Date(),
): Promise<HasilJalan> {
  const daftar = await prisma.recurringRule.findMany({
    where: { userId, isActive: true, nextRunDate: { lte: sampai } },
  });

  let transaksiDibuat = 0;
  let aturanDiproses = 0;

  for (const aturan of daftar) {
    const rencana = rencanaJalan(
      aturan.nextRunDate,
      aturan.frequency as Frequency,
      aturan.interval,
      sampai,
      aturan.endDate,
    );
    if (rencana.tanggal.length === 0) continue;

    await prisma.$transaction(async (tx) => {
      await tx.transaction.createMany({
        data: rencana.tanggal.map((tanggal) => ({
          userId,
          date: tanggal,
          type: aturan.type,
          amount: aturan.amount,
          accountId: aturan.accountId,
          toAccountId: aturan.type === "TRANSFER" ? aturan.toAccountId : null,
          categoryId: aturan.type === "TRANSFER" ? null : aturan.categoryId,
          note: aturan.note ?? aturan.name,
          tags: aturan.tags,
        })),
      });

      await tx.recurringRule.update({
        where: { id: aturan.id },
        data: {
          nextRunDate: rencana.berikutnya,
          lastRunAt: new Date(),
          // Aturan yang sudah melewati tanggal berakhir dinonaktifkan sendiri.
          isActive: !rencana.selesai,
        },
      });
    });

    transaksiDibuat += rencana.tanggal.length;
    aturanDiproses += 1;
  }

  return { aturanDiproses, transaksiDibuat };
}
