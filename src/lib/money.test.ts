import { describe, expect, it } from "vitest";
import {
  absMoney,
  formatAngka,
  formatRupiah,
  formatRupiahRingkas,
  moneyToNumber,
  percentOf,
  roundToMoney,
  serializeMoney,
  sumMoney,
  toMoney,
} from "@/lib/money";

describe("toMoney", () => {
  it("meneruskan bigint apa adanya", () => {
    expect(toMoney(12_500n)).toBe(12_500n);
  });

  it("membulatkan number ke rupiah penuh", () => {
    expect(toMoney(1250.4)).toBe(1250n);
    expect(toMoney(1250.6)).toBe(1251n);
  });

  it("membaca string berformat Indonesia", () => {
    expect(toMoney("1.250.000")).toBe(1_250_000n);
    expect(toMoney("Rp 2.500.000")).toBe(2_500_000n);
    expect(toMoney("-750.000")).toBe(-750_000n);
  });

  it("menolak masukan yang bukan angka", () => {
    expect(() => toMoney("abc")).toThrow();
    expect(() => toMoney(Number.NaN)).toThrow();
  });

  it("menangani nominal di atas batas 32-bit", () => {
    expect(toMoney("9.500.000.000.000")).toBe(9_500_000_000_000n);
  });
});

describe("aritmetika", () => {
  it("menjumlahkan sambil mengabaikan nilai kosong", () => {
    expect(sumMoney([1_000n, null, 2_500n, undefined])).toBe(3_500n);
    expect(sumMoney([])).toBe(0n);
  });

  it("menjumlahkan tanpa kehilangan presisi pada nominal besar", () => {
    const besar = 9_000_000_000_000_000n;
    expect(sumMoney([besar, 1n])).toBe(9_000_000_000_000_001n);
  });

  it("absMoney mengembalikan nilai positif", () => {
    expect(absMoney(-2_000n)).toBe(2_000n);
    expect(absMoney(2_000n)).toBe(2_000n);
  });

  it("roundToMoney membulatkan hasil perhitungan bunga", () => {
    expect(roundToMoney(240_000 * 0.01)).toBe(2_400n);
    expect(roundToMoney(1.5)).toBe(2n);
  });

  it("percentOf aman terhadap pembagi nol", () => {
    expect(percentOf(500n, 2_000n)).toBe(25);
    expect(percentOf(500n, 0n)).toBe(0);
  });

  it("moneyToNumber menolak nilai di luar jangkauan aman", () => {
    expect(moneyToNumber(1_000_000n)).toBe(1_000_000);
    expect(() => moneyToNumber(9_007_199_254_740_993n)).toThrow();
  });
});

describe("format", () => {
  it("format rupiah memakai locale id-ID tanpa desimal", () => {
    // Intl memakai spasi tak terputus setelah "Rp".
    expect(formatRupiah(1_250_000n).replace(/ /g, " ")).toBe("Rp 1.250.000");
    expect(formatRupiah(-425_000n).replace(/ /g, " ")).toBe("-Rp 425.000");
  });

  it("format angka tanpa simbol mata uang", () => {
    expect(formatAngka(1_250_000n)).toBe("1.250.000");
  });

  it("format ringkas untuk label grafik", () => {
    expect(formatRupiahRingkas(2_500n)).toBe("3 rb");
    expect(formatRupiahRingkas(1_250_000n)).toBe("1,3 jt");
    expect(formatRupiahRingkas(2_400_000_000n)).toBe("2,4 M");
    expect(formatRupiahRingkas(-1_500_000_000_000n)).toBe("-1,5 T");
  });

  it("serializeMoney mengubah bigint menjadi string untuk JSON", () => {
    expect(serializeMoney(9_500_000_000_000n)).toBe("9500000000000");
    expect(() => JSON.stringify({ jumlah: serializeMoney(10n) })).not.toThrow();
  });
});
