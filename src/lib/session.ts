import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/constants";

export type PenggunaSesi = {
  id: string;
  name: string;
  email: string;
  role: Role;
  currency: string;
  timezone: string;
};

/**
 * Data pengguna yang sedang masuk, dibaca segar dari basis data.
 *
 * Token JWT hanya menyimpan id dan peran. Nama, mata uang, zona waktu, serta
 * status aktif selalu diambil dari basis data supaya perubahan profil maupun
 * penonaktifan oleh admin langsung berlaku tanpa perlu login ulang.
 * `cache` membuat query ini hanya berjalan sekali per permintaan.
 */
export const getPenggunaSesi = cache(async (): Promise<PenggunaSesi | null> => {
  const sesi = await auth();
  if (!sesi?.user?.id) return null;

  const pengguna = await prisma.user.findUnique({
    where: { id: sesi.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      currency: true,
      timezone: true,
      isActive: true,
    },
  });

  if (!pengguna || !pengguna.isActive) return null;

  return {
    id: pengguna.id,
    name: pengguna.name,
    email: pengguna.email,
    role: pengguna.role as Role,
    currency: pengguna.currency,
    timezone: pengguna.timezone,
  };
});

/**
 * Memastikan ada pengguna yang masuk. Dipakai di setiap halaman terproteksi,
 * Server Action, dan Route Handler.
 */
export async function wajibMasuk(): Promise<PenggunaSesi> {
  const pengguna = await getPenggunaSesi();
  if (!pengguna) {
    // Token masih ada tetapi akunnya nonaktif/terhapus: paksa keluar supaya
    // cookie lama tidak membuat pengguna terjebak pada pengalihan berulang.
    redirect("/api/keluar?alasan=sesi-berakhir");
  }
  return pengguna;
}

/** Memastikan pengguna yang masuk berperan ADMIN. */
export async function wajibAdmin(): Promise<PenggunaSesi> {
  const pengguna = await wajibMasuk();
  if (pengguna.role !== "ADMIN") {
    redirect("/dasbor");
  }
  return pengguna;
}

/** Versi non-redirect untuk Server Action yang ingin mengembalikan pesan galat. */
export async function ambilPenggunaAtauGagal(): Promise<PenggunaSesi | null> {
  return getPenggunaSesi();
}
