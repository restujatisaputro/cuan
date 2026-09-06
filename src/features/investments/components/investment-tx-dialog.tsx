"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Coins } from "lucide-react";
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
import { catatTransaksiInvestasiAction } from "@/features/investments/actions";
import type { InvestmentAction } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  assetId: string;
  namaAset: string;
  hargaTerakhir: string;
  unitDimiliki: string;
  tanggalHariIni: string;
  akun: ReadonlyArray<{ id: string; name: string }>;
  pemicu?: React.ReactNode;
};

const AKSI: ReadonlyArray<{
  nilai: InvestmentAction;
  label: string;
  icon: typeof Coins;
  kelas: string;
}> = [
  {
    nilai: "BUY",
    label: "Beli",
    icon: ArrowDownLeft,
    kelas: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  {
    nilai: "SELL",
    label: "Jual",
    icon: ArrowUpRight,
    kelas:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  {
    nilai: "DIVIDEND",
    label: "Dividen",
    icon: Coins,
    kelas:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
];

export function InvestmentTxDialog({
  assetId,
  namaAset,
  hargaTerakhir,
  unitDimiliki,
  tanggalHariIni,
  akun,
  pemicu,
}: Props) {
  const [terbuka, setTerbuka] = useState(false);
  const [aksi, setAksi] = useState<InvestmentAction>("BUY");
  const [state, formAction] = useActionState(
    catatTransaksiInvestasiAction,
    STATE_AWAL,
  );

  useEffect(() => {
    if (state.pesan && !state.gagal) {
      toast.success(state.pesan);
      setTerbuka(false);
    }
  }, [state]);

  useEffect(() => {
    if (terbuka) setAksi("BUY");
  }, [terbuka]);

  const dividen = aksi === "DIVIDEND";

  return (
    <Dialog open={terbuka} onOpenChange={setTerbuka}>
      <DialogTrigger asChild>
        {pemicu ?? <Button size="sm">Catat transaksi</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transaksi {namaAset}</DialogTitle>
          <DialogDescription>
            Pembelian dan penjualan dicatat sebagai perpindahan dana antara kas
            dan portofolio, sedangkan dividen masuk sebagai pemasukan.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="assetId" value={assetId} />
          <input type="hidden" name="action" value={aksi} />
          {state.gagal && state.pesan ? <FormAlert pesan={state.pesan} /> : null}

          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Jenis transaksi">
            {AKSI.map((pilihan) => {
              const Icon = pilihan.icon;
              const aktif = aksi === pilihan.nilai;
              return (
                <button
                  key={pilihan.nilai}
                  type="button"
                  onClick={() => setAksi(pilihan.nilai)}
                  aria-pressed={aktif}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs font-medium transition",
                    aktif
                      ? pilihan.kelas
                      : "text-muted-foreground hover:bg-muted border-transparent",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {pilihan.label}
                </button>
              );
            })}
          </div>

          {dividen ? (
            <div className="space-y-2">
              <Label htmlFor="inv-nominal">Nominal dividen</Label>
              <MoneyInput
                id="inv-nominal"
                name="amount"
                required
                aria-invalid={Boolean(galatField(state, "amount"))}
              />
              <FieldError pesan={galatField(state, "amount")} />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inv-unit">Jumlah unit</Label>
                <Input
                  id="inv-unit"
                  name="units"
                  inputMode="decimal"
                  placeholder={aksi === "SELL" ? `maks. ${unitDimiliki}` : "mis. 100"}
                  required
                  aria-invalid={Boolean(galatField(state, "units"))}
                />
                <FieldError pesan={galatField(state, "units")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inv-harga">Harga per unit</Label>
                <Input
                  id="inv-harga"
                  name="pricePerUnit"
                  inputMode="decimal"
                  defaultValue={hargaTerakhir}
                  required
                  aria-invalid={Boolean(galatField(state, "pricePerUnit"))}
                />
                <FieldError pesan={galatField(state, "pricePerUnit")} />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inv-tanggal">Tanggal</Label>
              <Input
                id="inv-tanggal"
                name="date"
                type="date"
                defaultValue={tanggalHariIni}
                required
                aria-invalid={Boolean(galatField(state, "date"))}
              />
              <FieldError pesan={galatField(state, "date")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-biaya">Biaya transaksi</Label>
              <MoneyInput
                id="inv-biaya"
                name="fee"
                defaultValue="0"
                aria-invalid={Boolean(galatField(state, "fee"))}
              />
              <FieldError pesan={galatField(state, "fee")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inv-akun">
              {aksi === "BUY" ? "Dana diambil dari" : "Dana masuk ke"}
            </Label>
            <Select name="accountId" defaultValue={akun[0]?.id}>
              <SelectTrigger id="inv-akun" className="w-full">
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

          <div className="space-y-2">
            <Label htmlFor="inv-catatan">Catatan</Label>
            <Input id="inv-catatan" name="note" placeholder="opsional" />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTerbuka(false)}
            >
              Batal
            </Button>
            <SubmitButton>Catat</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
