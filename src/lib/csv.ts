/**
 * Penyusun berkas CSV untuk ekspor.
 *
 * Memakai pemisah titik koma dan BOM UTF-8 karena Excel berlokal Indonesia
 * membaca koma sebagai desimal; tanpa keduanya berkas tampil berantakan.
 */

/** Pemisah kolom yang dipakai seluruh ekspor. */
export const PEMISAH = ";";

/** Byte order mark UTF-8 agar Excel mengenali encoding-nya. */
export const BOM = "﻿";

/**
 * Membungkus satu sel: tanda kutip digandakan, dan sel yang mengandung
 * pemisah, kutip, atau baris baru dikutip penuh.
 */
export function selCsv(nilai: string | null | undefined): string {
  const teks = nilai ?? "";
  if (teks.includes(PEMISAH) || /["\n\r]/.test(teks)) {
    return `"${teks.replace(/"/g, '""')}"`;
  }
  return teks;
}

/** Menyusun satu baris dari beberapa sel. */
export function barisCsv(sel: ReadonlyArray<string | null | undefined>): string {
  return sel.map(selCsv).join(PEMISAH);
}

/**
 * Menyusun berkas lengkap: BOM, baris judul, lalu isinya, dengan akhir baris
 * CRLF sesuai kebiasaan berkas CSV di Windows.
 */
export function buatCsv(
  judul: ReadonlyArray<string>,
  baris: ReadonlyArray<ReadonlyArray<string | null | undefined>>,
): string {
  const isi = [barisCsv(judul), ...baris.map(barisCsv)];
  return `${BOM}${isi.join("\r\n")}\r\n`;
}
