import { describe, expect, it } from "vitest";
import {
  alokasiPembayaran,
  angsuranAnuitas,
  bungaPerBulan,
  hitungJadwal,
  tambahBulan,
  totalAngsuran,
  totalBunga,
} from "@/lib/finance/amortization";
import { sumMoney } from "@/lib/money";

const mulai = new Date(Date.UTC(2026, 0, 10));

describe("tambahBulan", () => {
  it("menambah bulan biasa", () => {
    expect(tambahBulan(mulai, 1).toISOString()).toBe("2026-02-10T00:00:00.000Z");
  });

  it("menjepit tanggal ke akhir bulan yang lebih pendek", () => {
    const akhirJanuari = new Date(Date.UTC(2026, 0, 31));
    expect(tambahBulan(akhirJanuari, 1).toISOString()).toBe(
      "2026-02-28T00:00:00.000Z",
    );
  });

  it("mengikuti tahun kabisat", () => {
    const akhirJanuari = new Date(Date.UTC(2028, 0, 31));
    expect(tambahBulan(akhirJanuari, 1).toISOString()).toBe(
      "2028-02-29T00:00:00.000Z",
    );
  });

  it("menyeberang pergantian tahun", () => {
    expect(tambahBulan(mulai, 12).toISOString()).toBe("2027-01-10T00:00:00.000Z");
  });
});

describe("bungaPerBulan", () => {
  it("mengubah basis point tahunan menjadi desimal bulanan", () => {
    expect(bungaPerBulan(1200)).toBeCloseTo(0.01, 10);
    expect(bungaPerBulan(0)).toBe(0);
  });
});

describe("angsuranAnuitas", () => {
  it("menghitung angsuran tetap 24 juta, 12% setahun, 12 bulan", () => {
    // Rumus anuitas baku menghasilkan Rp 2.132.371 per bulan.
    expect(angsuranAnuitas(24_000_000n, 1200, 12)).toBe(2_132_371n);
  });

  it("tanpa bunga hanya membagi pokok", () => {
    expect(angsuranAnuitas(12_000_000n, 0, 12)).toBe(1_000_000n);
  });
});

describe("hitungJadwal - anuitas", () => {
  const jadwal = hitungJadwal({
    pokok: 24_000_000n,
    bungaBps: 1200,
    jenisBunga: "ANNUITY",
    tenorBulan: 12,
    mulai,
  });

  it("membuat baris sebanyak tenor", () => {
    expect(jadwal).toHaveLength(12);
    expect(jadwal[0].ke).toBe(1);
    expect(jadwal[11].ke).toBe(12);
  });

  it("melunasi pokok tepat tanpa sisa", () => {
    expect(jadwal[11].sisaPokok).toBe(0n);
    expect(sumMoney(jadwal.map((baris) => baris.pokok))).toBe(24_000_000n);
  });

  it("porsi bunga mengecil tiap bulan", () => {
    expect(jadwal[0].bunga).toBe(240_000n);
    expect(jadwal[1].bunga).toBeLessThan(jadwal[0].bunga);
    expect(jadwal[11].bunga).toBeLessThan(jadwal[5].bunga);
  });

  it("angsuran pertama sesuai rumus anuitas", () => {
    expect(jadwal[0].angsuran).toBe(2_132_371n);
  });

  it("jatuh tempo pertama satu bulan setelah tanggal mulai", () => {
    expect(jadwal[0].jatuhTempo.toISOString()).toBe("2026-02-10T00:00:00.000Z");
    expect(jadwal[11].jatuhTempo.toISOString()).toBe("2027-01-10T00:00:00.000Z");
  });

  it("total angsuran sama dengan pokok ditambah total bunga", () => {
    expect(totalAngsuran(jadwal)).toBe(24_000_000n + totalBunga(jadwal));
  });
});

describe("hitungJadwal - flat", () => {
  const jadwal = hitungJadwal({
    pokok: 12_000_000n,
    bungaBps: 1200,
    jenisBunga: "FLAT",
    tenorBulan: 12,
    mulai,
  });

  it("bunga sama besar setiap bulan", () => {
    const bunga = jadwal.map((baris) => baris.bunga);
    expect(new Set(bunga.map(String)).size).toBe(1);
    expect(bunga[0]).toBe(120_000n);
  });

  it("angsuran tetap dan pokok lunas", () => {
    expect(jadwal[0].angsuran).toBe(1_120_000n);
    expect(sumMoney(jadwal.map((baris) => baris.pokok))).toBe(12_000_000n);
    expect(jadwal[11].sisaPokok).toBe(0n);
  });
});

describe("hitungJadwal - tanpa bunga", () => {
  it("membagi pokok rata dan menyerap sisa pembulatan di angsuran terakhir", () => {
    const jadwal = hitungJadwal({
      pokok: 10_000_000n,
      bungaBps: 0,
      jenisBunga: "NONE",
      tenorBulan: 3,
      mulai,
    });

    expect(totalBunga(jadwal)).toBe(0n);
    expect(sumMoney(jadwal.map((baris) => baris.pokok))).toBe(10_000_000n);
    expect(jadwal[0].pokok).toBe(3_333_333n);
    expect(jadwal[2].pokok).toBe(3_333_334n);
    expect(jadwal[2].sisaPokok).toBe(0n);
  });

  it("tenor satu bulan melunasi seluruhnya sekaligus", () => {
    const jadwal = hitungJadwal({
      pokok: 3_000_000n,
      bungaBps: 0,
      jenisBunga: "NONE",
      tenorBulan: 1,
      mulai,
    });
    expect(jadwal).toHaveLength(1);
    expect(jadwal[0].pokok).toBe(3_000_000n);
    expect(jadwal[0].sisaPokok).toBe(0n);
  });
});

describe("alokasiPembayaran", () => {
  it("membayar bunga lebih dulu lalu pokok", () => {
    const hasil = alokasiPembayaran(2_132_371n, 240_000n, 24_000_000n);
    expect(hasil.porsiBunga).toBe(240_000n);
    expect(hasil.porsiPokok).toBe(1_892_371n);
    expect(hasil.kelebihan).toBe(0n);
  });

  it("pembayaran lebih kecil dari bunga habis untuk bunga saja", () => {
    const hasil = alokasiPembayaran(100_000n, 240_000n, 24_000_000n);
    expect(hasil.porsiBunga).toBe(100_000n);
    expect(hasil.porsiPokok).toBe(0n);
  });

  it("porsi pokok tidak melebihi sisa pokok dan kelebihannya dilaporkan", () => {
    const hasil = alokasiPembayaran(5_000_000n, 0n, 4_000_000n);
    expect(hasil.porsiPokok).toBe(4_000_000n);
    expect(hasil.kelebihan).toBe(1_000_000n);
  });
});
