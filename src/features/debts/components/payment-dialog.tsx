"use client";

import { useActionState, useEffect, useState } from "react";
import { HandCoins } from "lucide-react";
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
import { catatPembayaranAction } from "@/features/debts/actions";

type Props = {
  debtId: string;
  /** PAYABLE berarti kita membayar; RECEIVABLE berarti kita menerima. */
  membayar: boolean;
  pihak: string;
  tanggalHariIni: string;
  /** Nominal angsuran terjadwal berikutnya, dipakai sebagai nilai awal. */
  saranNominal?: string;
  akun: ReadonlyArray<{ id: string; name: string }>;
  kategori: ReadonlyArray<{ id: string; label: string }>;
  pemicu?: React.ReactNode;
};

export function PaymentDialog({
  debtId,
  membayar,
  pihak,
  tanggalHariIni,
  saranNominal,
  akun,
  kategori,
  pemicu,
}: Props) {
  const [terbuka, setTerbuka] = useState(false);
  const [state, formAction] = useActionState(catatPembayaranAction, STATE_AWAL);

  useEffect(() => {
    if (state.pesan && !state.gagal) {
      toast.success(state.pesan);
      setTerbuka(false);
    }
  }, [state]);

  return (
    <Dialog open={terbuka} onOpenChange={setTerbuka}>
      <DialogTrigger asChild>
        {pemicu ?? (
          <Button size="sm">
            <HandCoins className="size-4" aria-hidden />
            {membayar ? "Bayar cicilan" : "Terima pembayaran"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {membayar ? "Catat pembayaran" : "Catat penerimaan"}
          </DialogTitle>
          <DialogDescription>
            {membayar
              ? `Uang keluar dari akun yang dipilih menuju ${pihak}. Porsi bunga dan pokok dipisah otomatis mengikuti jadwal.`
              : `Uang masuk ke akun yang dipilih dari ${pihak}.`}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="debtId" value={debtId} />
          {state.gagal && state.pesan ? <FormAlert pesan={state.pesan} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bayar-nominal">Nominal</Label>
              <MoneyInput
                id="bayar-nominal"
                name="amount"
                defaultValue={saranNominal}
                required
                aria-invalid={Boolean(galatField(state, "amount"))}
              />
              <FieldError pesan={galatField(state, "amount")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bayar-tanggal">Tanggal</Label>
              <Input
                id="bayar-tanggal"
                name="date"
                type="date"
                defaultValue={tanggalHariIni}
                required
                aria-invalid={Boolean(galatField(state, "date"))}
              />
              <FieldError pesan={galatField(state, "date")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bayar-akun">
              {membayar ? "Dibayar dari akun" : "Diterima di akun"}
            </Label>
            <Select name="accountId" defaultValue={akun[0]?.id}>
              <SelectTrigger id="bayar-akun" className="w-full">
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
            <Label htmlFor="bayar-kategori">Kategori (opsional)</Label>
            <Select name="categoryId" defaultValue="none">
              <SelectTrigger id="bayar-kategori" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanpa kategori</SelectItem>
                {kategori.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Berguna agar cicilan ikut terhitung pada laporan per kategori.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bayar-catatan">Catatan</Label>
            <Input id="bayar-catatan" name="note" placeholder="opsional" />
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
