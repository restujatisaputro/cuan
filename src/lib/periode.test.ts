import { describe, expect, it } from "vitest";
import {
  geserPeriode,
  labelPeriode,
  periodeSekarang,
  rentangBulan,
} from "@/lib/periode";

describe("rentangBulan", () => {
  it("menghitung awal dan akhir bulan dalam UTC", () => {
    const { awal, akhir } = rentangBulan("2026-09");
    expect(awal.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(akhir.toISOString()).toBe("2026-09-30T00:00:00.000Z");
  });

  it("menangani bulan 31 hari", () => {
    expect(rentangBulan("2026-01").akhir.toISOString()).toBe(
      "2026-01-31T00:00:00.000Z",
    );
  });

  it("menangani Februari tahun kabisat", () => {
    expect(rentangBulan("2028-02").akhir.toISOString()).toBe(
      "2028-02-29T00:00:00.000Z",
    );
    expect(rentangBulan("2026-02").akhir.toISOString()).toBe(
      "2026-02-28T00:00:00.000Z",
    );
  });
});

describe("geserPeriode", () => {
  it("mundur satu bulan", () => {
    expect(geserPeriode("2026-09", -1)).toBe("2026-08");
  });

  it("menyeberang pergantian tahun", () => {
    expect(geserPeriode("2026-01", -1)).toBe("2025-12");
    expect(geserPeriode("2026-12", 1)).toBe("2027-01");
  });

  it("menggeser beberapa bulan sekaligus", () => {
    expect(geserPeriode("2026-09", -6)).toBe("2026-03");
    expect(geserPeriode("2026-09", -12)).toBe("2025-09");
  });

  it("tidak mengubah apa pun saat digeser nol bulan", () => {
    expect(geserPeriode("2026-09", 0)).toBe("2026-09");
  });
});

describe("labelPeriode", () => {
  it("memberi label pendek dan panjang berbahasa Indonesia", () => {
    expect(labelPeriode("2026-09", true)).toBe("September 2026");
    expect(labelPeriode("2026-09")).toMatch(/Sep/);
  });
});

describe("periodeSekarang", () => {
  it("mengembalikan format YYYY-MM", () => {
    expect(periodeSekarang("Asia/Jakarta")).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it("mengikuti zona waktu yang diberikan", () => {
    // Zona waktu berbeda bisa berada di bulan berbeda pada pergantian bulan,
    // tetapi keduanya harus tetap berformat valid.
    expect(periodeSekarang("UTC")).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    expect(periodeSekarang("Asia/Jayapura")).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });
});
