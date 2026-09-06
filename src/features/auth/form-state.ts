/**
 * Bentuk state yang dikembalikan Server Action ke form.
 *
 * Berkas ini sengaja terpisah dari actions.ts karena modul "use server" hanya
 * boleh mengekspor fungsi async, sedangkan STATE_AWAL adalah nilai biasa yang
 * dibutuhkan komponen klien.
 */
export type FormState = {
  pesan?: string;
  /** true bila `pesan` merupakan galat, bukan konfirmasi keberhasilan. */
  gagal?: boolean;
  galatField?: Record<string, string[]>;
  /**
   * Nilai yang tadi diisi pengguna. React mengosongkan input tak terkendali
   * setiap kali Server Action selesai, jadi nilai ini dipakai untuk mengisinya
   * kembali agar pengguna tidak perlu mengetik ulang.
   */
  nilai?: Record<string, string>;
};

export const STATE_AWAL: FormState = {};

/** Mengambil nilai isian sebelumnya untuk sebuah field. */
export function nilaiField(state: FormState, nama: string): string | undefined {
  return state.nilai?.[nama];
}

/** Mengambil pesan galat pertama untuk sebuah field. */
export function galatField(
  state: FormState,
  nama: string,
): string | undefined {
  return state.galatField?.[nama]?.[0];
}

/** Menandai state sebagai galat beserta pesannya. */
export function galat(pesan: string): FormState {
  return { pesan, gagal: true };
}

/** Menandai state sebagai berhasil beserta pesannya. */
export function sukses(pesan: string): FormState {
  return { pesan };
}
