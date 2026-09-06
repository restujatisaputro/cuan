/**
 * Util periode bulanan berbentuk "YYYY-MM".
 *
 * Semua tanggal transaksi disimpan sebagai tengah malam UTC, jadi batas awal
 * dan akhir periode juga dihitung dalam UTC agar tidak ada transaksi yang
 * terlewat di ujung bulan.
 */

/** Rentang tanggal sebuah periode bulanan (inklusif, dalam UTC). */
export type RentangBulan = { awal: Date; akhir: Date; periode: string };

/** Periode bulan berjalan pada zona waktu pengguna. */
export function periodeSekarang(timezone: string): string {
  const bagian = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const tahun = bagian.find((item) => item.type === "year")?.value ?? "1970";
  const bulan = bagian.find((item) => item.type === "month")?.value ?? "01";
  return `${tahun}-${bulan}`;
}

/** Mengubah "YYYY-MM" menjadi rentang tanggal awal dan akhir bulan. */
export function rentangBulan(periode: string): RentangBulan {
  const [tahun, bulan] = periode.split("-").map(Number);
  return {
    periode,
    awal: new Date(Date.UTC(tahun, bulan - 1, 1)),
    // Tanggal 0 bulan berikutnya = hari terakhir bulan ini.
    akhir: new Date(Date.UTC(tahun, bulan, 0)),
  };
}

/** Menggeser periode sebanyak n bulan (boleh negatif). */
export function geserPeriode(periode: string, n: number): string {
  const [tahun, bulan] = periode.split("-").map(Number);
  const tanggal = new Date(Date.UTC(tahun, bulan - 1 + n, 1));
  return `${tanggal.getUTCFullYear()}-${String(tanggal.getUTCMonth() + 1).padStart(2, "0")}`;
}

const bulanPendek = new Intl.DateTimeFormat("id-ID", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

const bulanPanjang = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Label periode untuk ditampilkan, mis. "Sep 26" atau "September 2026". */
export function labelPeriode(periode: string, panjang = false): string {
  const { awal } = rentangBulan(periode);
  return panjang ? bulanPanjang.format(awal) : bulanPendek.format(awal);
}
