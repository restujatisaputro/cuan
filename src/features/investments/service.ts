import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { percentOf, sumMoney } from "@/lib/money";
import {
  hitungPosisi,
  labaBelumTerealisasi,
  nilaiPasar,
} from "@/lib/finance/portfolio";
import type { InvestmentAction, InvestmentType } from "@/lib/constants";

export type RingkasanAset = {
  id: string;
  name: string;
  type: InvestmentType;
  ticker: string | null;
  units: string;
  avgCost: string;
  lastPrice: string;
  lastPriceUpdatedAt: Date | null;
  /** Modal yang masih tertanam pada unit yang dipegang. */
  modal: bigint;
  nilaiPasar: bigint;
  labaBelumTerealisasi: bigint;
  persenLaba: number;
  labaTerealisasi: bigint;
  dividen: bigint;
  jumlahTransaksi: number;
};

type BarisAset = {
  id: string;
  name: string;
  type: string;
  ticker: string | null;
  lastPrice: Prisma.Decimal;
  lastPriceUpdatedAt: Date | null;
  transactions: {
    action: string;
    units: Prisma.Decimal;
    pricePerUnit: Prisma.Decimal;
    fee: bigint;
    amount: bigint;
  }[];
};

function keRingkasan(aset: BarisAset): RingkasanAset {
  const posisi = hitungPosisi(
    aset.transactions.map((item) => ({
      action: item.action as InvestmentAction,
      units: item.units,
      pricePerUnit: item.pricePerUnit,
      fee: item.fee,
      amount: item.amount,
    })),
  );

  const pasar = nilaiPasar(posisi.units, aset.lastPrice);
  const laba = labaBelumTerealisasi(posisi.units, aset.lastPrice, posisi.modal);

  return {
    id: aset.id,
    name: aset.name,
    type: aset.type as InvestmentType,
    ticker: aset.ticker,
    units: posisi.units.toString(),
    avgCost: posisi.avgCost.toDecimalPlaces(4).toString(),
    lastPrice: aset.lastPrice.toString(),
    lastPriceUpdatedAt: aset.lastPriceUpdatedAt,
    modal: posisi.modal,
    nilaiPasar: pasar,
    labaBelumTerealisasi: laba,
    persenLaba: posisi.modal === 0n ? 0 : percentOf(laba, posisi.modal),
    labaTerealisasi: posisi.realisasi,
    dividen: posisi.dividen,
    jumlahTransaksi: aset.transactions.length,
  };
}

/** Seluruh aset investasi milik pengguna beserta posisinya. */
export async function ambilDaftarAset(userId: string): Promise<RingkasanAset[]> {
  const daftar = await prisma.investmentAsset.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }],
    include: {
      transactions: {
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        select: {
          action: true,
          units: true,
          pricePerUnit: true,
          fee: true,
          amount: true,
        },
      },
    },
  });

  return daftar.map(keRingkasan);
}

export type TransaksiAsetTercatat = {
  id: string;
  date: Date;
  action: InvestmentAction;
  units: string;
  pricePerUnit: string;
  fee: bigint;
  amount: bigint;
  akun: string | null;
};

export type DetailAset = {
  ringkasan: RingkasanAset;
  transaksi: TransaksiAsetTercatat[];
};

/** Detail satu aset beserta riwayat transaksinya (terbaru di atas). */
export async function ambilDetailAset(
  userId: string,
  id: string,
): Promise<DetailAset | null> {
  const aset = await prisma.investmentAsset.findFirst({
    where: { id, userId },
    include: {
      transactions: {
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        include: {
          transaction: {
            select: {
              account: { select: { name: true } },
              toAccount: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!aset) return null;

  return {
    ringkasan: keRingkasan(aset),
    transaksi: [...aset.transactions].reverse().map((item) => ({
      id: item.id,
      date: item.date,
      action: item.action as InvestmentAction,
      units: item.units.toString(),
      pricePerUnit: item.pricePerUnit.toString(),
      fee: item.fee,
      amount: item.amount,
      // Untuk penjualan, dana masuk ke akun tujuan; sisanya keluar dari akun asal.
      akun:
        (item.action === "SELL"
          ? item.transaction?.toAccount?.name
          : item.transaction?.account.name) ?? null,
    })),
  };
}

export type RingkasanPortofolio = {
  modal: bigint;
  nilaiPasar: bigint;
  laba: bigint;
  persenLaba: number;
  labaTerealisasi: bigint;
  dividen: bigint;
};

/** Menjumlahkan posisi seluruh aset untuk kartu ringkasan. */
export function ringkasanPortofolio(
  daftar: readonly RingkasanAset[],
): RingkasanPortofolio {
  const modal = sumMoney(daftar.map((item) => item.modal));
  const pasar = sumMoney(daftar.map((item) => item.nilaiPasar));

  return {
    modal,
    nilaiPasar: pasar,
    laba: pasar - modal,
    persenLaba: modal === 0n ? 0 : percentOf(pasar - modal, modal),
    labaTerealisasi: sumMoney(daftar.map((item) => item.labaTerealisasi)),
    dividen: sumMoney(daftar.map((item) => item.dividen)),
  };
}

/** Total nilai pasar seluruh investasi, dipakai laporan kekayaan bersih. */
export async function totalNilaiInvestasi(userId: string): Promise<bigint> {
  const daftar = await ambilDaftarAset(userId);
  return sumMoney(daftar.map((item) => item.nilaiPasar));
}
