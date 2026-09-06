"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ambilPenggunaAtauGagal } from "@/lib/session";
import { galat, sukses, type FormState } from "@/features/auth/form-state";
import {
  assetIdSchema,
  assetSchema,
  hargaSchema,
  investmentTxIdSchema,
  investmentTxSchema,
} from "@/features/investments/schema";
import { hitungPosisi, nilaiKas } from "@/lib/finance/portfolio";
import { toMoney } from "@/lib/money";
import { INVESTMENT_ACCOUNT_NAME, type InvestmentAction } from "@/lib/constants";

const SESI_HABIS = galat("Sesi berakhir. Muat ulang halaman lalu masuk kembali.");

type Transaksional = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

function segarkan(id?: string): void {
  revalidatePath("/investasi");
  if (id) revalidatePath(`/investasi/${id}`);
  revalidatePath("/transaksi");
  revalidatePath("/akun");
  revalidatePath("/laporan");
  revalidatePath("/dasbor");
}

/**
 * Akun penampung portofolio. Dibuat otomatis saat dibutuhkan supaya pembelian
 * investasi tercatat sebagai perpindahan dana, bukan pengeluaran.
 */
async function akunPortofolio(tx: Transaksional, userId: string): Promise<string> {
  const adaSebelumnya = await tx.account.findFirst({
    where: { userId, type: "INVESTMENT" },
    select: { id: true },
  });
  if (adaSebelumnya) return adaSebelumnya.id;

  const dibuat = await tx.account.create({
    data: { userId, name: INVESTMENT_ACCOUNT_NAME, type: "INVESTMENT" },
    select: { id: true },
  });
  return dibuat.id;
}

/** Menghitung ulang unit dan biaya rata-rata sebuah aset dari seluruh riwayatnya. */
async function hitungUlangAset(tx: Transaksional, assetId: string): Promise<void> {
  const riwayat = await tx.investmentTx.findMany({
    where: { assetId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: {
      action: true,
      units: true,
      pricePerUnit: true,
      fee: true,
      amount: true,
    },
  });

  const posisi = hitungPosisi(
    riwayat.map((item) => ({
      action: item.action as InvestmentAction,
      units: item.units,
      pricePerUnit: item.pricePerUnit,
      fee: item.fee,
      amount: item.amount,
    })),
  );

  await tx.investmentAsset.update({
    where: { id: assetId },
    data: {
      units: posisi.units.toString(),
      avgCost: posisi.avgCost.toDecimalPlaces(6).toString(),
    },
  });
}

export async function simpanAsetAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const id = formData.get("id");
  const idLama = typeof id === "string" && id ? id : null;

  const hasil = assetSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    ticker: formData.get("ticker") ?? "",
    lastPrice: formData.get("lastPrice"),
  });

  if (!hasil.success) {
    return { galatField: z.flattenError(hasil.error).fieldErrors, gagal: true };
  }

  const data = hasil.data;
  const bentrok = await prisma.investmentAsset.findFirst({
    where: {
      userId: pengguna.id,
      name: data.name,
      ...(idLama ? { NOT: { id: idLama } } : {}),
    },
    select: { id: true },
  });
  if (bentrok) {
    return { galatField: { name: ["Sudah ada aset dengan nama ini"] }, gagal: true };
  }

  const isi = {
    name: data.name,
    type: data.type,
    ticker: data.ticker,
    lastPrice: data.lastPrice,
    lastPriceUpdatedAt: new Date(),
  };

  if (idLama) {
    const milik = await prisma.investmentAsset.count({
      where: { id: idLama, userId: pengguna.id },
    });
    if (milik !== 1) return galat("Aset tidak ditemukan.");

    await prisma.investmentAsset.update({ where: { id: idLama }, data: isi });
    segarkan(idLama);
    return sukses(`Aset ${data.name} diperbarui.`);
  }

  const dibuat = await prisma.investmentAsset.create({
    data: { ...isi, userId: pengguna.id },
  });
  segarkan(dibuat.id);
  return sukses(`Aset ${data.name} ditambahkan.`);
}

export async function perbaruiHargaAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = hargaSchema.safeParse({
    id: formData.get("id"),
    lastPrice: formData.get("lastPrice"),
  });
  if (!hasil.success) {
    return { galatField: z.flattenError(hasil.error).fieldErrors, gagal: true };
  }

  const aset = await prisma.investmentAsset.findFirst({
    where: { id: hasil.data.id, userId: pengguna.id },
    select: { id: true, name: true },
  });
  if (!aset) return galat("Aset tidak ditemukan.");

  await prisma.investmentAsset.update({
    where: { id: aset.id },
    data: { lastPrice: hasil.data.lastPrice, lastPriceUpdatedAt: new Date() },
  });

  segarkan(aset.id);
  return sukses(`Harga ${aset.name} diperbarui.`);
}

export async function hapusAsetAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = assetIdSchema.safeParse({ id: formData.get("id") });
  if (!hasil.success) return galat("Permintaan tidak valid.");

  const aset = await prisma.investmentAsset.findFirst({
    where: { id: hasil.data.id, userId: pengguna.id },
    select: {
      id: true,
      name: true,
      transactions: { select: { transactionId: true } },
    },
  });
  if (!aset) return galat("Aset tidak ditemukan.");

  const idTransaksi = aset.transactions
    .map((item) => item.transactionId)
    .filter((nilai): nilai is string => Boolean(nilai));

  await prisma.$transaction([
    prisma.investmentAsset.delete({ where: { id: aset.id } }),
    prisma.transaction.deleteMany({
      where: { id: { in: idTransaksi }, userId: pengguna.id },
    }),
  ]);

  segarkan();
  return sukses(`Aset ${aset.name} dan riwayat transaksinya dihapus.`);
}

export async function catatTransaksiInvestasiAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = investmentTxSchema.safeParse({
    assetId: formData.get("assetId"),
    action: formData.get("action"),
    date: formData.get("date"),
    accountId: formData.get("accountId") ?? "",
    units: formData.get("units") ?? "",
    pricePerUnit: formData.get("pricePerUnit") ?? "",
    fee: formData.get("fee") ?? "0",
    amount: formData.get("amount") ?? "",
    note: formData.get("note") ?? "",
  });

  if (!hasil.success) {
    return { galatField: z.flattenError(hasil.error).fieldErrors, gagal: true };
  }

  const data = hasil.data;
  const aset = await prisma.investmentAsset.findFirst({
    where: { id: data.assetId, userId: pengguna.id },
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
  if (!aset) return galat("Aset tidak ditemukan.");

  const akunKas = await prisma.account.count({
    where: { id: data.accountId, userId: pengguna.id },
  });
  if (akunKas !== 1) return galat("Akun tidak ditemukan.");

  const dividen = data.action === "DIVIDEND";
  const unitStr = dividen ? "0" : (data.units ?? "0").replace(/\./g, "").replace(",", ".");
  const hargaStr = dividen
    ? "0"
    : (data.pricePerUnit ?? "0").replace(/\./g, "").replace(",", ".");
  const nominalDividen = dividen ? toMoney(data.amount ?? "0") : 0n;

  // Penjualan tidak boleh melebihi unit yang dimiliki.
  if (data.action === "SELL") {
    const posisi = hitungPosisi(
      aset.transactions.map((item) => ({
        action: item.action as InvestmentAction,
        units: item.units,
        pricePerUnit: item.pricePerUnit,
        fee: item.fee,
        amount: item.amount,
      })),
    );
    if (posisi.units.lessThan(unitStr)) {
      return {
        galatField: {
          units: [`Hanya ada ${posisi.units.toString()} unit yang bisa dijual`],
        },
        gagal: true,
      };
    }
  }

  const nominalKas = nilaiKas(
    data.action,
    unitStr,
    hargaStr,
    data.fee,
    nominalDividen,
  );
  if (nominalKas <= 0n) {
    return galat("Nilai transaksi harus lebih dari nol.");
  }

  const catatan =
    data.note ||
    `${data.action === "BUY" ? "Pembelian" : data.action === "SELL" ? "Penjualan" : "Dividen"} ${aset.name}`;

  await prisma.$transaction(async (tx) => {
    const idPortofolio = await akunPortofolio(tx, pengguna.id);

    // Pembelian dan penjualan hanya memindahkan dana antara kas dan portofolio,
    // sedangkan dividen benar-benar menambah pemasukan.
    const transaksi = await tx.transaction.create({
      data: {
        userId: pengguna.id,
        date: data.date,
        type: dividen ? "INCOME" : "TRANSFER",
        amount: nominalKas,
        accountId: data.action === "SELL" ? idPortofolio : data.accountId,
        toAccountId:
          data.action === "BUY"
            ? idPortofolio
            : data.action === "SELL"
              ? data.accountId
              : null,
        note: catatan,
        tags: "investasi",
      },
    });

    await tx.investmentTx.create({
      data: {
        assetId: aset.id,
        date: data.date,
        action: data.action,
        units: unitStr,
        pricePerUnit: hargaStr,
        fee: data.fee,
        amount: nominalKas,
        transactionId: transaksi.id,
      },
    });

    await hitungUlangAset(tx, aset.id);
  });

  segarkan(aset.id);
  return sukses(
    dividen
      ? `Dividen ${aset.name} dicatat.`
      : `${data.action === "BUY" ? "Pembelian" : "Penjualan"} ${aset.name} dicatat.`,
  );
}

export async function hapusTransaksiInvestasiAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = investmentTxIdSchema.safeParse({ id: formData.get("id") });
  if (!hasil.success) return galat("Permintaan tidak valid.");

  const transaksiAset = await prisma.investmentTx.findFirst({
    where: { id: hasil.data.id, asset: { userId: pengguna.id } },
    select: { id: true, assetId: true, transactionId: true },
  });
  if (!transaksiAset) return galat("Transaksi tidak ditemukan.");

  await prisma.$transaction(async (tx) => {
    await tx.investmentTx.delete({ where: { id: transaksiAset.id } });
    if (transaksiAset.transactionId) {
      await tx.transaction.deleteMany({
        where: { id: transaksiAset.transactionId, userId: pengguna.id },
      });
    }
    // Posisi dihitung ulang dari awal agar tetap benar walau yang dihapus
    // adalah transaksi lama di tengah riwayat.
    await hitungUlangAset(tx, transaksiAset.assetId);
  });

  segarkan(transaksiAset.assetId);
  return sukses("Transaksi investasi dan mutasi kasnya dihapus.");
}
