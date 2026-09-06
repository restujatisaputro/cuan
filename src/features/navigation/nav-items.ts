import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  FolderTree,
  LayoutDashboard,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hanya tampil untuk pengguna ADMIN. */
  adminOnly?: boolean;
  /** Ikut tampil pada navigasi bawah versi ponsel (maksimal empat). */
  utama?: boolean;
};

/**
 * Daftar menu aplikasi. Menu ditambahkan seiring modul selesai dibangun supaya
 * tidak ada tautan yang menuju halaman kosong.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dasbor", label: "Dasbor", icon: LayoutDashboard, utama: true },
  { href: "/transaksi", label: "Transaksi", icon: ArrowLeftRight, utama: true },
  { href: "/akun", label: "Akun", icon: Wallet, utama: true },
  { href: "/kategori", label: "Kategori", icon: FolderTree, utama: true },
  { href: "/profil", label: "Profil", icon: UserRound },
  {
    href: "/admin/pengguna",
    label: "Pengguna",
    icon: ShieldCheck,
    adminOnly: true,
  },
];
