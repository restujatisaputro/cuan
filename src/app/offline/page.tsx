import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Sedang luring",
};

/**
 * Halaman cadangan saat jaringan mati dan halaman yang diminta belum pernah
 * tersimpan. Sengaja tanpa data apa pun: menampilkan angka basi pada aplikasi
 * keuangan lebih menyesatkan daripada berterus terang bahwa koneksi putus.
 *
 * Wajib bisa diakses tanpa sesi -- lihat RUTE_PUBLIK di auth.config.ts.
 */
export default function HalamanLuring() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-2xl">
        <WifiOff className="size-6" aria-hidden />
      </span>
      <h1 className="text-xl font-semibold">Tidak ada koneksi</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Halaman ini belum pernah dibuka sehingga tidak tersimpan di perangkat.
        Halaman yang sudah pernah dibuka tetap bisa dilihat saat luring.
      </p>
      <p className="text-muted-foreground max-w-sm text-sm">
        Pencatatan transaksi baru tetap memerlukan koneksi.
      </p>
    </main>
  );
}
