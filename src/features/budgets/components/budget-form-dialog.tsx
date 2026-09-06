"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
import { simpanAnggaranAction } from "@/features/budgets/actions";

type Props = {
  periode: string;
  labelPeriode: string;
  /** Kategori pengeluaran yang bisa dianggarkan. */
  kategori: ReadonlyArray<{ id: string; label: string }>;
  anggaran?: { categoryId: string; kategori: string; amount: string };
  pemicu?: React.ReactNode;
};

export function BudgetFormDialog({
  periode,
  labelPeriode,
  kategori,
  anggaran,
  pemicu,
}: Props) {
  const [terbuka, setTerbuka] = useState(false);
  const [state, formAction] = useActionState(simpanAnggaranAction, STATE_AWAL);
  const sedangUbah = Boolean(anggaran);

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
            <Plus className="size-4" aria-hidden />
            Tambah anggaran
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {sedangUbah ? `Ubah anggaran ${anggaran?.kategori}` : "Tambah anggaran"}
          </DialogTitle>
          <DialogDescription>
            Batas pengeluaran untuk {labelPeriode}. Pengeluaran sub-kategori ikut
            dihitung ke anggaran induknya.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="period" value={periode} />
          {state.gagal && state.pesan ? <FormAlert pesan={state.pesan} /> : null}

          <div className="space-y-2">
            <Label htmlFor="anggaran-kategori">Kategori</Label>
            {sedangUbah ? (
              <input type="hidden" name="categoryId" value={anggaran?.categoryId} />
            ) : null}
            <Select
              name={sedangUbah ? "kategori-terkunci" : "categoryId"}
              defaultValue={anggaran?.categoryId}
              disabled={sedangUbah}
            >
              <SelectTrigger id="anggaran-kategori" className="w-full">
                <SelectValue placeholder="Pilih kategori pengeluaran" />
              </SelectTrigger>
              <SelectContent>
                {kategori.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError pesan={galatField(state, "categoryId")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="anggaran-nominal">Batas pengeluaran</Label>
            <MoneyInput
              id="anggaran-nominal"
              name="amount"
              defaultValue={anggaran?.amount}
              required
              aria-invalid={Boolean(galatField(state, "amount"))}
            />
            <FieldError pesan={galatField(state, "amount")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTerbuka(false)}>
              Batal
            </Button>
            <SubmitButton>{sedangUbah ? "Simpan" : "Tambah"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
