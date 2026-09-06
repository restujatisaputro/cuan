"use client";

import { useActionState, useEffect, useState } from "react";
import { PiggyBank } from "lucide-react";
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
import { catatSetoranAction } from "@/features/savings/actions";

type Props = {
  goalId: string;
  namaTarget: string;
  akunPenampung: string | null;
  tanggalHariIni: string;
  saranNominal?: string;
  /** Akun sumber; akun penampung target sudah disaring keluar. */
  akun: ReadonlyArray<{ id: string; name: string }>;
  pemicu?: React.ReactNode;
};

export function ContributionDialog({
  goalId,
  namaTarget,
  akunPenampung,
  tanggalHariIni,
  saranNominal,
  akun,
  pemicu,
}: Props) {
  const [terbuka, setTerbuka] = useState(false);
  const [state, formAction] = useActionState(catatSetoranAction, STATE_AWAL);

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
            <PiggyBank className="size-4" aria-hidden />
            Setor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Setor ke {namaTarget}</DialogTitle>
          <DialogDescription>
            Dana dipindahkan ke {akunPenampung ?? "akun penampung"}. Transfer
            tidak dihitung sebagai pengeluaran.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="goalId" value={goalId} />
          {state.gagal && state.pesan ? <FormAlert pesan={state.pesan} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="setor-nominal">Nominal</Label>
              <MoneyInput
                id="setor-nominal"
                name="amount"
                defaultValue={saranNominal}
                required
                aria-invalid={Boolean(galatField(state, "amount"))}
              />
              <FieldError pesan={galatField(state, "amount")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="setor-tanggal">Tanggal</Label>
              <Input
                id="setor-tanggal"
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
            <Label htmlFor="setor-akun">Diambil dari akun</Label>
            <Select name="fromAccountId" defaultValue={akun[0]?.id}>
              <SelectTrigger id="setor-akun" className="w-full">
                <SelectValue placeholder="Pilih akun sumber" />
              </SelectTrigger>
              <SelectContent>
                {akun.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError pesan={galatField(state, "fromAccountId")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setor-catatan">Catatan</Label>
            <Input id="setor-catatan" name="note" placeholder="opsional" />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTerbuka(false)}
            >
              Batal
            </Button>
            <SubmitButton>Setor</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
