import { describe, expect, it } from "vitest";
import {
  jadwalBerikutnya,
  MAKS_SEKALI_JALAN,
  rencanaJalan,
  tambahHari,
} from "@/lib/finance/recurrence";

const tgl = (teks: string) => new Date(`${teks}T00:00:00.000Z`);
const iso = (tanggal: Date) => tanggal.toISOString().slice(0, 10);

describe("jadwalBerikutnya", () => {
  it("harian mengikuti interval", () => {
    expect(iso(jadwalBerikutnya(tgl("2026-09-06"), "DAILY"))).toBe("2026-09-07");
    expect(iso(jadwalBerikutnya(tgl("2026-09-06"), "DAILY", 10))).toBe("2026-09-16");
  });

  it("mingguan melompat tujuh hari", () => {
    expect(iso(jadwalBerikutnya(tgl("2026-09-06"), "WEEKLY"))).toBe("2026-09-13");
    expect(iso(jadwalBerikutnya(tgl("2026-09-06"), "WEEKLY", 2))).toBe("2026-09-20");
  });

  it("bulanan menjepit tanggal ke akhir bulan pendek", () => {
    expect(iso(jadwalBerikutnya(tgl("2026-01-31"), "MONTHLY"))).toBe("2026-02-28");
    expect(iso(jadwalBerikutnya(tgl("2028-01-31"), "MONTHLY"))).toBe("2028-02-29");
  });

  it("tahunan menambah dua belas bulan", () => {
    expect(iso(jadwalBerikutnya(tgl("2026-09-06"), "YEARLY"))).toBe("2027-09-06");
  });

  it("interval nol atau negatif diperlakukan sebagai satu", () => {
    expect(iso(jadwalBerikutnya(tgl("2026-09-06"), "DAILY", 0))).toBe("2026-09-07");
    expect(iso(jadwalBerikutnya(tgl("2026-09-06"), "DAILY", -5))).toBe("2026-09-07");
  });

  it("menyeberang pergantian tahun", () => {
    expect(iso(jadwalBerikutnya(tgl("2026-12-15"), "MONTHLY"))).toBe("2027-01-15");
    expect(iso(tambahHari(tgl("2026-12-31"), 1))).toBe("2027-01-01");
  });
});

describe("rencanaJalan", () => {
  it("tidak menjalankan apa pun bila belum jatuh tempo", () => {
    const hasil = rencanaJalan(
      tgl("2026-10-01"),
      "MONTHLY",
      1,
      tgl("2026-09-06"),
      null,
    );
    expect(hasil.tanggal).toHaveLength(0);
    expect(iso(hasil.berikutnya)).toBe("2026-10-01");
    expect(hasil.selesai).toBe(false);
  });

  it("menjalankan satu kali saat tepat jatuh tempo", () => {
    const hasil = rencanaJalan(
      tgl("2026-09-06"),
      "MONTHLY",
      1,
      tgl("2026-09-06"),
      null,
    );
    expect(hasil.tanggal.map(iso)).toEqual(["2026-09-06"]);
    expect(iso(hasil.berikutnya)).toBe("2026-10-06");
  });

  it("mengejar seluruh tunggakan aturan yang lama tidak dibuka", () => {
    const hasil = rencanaJalan(
      tgl("2026-06-10"),
      "MONTHLY",
      1,
      tgl("2026-09-06"),
      null,
    );
    expect(hasil.tanggal.map(iso)).toEqual([
      "2026-06-10",
      "2026-07-10",
      "2026-08-10",
    ]);
    // 10 September belum jatuh tempo pada 6 September, jadi menunggu di situ.
    expect(iso(hasil.berikutnya)).toBe("2026-09-10");
  });

  it("berhenti pada tanggal berakhir dan menandai selesai", () => {
    const hasil = rencanaJalan(
      tgl("2026-07-01"),
      "MONTHLY",
      1,
      tgl("2026-12-01"),
      tgl("2026-08-31"),
    );
    expect(hasil.tanggal.map(iso)).toEqual(["2026-07-01", "2026-08-01"]);
    expect(hasil.selesai).toBe(true);
  });

  it("membatasi jumlah transaksi sekali jalan", () => {
    const hasil = rencanaJalan(
      tgl("2020-01-01"),
      "DAILY",
      1,
      tgl("2026-09-06"),
      null,
    );
    expect(hasil.tanggal).toHaveLength(MAKS_SEKALI_JALAN);
  });
});
