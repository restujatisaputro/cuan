import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, Pencil, RotateCcw, Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { GoalFormDialog } from "@/features/savings/components/goal-form-dialog";
import { ContributionDialog } from "@/features/savings/components/contribution-dialog";
import {
  hapusSetoranAction,
  hapusTargetAction,
  ubahStatusTargetAction,
} from "@/features/savings/actions";
import { ambilDetailTarget } from "@/features/savings/service";
import { ambilAkunUntukPilihan } from "@/features/accounts/service";
import { wajibMasuk } from "@/lib/session";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Detail Tabungan" };

function formatTanggal(tanggal: Date | null): string {
  if (!tanggal) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(tanggal);
}

export default async function HalamanDetailTabungan({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const pengguna = await wajibMasuk();
  const { id } = await params;

  const detail = await ambilDetailTarget(pengguna.id, id);
  if (!detail) notFound();

  const akun = await ambilAkunUntukPilihan(pengguna.id);
  const { ringkasan, setoran } = detail;
  const akunSumber = akun.filter((item) => item.id !== ringkasan.accountId);

  const hariIni = new Intl.DateTimeFormat("en-CA", {
    timeZone: pengguna.timezone,
    dateStyle: "short",
  }).format(new Date());

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/tabungan">
          <ArrowLeft className="size-4" aria-hidden />
          Kembali ke daftar
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {ringkasan.name}
            </h1>
            <Badge
              variant={
                ringkasan.status === "TERCAPAI"
                  ? "default"
                  : ringkasan.status === "BATAL"
                    ? "secondary"
                    : ringkasan.berisikoTerlambat
                      ? "destructive"
                      : "outline"
              }
            >
              {ringkasan.status === "TERCAPAI"
                ? "Tercapai"
                : ringkasan.status === "BATAL"
                  ? "Dibatalkan"
                  : ringkasan.berisikoTerlambat
                    ? "Perlu dikejar"
                    : "Aktif"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Penampung: {ringkasan.akun ?? "-"}
            {ringkasan.targetDate
              ? ` · tenggat ${formatTanggal(ringkasan.targetDate)}`
              : " · tanpa tenggat"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ringkasan.status !== "BATAL" && ringkasan.sisa > 0n && akunSumber.length > 0 ? (
            <ContributionDialog
              goalId={ringkasan.id}
              namaTarget={ringkasan.name}
              akunPenampung={ringkasan.akun}
              tanggalHariIni={hariIni}
              saranNominal={ringkasan.butuhPerBulan?.toString()}
              akun={akunSumber}
            />
          ) : null}

          <GoalFormDialog
            akun={akun}
            target={{
              id: ringkasan.id,
              name: ringkasan.name,
              targetAmount: ringkasan.targetAmount.toString(),
              targetDate: ringkasan.targetDate
                ? ringkasan.targetDate.toISOString().slice(0, 10)
                : "",
              accountId: ringkasan.accountId ?? "",
            }}
            pemicu={
              <Button variant="outline" size="sm">
                <Pencil className="size-4" aria-hidden />
                Ubah
              </Button>
            }
          />

          <ConfirmDialog
            aksi={ubahStatusTargetAction}
            data={{
              id: ringkasan.id,
              status: ringkasan.status === "BATAL" ? "AKTIF" : "BATAL",
            }}
            judul={
              ringkasan.status === "BATAL" ? "Aktifkan target?" : "Batalkan target?"
            }
            keterangan={
              ringkasan.status === "BATAL"
                ? `${ringkasan.name} bisa menerima setoran lagi.`
                : `${ringkasan.name} berhenti menerima setoran baru. Riwayat setoran dan saldo akun tidak berubah.`
            }
            teksTombol={ringkasan.status === "BATAL" ? "Aktifkan" : "Batalkan"}
            pemicu={
              <Button variant="outline" size="sm">
                {ringkasan.status === "BATAL" ? (
                  <RotateCcw className="size-4" aria-hidden />
                ) : (
                  <Ban className="size-4" aria-hidden />
                )}
                {ringkasan.status === "BATAL" ? "Aktifkan" : "Batalkan"}
              </Button>
            }
          />

          <ConfirmDialog
            aksi={hapusTargetAction}
            data={{ id: ringkasan.id }}
            judul="Hapus target ini?"
            keterangan={`Seluruh riwayat setoran ${ringkasan.name} beserta transfernya ikut dihapus, dan saldo kedua akun kembali seperti semula.`}
            pemicu={
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="size-4" aria-hidden />
                Hapus
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="gap-1 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="text-xs sm:text-sm">Terkumpul</CardDescription>
            <CardTitle className="text-lg tabular-nums sm:text-xl">
              {formatRupiah(ringkasan.terkumpul)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="text-xs sm:text-sm">Kurang</CardDescription>
            <CardTitle className="text-lg tabular-nums sm:text-xl">
              {formatRupiah(ringkasan.sisa)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="text-xs sm:text-sm">
              Rata-rata / bulan
            </CardDescription>
            <CardTitle className="text-lg tabular-nums sm:text-xl">
              {formatRupiah(ringkasan.rataPerBulan)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="text-xs sm:text-sm">Perkiraan selesai</CardDescription>
            <CardTitle className="text-base tabular-nums sm:text-lg">
              {ringkasan.sisa === 0n
                ? "Tercapai"
                : ringkasan.proyeksiTercapai
                  ? formatTanggal(ringkasan.proyeksiTercapai)
                  : "Belum bisa dihitung"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Progres</CardTitle>
          <CardDescription>
            {ringkasan.persen.toFixed(0)}% dari {formatRupiah(ringkasan.targetAmount)}
            {ringkasan.setoranTerakhir
              ? ` · setoran terakhir ${formatTanggal(ringkasan.setoranTerakhir)}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress
            value={Math.min(ringkasan.persen, 100)}
            className={cn(
              "h-2",
              ringkasan.status === "TERCAPAI" && "[&>div]:bg-emerald-500",
            )}
          />
          {ringkasan.sisa > 0n && ringkasan.butuhPerBulan ? (
            <p
              className={cn(
                "text-xs",
                ringkasan.berisikoTerlambat
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              Perlu {formatRupiah(ringkasan.butuhPerBulan)} per bulan agar tercapai
              tepat waktu.
              {ringkasan.berisikoTerlambat && ringkasan.rataPerBulan > 0n
                ? ` Laju setoran sekarang ${formatRupiah(ringkasan.rataPerBulan)} per bulan, masih di bawah kebutuhan.`
                : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat setoran</CardTitle>
          <CardDescription>
            {setoran.length} setoran tercatat. Menghapusnya sekaligus menghapus
            transfer terkait.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {setoran.length === 0 ? (
            <p className="text-muted-foreground px-6 pb-6 text-sm">
              Belum ada setoran.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="hidden sm:table-cell">Dari akun</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {setoran.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatTanggal(item.date)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatRupiah(item.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        {item.akunSumber ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <ConfirmDialog
                          aksi={hapusSetoranAction}
                          data={{ id: item.id }}
                          judul="Hapus setoran?"
                          keterangan="Setoran dan transfernya dihapus, lalu progres dihitung ulang."
                          pemicu={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive size-8"
                              aria-label="Hapus setoran"
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
