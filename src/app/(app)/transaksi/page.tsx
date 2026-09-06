import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowLeft,
  ArrowRight,
  Lock,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/form-feedback";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TransactionFilters } from "@/features/transactions/components/transaction-filters";
import {
  TransactionFormDialog,
  type PilihanAkun,
  type PilihanKategori,
} from "@/features/transactions/components/transaction-form-dialog";
import { hapusTransaksiAction } from "@/features/transactions/actions";
import {
  ambilDaftarTransaksi,
  type BarisTransaksi,
} from "@/features/transactions/service";
import { filterSchema, UKURAN_HALAMAN } from "@/features/transactions/schema";
import { ambilAkunUntukPilihan } from "@/features/accounts/service";
import { ambilKategoriUntukPilihan } from "@/features/categories/service";
import { wajibMasuk } from "@/lib/session";
import { formatRupiah, formatRupiahRingkas } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Transaksi" };

type ParamHalaman = Record<string, string | string[] | undefined>;

/** Tanggal hari ini pada zona waktu pengguna, dalam format YYYY-MM-DD. */
function tanggalHariIni(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    dateStyle: "short",
  }).format(new Date());
}

function formatTanggal(tanggal: Date): string {
  // Tanggal disimpan sebagai tengah malam UTC, jadi dibaca kembali sebagai UTC.
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(tanggal);
}

function tautanHalaman(params: ParamHalaman, halaman: number): string {
  const query = new URLSearchParams();
  for (const [kunci, nilai] of Object.entries(params)) {
    if (kunci === "hal") continue;
    if (typeof nilai === "string" && nilai !== "") query.set(kunci, nilai);
  }
  if (halaman > 1) query.set("hal", String(halaman));
  const teks = query.toString();
  return teks ? `/transaksi?${teks}` : "/transaksi";
}

export default async function HalamanTransaksi({
  searchParams,
}: {
  searchParams: Promise<ParamHalaman>;
}) {
  const pengguna = await wajibMasuk();
  const params = await searchParams;
  const filter = filterSchema.parse(params);

  const [hasil, akun, kategori] = await Promise.all([
    ambilDaftarTransaksi(pengguna.id, filter),
    ambilAkunUntukPilihan(pengguna.id),
    ambilKategoriUntukPilihan(pengguna.id),
  ]);

  const pilihanAkun: PilihanAkun[] = akun.map((item) => ({
    id: item.id,
    name: item.name,
  }));
  const pilihanKategori: PilihanKategori[] = kategori.map((item) => ({
    id: item.id,
    label: item.label,
    kind: item.kind,
  }));
  const hariIni = tanggalHariIni(pengguna.timezone);

  const adaFilterAktif =
    Boolean(filter.q || filter.akun || filter.kategori || filter.dari || filter.sampai) ||
    filter.tipe !== "SEMUA";

  const selisih = hasil.ringkasan.pemasukan - hasil.ringkasan.pengeluaran;
  const awal = (hasil.halaman - 1) * UKURAN_HALAMAN + 1;
  const akhir = Math.min(hasil.halaman * UKURAN_HALAMAN, hasil.total);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transaksi</h1>
          <p className="text-muted-foreground text-sm">
            Catatan pemasukan, pengeluaran, dan perpindahan antar akun.
          </p>
        </div>
        <div className="hidden sm:block">
          <TransactionFormDialog
            akun={pilihanAkun}
            kategori={pilihanKategori}
            tanggalHariIni={hariIni}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <KartuRingkasan
          judul="Pemasukan"
          nilai={hasil.ringkasan.pemasukan}
          warna="text-emerald-600 dark:text-emerald-400"
        />
        <KartuRingkasan
          judul="Pengeluaran"
          nilai={hasil.ringkasan.pengeluaran}
          warna="text-destructive"
        />
        <KartuRingkasan
          judul="Selisih"
          nilai={selisih}
          warna={
            selisih < 0n
              ? "text-destructive"
              : "text-emerald-600 dark:text-emerald-400"
          }
          keterangan="Transfer tidak dihitung"
        />
      </div>

      <TransactionFilters
        filter={filter}
        akun={pilihanAkun}
        kategori={kategori.map((item) => ({ id: item.id, label: item.label }))}
        adaFilterAktif={adaFilterAktif}
      />

      {hasil.total === 0 ? (
        <EmptyState
          icon={<Receipt className="size-8" aria-hidden />}
          judul={
            adaFilterAktif ? "Tidak ada transaksi yang cocok" : "Belum ada transaksi"
          }
          keterangan={
            adaFilterAktif
              ? "Coba longgarkan filternya atau atur ulang rentang tanggal."
              : "Catat transaksi pertama Anda untuk mulai melihat arus kas."
          }
          aksi={
            adaFilterAktif ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/transaksi">Reset filter</Link>
              </Button>
            ) : (
              <TransactionFormDialog
                akun={pilihanAkun}
                kategori={pilihanKategori}
                tanggalHariIni={hariIni}
              />
            )
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Menampilkan {awal}–{akhir} dari {hasil.total} transaksi
          </p>

          <ul className="divide-y rounded-lg border">
            {hasil.baris.map((baris) => (
              <BarisDaftar
                key={baris.id}
                baris={baris}
                akun={pilihanAkun}
                kategori={pilihanKategori}
                tanggalHariIni={hariIni}
              />
            ))}
          </ul>

          {hasil.totalHalaman > 1 ? (
            <nav
              className="flex items-center justify-between gap-2"
              aria-label="Paginasi"
            >
              <Button asChild variant="outline" size="sm">
                <Link
                  href={tautanHalaman(params, hasil.halaman - 1)}
                  aria-disabled={hasil.halaman <= 1}
                  className={cn(
                    hasil.halaman <= 1 && "pointer-events-none opacity-50",
                  )}
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  Sebelumnya
                </Link>
              </Button>
              <span className="text-muted-foreground text-sm">
                Halaman {hasil.halaman} dari {hasil.totalHalaman}
              </span>
              <Button asChild variant="outline" size="sm">
                <Link
                  href={tautanHalaman(params, hasil.halaman + 1)}
                  aria-disabled={hasil.halaman >= hasil.totalHalaman}
                  className={cn(
                    hasil.halaman >= hasil.totalHalaman &&
                      "pointer-events-none opacity-50",
                  )}
                >
                  Berikutnya
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </nav>
          ) : null}
        </div>
      )}

      {/* Tombol aksi mengambang khusus ponsel, di atas navigasi bawah. */}
      <div className="fixed bottom-20 right-4 z-40 sm:hidden">
        <TransactionFormDialog
          akun={pilihanAkun}
          kategori={pilihanKategori}
          tanggalHariIni={hariIni}
          pemicu={
            <Button
              size="icon"
              className="size-14 rounded-full shadow-lg"
              aria-label="Catat transaksi"
            >
              <Plus className="size-6" aria-hidden />
            </Button>
          }
        />
      </div>
    </div>
  );
}

