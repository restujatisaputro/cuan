import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HandCoins, TrendingDown, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/form-feedback";
import { DebtFormDialog } from "@/features/debts/components/debt-form-dialog";
import {
  ambilDaftarUtang,
  totalPerArah,
  type RingkasanUtang,
} from "@/features/debts/service";
import { wajibMasuk } from "@/lib/session";
import { formatRupiah } from "@/lib/money";
import { INTEREST_TYPE_LABEL, type DebtDirection } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Utang & Piutang" };

function tanggalHariIni(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, dateStyle: "short" })
    .format(new Date());
}

function formatTanggal(tanggal: Date | null): string {
  if (!tanggal) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(tanggal);
}

export default async function HalamanUtang() {
  const pengguna = await wajibMasuk();
  const daftar = await ambilDaftarUtang(pengguna.id);
  const total = totalPerArah(daftar);
  const hariIni = tanggalHariIni(pengguna.timezone);

  const utang = daftar.filter((item) => item.direction === "PAYABLE");
  const piutang = daftar.filter((item) => item.direction === "RECEIVABLE");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Utang & Piutang</h1>
          <p className="text-muted-foreground text-sm">
            Pantau sisa pokok, jadwal angsuran, dan tanggal jatuh tempo.
          </p>
        </div>
        <DebtFormDialog tanggalHariIni={hariIni} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="gap-1 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs sm:text-sm">
              <TrendingDown className="size-3.5" aria-hidden />
              Sisa utang
            </CardDescription>
            <CardTitle className="text-destructive text-lg tabular-nums sm:text-2xl">
              {formatRupiah(total.utang)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="size-3.5" aria-hidden />
              Sisa piutang
            </CardDescription>
            <CardTitle className="text-lg tabular-nums text-emerald-600 sm:text-2xl dark:text-emerald-400">
              {formatRupiah(total.piutang)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="utang">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="utang" className="flex-1 sm:flex-none">
            Utang ({utang.length})
          </TabsTrigger>
          <TabsTrigger value="piutang" className="flex-1 sm:flex-none">
            Piutang ({piutang.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="utang" className="mt-4">
          <DaftarCatatan daftar={utang} arah="PAYABLE" hariIni={hariIni} />
        </TabsContent>
        <TabsContent value="piutang" className="mt-4">
          <DaftarCatatan daftar={piutang} arah="RECEIVABLE" hariIni={hariIni} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DaftarCatatan({
  daftar,
  arah,
  hariIni,
}: {
  daftar: RingkasanUtang[];
  arah: DebtDirection;
  hariIni: string;
}) {
  if (daftar.length === 0) {
    return (
      <EmptyState
        icon={<HandCoins className="size-8" aria-hidden />}
        judul={arah === "PAYABLE" ? "Belum ada utang" : "Belum ada piutang"}
        keterangan={
          arah === "PAYABLE"
            ? "Catat pinjaman yang Anda terima untuk memantau cicilan dan jatuh temponya."
            : "Catat uang yang Anda pinjamkan agar tidak lupa ditagih."
        }
        aksi={<DebtFormDialog arahAwal={arah} tanggalHariIni={hariIni} />}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {daftar.map((item) => (
        <KartuCatatan key={item.id} item={item} />
      ))}
    </div>
  );
}

function KartuCatatan({ item }: { item: RingkasanUtang }) {
  const jatuhTempoDekat =
    item.status === "AKTIF" && item.sisaHari !== null && item.sisaHari <= 7;

  return (
    <Card>
      <CardHeader className="gap-1 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{item.counterparty}</CardTitle>
            <CardDescription>
              {INTEREST_TYPE_LABEL[item.interestType]}
              {item.interestType !== "NONE"
                ? ` ${(item.interestRateBps / 100).toFixed(2).replace(".", ",")}%`
                : ""}{" "}
              · {item.tenorMonths} bulan
            </CardDescription>
          </div>
          <Badge
            variant={
              item.status === "LUNAS"
                ? "secondary"
                : item.status === "TERLAMBAT"
                  ? "destructive"
                  : "outline"
            }
          >
            {item.status === "LUNAS"
              ? "Lunas"
              : item.status === "TERLAMBAT"
                ? "Terlambat"
                : "Aktif"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-muted-foreground text-xs">Sisa pokok</p>
            <p
              className={cn(
                "text-xl font-semibold tabular-nums",
                item.direction === "PAYABLE"
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {formatRupiah(item.sisaPokok)}
            </p>
          </div>
          <p className="text-muted-foreground text-right text-xs">
            dari {formatRupiah(item.principal)}
          </p>
        </div>

        <Progress value={Math.min(item.persenLunas, 100)} className="h-2" />

        <div className="text-muted-foreground flex flex-wrap justify-between gap-2 text-xs">
          <span>
            {item.persenLunas.toFixed(0)}% lunas · {item.jumlahPembayaran} pembayaran
          </span>
          <span className={cn(jatuhTempoDekat && "text-destructive font-medium")}>
            Jatuh tempo {formatTanggal(item.dueDate)}
          </span>
        </div>

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={`/utang/${item.id}`}>
            Lihat jadwal & pembayaran
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
