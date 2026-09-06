/**
 * Pembatas laju sederhana berbasis memori (sliding window).
 *
 * Aplikasi ini dijalankan sebagai satu proses (self-hosted, SQLite), sehingga
 * penyimpanan di memori sudah memadai dan tidak perlu Redis. Bila kelak
 * dijalankan multi-instance, ganti implementasi ini dengan penyimpanan bersama.
 */

type Entry = {
  /** Waktu (epoch ms) setiap percobaan yang masih dalam jendela. */
  hits: number[];
  /** Waktu blokir berakhir, bila sedang diblokir. */
  blockedUntil?: number;
};

const store = new Map<string, Entry>();

/** Membersihkan entri kedaluwarsa supaya memori tidak menumpuk. */
function sweep(now: number, windowMs: number): void {
  for (const [key, entry] of store) {
    const masihDiblokir = entry.blockedUntil != null && entry.blockedUntil > now;
    const adaHitAktif = entry.hits.some((hit) => now - hit < windowMs);
    if (!masihDiblokir && !adaHitAktif) store.delete(key);
  }
}

export type RateLimitOptions = {
  /** Pengenal unik, mis. "masuk:127.0.0.1:budi@cuan.id". */
  key: string;
  /** Jumlah percobaan maksimum dalam satu jendela. */
  limit: number;
  /** Panjang jendela dalam milidetik. */
  windowMs: number;
  /** Lama blokir setelah limit terlampaui. Default sama dengan windowMs. */
  blockMs?: number;
};

export type RateLimitResult = {
  ok: boolean;
  /** Sisa percobaan sebelum diblokir. */
  sisa: number;
  /** Detik yang harus ditunggu bila sedang diblokir. */
  tungguDetik: number;
};

/**
 * Mencatat satu percobaan dan mengembalikan apakah percobaan itu diizinkan.
 * Panggil sebelum memproses permintaan.
 */
export function rateLimit({
  key,
  limit,
  windowMs,
  blockMs,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  if (store.size > 5_000) sweep(now, windowMs);

  const entry = store.get(key) ?? { hits: [] };

  if (entry.blockedUntil != null && entry.blockedUntil > now) {
    return {
      ok: false,
      sisa: 0,
      tungguDetik: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  entry.hits = entry.hits.filter((hit) => now - hit < windowMs);
  entry.hits.push(now);

  if (entry.hits.length > limit) {
    entry.blockedUntil = now + (blockMs ?? windowMs);
    store.set(key, entry);
    return {
      ok: false,
      sisa: 0,
      tungguDetik: Math.ceil((blockMs ?? windowMs) / 1000),
    };
  }

  delete entry.blockedUntil;
  store.set(key, entry);
  return { ok: true, sisa: limit - entry.hits.length, tungguDetik: 0 };
}

/** Menghapus catatan percobaan, dipanggil setelah aksi berhasil. */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/** Menyusun pesan kesalahan berbahasa Indonesia untuk pengguna. */
export function pesanRateLimit(tungguDetik: number): string {
  if (tungguDetik >= 60) {
    const menit = Math.ceil(tungguDetik / 60);
    return `Terlalu banyak percobaan. Coba lagi dalam ${menit} menit.`;
  }
  return `Terlalu banyak percobaan. Coba lagi dalam ${tungguDetik} detik.`;
}
