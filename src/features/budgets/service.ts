import "server-only";
import { prisma } from "@/lib/prisma";
import { percentOf } from "@/lib/money";
import { rentangBulan } from "@/features/dashboard/service";

export type ProgresAnggaran = {
  id: string;
  categoryId: string;
  kategori: string;
  warna: string;
  anggaran: bigint;
  terpakai: bigint;
  sisa: bigint;
  persen: number;
  /** true bila pemakaian sudah melewati anggaran. */
  terlampaui: boolean;
};

/**
 * Progres anggaran satu periode.
 *
 * Pengeluaran sub-kategori ikut dihitung ke anggaran induknya, sehingga
 * menganggarkan "Tagihan" otomatis mencakup "Tagihan / Listrik".
 */
export async function progresAnggaran(
  userId: string,
  periode: string,
): Promise<ProgresAnggaran[]> {
  const rentang = rentangBulan(periode);

  const [anggaran, pemakaian, kategori] = await Promise.all([
    prisma.budget.findMany({
      where: { userId, period: periode },
      include: { category: { select: { name: true, color: true } } },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: rentang.awal, lte: rentang.akhir },
      },
      _sum: { amount: true },
    }),
    prisma.category.findMany({
      where: { userId },
      select: { id: true, parentId: true },
    }),
  ]);

  if (anggaran.length === 0) return [];

  const indukDari = new Map(kategori.map((item) => [item.id, item.parentId]));
  const terpakaiPerKategori = new Map<string, bigint>();

  for (const baris of pemakaian) {
    if (!baris.categoryId) continue;
    const jumlah = baris._sum.amount ?? 0n;
    // Catat pada kategorinya sendiri dan pada induknya (bila ada).
    for (const kunci of [baris.categoryId, indukDari.get(baris.categoryId)]) {
      if (!kunci) continue;
      terpakaiPerKategori.set(kunci, (terpakaiPerKategori.get(kunci) ?? 0n) + jumlah);
    }
  }

  return anggaran
    .map((item) => {
      const terpakai = terpakaiPerKategori.get(item.categoryId) ?? 0n;
      return {
        id: item.id,
        categoryId: item.categoryId,
        kategori: item.category.name,
        warna: item.category.color ?? "#64748b",
        anggaran: item.amount,
        terpakai,
        sisa: item.amount - terpakai,
        persen: percentOf(terpakai, item.amount),
        terlampaui: terpakai > item.amount,
      };
    })
    .sort((a, b) => b.persen - a.persen);
}

/** Total anggaran dan pemakaiannya pada satu periode. */
export function totalAnggaran(daftar: ProgresAnggaran[]): {
  anggaran: bigint;
  terpakai: bigint;
  persen: number;
} {
  const anggaran = daftar.reduce((jumlah, item) => jumlah + item.anggaran, 0n);
  const terpakai = daftar.reduce((jumlah, item) => jumlah + item.terpakai, 0n);
  return { anggaran, terpakai, persen: percentOf(terpakai, anggaran) };
}
