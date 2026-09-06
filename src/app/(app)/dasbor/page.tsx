import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FolderTree, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { wajibMasuk } from "@/lib/session";

export const metadata: Metadata = { title: "Dasbor" };

export default async function HalamanDasbor() {
  const pengguna = await wajibMasuk();

  // Semua query difilter berdasarkan userId pengguna yang sedang masuk.
  const [jumlahAkun, jumlahKategori] = await Promise.all([
    prisma.account.count({ where: { userId: pengguna.id, isArchived: false } }),
    prisma.category.count({ where: { userId: pengguna.id } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Halo, {pengguna.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm">
          Ringkasan keuangan Anda akan tampil di sini.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="size-4" aria-hidden />
              Akun aktif
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{jumlahAkun}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Kas, bank, dan dompet digital yang Anda catat.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FolderTree className="size-4" aria-hidden />
              Kategori
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{jumlahKategori}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Kategori pemasukan dan pengeluaran bawaan.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modul berikutnya</CardTitle>
          <CardDescription>
            Pencatatan transaksi, grafik arus kas, utang, tabungan, investasi,
            dan laporan sedang dibangun bertahap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link href="/profil">
              Atur profil
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
