import Link from "next/link";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TRANSACTION_TYPE_LABEL, TRANSACTION_TYPES } from "@/lib/constants";
import type { FilterTransaksi } from "@/features/transactions/schema";

type Props = {
  filter: FilterTransaksi;
  akun: ReadonlyArray<{ id: string; name: string }>;
  kategori: ReadonlyArray<{ id: string; label: string }>;
  adaFilterAktif: boolean;
};

/**
 * Penyaring daftar transaksi.
 *
 * Sengaja memakai form GET biasa: filter tersimpan di URL sehingga bisa
 * di-bookmark dan dibagikan, halaman tetap dirender di server, dan tanpa
 * JavaScript pun tetap berfungsi. Select memakai elemen native agar nilainya
 * ikut terkirim tanpa komponen klien.
 */
export function TransactionFilters({
  filter,
  akun,
  kategori,
  adaFilterAktif,
}: Props) {
  const kelasSelect =
    "border-input bg-transparent dark:bg-input/30 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

  return (
    <details
      className="bg-card rounded-lg border"
      open={adaFilterAktif ? true : undefined}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium">
        <span className="flex items-center gap-2">
          <Filter className="size-4" aria-hidden />
          Filter
          {adaFilterAktif ? (
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">
              aktif
            </span>
          ) : null}
        </span>
        <span className="text-muted-foreground text-xs">klik untuk buka</span>
      </summary>

      <form method="get" action="/transaksi" className="space-y-4 border-t p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="f-q">Kata kunci</Label>
            <Input
              id="f-q"
              name="q"
              defaultValue={filter.q ?? ""}
              placeholder="Cari catatan atau tag"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="f-tipe">Tipe</Label>
            <select
              id="f-tipe"
              name="tipe"
              defaultValue={filter.tipe}
              className={kelasSelect}
            >
              <option value="SEMUA">Semua tipe</option>
              {TRANSACTION_TYPES.map((tipe) => (
                <option key={tipe} value={tipe}>
                  {TRANSACTION_TYPE_LABEL[tipe]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="f-akun">Akun</Label>
            <select
              id="f-akun"
              name="akun"
              defaultValue={filter.akun ?? ""}
              className={kelasSelect}
            >
              <option value="">Semua akun</option>
              {akun.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="f-kategori">Kategori</Label>
            <select
              id="f-kategori"
              name="kategori"
              defaultValue={filter.kategori ?? ""}
              className={kelasSelect}
            >
              <option value="">Semua kategori</option>
              {kategori.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="f-dari">Dari tanggal</Label>
            <Input id="f-dari" name="dari" type="date" defaultValue={filter.dari ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="f-sampai">Sampai tanggal</Label>
            <Input
              id="f-sampai"
              name="sampai"
              type="date"
              defaultValue={filter.sampai ?? ""}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm">
            Terapkan filter
          </Button>
          {adaFilterAktif ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/transaksi">
                <X className="size-4" aria-hidden />
                Reset
              </Link>
            </Button>
          ) : null}
        </div>
      </form>
    </details>
  );
}
