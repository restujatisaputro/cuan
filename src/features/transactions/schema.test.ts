import { describe, expect, it } from "vitest";
import {
  filterSchema,
  transactionSchema,
  tanggalKalender,
} from "@/features/transactions/schema";

const dasar = {
  date: "2026-09-06",
  amount: "150.000",
  accountId: "akun-1",
  toAccountId: "",
  categoryId: "kat-1",
  note: "",
  tags: "",
};

describe("tanggalKalender", () => {
  it("menyimpan tanggal sebagai tengah malam UTC", () => {
    const hasil = tanggalKalender.parse("2026-09-06");
    expect(hasil.toISOString()).toBe("2026-09-06T00:00:00.000Z");
  });

  it("menolak tanggal yang tidak ada di kalender", () => {
    expect(() => tanggalKalender.parse("2026-02-31")).toThrow();
  });

  it("menolak format selain YYYY-MM-DD", () => {
    expect(() => tanggalKalender.parse("06/09/2026")).toThrow();
  });

  it("menolak tanggal di luar jangkauan wajar", () => {
    expect(() => tanggalKalender.parse("1990-01-01")).toThrow();
  });
});

describe("transactionSchema", () => {
  it("menerima pengeluaran berkategori", () => {
    const hasil = transactionSchema.safeParse({ ...dasar, type: "EXPENSE" });
    expect(hasil.success).toBe(true);
    if (hasil.success) {
      expect(hasil.data.amount).toBe(150_000n);
      expect(hasil.data.categoryId).toBe("kat-1");
    }
  });

  it("menolak pemasukan tanpa kategori", () => {
    const hasil = transactionSchema.safeParse({
      ...dasar,
      type: "INCOME",
      categoryId: "",
    });
    expect(hasil.success).toBe(false);
    if (!hasil.success) {
      expect(hasil.error.issues[0]?.path).toEqual(["categoryId"]);
    }
  });

  it("menolak transfer tanpa akun tujuan", () => {
    const hasil = transactionSchema.safeParse({
      ...dasar,
      type: "TRANSFER",
      categoryId: "",
      toAccountId: "",
    });
    expect(hasil.success).toBe(false);
    if (!hasil.success) {
      expect(hasil.error.issues[0]?.path).toEqual(["toAccountId"]);
    }
  });

  it("menolak transfer ke akun yang sama", () => {
    const hasil = transactionSchema.safeParse({
      ...dasar,
      type: "TRANSFER",
      categoryId: "",
      toAccountId: "akun-1",
    });
    expect(hasil.success).toBe(false);
  });

  it("menerima transfer antar akun berbeda tanpa kategori", () => {
    const hasil = transactionSchema.safeParse({
      ...dasar,
      type: "TRANSFER",
      categoryId: "",
      toAccountId: "akun-2",
    });
    expect(hasil.success).toBe(true);
    if (hasil.success) {
      expect(hasil.data.categoryId).toBeNull();
      expect(hasil.data.toAccountId).toBe("akun-2");
    }
  });

  it("menolak nominal nol atau kosong", () => {
    expect(
      transactionSchema.safeParse({ ...dasar, type: "EXPENSE", amount: "0" })
        .success,
    ).toBe(false);
    expect(
      transactionSchema.safeParse({ ...dasar, type: "EXPENSE", amount: "" })
        .success,
    ).toBe(false);
  });

  it("membaca nominal berpemisah titik", () => {
    const hasil = transactionSchema.safeParse({
      ...dasar,
      type: "EXPENSE",
      amount: "12.500.000",
    });
    expect(hasil.success && hasil.data.amount).toBe(12_500_000n);
  });

  it("menolak catatan yang terlalu panjang", () => {
    const hasil = transactionSchema.safeParse({
      ...dasar,
      type: "EXPENSE",
      note: "x".repeat(201),
    });
    expect(hasil.success).toBe(false);
  });
});

describe("filterSchema", () => {
  it("memberi nilai bawaan saat query kosong", () => {
    const hasil = filterSchema.parse({});
    expect(hasil.tipe).toBe("SEMUA");
    expect(hasil.hal).toBe(1);
  });

  it("mengabaikan nilai yang tidak dikenal alih-alih gagal", () => {
    const hasil = filterSchema.parse({ tipe: "NGACO", hal: "abc", dari: "kemarin" });
    expect(hasil.tipe).toBe("SEMUA");
    expect(hasil.hal).toBe(1);
    expect(hasil.dari).toBeUndefined();
  });

  it("membaca filter yang sah", () => {
    const hasil = filterSchema.parse({
      tipe: "EXPENSE",
      hal: "3",
      dari: "2026-01-01",
      sampai: "2026-01-31",
      q: "listrik",
    });
    expect(hasil).toMatchObject({
      tipe: "EXPENSE",
      hal: 3,
      dari: "2026-01-01",
      sampai: "2026-01-31",
      q: "listrik",
    });
  });
});
