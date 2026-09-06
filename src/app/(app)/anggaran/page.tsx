import type { Metadata } from "next";
import { PiggyBank, Trash2, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/form-feedback";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BudgetFormDialog } from "@/features/budgets/components/budget-form-dialog";
import { BudgetProgressRow } from "@/features/budgets/components/budget-progress";
import { hapusAnggaranAction } from "@/features/budgets/actions";
import { CopyBudgetButton } from "@/features/budgets/components/copy-budget-button";
import { progresAnggaran, totalAnggaran } from "@/features/budgets/service";
import { PeriodPicker } from "@/features/dashboard/components/period-picker";
import {
  geserPeriode,
  labelPeriode,
  periodeSekarang,
} from "@/features/dashboard/service";
import { ambilKategoriUntukPilihan } from "@/features/categories/service";
import { periodeSchema } from "@/features/budgets/schema";
import { wajibMasuk } from "@/lib/session";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Anggaran" };

export default async function HalamanAnggaran({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const pengguna = await wajibMasuk();
  const params = await searchParams;

  const periodeKini = periodeSekarang(pengguna.timezone);
  const hasilPeriode = periodeSchema.safeParse(params.periode);
  const periode = hasilPeriode.success ? hasilPeriode.data : periodeKini;

  const [daftar, kategori] = await Promise.all([
    progresAnggaran(pengguna.id, periode),
    ambilKategoriUntukPilihan(pengguna.id),
  ]);

  const kategoriPengeluaran = kategori
    .filter((item) => item.kind === "EXPENSE")
    .map((item) => ({ id: item.id, label: item.label }));

  const total = totalAnggaran(daftar);
  const pilihanPeriode = Array.from({ length: 13 }, (_, index) => {
    const nilai = geserPeriode(periodeKini, 1 - index);
    return { nilai, label: labelPeriode(nilai, true) };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Anggaran</h1>
          <p className="text-muted-foreground text-sm">
            Batas pengeluaran per kategori untuk {labelPeriode(periode, true)}.
          </p>
        </div>
        <PeriodPicker
          periode={periode}
          pilihan={pilihanPeriode}
          periodeMaksimal={geserPeriode(periodeKini, 1)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <BudgetFormDialog
          periode={periode}
          labelPeriode={labelPeriode(periode, true)}
          kategori={kategoriPengeluaran}
        />
        <CopyBudgetButton periode={periode} />
      </div>

      {daftar.length === 0 ? (
        <EmptyState
          icon={<PiggyBank className="size-8" aria-hidden />}
          judul="Belum ada anggaran"
          keterangan={`Tetapkan batas pengeluaran per kategori untuk ${labelPeriode(periode, true)}, atau salin anggaran bulan sebelumnya.`}
          aksi={
            <BudgetFormDialog
              periode={periode}
              labelPeriode={labelPeriode(periode, true)}
              kategori={kategoriPengeluaran}
            />
          }
        />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Wallet className="size-4" aria-hidden />
                Total anggaran {labelPeriode(periode, true)}
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatRupiah(total.terpakai)}
                <span className="text-muted-foreground text-base font-normal">
                  {" "}
                  / {formatRupiah(total.anggaran)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress
                value={Math.min(total.persen, 100)}
                className={cn("h-2", total.terpakai > total.anggaran && "[&>div]:bg-destructive")}
                aria-label="Total pemakaian anggaran"
              />
              <p className="text-muted-foreground text-xs">
                {total.persen.toFixed(0)}% terpakai dari {daftar.length} kategori
                yang dianggarkan.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rincian per kategori</CardTitle>
              <CardDescription>
                Diurutkan dari yang pemakaiannya paling tinggi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {daftar.map((item) => (
                <BudgetProgressRow
                  key={item.id}
                  item={item}
                  aksi={
                    <span className="flex items-center">
                      <BudgetFormDialog
                        periode={periode}
                        labelPeriode={labelPeriode(periode, true)}
                        kategori={kategoriPengeluaran}
                        anggaran={{
                          categoryId: item.categoryId,
                          kategori: item.kategori,
                          amount: item.anggaran.toString(),
                        }}
                        pemicu={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            aria-label={`Ubah anggaran ${item.kategori}`}
                          >
                            Ubah
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        aksi={hapusAnggaranAction}
                        data={{ id: item.id }}
                        judul="Hapus anggaran?"
                        keterangan={`Anggaran ${item.kategori} untuk ${labelPeriode(periode, true)} akan dihapus. Transaksinya tidak terpengaruh.`}
                        pemicu={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive size-7"
                            aria-label={`Hapus anggaran ${item.kategori}`}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        }
                      />
                    </span>
                  }
                />
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
