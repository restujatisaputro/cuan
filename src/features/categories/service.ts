import "server-only";
import { prisma } from "@/lib/prisma";
import type { CategoryKind } from "@/lib/constants";

export type KategoriDenganPemakaian = {
  id: string;
  name: string;
  kind: CategoryKind;
  parentId: string | null;
  icon: string | null;
  color: string | null;
  /** Jumlah transaksi yang memakai kategori ini. */
  jumlahTransaksi: number;
  anak: KategoriDenganPemakaian[];
};

/**
 * Mengambil kategori pengguna dalam bentuk pohon dua tingkat beserta jumlah
 * transaksi yang memakainya (untuk menentukan apakah aman dihapus).
 */
export async function ambilKategoriTersusun(
  userId: string,
): Promise<{ pemasukan: KategoriDenganPemakaian[]; pengeluaran: KategoriDenganPemakaian[] }> {
  const [kategori, pemakaian] = await Promise.all([
    prisma.category.findMany({
      where: { userId },
      orderBy: [{ name: "asc" }],
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, categoryId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const hitungan = new Map(
    pemakaian.map((baris) => [baris.categoryId ?? "", baris._count._all]),
  );

  const simpul = new Map<string, KategoriDenganPemakaian>();
  for (const item of kategori) {
    simpul.set(item.id, {
      id: item.id,
      name: item.name,
      kind: item.kind as CategoryKind,
      parentId: item.parentId,
      icon: item.icon,
      color: item.color,
      jumlahTransaksi: hitungan.get(item.id) ?? 0,
      anak: [],
    });
  }

  const akar: KategoriDenganPemakaian[] = [];
  for (const item of simpul.values()) {
    if (item.parentId) {
      const induk = simpul.get(item.parentId);
      if (induk) {
        induk.anak.push(item);
        continue;
      }
    }
    akar.push(item);
  }

  return {
    pemasukan: akar.filter((item) => item.kind === "INCOME"),
    pengeluaran: akar.filter((item) => item.kind === "EXPENSE"),
  };
}

/** Daftar datar untuk isian pilihan kategori pada form transaksi. */
export async function ambilKategoriUntukPilihan(userId: string) {
  const kategori = await prisma.category.findMany({
    where: { userId },
    select: { id: true, name: true, kind: true, parentId: true, color: true },
    orderBy: [{ name: "asc" }],
  });

  const namaInduk = new Map(
    kategori.filter((item) => !item.parentId).map((item) => [item.id, item.name]),
  );

  return kategori.map((item) => ({
    ...item,
    kind: item.kind as CategoryKind,
    /** Label bertingkat, mis. "Tagihan / Listrik". */
    label: item.parentId
      ? `${namaInduk.get(item.parentId) ?? "?"} / ${item.name}`
      : item.name,
  }));
}
