import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  hitungPosisi,
  labaBelumTerealisasi,
  nilaiKas,
  nilaiPasar,
  type TransaksiInvestasi,
} from "@/lib/finance/portfolio";

const beli = (units: string, harga: string, fee = 0n): TransaksiInvestasi => ({
  action: "BUY",
  units,
  pricePerUnit: harga,
  fee,
  amount: 0n,
});

const jual = (units: string, harga: string, fee = 0n): TransaksiInvestasi => ({
  action: "SELL",
  units,
  pricePerUnit: harga,
  fee,
  amount: 0n,
});

const dividen = (jumlah: bigint): TransaksiInvestasi => ({
  action: "DIVIDEND",
  units: "0",
  pricePerUnit: "0",
  fee: 0n,
  amount: jumlah,
});

describe("hitungPosisi", () => {
  it("mengembalikan posisi kosong bila belum ada transaksi", () => {
    const posisi = hitungPosisi([]);
    expect(posisi.units.toString()).toBe("0");
    expect(posisi.modal).toBe(0n);
    expect(posisi.realisasi).toBe(0n);
  });

  it("menghitung biaya rata-rata dari dua pembelian", () => {
    const posisi = hitungPosisi([beli("100", "9000"), beli("100", "11000")]);
    expect(posisi.units.toString()).toBe("200");
    expect(posisi.avgCost.toString()).toBe("10000");
    expect(posisi.modal).toBe(2_000_000n);
  });

  it("memasukkan biaya transaksi ke harga perolehan", () => {
    const posisi = hitungPosisi([beli("100", "10000", 5_000n)]);
    expect(posisi.avgCost.toString()).toBe("10050");
    expect(posisi.modal).toBe(1_005_000n);
  });

  it("menangani unit pecahan seperti reksa dana", () => {
    const posisi = hitungPosisi([
      beli("2000", "1201.3345"),
      beli("1500", "1243.8812"),
    ]);
    expect(posisi.units.toString()).toBe("3500");
    // Rata-rata tertimbang: (2000*1201,3345 + 1500*1243,8812) / 3500
    // = 4.268.490,8 / 3.500 = 1.219,5688
    expect(posisi.avgCost.toDecimalPlaces(4).toString()).toBe("1219.5688");
  });

  it("penjualan mengurangi unit tanpa mengubah biaya rata-rata", () => {
    const posisi = hitungPosisi([
      beli("100", "9000"),
      beli("100", "11000"),
      jual("50", "12000"),
    ]);
    expect(posisi.units.toString()).toBe("150");
    expect(posisi.avgCost.toString()).toBe("10000");
    expect(posisi.modal).toBe(1_500_000n);
  });

  it("menghitung laba terealisasi beserta biaya jual", () => {
    const posisi = hitungPosisi([beli("100", "10000"), jual("50", "12000", 3_000n)]);
    // (50 * 12.000) - (50 * 10.000) - 3.000 biaya = 97.000
    expect(posisi.realisasi).toBe(97_000n);
  });

  it("menghitung rugi terealisasi sebagai nilai negatif", () => {
    const posisi = hitungPosisi([beli("100", "10000"), jual("100", "8000")]);
    expect(posisi.realisasi).toBe(-200_000n);
    expect(posisi.units.toString()).toBe("0");
    expect(posisi.modal).toBe(0n);
  });

  it("menjual seluruh unit mengosongkan posisi", () => {
    const posisi = hitungPosisi([
      beli("100", "10000"),
      jual("100", "10000"),
      beli("50", "20000"),
    ]);
    expect(posisi.units.toString()).toBe("50");
    expect(posisi.avgCost.toString()).toBe("20000");
  });

  it("penjualan melebihi kepemilikan dibatasi pada unit yang ada", () => {
    const posisi = hitungPosisi([beli("100", "10000"), jual("500", "12000")]);
    expect(posisi.units.toString()).toBe("0");
    expect(posisi.realisasi).toBe(200_000n);
  });

  it("dividen menambah catatan dividen tanpa mengubah unit", () => {
    const posisi = hitungPosisi([beli("100", "10000"), dividen(75_000n)]);
    expect(posisi.units.toString()).toBe("100");
    expect(posisi.dividen).toBe(75_000n);
    expect(posisi.realisasi).toBe(0n);
  });
});

describe("nilai pasar", () => {
  it("mengalikan unit dengan harga terakhir", () => {
    expect(
      nilaiPasar(new Prisma.Decimal("3500"), new Prisma.Decimal("1287.4521")),
    ).toBe(4_506_082n);
  });

  it("laba belum terealisasi adalah selisih terhadap modal", () => {
    expect(
      labaBelumTerealisasi(
        new Prisma.Decimal("100"),
        new Prisma.Decimal("12000"),
        1_000_000n,
      ),
    ).toBe(200_000n);
  });
});

describe("nilaiKas", () => {
  it("pembelian menambahkan biaya", () => {
    expect(nilaiKas("BUY", "100", "10000", 5_000n, 0n)).toBe(1_005_000n);
  });

  it("penjualan memotong biaya", () => {
    expect(nilaiKas("SELL", "100", "10000", 5_000n, 0n)).toBe(995_000n);
  });

  it("dividen memakai nominal apa adanya", () => {
    expect(nilaiKas("DIVIDEND", "0", "0", 0n, 125_000n)).toBe(125_000n);
  });
});