function KartuRingkasan({
  judul,
  nilai,
  warna,
  keterangan,
}: {
  judul: string;
  nilai: bigint;
  warna: string;
  keterangan?: string;
}) {
  return (
    <Card>
      <CardHeader className="gap-1 p-3 sm:p-6 sm:pb-2">
        <CardDescription className="text-xs sm:text-sm">{judul}</CardDescription>
        <CardTitle className={cn("tabular-nums", warna)}>
          {/* Layar sempit memakai format ringkas supaya tiga kartu tetap sebaris. */}
          <span className="text-lg sm:hidden">{formatRupiahRingkas(nilai)}</span>
          <span className="hidden sm:inline sm:text-2xl">{formatRupiah(nilai)}</span>
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

function BarisDaftar({
  baris,
  akun,
  kategori,
  tanggalHariIni: hariIni,
}: {
  baris: BarisTransaksi;
  akun: PilihanAkun[];
  kategori: PilihanKategori[];
  tanggalHariIni: string;
}) {
  const tandaNominal =
    baris.type === "INCOME" ? "+" : baris.type === "EXPENSE" ? "-" : "";
  const warnaNominal =
    baris.type === "INCOME"
      ? "text-emerald-600 dark:text-emerald-400"
      : baris.type === "EXPENSE"
        ? "text-destructive"
        : "text-sky-600 dark:text-sky-400";

  const keterangan =
    baris.type === "TRANSFER"
      ? `${baris.accountName} → ${baris.toAccountName ?? "?"}`
      : `${baris.categoryName ?? "Tanpa kategori"} · ${baris.accountName}`;

  return (
    <li className="flex items-center justify-between gap-3 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{
            backgroundColor:
              baris.type === "TRANSFER"
                ? "#0ea5e9"
                : (baris.categoryColor ?? "#64748b"),
          }}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {baris.note || (baris.type === "TRANSFER" ? "Transfer" : keterangan)}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {formatTanggal(baris.date)} · {keterangan}
            {baris.tags ? ` · ${baris.tags}` : ""}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="text-right">
          <p className={cn("text-sm font-semibold tabular-nums", warnaNominal)}>
            {tandaNominal}
            {formatRupiah(baris.amount)}
          </p>
          {baris.type === "TRANSFER" ? (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <ArrowLeftRight className="size-3" aria-hidden />
              transfer
            </span>
          ) : null}
        </div>

        {baris.terkaitModulLain ? (
          <Badge variant="secondary" className="gap-1">
            <Lock className="size-3" aria-hidden />
            terkunci
          </Badge>
        ) : (
          <div className="flex items-center">
            <TransactionFormDialog
              akun={akun}
              kategori={kategori}
              tanggalHariIni={hariIni}
              transaksi={{
                id: baris.id,
                type: baris.type,
                date: baris.date.toISOString().slice(0, 10),
                amount: baris.amount.toString(),
                accountId: baris.accountId,
                toAccountId: baris.toAccountId,
                categoryId: baris.categoryId,
                note: baris.note,
                tags: baris.tags,
              }}
              pemicu={
                <Button variant="ghost" size="icon" aria-label="Ubah transaksi">
                  <Pencil className="size-4" aria-hidden />
                </Button>
              }
            />
            <ConfirmDialog
              aksi={hapusTransaksiAction}
              data={{ id: baris.id }}
              judul="Hapus transaksi?"
              keterangan="Transaksi dihapus permanen dan saldo akun ikut menyesuaikan."
              pemicu={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Hapus transaksi"
                  className="text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              }
            />
          </div>
        )}
      </div>
    </li>
  );
}
