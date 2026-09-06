import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/form-feedback";
import { AssetFormDialog } from "@/features/investments/components/asset-form-dialog";
import { PriceDialog } from "@/features/investments/components/price-dialog";
import { InvestmentTxDialog } from "@/features/investments/components/investment-tx-dialog";
import {
  ambilDaftarAset,
  ringkasanPortofolio,
  type RingkasanAset,
} from "@/features/investments/service";
import { ambilAkunUntukPilihan } from "@/features/accounts/service";
import { wajibMasuk } from "@/lib/session";
import { formatHarga, formatRupiah, formatUnit } from "@/lib/money";
import { INVESTMENT_TYPE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Investasi" };

export default async function HalamanInvestasi() {
  const pengguna = await wajibMasuk();
  const [daftar, akun] = await Promise.all([
    ambilDaftarAset(pengguna.id),
    ambilAkunUntukPilihan(pengguna.id),
  ]);

  // Portofolio hanya penampung; dana selalu berasal dari akun kas.
  const akunKas = akun.filter((item) => item.type !== "INVESTMENT");
  const total = ringkasanPortofolio(daftar);
  const hariIni = new Intl.DateTimeFormat("en-CA", {
    timeZone: pengguna.timezone,
    dateStyle: "short",
  }).format(new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Investasi</h1>
          <p className="text-muted-foreground text-sm">
            Nilai portofolio dihitung dari harga terakhir yang Anda masukkan.
          </p>
        </div>
        <AssetFormDialog />
      </div>

      {daftar.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="size-8" aria-hidden />}
          judul="Belum ada aset investasi"
          keterangan="Tambahkan saham, reksa dana, emas, atau aset lain untuk memantau modal dan nilai pasarnya."
          aksi={<AssetFormDialog />}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KartuAngka judul="Modal" nilai={formatRupiah(total.modal)} />
            <KartuAngka judul="Nilai pasar" nilai={formatRupiah(total.nilaiPasar)} />
            <KartuAngka
              judul="Belum terealisasi"
              nilai={formatRupiah(total.laba)}
              warna={
                total.laba < 0n
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400"
              }
              keterangan={`${total.laba >= 0n ? "+" : ""}${total.persenLaba.toFixed(2).replace(".", ",")}%`}
            />
            <KartuAngka
              judul="Terealisasi + dividen"
              nilai={formatRupiah(total.labaTerealisasi + total.dividen)}
              keterangan={`dividen ${formatRupiah(total.dividen)}`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {daftar.map((aset) => (
              <KartuAset key={aset.id} aset={aset} akun={akunKas} hariIni={hariIni} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function KartuAngka({
  judul,
  nilai,
  warna,
  keterangan,
}: {
  judul: string;
  nilai: string;
  warna?: string;
  keterangan?: string;
}) {
  return (
    <Card>
      <CardHeader className="gap-1 p-3 sm:p-6 sm:pb-2">
        <CardDescription className="text-xs sm:text-sm">{judul}</CardDescription>
        <CardTitle className={cn("text-base tabular-nums sm:text-xl", warna)}>
          {nilai}
        </CardTitle>
      </CardHeader>
      {keterangan ? (
        <CardContent className="text-muted-foreground px-3 pt-0 text-xs sm:px-6">
          {keterangan}
        </CardContent>
      ) : null}
    </Card>
  );
}

function KartuAset({
  aset,
  akun,
  hariIni,
}: {
  aset: RingkasanAset;
  akun: ReadonlyArray<{ id: string; name: string }>;
  hariIni: string;
}) {
  const untung = aset.labaBelumTerealisasi >= 0n;

  return (
    <Card>
      <CardHeader className="gap-1 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">
              {aset.name}
              {aset.ticker ? (
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  {aset.ticker}
                </span>
              ) : null}
            </CardTitle>
            <CardDescription>{INVESTMENT_TYPE_LABEL[aset.type]}</CardDescription>
          </div>
          <Badge variant={untung ? "outline" : "destructive"}>
            {untung ? "+" : ""}
            {aset.persenLaba.toFixed(2).replace(".", ",")}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-muted-foreground text-xs">Nilai pasar</p>
            <p className="text-xl font-semibold tabular-nums">
              {formatRupiah(aset.nilaiPasar)}
            </p>
          </div>
          <p
            className={cn(
              "text-right text-sm font-medium tabular-nums",
              untung
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive",
            )}
          >
            {untung ? "+" : ""}
            {formatRupiah(aset.labaBelumTerealisasi)}
          </p>
        </div>

        <dl className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex justify-between">
            <dt>Unit</dt>
            <dd className="tabular-nums">{formatUnit(aset.units)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Modal</dt>
            <dd className="tabular-nums">{formatRupiah(aset.modal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Rata-rata</dt>
            <dd className="tabular-nums">{formatHarga(aset.avgCost)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Harga kini</dt>
            <dd className="tabular-nums">{formatHarga(aset.lastPrice)}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <InvestmentTxDialog
            assetId={aset.id}
            namaAset={aset.name}
            hargaTerakhir={aset.lastPrice}
            unitDimiliki={aset.units}
            tanggalHariIni={hariIni}
            akun={akun}
          />
          <PriceDialog
            assetId={aset.id}
            nama={aset.name}
            hargaSekarang={aset.lastPrice}
          />
          <Button asChild variant="ghost" size="sm">
            <Link href={`/investasi/${aset.id}`}>
              Detail
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
