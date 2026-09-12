import { PrismaClient } from "@prisma/client";

// Next.js melakukan hot-reload di mode dev sehingga instance PrismaClient bisa
// tercipta berulang kali. Simpan satu instance pada globalThis untuk mencegah
// kebocoran koneksi.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pragmaSelesai: Promise<void> | undefined;
};

/**
 * Penyetelan SQLite untuk cakram lambat.
 *
 * Cuan dijalankan sendiri di mesin kecil -- saat ini sebuah laptop 2012 dengan
 * cakram piringan, berbagi dengan layanan lain. Di sana yang menentukan bukan
 * CPU melainkan berapa kali kepala cakram harus berpindah posisi, dan setelan
 * bawaan SQLite justru boros tepat di titik itu:
 *
 * - journal_mode=delete (bawaan) membuat lalu menghapus berkas jurnal pada
 *   SETIAP transaksi tulis, sehingga ada fsync berulang plus pembaruan metadata
 *   direktori. WAL menggantinya dengan penambahan berurutan ke satu berkas dan
 *   -- ini yang terpenting bagi aplikasi yang lebih banyak membaca seperti
 *   dasbor -- pembacaan tidak lagi terhalang penulisan yang sedang berjalan.
 *   Nilainya tersimpan di kepala berkas basis data, jadi sekali diatur tetap
 *   berlaku setelah restart.
 *
 * - synchronous=NORMAL baru masuk akal SETELAH WAL aktif. Pada mode itu,
 *   kegagalan sistem paling buruk kehilangan beberapa transaksi terakhir dan
 *   TIDAK merusak basis data. Dengan FULL, setiap commit menunggu piringan
 *   benar-benar tuntas menulis.
 *
 * - cache_size bawaan hanya 2 MB. Seluruh basis data Cuan kini 0,4 MB, jadi
 *   16 MB membuatnya muat sepenuhnya di memori dan pembacaan berulang tidak
 *   menyentuh cakram sama sekali.
 *
 * Kegagalan di sini sengaja tidak menghentikan aplikasi: penyetelan ini
 * mempercepat, bukan menentukan benar-salahnya data. Tetapi kegagalannya harus
 * BERSUARA -- lihat pemeriksaan hasil di bawah.
 */
async function setelSqlite(klien: PrismaClient): Promise<void> {
  try {
    // journal_mode dijalankan lewat queryRaw, bukan executeRaw: pragma ini
    // membalas satu baris berisi mode yang berlaku, dan executeRaw menolaknya
    // dengan "Execute returned results, which is not allowed in SQLite."
    // Dua pragma sesudahnya tidak membalas apa pun, jadi tetap executeRaw.
    const hasil =
      await klien.$queryRawUnsafe<{ journal_mode: string }[]>(
        "PRAGMA journal_mode = WAL",
      );
    const mode = hasil[0]?.journal_mode?.toLowerCase();
    if (mode !== "wal") {
      // Diam berarti aplikasi berjalan dengan pola tulis yang jauh lebih mahal
      // tanpa ada yang tahu. Lebih baik berisik.
      console.warn(
        `[cuan] journal_mode tetap "${mode ?? "tidak diketahui"}", bukan WAL.` +
          " Basis data mungkin berada di berkas jaringan yang tidak mendukung WAL.",
      );
    }

    await klien.$executeRawUnsafe("PRAGMA synchronous = NORMAL");
    await klien.$executeRawUnsafe("PRAGMA cache_size = -16000");
  } catch (galat) {
    console.warn("[cuan] penyetelan SQLite gagal:", galat);
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

// Dijalankan sekali per proses. Yang disimpan promise-nya, bukan hasilnya,
// supaya hot-reload di mode dev tidak mengulang penyetelan pada instance sama.
globalForPrisma.pragmaSelesai ??= setelSqlite(prisma);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
