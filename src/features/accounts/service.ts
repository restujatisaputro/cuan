import "server-only";
import { prisma } from "@/lib/prisma";
import type { AccountType } from "@/lib/constants";

export type AkunDenganSaldo = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  isArchived: boolean;
  openingBalance: bigint;
  /** Saldo berjalan: saldo awal + pemasukan - pengeluaran +/- transfer. */
  saldo: bigint;
  jumlahTransaksi: number;
};

/**
 * Mengambil seluruh akun milik pengguna beserta saldo berjalannya.
 *
 * Saldo dihitung lewat agregasi di basis data (tiga groupBy), bukan dengan
 * memuat seluruh transaksi ke memori, supaya tetap ringan saat data membesar.
 */
export async function ambilAkunDenganSaldo(
  userId: string,
  opsi: { sertakanArsip?: boolean } = {},
): Promise<AkunDenganSaldo[]> {
  const akun = await prisma.account.findMany({
    where: {
      userId,
      ...(opsi.sertakanArsip ? {} : { isArchived: false }),
    },
    orderBy: [{ isArchived: "asc" }, { createdAt: "asc" }],
  });

  const [perAkun, transferMasuk] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.groupBy({
      by: ["toAccountId"],
      where: { userId, type: "TRANSFER", toAccountId: { not: null } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const mutasi = new Map<string, { delta: bigint; jumlah: number }>();
  const catat = (id: string, delta: bigint, jumlah: number) => {
    const sebelumnya = mutasi.get(id) ?? { delta: 0n, jumlah: 0 };
    mutasi.set(id, {
      delta: sebelumnya.delta + delta,
      jumlah: sebelumnya.jumlah + jumlah,
    });
  };

  for (const baris of perAkun) {
    const jumlah = baris._sum.amount ?? 0n;
    // Pemasukan menambah saldo; pengeluaran dan transfer keluar menguranginya.
    const delta = baris.type === "INCOME" ? jumlah : -jumlah;
    catat(baris.accountId, delta, baris._count._all);
  }

  for (const baris of transferMasuk) {
    if (!baris.toAccountId) continue;
    catat(baris.toAccountId, baris._sum.amount ?? 0n, baris._count._all);
  }

  return akun.map((item) => {
    const perubahan = mutasi.get(item.id) ?? { delta: 0n, jumlah: 0 };
    return {
      id: item.id,
      name: item.name,
      type: item.type as AccountType,
      currency: item.currency,
      isArchived: item.isArchived,
      openingBalance: item.openingBalance,
      saldo: item.openingBalance + perubahan.delta,
      jumlahTransaksi: perubahan.jumlah,
    };
  });
}

/** Daftar ringkas untuk isian pilihan akun pada form. */
export async function ambilAkunUntukPilihan(userId: string) {
  return prisma.account.findMany({
    where: { userId, isArchived: false },
    select: { id: true, name: true, type: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Memastikan akun benar-benar milik pengguna yang sedang masuk. */
export async function akunMilikPengguna(
  userId: string,
  accountId: string,
): Promise<boolean> {
  const jumlah = await prisma.account.count({
    where: { id: accountId, userId },
  });
  return jumlah === 1;
}
