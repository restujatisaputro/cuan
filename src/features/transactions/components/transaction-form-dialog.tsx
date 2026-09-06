"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowLeftRight, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyInput } from "@/components/money-input";
import { SubmitButton } from "@/components/submit-button";
import { FieldError, FormAlert } from "@/components/form-feedback";
import { galatField, STATE_AWAL } from "@/features/auth/form-state";
import { simpanTransaksiAction } from "@/features/transactions/actions";
import type { TransactionType } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type PilihanAkun = { id: string; name: string };
export type PilihanKategori = {
  id: string;
  label: string;
  kind: "INCOME" | "EXPENSE";
};

export type TransaksiAwal = {
  id: string;
  type: TransactionType;
  date: string;
  amount: string;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  note: string | null;
  tags: string | null;
};

type Props = {
  akun: PilihanAkun[];
  kategori: PilihanKategori[];
  /** Tanggal hari ini di zona waktu pengguna, dihitung di server. */
  tanggalHariIni: string;
  transaksi?: TransaksiAwal;
  pemicu?: React.ReactNode;
};

const TIPE: ReadonlyArray<{
  nilai: TransactionType;
  label: string;
  icon: typeof TrendingUp;
  kelasAktif: string;
}> = [
  {
    nilai: "EXPENSE",
    label: "Pengeluaran",
    icon: TrendingDown,
    kelasAktif: "bg-destructive/10 text-destructive border-destructive/40",
  },
  {
    nilai: "INCOME",
    label: "Pemasukan",
    icon: TrendingUp,
    kelasAktif:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
  },
  {
    nilai: "TRANSFER",
    label: "Transfer",
    icon: ArrowLeftRight,
    kelasAktif: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/40",
  },
];

export function TransactionFormDialog({
  akun,
  kategori,
  tanggalHariIni,
  transaksi,
  pemicu,
}: Props) {
  const [terbuka, setTerbuka] = useState(false);
  const [state, formAction] = useActionState(simpanTransaksiAction, STATE_AWAL);
  const [tipe, setTipe] = useState<TransactionType>(transaksi?.type ?? "EXPENSE");
  const sedangUbah = Boolean(transaksi);

  useEffect(() => {
    if (state.pesan && !state.gagal) {
      toast.success(state.pesan);
      setTerbuka(false);
    }
  }, [state]);

  // Setiap kali dialog dibuka ulang, kembalikan tipe ke nilai awalnya.
  useEffect(() => {
    if (terbuka) setTipe(transaksi?.type ?? "EXPENSE");
  }, [terbuka, transaksi?.type]);

  const kategoriTersedia = kategori.filter(
    (item) => item.kind === (tipe === "INCOME" ? "INCOME" : "EXPENSE"),
  );

  return (
    <Dialog open={terbuka} onOpenChange={setTerbuka}>
      <DialogTrigger asChild>
        {pemicu ?? (
          <Button size="sm">
            <Plus className="size-4" aria-hidden />
            Catat transaksi
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {sedangUbah ? "Ubah transaksi" : "Catat transaksi"}
          </DialogTitle>
          <DialogDescription>
            Transfer antar akun tidak dihitung sebagai pemasukan maupun
            pengeluaran.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {transaksi ? <input type="hidden" name="id" value={transaksi.id} /> : null}
          <input type="hidden" name="type" value={tipe} />
          {state.gagal && state.pesan ? <FormAlert pesan={state.pesan} /> : null}

          <div
            className="grid grid-cols-3 gap-2"
            role="group"
            aria-label="Tipe transaksi"
          >
            {TIPE.map((pilihan) => {
              const Icon = pilihan.icon;
              const aktif = tipe === pilihan.nilai;
              return (
                <button
                  key={pilihan.nilai}
                  type="button"
                  onClick={() => setTipe(pilihan.nilai)}
                  aria-pressed={aktif}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs font-medium transition",
                    aktif
                      ? pilihan.kelasAktif
                      : "text-muted-foreground hover:bg-muted border-transparent",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {pilihan.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trx-jumlah">Nominal</Label>
              <MoneyInput
                id="trx-jumlah"
                name="amount"
                defaultValue={transaksi?.amount}
                required
                aria-invalid={Boolean(galatField(state, "amount"))}
              />
              <FieldError pesan={galatField(state, "amount")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trx-tanggal">Tanggal</Label>
              <Input
                id="trx-tanggal"
                name="date"
                type="date"
                defaultValue={transaksi?.date ?? tanggalHariIni}
                required
                aria-invalid={Boolean(galatField(state, "date"))}
              />
              <FieldError pesan={galatField(state, "date")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trx-akun">
              {tipe === "TRANSFER" ? "Dari akun" : "Akun"}
            </Label>
            <Select
              name="accountId"
              defaultValue={transaksi?.accountId ?? akun[0]?.id}
            >
              <SelectTrigger id="trx-akun" className="w-full">
                <SelectValue placeholder="Pilih akun" />
              </SelectTrigger>
              <SelectContent>
                {akun.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError pesan={galatField(state, "accountId")} />
          </div>

          {tipe === "TRANSFER" ? (
            <div className="space-y-2">
              <Label htmlFor="trx-akun-tujuan">Ke akun</Label>
              <Select
                name="toAccountId"
                defaultValue={transaksi?.toAccountId ?? "none"}
              >
                <SelectTrigger id="trx-akun-tujuan" className="w-full">
                  <SelectValue placeholder="Pilih akun tujuan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pilih akun tujuan</SelectItem>
                  {akun.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError pesan={galatField(state, "toAccountId")} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="trx-kategori">Kategori</Label>
              <Select
                name="categoryId"
                key={tipe}
                defaultValue={transaksi?.categoryId ?? "none"}
              >
                <SelectTrigger id="trx-kategori" className="w-full">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pilih kategori</SelectItem>
                  {kategoriTersedia.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError pesan={galatField(state, "categoryId")} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="trx-catatan">Catatan</Label>
            <Input
              id="trx-catatan"
              name="note"
              defaultValue={transaksi?.note ?? ""}
              placeholder="mis. Belanja bulanan"
              aria-invalid={Boolean(galatField(state, "note"))}
            />
            <FieldError pesan={galatField(state, "note")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trx-tag">Tag</Label>
            <Input
              id="trx-tag"
              name="tags"
              defaultValue={transaksi?.tags ?? ""}
              placeholder="pisahkan dengan koma, mis. rutin, kantor"
              aria-invalid={Boolean(galatField(state, "tags"))}
            />
            <FieldError pesan={galatField(state, "tags")} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTerbuka(false)}
            >
              Batal
            </Button>
            <SubmitButton>{sedangUbah ? "Simpan" : "Catat"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
