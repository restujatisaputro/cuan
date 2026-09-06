import "server-only";
import { prisma } from "@/lib/prisma";
import { sumMoney } from "@/lib/money";
import type { RentangBulan } from "@/lib/periode";
import { ambilAkunDenganSaldo } from "@/features/accounts/service";
import { ambilDaftarUtang, totalPerArah } from "@/features/debts/service";
import { totalNilaiInvestasi } from "@/features/investments/service";

export type BarisKategori = {
  id: string;
  nama: string;
  warna: string;
  jumlah: bigint;
  persen: number;
};

export type LaporanArusKas = {
  pemasukan: bigint;
  pengeluaran: bigint;
  selisih: bigint;
  transfer: bigint;
  kategoriPemasukan: BarisKategori[];
  kategoriPengeluaran: BarisKategori[];
};

/**
 * Arus kas satu periode beserta rinciannya per kategori.
 * Sub-kategori digabungkan ke induknya agar tabel tetap ringkas, dan transfer
 * antar akun sendiri tidak dihitung sebagai pemasukan maupun pengeluaran.
 */
export async function laporanArusKas(
  userId: string,
  rentang: RentangBulan,
): Promise<LaporanArusKas> {
  const where = { userId, date: { gte: rentang.awal, lte: rentang.akhir } };

  const [perTipe, perKategori, kategori] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where,
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId", "type"],
      where: { ...where, type: { in: ["INCOME", "EXPENSE"] } },
      _sum: { amount: true },
    }),
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, color: true, parentId: true },
    }),
  ]);

  let pemasukan = 0n;
  let pengeluaran = 0n;
  let transfer = 0n;
  for (const baris of perTipe) {
    const jumlah = baris._sum.amount ?? 0n;
    if (baris.type === "INCOME") pemasukan += jumlah;
    else if (baris.type === "EXPENSE") pengeluaran += jumlah;
    else transfer += jumlah;
  }

  const peta = new Map(kategori.map((item) => [item.id, item]));
  const kumpulan = new Map<
    string,
    { nama: string; warna: string; jumlah: bigint; tipe: string }
  >();

  for (const baris of perKategori) {
    const jumlah = baris._sum.amount ?? 0n;
    if (jumlah === 0n) continue;

    const asal = baris.categoryId ? peta.get(baris.categoryId) : undefined;
    const induk = asal?.parentId ? peta.get(asal.parentId) : undefined;
    const acuan = induk ?? asal;
    const kunci = `${baris.type}:${acuan?.id ?? "tanpa"}`;

    const sebelumnya = kumpulan.get(kunci);
    kumpulan.set(kunci, {
      nama: acuan?.name ?? "Tanpa kategori",
      warna: acuan?.color ?? "#64748b",
      jumlah: (sebelumnya?.jumlah ?? 0n) + jumlah,
      tipe: baris.type,
    });
  }

  const susun = (tipe: string, total: bigint): BarisKategori[] =>
    [...kumpulan.entries()]
      .filter(([, item]) => item.tipe === tipe)
      .map(([kunci, item]) => ({
        id: kunci,
        nama: item.nama,
        warna: item.warna,
        jumlah: item.jumlah,
        persen: total === 0n ? 0 : Number((item.jumlah * 10_000n) / total) / 100,
      }))
      .sort((a, b) => (b.jumlah > a.jumlah ? 1 : b.jumlah < a.jumlah ? -1 : 0));

  return {
    pemasukan,
    pengeluaran,
    selisih: pemasukan - pengeluaran,
    transfer,
    kategoriPemasukan: susun("INCOME", pemasukan),
    kategoriPengeluaran: susun("EXPENSE", pengeluaran),
  };
}

export type LaporanLabaRugi = {
  pemasukanKas: bigint;
  pengeluaranKas: bigint;
  /** Pokok piutang yang kembali; masuk kas tetapi bukan penghasilan. */
  pokokPiutangDiterima: bigint;
  /** Pokok cicilan yang dibayar; keluar kas tetapi bukan beban. */
  pokokCicilanDibayar: bigint;
  bungaDibayar: bigint;
  penghasilan: bigint;
  beban: bigint;
  laba: bigint;
};

/**
 * Laba rugi sederhana berbasis kas dengan satu koreksi penting: pelunasan
 * pokok bukan beban, dan pokok piutang yang kembali bukan penghasilan.
 * Keduanya hanya memindahkan posisi harta/kewajiban.
 */
export async function laporanLabaRugi(
  userId: string,
  rentang: RentangBulan,
): Promise<LaporanLabaRugi> {
  const [perTipe, pembayaran] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId,
        type: { in: ["INCOME", "EXPENSE"] },
        date: { gte: rentang.awal, lte: rentang.akhir },
      },
      _sum: { amount: true },
    }),
    prisma.debtPayment.findMany({
      where: {
        debt: { userId },
        date: { gte: rentang.awal, lte: rentang.akhir },
      },
      select: {
        principalPortion: true,
        interestPortion: true,
        debt: { select: { direction: true } },
      },
    }),
  ]);

  let pemasukanKas = 0n;
  let pengeluaranKas = 0n;
  for (const baris of perTipe) {
    if (baris.type === "INCOME") pemasukanKas += baris._sum.amount ?? 0n;
    else pengeluaranKas += baris._sum.amount ?? 0n;
  }

  const pokokPiutangDiterima = sumMoney(
    pembayaran
      .filter((item) => item.debt.direction === "RECEIVABLE")
      .map((item) => item.principalPortion),
  );
  const cicilan = pembayaran.filter((item) => item.debt.direction === "PAYABLE");
  const pokokCicilanDibayar = sumMoney(cicilan.map((item) => item.principalPortion));
  const bungaDibayar = sumMoney(cicilan.map((item) => item.interestPortion));

  const penghasilan = pemasukanKas - pokokPiutangDiterima;
  const beban = pengeluaranKas - pokokCicilanDibayar;

  return {
    pemasukanKas,
    pengeluaranKas,
    pokokPiutangDiterima,
    pokokCicilanDibayar,
    bungaDibayar,
    penghasilan,
    beban,
    laba: penghasilan - beban,
  };
}

export type KekayaanBersih = {
  saldoKas: bigint;
  nilaiInvestasi: bigint;
  piutang: bigint;
  utang: bigint;
  total: bigint;
  rincianAkun: { nama: string; saldo: bigint }[];
};

/**
 * Kekayaan bersih = saldo akun kas + nilai pasar investasi + sisa piutang
 * - sisa utang. Saldo akun portofolio sengaja dikecualikan supaya investasi
 * tidak terhitung dua kali.
 */
export async function laporanKekayaanBersih(
  userId: string,
): Promise<KekayaanBersih> {
  const [akun, nilaiInvestasi, utangPiutang] = await Promise.all([
    ambilAkunDenganSaldo(userId),
    totalNilaiInvestasi(userId),
    ambilDaftarUtang(userId),
  ]);

  const akunKas = akun.filter((item) => item.type !== "INVESTMENT");
  const saldoKas = sumMoney(akunKas.map((item) => item.saldo));
  const total = totalPerArah(utangPiutang);

  return {
    saldoKas,
    nilaiInvestasi,
    piutang: total.piutang,
    utang: total.utang,
    total: saldoKas + nilaiInvestasi + total.piutang - total.utang,
    rincianAkun: akunKas.map((item) => ({ nama: item.name, saldo: item.saldo })),
  };
}
