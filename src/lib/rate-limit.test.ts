import { afterEach, describe, expect, it, vi } from "vitest";
import { pesanRateLimit, rateLimit, resetRateLimit } from "@/lib/rate-limit";

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("mengizinkan percobaan sebanyak batas lalu memblokir", () => {
    const key = `uji-${Math.random()}`;
    const opsi = { key, limit: 5, windowMs: 60_000 };

    for (let i = 1; i <= 5; i += 1) {
      const hasil = rateLimit(opsi);
      expect(hasil.ok, `percobaan ke-${i} seharusnya lolos`).toBe(true);
      expect(hasil.sisa).toBe(5 - i);
    }

    const keenam = rateLimit(opsi);
    expect(keenam.ok).toBe(false);
    expect(keenam.sisa).toBe(0);
    expect(keenam.tungguDetik).toBeGreaterThan(0);
  });

  it("tetap memblokir selama masa blokir walau jendela sudah lewat", () => {
    // Waktu dipalsukan supaya hasilnya tidak bergantung kecepatan mesin.
    vi.useFakeTimers();
    const key = `uji-blokir-${Math.random()}`;
    const opsi = { key, limit: 1, windowMs: 1_000, blockMs: 60_000 };

    expect(rateLimit(opsi).ok).toBe(true);
    expect(rateLimit(opsi).ok).toBe(false);

    // Jendela 1 detik sudah lewat, tetapi blokir 60 detik masih berlaku.
    vi.advanceTimersByTime(5_000);
    expect(rateLimit(opsi).ok).toBe(false);

    // Setelah masa blokir habis, percobaan diterima lagi.
    vi.advanceTimersByTime(60_000);
    expect(rateLimit(opsi).ok).toBe(true);
  });

  it("menghitung mundur sisa blokir", () => {
    const key = `uji-mundur-${Math.random()}`;
    const opsi = { key, limit: 1, windowMs: 10_000, blockMs: 30_000 };

    rateLimit(opsi);
    const diblokir = rateLimit(opsi);
    expect(diblokir.tungguDetik).toBeLessThanOrEqual(30);
    expect(diblokir.tungguDetik).toBeGreaterThan(25);
  });

  it("resetRateLimit menghapus riwayat percobaan", () => {
    const key = `uji-reset-${Math.random()}`;
    const opsi = { key, limit: 2, windowMs: 60_000 };

    rateLimit(opsi);
    rateLimit(opsi);
    expect(rateLimit(opsi).ok).toBe(false);

    resetRateLimit(key);
    expect(rateLimit(opsi).ok).toBe(true);
  });

  it("memisahkan hitungan antar kunci", () => {
    const a = `uji-a-${Math.random()}`;
    const b = `uji-b-${Math.random()}`;

    rateLimit({ key: a, limit: 1, windowMs: 60_000 });
    expect(rateLimit({ key: a, limit: 1, windowMs: 60_000 }).ok).toBe(false);
    expect(rateLimit({ key: b, limit: 1, windowMs: 60_000 }).ok).toBe(true);
  });
});

describe("pesanRateLimit", () => {
  it("memakai satuan detik di bawah satu menit", () => {
    expect(pesanRateLimit(45)).toContain("45 detik");
  });

  it("memakai satuan menit untuk durasi panjang", () => {
    expect(pesanRateLimit(900)).toContain("15 menit");
  });
});
