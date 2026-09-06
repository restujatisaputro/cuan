import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, ShieldCheck, UserRound } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hanya tampil untuk pengguna ADMIN. */
  adminOnly?: boolean;
  /** Tampil pada navigasi bawah versi ponsel. */
  utama?: boolean;
};

/**
 * Daftar menu aplikasi. Menu ditambahkan seiring modul selesai dibangun supaya
 * tidak ada tautan yang menuju halaman kosong.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dasbor", label: "Dasbor", icon: LayoutDashboard, utama: true },
  { href: "/profil", label: "Profil", icon: UserRound, utama: true },
  {
    href: "/admin/pengguna",
    label: "Pengguna",
    icon: ShieldCheck,
    adminOnly: true,
    utama: true,
  },
];
