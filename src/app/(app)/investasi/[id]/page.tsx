import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AssetFormDialog } from "@/features/investments/components/asset-form-dialog";
import { PriceDialog } from "@/features/investments/components/price-dialog";
import { InvestmentTxDialog } from "@/features/investments/components/investment-tx-dialog";
import {
  hapusAsetAction,
  hapusTransaksiInvestasiAction,
} from "@/features/investments/actions";
import { ambilDetailAset } from "@/features/investments/service";
import { ambilAkunUntukPilihan } from "@/features/accounts/service";
import { wajibMasuk } from "@/lib/session";
import { formatHarga, formatRupiah, formatUnit } from "@/lib/money";
import { INVESTMENT_ACTION_LABEL, INVESTMENT_TYPE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Detail Investasi" };

function formatTanggal(tanggal: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(tanggal);
}

export default async function HalamanDetailInvestasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const pengguna = await wajibMasuk();
  const { id } = await params;

  const detail = await ambilDetailAset(pengguna.id, id);
  if (!detail) notFound();

  const akun = await ambilAkunUntukPilihan(pengguna.id);
  const akunKas = akun.filter((item) => item.type !== "INVESTMENT");
  const { ringkasan, transaksi } = detail;
  const untung = ringkasan.labaBelumTerealisasi >= 0n;

  const hariIni = new Intl.DateTimeFormat("en-CA", {
    timeZone: pengguna.timezone,
    dateStyle: "short",
  }).format(new Date());

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/investasi">
          <ArrowLeft className="size-4" aria-hidden />
          Kembali ke portofolio
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {ringkasan.name}
            </h1>
            {ringkasan.ticker ? (
              <Badge variant="secondary">{ringkasan.ticker}</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">
            {INVESTMENT_TYPE_LABEL[ringkasan.type]} · harga terakhir{" "}
            {formatHarga(ringkasan.lastPrice)}
            {ringkasan.lastPriceUpdatedAt
              ? ` (diperbarui ${formatTanggal(ringkasan.lastPriceUpdatedAt)})`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InvestmentTxDialog
            assetId={ringkasan.id}
            namaAset={ringkasan.name}
            hargaTerakhir={ringkasan.lastPrice}
            unitDimiliki={ringkasan.units}
            tanggalHariIni={hariIni}
            akun={akunKas}
          />
          <PriceDialog
            assetId={ringkasan.id}
            nama={ringkasan.name}
            hargaSekarang={ringkasan.lastPrice}
          />
          <AssetFormDialog
            aset={{
              id: ringkasan.id,
              name: ringkasan.name,
              type: ringkasan.type,
              ticker: ringkasan.ticker,
              lastPrice: ringkasan.lastPrice,
            }}
            pemicu={
              <Button variant="outline" size="sm">
                <Pencil className="size-4" aria-hidden />
                Ubah
              </Button>
            }
          />
          <ConfirmDialog
            aksi={hapusAsetAction}
            data={{ id: ringkasan.id }}
            judul="Hapus aset ini?"
            keterangan={`Seluruh riwayat transaksi ${ringkasan.name} beserta mutasi kasnya ikut dihapus, dan saldo akun kembali menyesuaikan.`}
            pemicu={
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="size-4" aria-hidden />
                Hapus
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="gap-1 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="text-xs sm:text-sm">Unit dimiliki</CardDescription>
            <CardTitle className="text-base tabular-nums sm:text-xl">
              {formatUnit(ringkasan.units)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground px-3 pt-0 text-xs sm:px-6">
            rata-rata {formatHarga(ringkasan.avgCost)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-1 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="text-xs sm:text-sm">Modal</CardDescription>
            <CardTitle className="text-base tabular-nums sm:text-xl">
              {formatRupiah(ringkasan.modal)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="text-xs sm:text-sm">Nilai pasar</CardDescription>
            <CardTitle className="text-base tabular-nums sm:text-xl">
              {formatRupiah(ringkasan.nilaiPasar)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="text-xs sm:text-sm">
              Belum terealisasi
            </CardDescription>
            <CardTitle
              className={cn(
                "text-base tabular-nums sm:text-xl",
                untung ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
              )}
            >
              {untung ? "+" : ""}
              {formatRupiah(ringkasan.labaBelumTerealisasi)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground px-3 pt-0 text-xs sm:px-6">
            {untung ? "+" : ""}
            {ringkasan.persenLaba.toFixed(2).replace(".", ",")}% dari modal
          </CardContent>
        </Card>
      </div>

      {ringkasan.labaTerealisasi !== 0n || ringkasan.dividen !== 0n ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Hasil yang sudah diterima</CardTitle>
            <CardDescription>
              Keuntungan penjualan dan dividen selama memegang aset ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Laba/rugi terealisasi</p>
              <p
                className={cn(
                  "font-semibold tabular-nums",
                  ringkasan.labaTerealisasi < 0n
                    ? "text-destructive"
                    : "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {formatRupiah(ringkasan.labaTerealisasi)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Dividen diterima</p>
              <p className="font-semibold tabular-nums">
                {formatRupiah(ringkasan.dividen)}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat transaksi</CardTitle>
          <CardDescription>
            {transaksi.length} transaksi tercatat. Menghapusnya sekaligus
            menghapus mutasi kas terkait dan menghitung ulang posisi.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {transaksi.length === 0 ? (
            <p className="text-muted-foreground px-6 pb-6 text-sm">
              Belum ada transaksi. Catat pembelian pertama Anda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Unit</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Harga</TableHead>
                    <TableHead className="text-right">Nilai kas</TableHead>
                    <TableHead className="hidden md:table-cell">Akun</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transaksi.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatTanggal(item.date)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={item.action === "SELL" ? "secondary" : "outline"}
                        >
                          {INVESTMENT_ACTION_LABEL[item.action]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {item.action === "DIVIDEND" ? "-" : formatUnit(item.units)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {item.action === "DIVIDEND"
                          ? "-"
                          : formatHarga(item.pricePerUnit)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatRupiah(item.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">
                        {item.akun ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <ConfirmDialog
                          aksi={hapusTransaksiInvestasiAction}
                          data={{ id: item.id }}
                          judul="Hapus transaksi ini?"
                          keterangan="Transaksi investasi dan mutasi kasnya dihapus, lalu unit serta biaya rata-rata dihitung ulang."
                          pemicu={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive size-8"
                              aria-label="Hapus transaksi investasi"
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
