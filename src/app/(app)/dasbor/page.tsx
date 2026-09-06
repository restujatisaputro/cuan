import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeftRight,
  PiggyBank,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/form-feedback";
import { PeriodPicker } from "@/features/dashboard/components/period-picker";
import { CashflowChart } from "@/features/dashboard/components/cashflow-chart";
import { ExpenseDonut } from "@/features/dashboard/components/expense-donut";
import { BudgetProgressRow } from "@/features/budgets/components/budget-progress";
import {
  arusKasBulanan,
  geserPeriode,
  komposisiPengeluaran,
  labelPeriode,
  periodeSekarang,
  rentangBulan,
  ringkasanPeriode,
  transaksiTerbaru,
} from "@/features/dashboard/service";
import { progresAnggaran } from "@/features/budgets/service";
import { ambilAkunDenganSaldo } from "@/features/accounts/service";
import { periodeSchema } from "@/features/budgets/schema";
import { wajibMasuk } from "@/lib/session";
import { formatRupiah, sumMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dasbor" };

function formatTanggalPendek(tanggal: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(tanggal);
}

export default async function HalamanDasbor({
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

  const [akun, ringkasan, arusKas, komposisi, anggaran, terbaru] =
    await Promise.all([
      ambilAkunDenganSaldo(pengguna.id),
      ringkasanPeriode(pengguna.id, rentang),
      arusKasBulanan(pengguna.id, periode, 6),
      komposisiPengeluaran(pengguna.id, rentang),
      progresAnggaran(pengguna.id, periode),
      transaksiTerbaru(pengguna.id, 6),
    ]);

  // Portofolio investasi tidak masuk saldo kas; nilainya dihitung modul investasi.
  const saldoKas = sumMoney(
    akun.filter((item) => item.type !== "INVESTMENT").map((item) => item.saldo),
  );

  const pilihanPeriode = Array.from({ length: 13 }, (_, index) => {
    const nilai = geserPeriode(periodeKini, 1 - index);
    return { nilai, label: labelPeriode(nilai, true) };
  });

  const belumAdaData = ringkasan.jumlahTransaksi === 0 && terbaru.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Halo, {pengguna.name.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground text-sm">
            Ringkasan keuangan {labelPeriode(periode, true)}.
          </p>
        </div>
        <PeriodPicker
          periode={periode}
          pilihan={pilihanPeriode}
          periodeMaksimal={geserPeriode(periodeKini, 1)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KartuAngka
          judul="Saldo kas"
          nilai={saldoKas}
          icon={Wallet}
          keterangan={`${akun.length} akun aktif`}
        />
        <KartuAngka
          judul="Pemasukan"
          nilai={ringkasan.pemasukan}
          icon={TrendingUp}
          warna="text-emerald-600 dark:text-emerald-400"
        />
        <KartuAngka
          judul="Pengeluaran"
          nilai={ringkasan.pengeluaran}
          icon={TrendingDown}
          warna="text-destructive"
        />
        <KartuAngka
          judul="Selisih"
          nilai={ringkasan.selisih}
          icon={ArrowLeftRight}
          warna={
            ringkasan.selisih < 0n
              ? "text-destructive"
              : "text-emerald-600 dark:text-emerald-400"
          }
          keterangan={`${ringkasan.jumlahTransaksi} transaksi`}
        />
      </div>

      {belumAdaData ? (
        <EmptyState
          icon={<Receipt className="size-8" aria-hidden />}
          judul="Belum ada transaksi"
          keterangan="Catat transaksi pertama Anda, lalu grafik dan ringkasan di halaman ini akan terisi otomatis."
          aksi={
            <Button asChild size="sm">
              <Link href="/transaksi">Catat transaksi</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Arus kas 6 bulan terakhir</CardTitle>
              <CardDescription>
                Perbandingan pemasukan dan pengeluaran per bulan. Transfer antar
                akun tidak ikut dihitung.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CashflowChart data={arusKas} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Komposisi pengeluaran</CardTitle>
                <CardDescription>
                  {labelPeriode(periode, true)} · sub-kategori digabung ke induknya
                </CardDescription>
              </CardHeader>
              <CardContent>
                {komposisi.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    Belum ada pengeluaran pada periode ini.
                  </p>
                ) : (
                  <ExpenseDonut irisan={komposisi} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-base">Anggaran</CardTitle>
                  <CardDescription>{labelPeriode(periode, true)}</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/anggaran?periode=${periode}`}>
                    Kelola
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-5">
                {anggaran.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <PiggyBank className="text-muted-foreground size-8" aria-hidden />
                    <p className="text-muted-foreground text-sm">
                      Belum ada anggaran untuk periode ini.
                    </p>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/anggaran?periode=${periode}`}>
                        Atur anggaran
                      </Link>
                    </Button>
                  </div>
                ) : (
                  anggaran
                    .slice(0, 4)
                    .map((item) => <BudgetProgressRow key={item.id} item={item} />)
                )}
                {anggaran.length > 4 ? (
                  <p className="text-muted-foreground text-xs">
                    dan {anggaran.length - 4} kategori lain
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">Transaksi terbaru</CardTitle>
                <CardDescription>Enam catatan terakhir Anda</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/transaksi">
                  Lihat semua
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y border-t">
                {terbaru.map((item) => {
                  const tanda =
                    item.tipe === "INCOME" ? "+" : item.tipe === "EXPENSE" ? "-" : "";
                  const warna =
                    item.tipe === "INCOME"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : item.tipe === "EXPENSE"
                        ? "text-destructive"
                        : "text-sky-600 dark:text-sky-400";
                  const keterangan =
                    item.tipe === "TRANSFER"
                      ? `${item.akun} → ${item.akunTujuan ?? "?"}`
                      : `${item.kategori ?? "Tanpa kategori"} · ${item.akun}`;

                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              item.tipe === "TRANSFER"
                                ? "#0ea5e9"
                                : (item.warna ?? "#64748b"),
                          }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.catatan ||
                              (item.tipe === "TRANSFER" ? "Transfer" : keterangan)}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">
                            {formatTanggalPendek(item.tanggal)} · {keterangan}
                          </p>
                        </div>
                      </div>
                      <p className={cn("shrink-0 text-sm font-semibold tabular-nums", warna)}>
                        {tanda}
                        {formatRupiah(item.jumlah)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KartuAngka({
  judul,
  nilai,
  icon: Icon,
  warna,
  keterangan,
}: {
  judul: string;
  nilai: bigint;
  icon: typeof Wallet;
  warna?: string;
  keterangan?: string;
}) {
  return (
    <Card>
      <CardHeader className="gap-1 p-3 sm:p-6 sm:pb-2">
        <CardDescription className="flex items-center gap-1.5 text-xs sm:text-sm">
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {judul}
        </CardDescription>
        <CardTitle
          className={cn("text-lg tabular-nums sm:text-2xl", warna)}
          title={formatRupiah(nilai)}
        >
          {formatRupiah(nilai)}
        </CardTitle>
      </CardHeader>
      {keterangan ? (
        <CardContent className="text-muted-foreground hidden px-3 pt-0 text-xs sm:block sm:px-6">
          {keterangan}
        </CardContent>
      ) : null}
    </Card>
  );
}
