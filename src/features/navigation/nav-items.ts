import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  FolderTree,
  HandCoins,
  LayoutDashboard,
  PiggyBank,
  ShieldCheck,
  Target,
  UserRound,
  Wallet,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hanya tampil untuk pengguna ADMIN. */
  adminOnly?: boolean;
  /**
   * Tampil langsung pada navigasi bawah versi ponsel. Menu selebihnya
   * dijangkau lewat tombol "Lainnya" agar bilah bawah tidak sesak.
   */
  utama?: boolean;
};

/**
 * Daftar menu aplikasi. Menu ditambahkan seiring modul selesai dibangun supaya
 * tidak ada tautan yang menuju halaman kosong.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dasbor", label: "Dasbor", icon: LayoutDashboard, utama: true },
  { href: "/transaksi", label: "Transaksi", icon: ArrowLeftRight, utama: true },
  { href: "/anggaran", label: "Anggaran", icon: PiggyBank, utama: true },
  { href: "/utang", label: "Utang", icon: HandCoins, utama: true },
  { href: "/tabungan", label: "Tabungan", icon: Target },
  { href: "/akun", label: "Akun", icon: Wallet },
  { href: "/kategori", label: "Kategori", icon: FolderTree },
  { href: "/profil", label: "Profil", icon: UserRound },
  {
    href: "/admin/pengguna",
    label: "Pengguna",
    icon: ShieldCheck,
    adminOnly: true,
  },
];
