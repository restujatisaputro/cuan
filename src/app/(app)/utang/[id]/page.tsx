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
import { DebtFormDialog } from "@/features/debts/components/debt-form-dialog";
import { PaymentDialog } from "@/features/debts/components/payment-dialog";
import { hapusPembayaranAction, hapusUtangAction } from "@/features/debts/actions";
import { ambilDetailUtang } from "@/features/debts/service";
import { ambilAkunUntukPilihan } from "@/features/accounts/service";
import { ambilKategoriUntukPilihan } from "@/features/categories/service";
import { wajibMasuk } from "@/lib/session";
import { formatRupiah } from "@/lib/money";
import { INTEREST_TYPE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Detail Utang" };

function formatTanggal(tanggal: Date | null): string {
  if (!tanggal) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(tanggal);
}

export default async function HalamanDetailUtang({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const pengguna = await wajibMasuk();
  const { id } = await params;

  const detail = await ambilDetailUtang(pengguna.id, id);
  if (!detail) notFound();

  const [akun, kategori] = await Promise.all([
    ambilAkunUntukPilihan(pengguna.id),
    ambilKategoriUntukPilihan(pengguna.id),
  ]);

  const { ringkasan, jadwal, pembayaran, angsuranBerikutnya, totalBungaJadwal } =
    detail;
  const membayar = ringkasan.direction === "PAYABLE";
  const hariIni = new Intl.DateTimeFormat("en-CA", {
    timeZone: pengguna.timezone,
    dateStyle: "short",
  }).format(new Date());

  const kategoriPilihan = kategori
    .filter((item) => item.kind === (membayar ? "EXPENSE" : "INCOME"))
    .map((item) => ({ id: item.id, label: item.label }));

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/utang">
          <ArrowLeft className="size-4" aria-hidden />
          Kembali ke daftar
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {ringkasan.counterparty}
            </h1>
            <Badge
              variant={
                ringkasan.status === "LUNAS"
                  ? "secondary"
                  : ringkasan.status === "TERLAMBAT"
                    ? "destructive"
                    : "outline"
              }
            >
              {ringkasan.status === "LUNAS"
                ? "Lunas"
                : ringkasan.status === "TERLAMBAT"
                  ? "Terlambat"
                  : "Aktif"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {membayar ? "Utang kepada" : "Piutang dari"} {ringkasan.counterparty} ·{" "}
            {INTEREST_TYPE_LABEL[ringkasan.interestType]}
            {ringkasan.interestType !== "NONE"
              ? ` ${(ringkasan.interestRateBps / 100).toFixed(2).replace(".", ",")}% per tahun`
              : ""}
          </p>
          {ringkasan.note ? (
            <p className="text-muted-foreground mt-1 text-sm">{ringkasan.note}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ringkasan.sisaPokok > 0n ? (
            <PaymentDialog
              debtId={ringkasan.id}
              membayar={membayar}
              pihak={ringkasan.counterparty}
              tanggalHariIni={hariIni}
              saranNominal={angsuranBerikutnya?.angsuran.toString()}
              akun={akun}
              kategori={kategoriPilihan}
            />
          ) : null}

          <DebtFormDialog
            tanggalHariIni={hariIni}
            utang={{
              id: ringkasan.id,
              direction: ringkasan.direction,
              counterparty: ringkasan.counterparty,
              principal: ringkasan.principal.toString(),
              bungaPersen: (ringkasan.interestRateBps / 100).toString(),
              interestType: ringkasan.interestType,
              startDate: ringkasan.startDate.toISOString().slice(0, 10),
              tenorMonths: ringkasan.tenorMonths,
              note: ringkasan.note,
            }}
            pemicu={
              <Button variant="outline" size="sm">
                <Pencil className="size-4" aria-hidden />
                Ubah
              </Button>
            }
          />

          <ConfirmDialog
            aksi={hapusUtangAction}
            data={{ id: ringkasan.id }}
            judul="Hapus catatan ini?"
            keterangan={`Seluruh riwayat pembayaran ${ringkasan.counterparty} beserta transaksi kasnya ikut dihapus, dan saldo akun akan menyesuaikan kembali.`}
            pemicu={
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="size-4" aria-hidden />
                Hapus
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="gap-1 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="text-xs sm:text-sm">Sisa pokok</CardDescription>
            <CardTitle
              className={cn(
                "text-lg tabular-nums sm:text-2xl",
                membayar ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {formatRupiah(ringkasan.sisaPokok)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="text-xs sm:text-sm">Sudah dibayar</CardDescription>
            <CardTitle className="text-lg tabular-nums sm:text-2xl">
              {formatRupiah(ringkasan.totalDibayar)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground hidden px-3 pt-0 text-xs sm:block sm:px-6">
            pokok {formatRupiah(ringkasan.pokokTerbayar)} · bunga{" "}
            {formatRupiah(ringkasan.bungaTerbayar)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-1 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="text-xs sm:text-sm">Total bunga</CardDescription>
            <CardTitle className="text-lg tabular-nums sm:text-2xl">
              {formatRupiah(totalBungaJadwal)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground hidden px-3 pt-0 text-xs sm:block sm:px-6">
            sepanjang {ringkasan.tenorMonths} bulan
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Progres pelunasan</CardTitle>
          <CardDescription>
            Mulai {formatTanggal(ringkasan.startDate)} · jatuh tempo{" "}
            {formatTanggal(ringkasan.dueDate)}
            {ringkasan.status !== "LUNAS" && ringkasan.sisaHari !== null
              ? ringkasan.sisaHari >= 0
                ? ` · ${ringkasan.sisaHari} hari lagi`
                : ` · lewat ${Math.abs(ringkasan.sisaHari)} hari`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={Math.min(ringkasan.persenLunas, 100)} className="h-2" />
          <p className="text-muted-foreground text-xs">
            {ringkasan.persenLunas.toFixed(0)}% pokok terbayar
            {angsuranBerikutnya
              ? ` · angsuran berikutnya ${formatRupiah(angsuranBerikutnya.angsuran)} pada ${formatTanggal(angsuranBerikutnya.jatuhTempo)}`
              : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat pembayaran</CardTitle>
          <CardDescription>
            {pembayaran.length} pembayaran tercatat. Menghapusnya sekaligus
            menghapus transaksi kas terkait.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pembayaran.length === 0 ? (
            <p className="text-muted-foreground px-6 pb-6 text-sm">
              Belum ada pembayaran.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Pokok</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Bunga</TableHead>
                    <TableHead className="hidden md:table-cell">Akun</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pembayaran.map((bayar) => (
                    <TableRow key={bayar.id}>
                      <TableCell>{formatTanggal(bayar.date)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatRupiah(bayar.amount)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {formatRupiah(bayar.principalPortion)}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden text-right tabular-nums sm:table-cell">
                        {formatRupiah(bayar.interestPortion)}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">
                        {bayar.akun ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <ConfirmDialog
                          aksi={hapusPembayaranAction}
                          data={{ id: bayar.id }}
                          judul="Hapus pembayaran?"
                          keterangan="Pembayaran dan transaksi kasnya dihapus, lalu sisa pokok dihitung ulang."
                          pemicu={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive size-8"
                              aria-label="Hapus pembayaran"
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jadwal angsuran</CardTitle>
          <CardDescription>
            Perkiraan {ringkasan.tenorMonths} angsuran. Baris yang pokoknya sudah
            tertutup pembayaran ditandai lunas.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader className="bg-background sticky top-0">
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Jatuh tempo</TableHead>
                  <TableHead className="text-right">Angsuran</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Pokok</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Bunga</TableHead>
                  <TableHead className="text-right">Sisa pokok</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jadwal.map((baris) => {
                  const sudahLunas = baris.sisaPokok >= ringkasan.sisaPokok;
                  return (
                    <TableRow
                      key={baris.ke}
                      className={cn(sudahLunas && "text-muted-foreground")}
                    >
                      <TableCell>{baris.ke}</TableCell>
                      <TableCell>
                        {formatTanggal(baris.jatuhTempo)}
                        {sudahLunas ? (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            lunas
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatRupiah(baris.angsuran)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {formatRupiah(baris.pokok)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {formatRupiah(baris.bunga)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatRupiah(baris.sisaPokok)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
