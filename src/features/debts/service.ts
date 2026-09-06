import "server-only";
import { prisma } from "@/lib/prisma";
import { percentOf, sumMoney } from "@/lib/money";
import {
  hitungJadwal,
  totalBunga,
  type BarisJadwal,
} from "@/lib/finance/amortization";
import type {
  DebtDirection,
  DebtStatus,
  InterestType,
} from "@/lib/constants";

export type RingkasanUtang = {
  id: string;
  direction: DebtDirection;
  counterparty: string;
  principal: bigint;
  interestRateBps: number;
  interestType: InterestType;
  startDate: Date;
  dueDate: Date | null;
  tenorMonths: number;
  note: string | null;
  /** Jumlah seluruh pembayaran yang tercatat. */
  totalDibayar: bigint;
  pokokTerbayar: bigint;
  bungaTerbayar: bigint;
  sisaPokok: bigint;
  persenLunas: number;
  jumlahPembayaran: number;
  status: DebtStatus;
  /** Selisih hari menuju jatuh tempo; negatif berarti sudah lewat. */
  sisaHari: number | null;
};

/** Menghitung status terkini dari sisa pokok dan tanggal jatuh tempo. */
function hitungStatus(sisaPokok: bigint, dueDate: Date | null): DebtStatus {
  if (sisaPokok <= 0n) return "LUNAS";
  if (dueDate && dueDate.getTime() < Date.now()) return "TERLAMBAT";
  return "AKTIF";
}

function selisihHari(dueDate: Date | null): number | null {
  if (!dueDate) return null;
  const sehari = 24 * 60 * 60 * 1000;
  return Math.ceil((dueDate.getTime() - Date.now()) / sehari);
}

type BarisDebt = {
  id: string;
  direction: string;
  counterparty: string;
  principal: bigint;
  interestRateBps: number;
  interestType: string;
  startDate: Date;
  dueDate: Date | null;
  tenorMonths: number;
  note: string | null;
  payments: { amount: bigint; principalPortion: bigint; interestPortion: bigint }[];
};

function keRingkasan(item: BarisDebt): RingkasanUtang {
  const pokokTerbayar = sumMoney(item.payments.map((bayar) => bayar.principalPortion));
  const sisaPokok = item.principal - pokokTerbayar;

  return {
    id: item.id,
    direction: item.direction as DebtDirection,
    counterparty: item.counterparty,
    principal: item.principal,
    interestRateBps: item.interestRateBps,
    interestType: item.interestType as InterestType,
    startDate: item.startDate,
    dueDate: item.dueDate,
    tenorMonths: item.tenorMonths,
    note: item.note,
    totalDibayar: sumMoney(item.payments.map((bayar) => bayar.amount)),
    pokokTerbayar,
    bungaTerbayar: sumMoney(item.payments.map((bayar) => bayar.interestPortion)),
    sisaPokok: sisaPokok < 0n ? 0n : sisaPokok,
    persenLunas: percentOf(pokokTerbayar, item.principal),
    jumlahPembayaran: item.payments.length,
    status: hitungStatus(sisaPokok, item.dueDate),
    sisaHari: selisihHari(item.dueDate),
  };
}

/** Seluruh catatan utang/piutang milik pengguna beserta ringkasannya. */
export async function ambilDaftarUtang(
  userId: string,
): Promise<RingkasanUtang[]> {
  const daftar = await prisma.debt.findMany({
    where: { userId },
    orderBy: [{ startDate: "desc" }],
    include: {
      payments: {
        select: { amount: true, principalPortion: true, interestPortion: true },
      },
    },
  });

  return daftar.map(keRingkasan);
}

export type PembayaranTercatat = {
  id: string;
  date: Date;
  amount: bigint;
  principalPortion: bigint;
  interestPortion: bigint;
  transactionId: string | null;
  akun: string | null;
};

export type DetailUtang = {
  ringkasan: RingkasanUtang;
  jadwal: BarisJadwal[];
  pembayaran: PembayaranTercatat[];
  totalBungaJadwal: bigint;
  /** Baris jadwal berikutnya yang belum tertutup pembayaran. */
  angsuranBerikutnya: BarisJadwal | null;
};

/** Detail satu catatan utang: jadwal, riwayat pembayaran, dan ringkasannya. */
export async function ambilDetailUtang(
  userId: string,
  id: string,
): Promise<DetailUtang | null> {
  const utang = await prisma.debt.findFirst({
    where: { id, userId },
    include: {
      payments: {
        orderBy: [{ date: "asc" }],
        include: {
          transaction: { select: { account: { select: { name: true } } } },
        },
      },
    },
  });
  if (!utang) return null;

  const ringkasan = keRingkasan(utang);
  const jadwal = hitungJadwal({
    pokok: utang.principal,
    bungaBps: utang.interestRateBps,
    jenisBunga: utang.interestType as InterestType,
    tenorBulan: utang.tenorMonths,
    mulai: utang.startDate,
  });

  // Angsuran berikutnya ditentukan dari jumlah pokok yang sudah terbayar,
  // bukan dari jumlah baris pembayaran, supaya pembayaran sebagian tetap benar.
  const angsuranBerikutnya =
    jadwal.find((baris) => baris.sisaPokok < ringkasan.sisaPokok) ?? null;

  return {
    ringkasan,
    jadwal,
    totalBungaJadwal: totalBunga(jadwal),
    angsuranBerikutnya: ringkasan.sisaPokok > 0n ? angsuranBerikutnya : null,
    pembayaran: utang.payments.map((bayar) => ({
      id: bayar.id,
      date: bayar.date,
      amount: bayar.amount,
      principalPortion: bayar.principalPortion,
      interestPortion: bayar.interestPortion,
      transactionId: bayar.transactionId,
      akun: bayar.transaction?.account.name ?? null,
    })),
  };
}

/** Total utang dan piutang yang masih berjalan, untuk kartu ringkasan. */
export function totalPerArah(daftar: readonly RingkasanUtang[]): {
  utang: bigint;
  piutang: bigint;
} {
  return {
    utang: sumMoney(
      daftar
        .filter((item) => item.direction === "PAYABLE")
        .map((item) => item.sisaPokok),
    ),
    piutang: sumMoney(
      daftar
        .filter((item) => item.direction === "RECEIVABLE")
        .map((item) => item.sisaPokok),
    ),
  };
}
