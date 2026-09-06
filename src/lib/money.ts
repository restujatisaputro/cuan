/**
 * Utilitas nominal uang.
 *
 * Seluruh nominal disimpan sebagai `bigint` dalam rupiah penuh (tanpa desimal)
 * supaya tidak ada pembulatan floating point dan tidak terbentur batas 32-bit.
 * Aturan main:
 *  - Perhitungan uang murni memakai `bigint`.
 *  - `number` hanya dipakai saat menghitung bunga/persentase, lalu segera
 *    dibulatkan kembali ke `bigint` dengan {@link roundToMoney}.
 *  - `bigint` tidak bisa di-JSON.stringify, jadi respons API memakai
 *    {@link serializeMoney} yang mengubahnya menjadi string desimal.
 */

/** Nominal maksimum yang wajar diterima dari input pengguna: 1 kuadriliun rupiah. */
export const MAX_MONEY = 1_000_000_000_000_000n;

/** Mengubah number/string menjadi bigint rupiah, membulatkan pecahan. */
export function toMoney(value: number | string | bigint): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Nominal tidak valid: ${value}`);
    }
    return BigInt(Math.round(value));
  }
  const cleaned = value.trim().replace(/[^\d.,-]/g, "");
  if (cleaned === "" || cleaned === "-") {
    throw new Error(`Nominal tidak valid: ${value}`);
  }
  // Buang pemisah ribuan gaya Indonesia, sisakan tanda minus dan angka.
  const normalized = cleaned.replace(/[.,]/g, "");
  return BigInt(normalized);
}

/** Membulatkan hasil perhitungan number (mis. bunga) menjadi rupiah penuh. */
export function roundToMoney(value: number): bigint {
  return BigInt(Math.round(value));
}

/**
 * Mengubah bigint menjadi number untuk keperluan grafik/persentase.
 * Aman selama nominal di bawah Number.MAX_SAFE_INTEGER (± 9 kuadriliun).
 */
export function moneyToNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < -BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Nominal terlalu besar untuk dikonversi ke number: ${value}`);
  }
  return Number(value);
}

/** Menjumlahkan daftar nominal. */
export function sumMoney(values: Iterable<bigint | null | undefined>): bigint {
  let total = 0n;
  for (const value of values) {
    if (value != null) total += value;
  }
  return total;
}

/** Nilai absolut untuk bigint. */
export function absMoney(value: bigint): bigint {
  return value < 0n ? -value : value;
}

/**
 * Persentase `part` terhadap `whole`, dikembalikan sebagai number 0-100.
 * Mengembalikan 0 bila pembagi nol supaya aman dipakai langsung di UI.
 */
export function percentOf(part: bigint, whole: bigint): number {
  if (whole === 0n) return 0;
  return (moneyToNumber(part) / moneyToNumber(whole)) * 100;
}

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

/** Format "Rp 1.250.000". */
export function formatRupiah(value: bigint | number): string {
  return rupiahFormatter.format(value);
}

/** Format "1.250.000" tanpa simbol mata uang. */
export function formatAngka(value: bigint | number): string {
  return numberFormatter.format(value);
}

/** Format ringkas untuk label grafik: "1,2 jt", "3,4 M". */
export function formatRupiahRingkas(value: bigint | number): string {
  const angka = typeof value === "bigint" ? moneyToNumber(value) : value;
  const absolut = Math.abs(angka);
  const tanda = angka < 0 ? "-" : "";
  if (absolut >= 1_000_000_000_000) {
    return `${tanda}${(absolut / 1_000_000_000_000).toFixed(1).replace(".", ",")} T`;
  }
  if (absolut >= 1_000_000_000) {
    return `${tanda}${(absolut / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  }
  if (absolut >= 1_000_000) {
    return `${tanda}${(absolut / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  }
  if (absolut >= 1_000) {
    return `${tanda}${(absolut / 1_000).toFixed(0)} rb`;
  }
  return `${tanda}${absolut}`;
}

/** Mengubah bigint menjadi string agar aman dikirim sebagai JSON. */
export function serializeMoney(value: bigint): string {
  return value.toString();
}

const unitFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 6,
});

const hargaFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

/**
 * Format kuantitas unit investasi, mis. "3.500" atau "0,123457".
 * Menerima string Decimal agar presisinya utuh sampai saat diformat.
 */
export function formatUnit(value: string | number): string {
  return unitFormatter.format(Number(value));
}

/** Format harga per unit yang boleh berpecahan, mis. "Rp 1.287,4521". */
export function formatHarga(value: string | number): string {
  return `Rp ${hargaFormatter.format(Number(value))}`;
}
