/**
 * Perhitungan posisi portofolio investasi dengan metode biaya rata-rata
 * tertimbang (weighted average cost).
 *
 * Unit dan harga per unit memakai Decimal karena butuh pecahan, sedangkan
 * nilai rupiah tetap bigint. Posisi selalu dihitung ulang dengan memutar
 * seluruh riwayat transaksi dari awal, sehingga menghapus satu transaksi lama
 * pun menghasilkan angka yang tetap benar.
 */
import { Prisma } from "@prisma/client";
import { roundToMoney } from "@/lib/money";
import type { InvestmentAction } from "@/lib/constants";

type Decimal = Prisma.Decimal;

export type TransaksiInvestasi = {
  action: InvestmentAction;
  /** Jumlah unit; "0" untuk dividen. */
  units: string | Decimal;
  pricePerUnit: string | Decimal;
  fee: bigint;
  /** Nominal kas; dipakai apa adanya untuk dividen. */
  amount: bigint;
};

export type PosisiAset = {
  /** Sisa unit yang dimiliki. */
  units: Decimal;
  /** Biaya rata-rata per unit, sudah termasuk biaya transaksi pembelian. */
  avgCost: Decimal;
  /** Total modal yang masih tertanam. */
  modal: bigint;
  /** Keuntungan atau kerugian yang sudah terealisasi dari penjualan. */
  realisasi: bigint;
  /** Total dividen yang diterima. */
  dividen: bigint;
};

const NOL = new Prisma.Decimal(0);

function keDecimal(nilai: string | Decimal): Decimal {
  return nilai instanceof Prisma.Decimal ? nilai : new Prisma.Decimal(nilai);
}

/**
 * Memutar ulang seluruh transaksi untuk mendapatkan posisi terkini.
 * Urutan daftar harus sudah menaik berdasarkan tanggal.
 */
export function hitungPosisi(
  daftar: readonly TransaksiInvestasi[],
): PosisiAset {
  let units = NOL;
  // Total biaya perolehan unit yang masih dipegang.
  let biaya = NOL;
  let realisasi = 0n;
  let dividen = 0n;

  for (const item of daftar) {
    if (item.action === "DIVIDEND") {
      dividen += item.amount;
      continue;
    }

    const jumlahUnit = keDecimal(item.units);
    const harga = keDecimal(item.pricePerUnit);

    if (item.action === "BUY") {
      // Biaya transaksi ikut menaikkan harga perolehan.
      biaya = biaya.add(jumlahUnit.mul(harga)).add(item.fee.toString());
      units = units.add(jumlahUnit);
      continue;
    }

    // SELL: unit yang dijual dilepas pada biaya rata-rata saat itu.
    const unitTerjual = jumlahUnit.greaterThan(units) ? units : jumlahUnit;
    if (units.isZero()) continue;

    const biayaPerUnit = biaya.div(units);
    const biayaDilepas = biayaPerUnit.mul(unitTerjual);
    const hasilJual = unitTerjual.mul(harga);

    realisasi +=
      roundToMoney(hasilJual.toNumber()) -
      roundToMoney(biayaDilepas.toNumber()) -
      item.fee;

    biaya = biaya.sub(biayaDilepas);
    units = units.sub(unitTerjual);
    if (units.lessThanOrEqualTo(0)) {
      units = NOL;
      biaya = NOL;
    }
  }

  return {
    units,
    avgCost: units.isZero() ? NOL : biaya.div(units),
    modal: roundToMoney(biaya.toNumber()),
    realisasi,
    dividen,
  };
}

/** Nilai pasar saat ini: sisa unit dikali harga terakhir. */
export function nilaiPasar(units: Decimal, hargaTerakhir: Decimal): bigint {
  return roundToMoney(units.mul(hargaTerakhir).toNumber());
}

/** Selisih nilai pasar terhadap modal yang masih tertanam. */
export function labaBelumTerealisasi(
  units: Decimal,
  hargaTerakhir: Decimal,
  modal: bigint,
): bigint {
  return nilaiPasar(units, hargaTerakhir) - modal;
}

/** Nominal kas sebuah transaksi investasi. */
export function nilaiKas(
  action: InvestmentAction,
  units: string | Decimal,
  hargaPerUnit: string | Decimal,
  fee: bigint,
  nominalDividen: bigint,
): bigint {
  if (action === "DIVIDEND") return nominalDividen;

  const bruto = roundToMoney(keDecimal(units).mul(keDecimal(hargaPerUnit)).toNumber());
  // Membeli menambah biaya, menjual memotong hasil.
  return action === "BUY" ? bruto + fee : bruto - fee;
}
