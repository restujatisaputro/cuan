import "server-only";
import { prisma } from "@/lib/prisma";
import { moneyToNumber, percentOf, sumMoney } from "@/lib/money";
import { tambahBulan } from "@/lib/finance/amortization";
import type { SavingsStatus } from "@/lib/constants";

export type RingkasanTarget = {
  id: string;
  name: string;
  targetAmount: bigint;
  targetDate: Date | null;
  accountId: string | null;
  akun: string | null;
  status: SavingsStatus;
  terkumpul: bigint;
  sisa: bigint;
  persen: number;
  jumlahSetoran: number;
  setoranTerakhir: Date | null;
  /** Rata-rata setoran per bulan sejak setoran pertama. */
  rataPerBulan: bigint;
  /** Perkiraan tanggal target tercapai bila laju setoran bertahan. */
  proyeksiTercapai: Date | null;
  /** Setoran per bulan yang dibutuhkan agar tepat waktu. */
  butuhPerBulan: bigint | null;
  /** true bila laju setoran saat ini diperkirakan meleset dari tenggat. */
  berisikoTerlambat: boolean;
};

const SEBULAN = 30.44 * 24 * 60 * 60 * 1000;

/** Jumlah bulan antara dua tanggal, minimal satu. */
function selisihBulan(awal: Date, akhir: Date): number {
  return Math.max(1, Math.ceil((akhir.getTime() - awal.getTime()) / SEBULAN));
}

type BarisGoal = {
  id: string;
  name: string;
  targetAmount: bigint;
  targetDate: Date | null;
  accountId: string | null;
  status: string;
  account: { name: string } | null;
  contributions: { amount: bigint; date: Date }[];
};

function keRingkasan(item: BarisGoal): RingkasanTarget {
  const terkumpul = sumMoney(item.contributions.map((setoran) => setoran.amount));
  const sisaMentah = item.targetAmount - terkumpul;
  const sisa = sisaMentah < 0n ? 0n : sisaMentah;

  const tanggalSetoran = item.contributions.map((setoran) => setoran.date);
  const setoranPertama =
    tanggalSetoran.length > 0
      ? new Date(Math.min(...tanggalSetoran.map((tanggal) => tanggal.getTime())))
      : null;
  const setoranTerakhir =
    tanggalSetoran.length > 0
      ? new Date(Math.max(...tanggalSetoran.map((tanggal) => tanggal.getTime())))
      : null;

  const sekarang = new Date();
  const bulanBerjalan = setoranPertama
    ? selisihBulan(setoranPertama, sekarang)
    : 0;
  const rataPerBulan =
    bulanBerjalan > 0 ? terkumpul / BigInt(bulanBerjalan) : 0n;

  let proyeksiTercapai: Date | null = null;
  if (sisa > 0n && rataPerBulan > 0n) {
    const bulanLagi = Math.ceil(moneyToNumber(sisa) / moneyToNumber(rataPerBulan));
    proyeksiTercapai = tambahBulan(sekarang, bulanLagi);
  }

  let butuhPerBulan: bigint | null = null;
  if (item.targetDate && sisa > 0n) {
    const bulanTersisa = selisihBulan(sekarang, item.targetDate);
    butuhPerBulan =
      item.targetDate.getTime() > sekarang.getTime()
        ? sisa / BigInt(bulanTersisa)
        : sisa;
  }

  return {
    id: item.id,
    name: item.name,
    targetAmount: item.targetAmount,
    targetDate: item.targetDate,
    accountId: item.accountId,
    akun: item.account?.name ?? null,
    status: item.status as SavingsStatus,
    terkumpul,
    sisa,
    persen: percentOf(terkumpul, item.targetAmount),
    jumlahSetoran: item.contributions.length,
    setoranTerakhir,
    rataPerBulan,
    proyeksiTercapai,
    butuhPerBulan,
    berisikoTerlambat: Boolean(
      item.targetDate &&
        sisa > 0n &&
        (proyeksiTercapai === null ||
          proyeksiTercapai.getTime() > item.targetDate.getTime()),
    ),
  };
}

/** Seluruh target tabungan milik pengguna beserta progresnya. */
export async function ambilDaftarTarget(
  userId: string,
): Promise<RingkasanTarget[]> {
  const daftar = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      account: { select: { name: true } },
      contributions: { select: { amount: true, date: true } },
    },
  });

  return daftar.map(keRingkasan);
}

export type SetoranTercatat = {
  id: string;
  date: Date;
  amount: bigint;
  transactionId: string | null;
  akunSumber: string | null;
};

export type DetailTarget = {
  ringkasan: RingkasanTarget;
  setoran: SetoranTercatat[];
};

/** Detail satu target beserta riwayat setorannya. */
export async function ambilDetailTarget(
  userId: string,
  id: string,
): Promise<DetailTarget | null> {
  const target = await prisma.savingsGoal.findFirst({
    where: { id, userId },
    include: {
      account: { select: { name: true } },
      contributions: {
        orderBy: [{ date: "desc" }],
        include: {
          transaction: { select: { account: { select: { name: true } } } },
        },
      },
    },
  });
  if (!target) return null;

  return {
    ringkasan: keRingkasan(target),
    setoran: target.contributions.map((setoran) => ({
      id: setoran.id,
      date: setoran.date,
      amount: setoran.amount,
      transactionId: setoran.transactionId,
      akunSumber: setoran.transaction?.account.name ?? null,
    })),
  };
}
