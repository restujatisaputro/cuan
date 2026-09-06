import type { Metadata } from "next";
import { Download, Scale, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PeriodPicker } from "@/features/dashboard/components/period-picker";
import {
  laporanArusKas,
  laporanKekayaanBersih,
  laporanLabaRugi,
  type BarisKategori,
} from "@/features/reports/service";
import { periodeSchema } from "@/features/budgets/schema";
import { wajibMasuk } from "@/lib/session";
import {
  geserPeriode,
  labelPeriode,
  periodeSekarang,
  rentangBulan,
} from "@/lib/periode";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Laporan" };

function tanggalIso(tanggal: Date): string {
  return tanggal.toISOString().slice(0, 10);
}

export default async function HalamanLaporan({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const pengguna = await wajibMasuk();
  const params = await searchParams;

  const periodeKini = periodeSekarang(pengguna.timezone);
  const hasilPeriode = periodeSchema.safeParse(params.periode);
  const periode = hasilPeriode.success ? hasilPeriode.data : periodeKini;
  const rentang = rentangBulan(periode);

  const [arusKas, labaRugi, kekayaan] = await Promise.all([
    laporanArusKas(pengguna.id, rentang),
    laporanLabaRugi(pengguna.id, rentang),
    laporanKekayaanBersih(pengguna.id),
  ]);

  const pilihanPeriode = Array.from({ length: 13 }, (_, index) => {
    const nilai = geserPeriode(periodeKini, 1 - index);
    return { nilai, label: labelPeriode(nilai, true) };
  });

  const tautanEkspor = `/api/ekspor/transaksi?dari=${tanggalIso(rentang.awal)}&sampai=${tanggalIso(rentang.akhir)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Laporan</h1>
          <p className="text-muted-foreground text-sm">
            Arus kas, laba rugi, dan kekayaan bersih untuk{" "}
            {labelPeriode(periode, true)}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker
            periode={periode}
            pilihan={pilihanPeriode}
            periodeMaksimal={geserPeriode(periodeKini, 1)}
          />
          <Button asChild variant="outline" size="sm">
            {/* Unduhan langsung dari Route Handler, tanpa JavaScript tambahan. */}
            <a href={tautanEkspor} download>
              <Download className="size-4" aria-hidden />
              Ekspor CSV
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="size-4" aria-hidden />
            Kekayaan bersih
          </CardTitle>
          <CardDescription>
            Posisi terkini, bukan angka periode. Saldo portofolio dikecualikan
            karena investasi sudah dihitung dari nilai pasarnya.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p
            className={cn(
              "text-3xl font-semibold tabular-nums",
              kekayaan.total < 0n && "text-destructive",
            )}
          >
            {formatRupiah(kekayaan.total)}
          </p>

          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <BarisNilai label="Saldo kas" nilai={kekayaan.saldoKas} />
            <BarisNilai label="Nilai investasi" nilai={kekayaan.nilaiInvestasi} />
            <BarisNilai label="Piutang" nilai={kekayaan.piutang} />
            <BarisNilai label="Utang" nilai={-kekayaan.utang} negatifMerah />
          </dl>

          <details className="text-sm">
            <summary className="text-muted-foreground cursor-pointer">
              Rincian saldo per akun
            </summary>
            <dl className="mt-2 space-y-1">
              {kekayaan.rincianAkun.map((akun) => (
                <div key={akun.nama} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{akun.nama}</dt>
                  <dd className="tabular-nums">{formatRupiah(akun.saldo)}</dd>
                </div>
              ))}
            </dl>
          </details>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="size-4" aria-hidden />
              Arus kas
            </CardTitle>
            <CardDescription>
              Uang masuk dan keluar sepanjang {labelPeriode(periode, true)}.
              Transfer antar akun sendiri ({formatRupiah(arusKas.transfer)}) tidak
              ikut dihitung.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <dl className="space-y-2 text-sm">
              <BarisNilai label="Pemasukan" nilai={arusKas.pemasukan} />
              <BarisNilai label="Pengeluaran" nilai={-arusKas.pengeluaran} negatifMerah />
              <div className="flex justify-between gap-4 border-t pt-2 font-medium">
                <dt>Selisih</dt>
                <dd
                  className={cn(
                    "tabular-nums",
                    arusKas.selisih < 0n
                      ? "text-destructive"
                      : "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {formatRupiah(arusKas.selisih)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4" aria-hidden />
              Laba rugi sederhana
            </CardTitle>
            <CardDescription>
              Berbasis kas, dengan koreksi: pelunasan pokok bukan beban, dan
              pokok piutang yang kembali bukan penghasilan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <BarisNilai label="Pemasukan kas" nilai={labaRugi.pemasukanKas} />
              {labaRugi.pokokPiutangDiterima > 0n ? (
                <BarisNilai
                  label="− pokok piutang kembali"
                  nilai={-labaRugi.pokokPiutangDiterima}
                  samar
                />
              ) : null}
              <BarisNilai label="Penghasilan" nilai={labaRugi.penghasilan} tebal />

              <BarisNilai
                label="Pengeluaran kas"
                nilai={-labaRugi.pengeluaranKas}
                negatifMerah
              />
              {labaRugi.pokokCicilanDibayar > 0n ? (
                <BarisNilai
                  label="+ pokok cicilan dibayar"
                  nilai={labaRugi.pokokCicilanDibayar}
                  samar
                />
              ) : null}
              <BarisNilai label="Beban" nilai={-labaRugi.beban} tebal negatifMerah />

              <div className="flex justify-between gap-4 border-t pt-2 font-semibold">
                <dt>Laba bersih</dt>
                <dd
                  className={cn(
                    "tabular-nums",
                    labaRugi.laba < 0n
                      ? "text-destructive"
                      : "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {formatRupiah(labaRugi.laba)}
                </dd>
              </div>
            </dl>

            {labaRugi.bungaDibayar > 0n ? (
              <p className="text-muted-foreground mt-3 text-xs">
                Termasuk beban bunga {formatRupiah(labaRugi.bungaDibayar)} pada
                periode ini.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TabelKategori
          judul="Pengeluaran per kategori"
          icon={<TrendingDown className="size-4" aria-hidden />}
          baris={arusKas.kategoriPengeluaran}
          total={arusKas.pengeluaran}
        />
        <TabelKategori
          judul="Pemasukan per kategori"
          icon={<TrendingUp className="size-4" aria-hidden />}
          baris={arusKas.kategoriPemasukan}
          total={arusKas.pemasukan}
        />
      </div>
    </div>
  );
}

function BarisNilai({
  label,
  nilai,
  negatifMerah,
  tebal,
  samar,
}: {
  label: string;
  nilai: bigint;
  negatifMerah?: boolean;
  tebal?: boolean;
  samar?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-between gap-4",
        tebal && "font-medium",
        samar && "text-muted-foreground text-xs",
      )}
    >
      <dt className={cn(!samar && "text-muted-foreground")}>{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          negatifMerah && nilai < 0n && "text-destructive",
        )}
      >
        {formatRupiah(nilai)}
      </dd>
    </div>
  );
}

function TabelKategori({
  judul,
  icon,
  baris,
  total,
}: {
  judul: string;
  icon: React.ReactNode;
  baris: BarisKategori[];
  total: bigint;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {judul}
        </CardTitle>
        <CardDescription>Total {formatRupiah(total)}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {baris.length === 0 ? (
          <p className="text-muted-foreground px-6 pb-6 text-sm">
            Belum ada data pada periode ini.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="w-20 text-right">Porsi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baris.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.warna }}
                        aria-hidden
                      />
                      <span className="truncate">{item.nama}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatRupiah(item.jumlah)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {item.persen.toFixed(1).replace(".", ",")}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
