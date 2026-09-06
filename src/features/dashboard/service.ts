import "server-only";
import { prisma } from "@/lib/prisma";
import { moneyToNumber } from "@/lib/money";
import {
  geserPeriode,
  labelPeriode,
  rentangBulan,
  type RentangBulan,
} from "@/lib/periode";

// Util periode dipakai juga oleh halaman lain lewat modul ini.
export {
  geserPeriode,
  labelPeriode,
  periodeSekarang,
  rentangBulan,
  type RentangBulan,
} from "@/lib/periode";
import type { TransactionType } from "@/lib/constants";

export type RingkasanPeriode = {
  pemasukan: bigint;
  pengeluaran: bigint;
  selisih: bigint;
  jumlahTransaksi: number;
};

/** Total pemasukan dan pengeluaran pada satu rentang. Transfer diabaikan. */
export async function ringkasanPeriode(
  userId: string,
  rentang: RentangBulan,
): Promise<RingkasanPeriode> {
  const baris = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      userId,
      type: { in: ["INCOME", "EXPENSE"] },
      date: { gte: rentang.awal, lte: rentang.akhir },
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  let pemasukan = 0n;
  let pengeluaran = 0n;
  let jumlahTransaksi = 0;
  for (const item of baris) {
    jumlahTransaksi += item._count._all;
    if (item.type === "INCOME") pemasukan += item._sum.amount ?? 0n;
    else pengeluaran += item._sum.amount ?? 0n;
  }

  return {
    pemasukan,
    pengeluaran,
    selisih: pemasukan - pengeluaran,
    jumlahTransaksi,
  };
}

export type TitikArusKas = {
  periode: string;
  label: string;
  pemasukan: number;
  pengeluaran: number;
  selisih: number;
};

/**
 * Arus kas beberapa bulan terakhir untuk grafik batang.
 * Nilai dikonversi ke number karena Recharts tidak mengenal bigint.
 */
export async function arusKasBulanan(
  userId: string,
  periodeAkhir: string,
  jumlahBulan = 6,
): Promise<TitikArusKas[]> {
  const daftarPeriode = Array.from({ length: jumlahBulan }, (_, index) =>
    geserPeriode(periodeAkhir, index - (jumlahBulan - 1)),
  );

  const hasil = await Promise.all(
    daftarPeriode.map((periode) =>
      ringkasanPeriode(userId, rentangBulan(periode)),
    ),
  );

  return daftarPeriode.map((periode, index) => ({
    periode,
    label: labelPeriode(periode),
    pemasukan: moneyToNumber(hasil[index].pemasukan),
    pengeluaran: moneyToNumber(hasil[index].pengeluaran),
    selisih: moneyToNumber(hasil[index].selisih),
  }));
}

export type IrisanKategori = {
  id: string;
  nama: string;
  warna: string;
  jumlah: number;
  persen: number;
};

const WARNA_CADANGAN = "#64748b";

/**
 * Komposisi pengeluaran per kategori pada satu periode.
 * Sub-kategori digabungkan ke induknya supaya grafik tetap terbaca.
 */
export async function komposisiPengeluaran(
  userId: string,
  rentang: RentangBulan,
  maksimalIrisan = 6,
): Promise<IrisanKategori[]> {
  const [baris, kategori] = await Promise.all([
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
      where: { userId, kind: "EXPENSE" },
      select: { id: true, name: true, color: true, parentId: true },
    }),
  ]);

  const peta = new Map(kategori.map((item) => [item.id, item]));
  const gabungan = new Map<string, { nama: string; warna: string; jumlah: bigint }>();

  for (const item of baris) {
    const jumlah = item._sum.amount ?? 0n;
    if (jumlah === 0n) continue;

    const asal = item.categoryId ? peta.get(item.categoryId) : undefined;
    const induk = asal?.parentId ? peta.get(asal.parentId) : undefined;
    const acuan = induk ?? asal;
    const kunci = acuan?.id ?? "tanpa-kategori";

    const sebelumnya = gabungan.get(kunci);
    gabungan.set(kunci, {
      nama: acuan?.name ?? "Tanpa kategori",
      warna: acuan?.color ?? WARNA_CADANGAN,
      jumlah: (sebelumnya?.jumlah ?? 0n) + jumlah,
    });
  }

  const terurut = [...gabungan.entries()]
    .map(([id, item]) => ({ id, ...item }))
    .sort((a, b) => (b.jumlah > a.jumlah ? 1 : b.jumlah < a.jumlah ? -1 : 0));

  const total = terurut.reduce((jumlah, item) => jumlah + item.jumlah, 0n);
  if (total === 0n) return [];

  const utama = terurut.slice(0, maksimalIrisan);
  const sisa = terurut.slice(maksimalIrisan);

  const irisan: IrisanKategori[] = utama.map((item) => ({
    id: item.id,
    nama: item.nama,
    warna: item.warna,
    jumlah: moneyToNumber(item.jumlah),
    persen: (moneyToNumber(item.jumlah) / moneyToNumber(total)) * 100,
  }));

  if (sisa.length > 0) {
    const jumlahSisa = sisa.reduce((jumlah, item) => jumlah + item.jumlah, 0n);
    irisan.push({
      id: "lainnya",
      nama: `Lainnya (${sisa.length} kategori)`,
      warna: WARNA_CADANGAN,
      jumlah: moneyToNumber(jumlahSisa),
      persen: (moneyToNumber(jumlahSisa) / moneyToNumber(total)) * 100,
    });
  }

  return irisan;
}

export type TransaksiRingkas = {
  id: string;
  tanggal: Date;
  tipe: TransactionType;
  jumlah: bigint;
  catatan: string | null;
  kategori: string | null;
  warna: string | null;
  akun: string;
  akunTujuan: string | null;
};

/** Beberapa transaksi terakhir untuk ditampilkan di dasbor. */
export async function transaksiTerbaru(
  userId: string,
  batas = 6,
): Promise<TransaksiRingkas[]> {
  const baris = await prisma.transaction.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: batas,
    select: {
      id: true,
      date: true,
      type: true,
      amount: true,
      note: true,
      account: { select: { name: true } },
      toAccount: { select: { name: true } },
      category: { select: { name: true, color: true } },
    },
  });

  return baris.map((item) => ({
    id: item.id,
    tanggal: item.date,
    tipe: item.type as TransactionType,
    jumlah: item.amount,
    catatan: item.note,
    kategori: item.category?.name ?? null,
    warna: item.category?.color ?? null,
    akun: item.account.name,
    akunTujuan: item.toAccount?.name ?? null,
  }));
}
