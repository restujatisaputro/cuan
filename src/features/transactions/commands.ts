import "server-only";
import { prisma } from "@/lib/prisma";
import type { TransactionInput } from "@/features/transactions/schema";

/**
 * Sisi tulis modul transaksi, bebas dari urusan web.
 *
 * Berkas ini tidak mengenal FormData, FormState, revalidatePath, maupun
 * Response. Alasannya: aturan yang sama harus dipakai dua pemanggil sekaligus
 * -- Server Action untuk antarmuka web, dan Route Handler /api/v1 untuk klien
 * Android. Bila aturan ikut tinggal di salah satu pemanggil, pemanggil yang
 * lain harus menyalinnya, dan setiap salinan adalah tempat baru bagi saldo
 * yang tidak cocok.
 *
 * Kegagalan dikembalikan sebagai nilai, bukan dilempar sebagai exception,
 * supaya setiap pemanggil bebas menerjemahkannya: web jadi pesan di form,
 * REST jadi kode status HTTP.
 */

/** Sebab kegagalan yang bisa dibedakan pemanggil. */
export type KodeGalat =
  /** Referensi (akun, kategori, transaksi) tidak ada atau bukan milik pengguna. */
  | "TIDAK_DITEMUKAN"
  /** Isian tidak lolos aturan yang bergantung pada isi basis data. */
  | "VALIDASI"
  /** Baris dimiliki modul utang/tabungan/investasi, tidak boleh disunting di sini. */
  | "TERKAIT_MODUL_LAIN";

export type HasilPerintah<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      kode: KodeGalat;
      pesan: string;
      /** Diisi bila galatnya menempel pada field tertentu. */
      galatField?: Record<string, string[]>;
    };

function gagal(
  kode: KodeGalat,
  pesan: string,
  galatField?: Record<string, string[]>,
): HasilPerintah<never> {
  return { ok: false, kode, pesan, galatField };
}

/** Kolom yang cukup untuk tahu sebuah transaksi dimiliki modul lain. */
const PEMILIK_MODUL = {
  id: true,
  debtPayment: { select: { id: true } },
  savingsContribution: { select: { id: true } },
  investmentTx: { select: { id: true } },
} as const;

export type TransaksiTersimpan = { id: string; dibuat: boolean };

/**
 * Mencatat transaksi baru, atau memperbarui yang sudah ada bila `idLama` diisi.
 *
 * Semua referensi diverifikasi kepemilikannya lebih dulu: tanpa itu, id akun
 * atau kategori milik pengguna lain yang dikirim langsung ke endpoint akan
 * diterima begitu saja.
 */
export async function simpanTransaksi(
  userId: string,
  masukan: TransactionInput,
  idLama: string | null = null,
): Promise<HasilPerintah<TransaksiTersimpan>> {
  // Transfer tidak berkategori; pemasukan/pengeluaran tidak punya akun tujuan.
  const toAccountId = masukan.type === "TRANSFER" ? masukan.toAccountId : null;
  const categoryId = masukan.type === "TRANSFER" ? null : masukan.categoryId;

  const idAkun = [masukan.accountId, toAccountId].filter(
    (nilai): nilai is string => Boolean(nilai),
  );
  const akunValid = await prisma.account.count({
    where: { id: { in: idAkun }, userId },
  });
  if (akunValid !== idAkun.length) {
    return gagal("TIDAK_DITEMUKAN", "Akun tidak ditemukan.");
  }

  if (categoryId) {
    const kategori = await prisma.category.findFirst({
      where: { id: categoryId, userId },
      select: { kind: true },
    });
    if (!kategori) {
      return gagal("TIDAK_DITEMUKAN", "Kategori tidak ditemukan.");
    }
    if (kategori.kind !== masukan.type) {
      const pesan =
        masukan.type === "INCOME"
          ? "Pilih kategori pemasukan"
          : "Pilih kategori pengeluaran";
      return gagal("VALIDASI", pesan, { categoryId: [pesan] });
    }
  }

  const isi = {
    date: masukan.date,
    type: masukan.type,
    amount: masukan.amount,
    accountId: masukan.accountId,
    toAccountId,
    categoryId,
    note: masukan.note || null,
    tags: masukan.tags || null,
  };

  if (idLama) {
    const lama = await prisma.transaction.findFirst({
      where: { id: idLama, userId },
      select: PEMILIK_MODUL,
    });
    if (!lama) {
      return gagal("TIDAK_DITEMUKAN", "Transaksi tidak ditemukan.");
    }
    if (lama.debtPayment || lama.savingsContribution || lama.investmentTx) {
      return gagal(
        "TERKAIT_MODUL_LAIN",
        "Transaksi ini dibuat oleh modul lain (utang, tabungan, atau investasi). Ubah dari modul tersebut.",
      );
    }

    await prisma.transaction.update({ where: { id: idLama }, data: isi });
    return { ok: true, data: { id: idLama, dibuat: false } };
  }

  const baru = await prisma.transaction.create({
    data: { ...isi, userId },
    select: { id: true },
  });
  return { ok: true, data: { id: baru.id, dibuat: true } };
}

/**
 * Menghapus transaksi milik pengguna.
 *
 * Baris yang dibuat modul lain ditolak: menghapusnya di sini akan meninggalkan
 * angsuran, setoran, atau transaksi investasi yang menunjuk ke baris hantu.
 */
export async function hapusTransaksi(
  userId: string,
  id: string,
): Promise<HasilPerintah<{ id: string }>> {
  const transaksi = await prisma.transaction.findFirst({
    where: { id, userId },
    select: PEMILIK_MODUL,
  });
  if (!transaksi) {
    return gagal("TIDAK_DITEMUKAN", "Transaksi tidak ditemukan.");
  }
  if (
    transaksi.debtPayment ||
    transaksi.savingsContribution ||
    transaksi.investmentTx
  ) {
    return gagal(
      "TERKAIT_MODUL_LAIN",
      "Transaksi ini terkait modul lain. Hapus dari modul utang, tabungan, atau investasi.",
    );
  }

  await prisma.transaction.delete({ where: { id: transaksi.id } });
  return { ok: true, data: { id: transaksi.id } };
}
