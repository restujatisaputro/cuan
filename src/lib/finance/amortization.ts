/**
 * Perhitungan jadwal cicilan utang.
 *
 * Seluruh nominal memakai bigint rupiah penuh. Perhitungan bunga dilakukan
 * dalam number lalu segera dibulatkan kembali ke rupiah, dan selisih
 * pembulatan diserap oleh angsuran terakhir sehingga jumlah pokok seluruh
 * jadwal selalu persis sama dengan pokok utang.
 */
import { roundToMoney } from "@/lib/money";
import type { InterestType } from "@/lib/constants";

export type BarisJadwal = {
  /** Angsuran ke-berapa, mulai dari 1. */
  ke: number;
  jatuhTempo: Date;
  angsuran: bigint;
  pokok: bigint;
  bunga: bigint;
  /** Sisa pokok setelah angsuran ini dibayar. */
  sisaPokok: bigint;
};

export type ParameterJadwal = {
  pokok: bigint;
  /** Bunga tahunan dalam basis point: 1250 = 12,50% per tahun. */
  bungaBps: number;
  jenisBunga: InterestType;
  tenorBulan: number;
  /** Tanggal mulai; angsuran pertama jatuh tempo satu bulan sesudahnya. */
  mulai: Date;
};

/**
 * Menambah n bulan pada sebuah tanggal UTC.
 * Tanggal yang melewati akhir bulan dijepit ke hari terakhir bulan tersebut
 * (31 Januari + 1 bulan = 28/29 Februari).
 */
export function tambahBulan(tanggal: Date, n: number): Date {
  const tahun = tanggal.getUTCFullYear();
  const bulan = tanggal.getUTCMonth();
  const hari = tanggal.getUTCDate();
  const hariTerakhir = new Date(Date.UTC(tahun, bulan + n + 1, 0)).getUTCDate();
  return new Date(Date.UTC(tahun, bulan + n, Math.min(hari, hariTerakhir)));
}

/** Bunga per bulan dalam bentuk desimal, mis. 1200 bps -> 0,01. */
export function bungaPerBulan(bungaBps: number): number {
  return bungaBps / 10_000 / 12;
}

/**
 * Angsuran tetap metode anuitas: A = P * i / (1 - (1 + i)^-n).
 * Bila bunga nol, angsuran hanya pokok dibagi tenor.
 */
export function angsuranAnuitas(
  pokok: bigint,
  bungaBps: number,
  tenorBulan: number,
): bigint {
  if (tenorBulan < 1) return pokok;
  const i = bungaPerBulan(bungaBps);
  if (i === 0) return roundToMoney(Number(pokok) / tenorBulan);
  return roundToMoney(
    (Number(pokok) * i) / (1 - Math.pow(1 + i, -tenorBulan)),
  );
}

/**
 * Menyusun jadwal angsuran sesuai jenis bunganya:
 *  - ANNUITY: angsuran tetap, porsi bunga mengecil tiap bulan.
 *  - FLAT: bunga dihitung dari pokok awal, nilainya sama tiap bulan.
 *  - NONE: tanpa bunga, pokok dibagi rata.
 */
export function hitungJadwal({
  pokok,
  bungaBps,
  jenisBunga,
  tenorBulan,
  mulai,
}: ParameterJadwal): BarisJadwal[] {
  const tenor = Math.max(1, Math.trunc(tenorBulan));
  const jadwal: BarisJadwal[] = [];

  const i = jenisBunga === "NONE" ? 0 : bungaPerBulan(bungaBps);
  const angsuranTetap =
    jenisBunga === "ANNUITY"
      ? angsuranAnuitas(pokok, bungaBps, tenor)
      : roundToMoney(Number(pokok) / tenor) +
        (jenisBunga === "FLAT" ? roundToMoney(Number(pokok) * i) : 0n);

  let sisa = pokok;

  for (let ke = 1; ke <= tenor; ke += 1) {
    const terakhir = ke === tenor;

    let bunga: bigint;
    if (jenisBunga === "ANNUITY") {
      bunga = roundToMoney(Number(sisa) * i);
    } else if (jenisBunga === "FLAT") {
      // Bunga flat selalu dihitung dari pokok awal, bukan sisa pokok.
      bunga = roundToMoney(Number(pokok) * i);
    } else {
      bunga = 0n;
    }

    // Angsuran terakhir melunasi seluruh sisa pokok agar tidak ada selisih
    // akibat pembulatan pada angsuran-angsuran sebelumnya.
    const pokokAngsuran = terakhir ? sisa : angsuranTetap - bunga;
    const pokokTerpakai = pokokAngsuran > sisa ? sisa : pokokAngsuran;
    sisa -= pokokTerpakai;

    jadwal.push({
      ke,
      jatuhTempo: tambahBulan(mulai, ke),
      angsuran: pokokTerpakai + bunga,
      pokok: pokokTerpakai,
      bunga,
      sisaPokok: sisa,
    });
  }

  return jadwal;
}

/** Total bunga sepanjang jadwal. */
export function totalBunga(jadwal: readonly BarisJadwal[]): bigint {
  return jadwal.reduce((jumlah, baris) => jumlah + baris.bunga, 0n);
}

/** Total seluruh angsuran (pokok + bunga). */
export function totalAngsuran(jadwal: readonly BarisJadwal[]): bigint {
  return jadwal.reduce((jumlah, baris) => jumlah + baris.angsuran, 0n);
}

/**
 * Membagi satu pembayaran menjadi porsi bunga dan pokok.
 *
 * Bunga yang jatuh tempo dibayar lebih dulu, sisanya mengurangi pokok. Porsi
 * pokok tidak pernah melebihi sisa pokok yang masih terutang.
 */
export function alokasiPembayaran(
  jumlahBayar: bigint,
  bungaJatuhTempo: bigint,
  sisaPokok: bigint,
): { porsiBunga: bigint; porsiPokok: bigint; kelebihan: bigint } {
  const porsiBunga = jumlahBayar < bungaJatuhTempo ? jumlahBayar : bungaJatuhTempo;
  const setelahBunga = jumlahBayar - porsiBunga;
  const porsiPokok = setelahBunga > sisaPokok ? sisaPokok : setelahBunga;
  return {
    porsiBunga,
    porsiPokok,
    kelebihan: setelahBunga - porsiPokok,
  };
}
