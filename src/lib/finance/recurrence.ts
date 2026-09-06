/**
 * Perhitungan jadwal transaksi berulang.
 *
 * Semua tanggal diperlakukan sebagai tengah malam UTC, sama seperti tanggal
 * transaksi, sehingga pergeseran jadwal tidak terpengaruh zona waktu.
 */
import { tambahBulan } from "@/lib/finance/amortization";
import type { Frequency } from "@/lib/constants";

/** Menambah n hari pada sebuah tanggal UTC. */
export function tambahHari(tanggal: Date, n: number): Date {
  return new Date(tanggal.getTime() + n * 24 * 60 * 60 * 1000);
}

/**
 * Tanggal jalan berikutnya setelah sebuah aturan dieksekusi.
 * Untuk frekuensi bulanan dan tahunan, tanggal yang melewati akhir bulan
 * dijepit ke hari terakhir bulan tersebut (31 Jan -> 28/29 Feb).
 */
export function jadwalBerikutnya(
  tanggal: Date,
  frekuensi: Frequency,
  interval = 1,
): Date {
  const langkah = Math.max(1, Math.trunc(interval));

  switch (frekuensi) {
    case "DAILY":
      return tambahHari(tanggal, langkah);
    case "WEEKLY":
      return tambahHari(tanggal, langkah * 7);
    case "MONTHLY":
      return tambahBulan(tanggal, langkah);
    case "YEARLY":
      return tambahBulan(tanggal, langkah * 12);
  }
}

export type RencanaJalan = {
  /** Tanggal-tanggal yang harus dibuatkan transaksi. */
  tanggal: Date[];
  /** Tanggal jalan berikutnya setelah seluruh tunggakan diproses. */
  berikutnya: Date;
  /** true bila aturan sudah melewati tanggal berakhirnya. */
  selesai: boolean;
};

/** Batas pengaman agar aturan yang lama tidak dijalankan berkali-kali tanpa henti. */
export const MAKS_SEKALI_JALAN = 60;

/**
 * Menentukan tanggal mana saja yang tertunggak sampai `sampai` (inklusif).
 *
 * Aturan yang lama tidak dibuka bisa punya banyak tunggakan sekaligus; semuanya
 * dibuatkan transaksi agar riwayat tetap utuh, dibatasi MAKS_SEKALI_JALAN.
 */
export function rencanaJalan(
  nextRunDate: Date,
  frekuensi: Frequency,
  interval: number,
  sampai: Date,
  endDate: Date | null,
): RencanaJalan {
  const tanggal: Date[] = [];
  let cursor = nextRunDate;

  while (
    cursor.getTime() <= sampai.getTime() &&
    tanggal.length < MAKS_SEKALI_JALAN
  ) {
    if (endDate && cursor.getTime() > endDate.getTime()) break;
    tanggal.push(cursor);
    cursor = jadwalBerikutnya(cursor, frekuensi, interval);
  }

  return {
    tanggal,
    berikutnya: cursor,
    selesai: Boolean(endDate && cursor.getTime() > endDate.getTime()),
  };
}
