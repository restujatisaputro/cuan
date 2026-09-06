import type { Metadata } from "next";
import { Pause, Pencil, Play, Repeat, Trash2 } from "lucide-react";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RecurringFormDialog } from "@/features/recurring/components/recurring-form-dialog";
import { RunRulesButton } from "@/features/recurring/components/run-rules-button";
import {
  hapusAturanAction,
  ubahAktifAturanAction,
} from "@/features/recurring/actions";
import {
  ambilDaftarAturan,
  type RingkasanAturan,
} from "@/features/recurring/service";
import { ambilAkunUntukPilihan } from "@/features/accounts/service";
import { ambilKategoriUntukPilihan } from "@/features/categories/service";
import { wajibMasuk } from "@/lib/session";
import { formatRupiah } from "@/lib/money";
import {
  FREQUENCY_LABEL,
  TRANSACTION_TYPE_LABEL,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Transaksi Berulang" };

function formatTanggal(tanggal: Date | null): string {
  if (!tanggal) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(tanggal);
}

export default async function HalamanBerulang() {
  const pengguna = await wajibMasuk();
  const [daftar, akun, kategori] = await Promise.all([
    ambilDaftarAturan(pengguna.id),
    ambilAkunUntukPilihan(pengguna.id),
    ambilKategoriUntukPilihan(pengguna.id),
  ]);

  const pilihanKategori = kategori.map((item) => ({
    id: item.id,
    label: item.label,
    kind: item.kind,
  }));
  const hariIni = new Intl.DateTimeFormat("en-CA", {
    timeZone: pengguna.timezone,
    dateStyle: "short",
  }).format(new Date());

  const tertunggak = daftar.filter((item) => item.tertunggak).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Transaksi berulang
          </h1>
          <p className="text-muted-foreground text-sm">
            Gaji, tagihan, dan setoran rutin dibuat otomatis saat jadwalnya tiba.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RunRulesButton jumlahTertunggak={tertunggak} />
          <RecurringFormDialog
            akun={akun}
            kategori={pilihanKategori}
            tanggalHariIni={hariIni}
          />
        </div>
      </div>

      {tertunggak > 0 ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="py-4 text-sm">
            <p className="font-medium">
              {tertunggak} aturan sudah jatuh tempo dan menunggu dijalankan.
            </p>
            <p className="text-muted-foreground mt-1">
              Tekan tombol di atas, atau pasang penjadwal harian yang memanggil{" "}
              <code className="text-xs">/api/cron/berulang</code> seperti
              dijelaskan di README.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {daftar.length === 0 ? (
        <EmptyState
          icon={<Repeat className="size-8" aria-hidden />}
          judul="Belum ada aturan berulang"
          keterangan="Buat aturan untuk transaksi yang selalu sama tiap bulan, seperti gaji, cicilan, atau langganan."
          aksi={
            <RecurringFormDialog
              akun={akun}
              kategori={pilihanKategori}
              tanggalHariIni={hariIni}
            />
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {daftar.map((aturan) => (
            <KartuAturan
              key={aturan.id}
              aturan={aturan}
              akun={akun}
              kategori={pilihanKategori}
              hariIni={hariIni}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KartuAturan({
  aturan,
  akun,
  kategori,
  hariIni,
}: {
  aturan: RingkasanAturan;
  akun: ReadonlyArray<{ id: string; name: string }>;
  kategori: ReadonlyArray<{ id: string; label: string; kind: "INCOME" | "EXPENSE" }>;
  hariIni: string;
}) {
  const keterangan =
    aturan.type === "TRANSFER"
      ? `${aturan.akun} → ${aturan.akunTujuan ?? "?"}`
      : `${aturan.kategori ?? "Tanpa kategori"} · ${aturan.akun}`;

  const jadwal =
    aturan.interval === 1
      ? FREQUENCY_LABEL[aturan.frequency]
      : `Setiap ${aturan.interval} ${FREQUENCY_LABEL[aturan.frequency].toLowerCase()}`;

  return (
    <Card className={cn(!aturan.isActive && "opacity-70")}>
      <CardHeader className="gap-1 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{aturan.name}</CardTitle>
            <CardDescription>
              {TRANSACTION_TYPE_LABEL[aturan.type]} · {keterangan}
            </CardDescription>
          </div>
          <Badge
            variant={
              !aturan.isActive
                ? "secondary"
                : aturan.tertunggak
                  ? "destructive"
                  : "outline"
            }
          >
            {!aturan.isActive ? "Dijeda" : aturan.tertunggak ? "Jatuh tempo" : "Aktif"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-xl font-semibold tabular-nums">
          {formatRupiah(aturan.amount)}
        </p>

        <dl className="text-muted-foreground space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <dt>Jadwal</dt>
            <dd>{jadwal}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Berikutnya</dt>
            <dd className={cn(aturan.tertunggak && "text-destructive font-medium")}>
              {formatTanggal(aturan.nextRunDate)}
            </dd>
          </div>
          {aturan.endDate ? (
            <div className="flex justify-between gap-4">
              <dt>Berakhir</dt>
              <dd>{formatTanggal(aturan.endDate)}</dd>
            </div>
          ) : null}
          {aturan.lastRunAt ? (
            <div className="flex justify-between gap-4">
              <dt>Terakhir dijalankan</dt>
              <dd>{formatTanggal(aturan.lastRunAt)}</dd>
            </div>
          ) : null}
        </dl>

        <div className="flex items-center gap-1">
          <RecurringFormDialog
            akun={akun}
            kategori={kategori}
            tanggalHariIni={hariIni}
            aturan={{
              id: aturan.id,
              name: aturan.name,
              type: aturan.type,
              amount: aturan.amount.toString(),
              accountId: aturan.accountId,
              toAccountId: aturan.toAccountId,
              categoryId: aturan.categoryId,
              frequency: aturan.frequency,
              interval: aturan.interval,
              nextRunDate: aturan.nextRunDate.toISOString().slice(0, 10),
              endDate: aturan.endDate
                ? aturan.endDate.toISOString().slice(0, 10)
                : "",
              note: aturan.note,
              tags: aturan.tags,
            }}
            pemicu={
              <Button variant="ghost" size="icon" aria-label={`Ubah ${aturan.name}`}>
                <Pencil className="size-4" aria-hidden />
              </Button>
            }
          />

          <ConfirmDialog
            aksi={ubahAktifAturanAction}
            data={{ id: aturan.id }}
            judul={aturan.isActive ? "Jeda aturan?" : "Aktifkan aturan?"}
            keterangan={
              aturan.isActive
                ? `${aturan.name} berhenti membuat transaksi baru sampai diaktifkan kembali.`
                : `${aturan.name} akan kembali membuat transaksi sesuai jadwalnya.`
            }
            teksTombol={aturan.isActive ? "Jeda" : "Aktifkan"}
            pemicu={
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  aturan.isActive ? `Jeda ${aturan.name}` : `Aktifkan ${aturan.name}`
                }
              >
                {aturan.isActive ? (
                  <Pause className="size-4" aria-hidden />
                ) : (
                  <Play className="size-4" aria-hidden />
                )}
              </Button>
            }
          />

          <ConfirmDialog
            aksi={hapusAturanAction}
            data={{ id: aturan.id }}
            judul="Hapus aturan?"
            keterangan={`${aturan.name} dihapus. Transaksi yang sudah terlanjur dibuat tetap tersimpan.`}
            pemicu={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Hapus ${aturan.name}`}
                className="text-destructive"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
